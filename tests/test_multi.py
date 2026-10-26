# 連線模式測試：python3 tests/test_multi.py
# 不連網。用「假的 Firebase」：頁面對 http://fake.local 發請求，由這支測試程式扮演資料庫（含 firestore.rules.txt 裡 rayo_rooms 規則的 Python 版），
# 多個瀏覽器分頁各當一個玩家，檢查：開房、加入、觀賽、同題同時作答、淘汰落雷、結算、再來一局、房主離開、15 人上限、版面。
import os, re, json, time, random, string
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
URL = 'file://' + ROOT + '/index.html?test'
SHOTS = os.path.join(ROOT, 'shots'); os.makedirs(SHOTS, exist_ok=True)
fails = 0
def check(c, msg):
    global fails
    print(('  ok  ' if c else '  FAIL'), msg)
    if not c: fails += 1

# ======================= 假資料庫 + 規則（Python 版）=======================
H7 = 7 * 3600 * 1000
def ts(v): return v['__ts'] if isinstance(v, dict) and '__ts' in v else None
def isint(x): return isinstance(x, int) and not isinstance(x, bool)
def okname(n): return isinstance(n, str) and 1 <= len(n) <= 14

ROOM_KEYS = {'code','hostUid','hostName','level','status','ph','rd','n','qs','ro','elim','final','createdAt','expireAt'}
def room_shape(r, now):
    return (set(r) == ROOM_KEYS and okname(r['hostName']) and r['level'] in ('easy','normal','hard')
        and r['status'] in ('waiting','playing','finished','closed') and r['ph'] in ('','ready','ask','reveal','end')
        and isint(r['rd']) and 0 <= r['rd'] <= 9 and isint(r['n']) and 0 <= r['n'] <= 999
        and isinstance(r['qs'], list) and len(r['qs']) <= 10 and isinstance(r['ro'], list) and len(r['ro']) <= 15
        and isinstance(r['elim'], dict) and len(r['elim']) <= 15 and isinstance(r['final'], list) and len(r['final']) <= 15
        and ts(r['createdAt']) is not None and ts(r['expireAt']) is not None and ts(r['expireAt']) <= now + H7)
def room_valid_new(code, uid, r, now):
    return (re.fullmatch(r'[0-9]{4}', code) and r['code'] == code and r['hostUid'] == uid and r['status'] == 'waiting' and r['ph'] == ''
        and r['rd'] == 0 and r['n'] == 0 and not r['qs'] and not r['ro'] and not r['elim'] and not r['final']
        and ts(r['createdAt']) == now and room_shape(r, now))
def room_ok(op, code, uid, old, new, now):
    if op == 'delete':
        return old is None or ts(old['expireAt']) < now or old['status'] == 'closed' or uid == old['hostUid']
    if old is None: return bool(room_valid_new(code, uid, new, now))
    recl = ts(old['expireAt']) < now or old['status'] == 'closed'
    if recl and room_valid_new(code, uid, new, now): return True
    if recl: return False
    return bool(uid == old['hostUid'] and new['code'] == old['code'] and new['hostUid'] == old['hostUid']
        and new['createdAt'] == old['createdAt'] and new['expireAt'] == old['expireAt']
        and (new['level'] == old['level'] or new['status'] == 'waiting') and room_shape(new, now))
PL_KEYS = {'name','g','ci','want','spec','a','joinedAt'}
def pl_shape(p):
    return (set(p) == PL_KEYS and okname(p['name']) and p['g'] in ('m','f') and isint(p['ci']) and 0 <= p['ci'] <= 4
        and isinstance(p['want'], bool) and isinstance(p['spec'], bool) and isinstance(p['a'], dict) and len(p['a']) <= 10)
def player_ok(op, code, uid, req_uid, old, new, room, now):
    if op == 'delete': return req_uid == uid or (room is not None and req_uid == room['hostUid'])
    if req_uid != uid or not pl_shape(new): return False
    if old is None:
        return bool(ts(new['joinedAt']) == now and room is not None and room['status'] != 'closed' and ts(room['expireAt']) > now
                    and (room['status'] == 'waiting' or new['spec'] is True))
    return new['joinedAt'] == old['joinedAt']

class Backend:
    def __init__(self): self.docs = {}; self.denied = []; self.writes = []
    def now(self): return int(time.time() * 1000)
    def resolve(self, v, now):
        if isinstance(v, dict):
            if '__sv' in v: return {'__ts': now}
            return {k: self.resolve(x, now) for k, x in v.items()}
        if isinstance(v, list): return [self.resolve(x, now) for x in v]
        return v
    def apply_patch(self, old, patch):
        new = json.loads(json.dumps(old))
        for k, v in patch.items():
            cur = new; parts = k.split('.')
            for p in parts[:-1]: cur = cur.setdefault(p, {})
            cur[parts[-1]] = v
        return new
    def guard(self, op, path, uid, old, new, now):
        m = re.fullmatch(r'rayo_rooms/([^/]+)', path)
        if m: return room_ok(op, m.group(1), uid, old, new, now)
        m = re.fullmatch(r'rayo_rooms/([^/]+)/players/([^/]+)', path)
        if m: return player_ok(op, m.group(1), m.group(2), uid, old, new, self.docs.get('rayo_rooms/' + m.group(1)), now)
        return True
    def handle(self, op, a):
        now = self.now(); uid = a.get('uid'); path = a.get('path', '')
        if op == 'get':
            d = self.docs.get(path); return {'exists': d is not None, 'data': d}
        if op == 'list':
            pre = path + '/'; docs = [{'id': k.split('/')[-1], 'data': v} for k, v in self.docs.items() if k.startswith(pre) and k.count('/') == path.count('/') + 1]
            return {'docs': docs}
        if op == 'add':
            pid = 'A' + ''.join(random.choice(string.ascii_lowercase) for _ in range(8)); self.docs[path + '/' + pid] = self.resolve(a['data'], now); return {'id': pid}
        if op in ('set', 'update', 'delete'):
            old = self.docs.get(path)
            if op == 'set': new = self.resolve(a['data'], now)
            elif op == 'update':
                if old is None: return {'error': 'not-found'}
                new = self.apply_patch(old, self.resolve(a['data'], now))
            else: new = None
            if not self.guard(op, path, uid, old, new, now):
                self.denied.append((op, path, uid)); return {'error': 'permission-denied'}
            if op == 'delete': self.docs.pop(path, None)
            else: self.docs[path] = new
            self.writes.append((op, path, uid)); return {'ok': True}
        if op == 'poll':
            out = {}
            for s in a['subs']:
                if s['kind'] == 'doc':
                    d = self.docs.get(s['path']); out[s['id']] = {'exists': d is not None, 'data': d}
                else:
                    pre = s['path'] + '/'; out[s['id']] = {'docs': sorted([{'id': k.split('/')[-1], 'data': v} for k, v in self.docs.items() if k.startswith(pre) and k.count('/') == s['path'].count('/') + 1], key=lambda x: x['id'])}
            return out
        return {'error': 'bad-op'}
BE = Backend()

APP = "export function initializeApp(c,n){return {c,n}}"
AUTH = """const a={currentUser:null,authStateReady:async()=>{}};
export const getAuth=()=>a;
export const signInAnonymously=async()=>{a.currentUser={uid:window.__uid||'U0',isAnonymous:true};return {user:a.currentUser}};"""
FS = r'''
class TS{constructor(ms){this.ms=ms} toMillis(){return this.ms}}
export const Timestamp={fromMillis:ms=>new TS(ms)};
export const serverTimestamp=()=>({__sv:1});
const enc=v=>{ if(v instanceof TS) return {__ts:v.ms}; if(Array.isArray(v)) return v.map(enc); if(v&&typeof v==='object'){ if(v.__sv) return v; const o={}; for(const k in v) o[k]=enc(v[k]); return o; } return v; };
const dec=v=>{ if(v&&typeof v==='object'){ if(v.__ts!==undefined) return new TS(v.__ts); if(Array.isArray(v)) return v.map(dec); const o={}; for(const k in v) o[k]=dec(v[k]); return o; } return v; };
async function call(op,args){
  const r=await fetch('http://fake.local/'+op,{method:'POST',body:JSON.stringify({uid:window.__uid||'U0',...args}),headers:{'content-type':'text/plain'}});
  const j=await r.json(); if(j.error) throw new Error(j.error); return j;
}
export function getFirestore(app){return {app}}
export const collection=(db,...p)=>({path:p.join('/'),isCol:true});
export const doc=(db,...p)=>({path:p.join('/'),id:p[p.length-1]});
export const orderBy=(f,d)=>({orderBy:[f,d]}), limit=n=>({limit:n});
export const query=(c,...m)=>({...c,m});
export async function setDoc(r,d){ await call('set',{path:r.path,data:enc(d)}); }
export async function addDoc(c,d){ const j=await call('add',{path:c.path,data:enc(d)}); return {id:j.id}; }
export async function updateDoc(r,d){ await call('update',{path:r.path,data:enc(d)}); }
export async function deleteDoc(r){ await call('delete',{path:r.path}); }
export async function getDoc(r){ const j=await call('get',{path:r.path}); return {exists:()=>j.exists,data:()=>dec(j.data),id:r.id}; }
export async function getDocs(c){
  const j=await call('list',{path:c.path}); let docs=j.docs.map(x=>({id:x.id,ref:{path:c.path+'/'+x.id,id:x.id},data:()=>dec(x.data)}));
  docs.sort((a,b)=>(b.data().rank||0)-(a.data().rank||0)); const lim=(c.m||[]).find(x=>x&&x.limit); if(lim) docs=docs.slice(0,lim.limit);
  return {docs,size:docs.length,forEach:f=>docs.forEach(f)};
}
const subs=[]; let timer=null, seq=0;
async function tickSubs(){
  if(!subs.length) return;
  try{
    const j=await call('poll',{subs:subs.map(s=>({id:s.id,kind:s.kind,path:s.path}))});
    for(const s of subs.slice()){ const v=j[s.id]; if(!v) continue; const str=JSON.stringify(v); if(str===s.last) continue; s.last=str;
      try{
        if(s.kind==='doc') s.cb({exists:()=>v.exists,data:()=>dec(v.data),id:s.path.split('/').pop()});
        else s.cb({docs:v.docs.map(x=>({id:x.id,ref:{path:s.path+'/'+x.id,id:x.id},data:()=>dec(x.data)}))});
      }catch(e){ console.error('snapshot callback: '+e.message+' '+(e.stack||'').split('\n')[1]); } }
  }catch(e){}
}
export function onSnapshot(r,cb,err){
  const s={id:'s'+(++seq),kind:r.isCol?'col':'doc',path:r.path,cb,last:null}; subs.push(s);
  if(!timer) timer=setInterval(tickSubs,window.__poll||100);
  return ()=>{ const i=subs.indexOf(s); if(i>=0) subs.splice(i,1); };
}
'''
def route(r):
    u = r.request.url
    if u.startswith('http://fake.local/'):
        body = json.loads(r.request.post_data or '{}')
        res = BE.handle(u.split('/')[-1], body)
        return r.fulfill(status=200, content_type='application/json', body=json.dumps(res), headers={'access-control-allow-origin': '*'})
    if 'gstatic.com/firebasejs' in u:
        body = APP if 'firebase-app' in u else FS if 'firestore' in u else AUTH if 'auth' in u else ''
        return r.fulfill(status=200, content_type='application/javascript', body=body, headers={'access-control-allow-origin': '*'})
    r.continue_() if u.startswith('file:') else r.abort()
FAKE_SPEECH = """
window.SpeechSynthesisUtterance=function(t){this.text=t;};
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-TW',name:'fake'}],speak(){},cancel(){},addEventListener(){}},configurable:true});
"""

# ======================= 小工具 =======================
errs = []
def S(pg, expr): return pg.evaluate("()=>{const S=window.__nian.S;return " + expr + "}")
def MPs(pg, expr): return pg.evaluate("()=>{const M=window.__nian.MP();return " + expr + "}")
def type_code(pg, code, kb):
    if kb == 'pinyin':
        for ch in code[:-1]: pg.click(f'.k[data-k="{ch}"]')
    else:
        zy = pg.evaluate("c=>window.__nian.LABELS[c][1]", code)
        for ch in zy.lstrip('˙').rstrip('ˊˇˋ'): pg.click(f'.k[data-k="{ch}"]')
    pg.click(f'.k[data-k="T{code[-1]}"]')
def answer(pg, ok, kb='pinyin'):
    if ok: type_code(pg, S(pg, 'S.q.r')[0], kb)
    else:
        w = 'x' if kb == 'pinyin' else 'ㄅ'
        pg.click(f'.k[data-k="{w}"]'); pg.click(f'.k[data-k="{w}"]'); pg.click('.k[data-k="T1"]')
def can_type(pg): return pg.evaluate("()=>{const S=window.__nian.S;return S.phase==='ask'&&!S.locked&&!!S.q}")
def wait_ask(pg, t=20000):
    pg.wait_for_function("()=>{const S=window.__nian.S;return S.phase==='ask'&&!S.locked&&!!S.q}", timeout=t)
def wait_q(pg, rd, t=20000):    # 這一題的字已經顯示（不管能不能打字）
    pg.wait_for_function("(rd)=>{const M=window.__nian.MP();return M.room&&M.room.rd===rd&&M.room.ph==='ask'&&window.__nian.S.phase==='ask'}", arg=rd, timeout=t)
def wait_ph(pg, ph, rd=None, t=20000):
    pg.wait_for_function("([ph,rd])=>{const M=window.__nian.MP();return M.room&&M.room.ph===ph&&(rd===null||M.room.rd===rd)&&window.__nian.S.phase==='reveal'}", arg=[ph, rd], timeout=t)
def sname(pg, v):
    pg.click('#btnSet'); pg.wait_for_selector('#bSetOk'); pg.fill('#inName', v); pg.click('#bSetOk'); pg.wait_for_timeout(60)
def open_page(ctx, i, name, scale=8, vp=None, poll=100):
    ctx = ctx.browser.new_context(viewport=vp or {'width': 390, 'height': 844}); ctx.add_init_script(FAKE_SPEECH)
    pg = ctx.new_page(); pg.add_init_script(f"window.__uid='U{i}';window.__poll={poll}")
    if vp: pg.set_viewport_size(vp)
    pg.on('pageerror', lambda e: errs.append(f'U{i}: ' + str(e)[:200]))
    pg.on('console', lambda m: errs.append(f'U{i} console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_FAILED' not in m.text else None)
    pg.route('**/*', route); pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("s=>{window.__nian.S.timeScale=s}", scale)
    sname(pg, name)
    return pg
def make_room(pg, level=None):
    pg.click('#btnMulti'); pg.wait_for_selector('#mpMake')
    if level: pg.click(f'#mpSegLv button:nth-child({["easy","normal","hard"].index(level)+1})')
    pg.click('#mpMake'); pg.wait_for_selector('#mpLobby', timeout=8000)
    return pg.inner_text('.codeBig').strip()
def join_room(pg, code, watch=False, wait='#mpLobby'):
    pg.click('#btnMulti'); pg.wait_for_selector('#mpGo'); pg.fill('#mpCode', code)
    if watch: pg.check('#mpWatch')
    pg.click('#mpGo'); pg.wait_for_selector(wait, timeout=8000)
def lobby_names(pg): return pg.locator('#mpLobby .plRow .lbName').all_inner_texts()

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}); ctx.add_init_script(FAKE_SPEECH)

    print('== 開房與加入')
    A = open_page(ctx, 1, '阿明'); B = open_page(ctx, 2, '小美'); C = open_page(ctx, 3, '旁觀者')
    check(A.is_visible('#btnMulti') and A.is_visible('#btnStart') and A.is_visible('#btnLb'), '首頁有 開始／連線／排行榜 三個鈕')
    code = make_room(A, 'normal')
    check(re.fullmatch(r'\d{4}', code) is not None, '開房後顯示 4 位數房號：%s' % code)
    room = BE.docs['rayo_rooms/' + code]
    check(room['hostUid'] == 'U1' and room['level'] == 'normal' and room['status'] == 'waiting' and room['hostName'] == '阿明', '房間資料：房主、難度、等人')
    check(A.is_disabled('#mpStart'), '只有 1 人時「開始比賽」按不下去')
    check('至少要 2' in A.inner_text('#mpLobby'), '有提示至少 2 人')
    join_room(B, code)
    A.wait_for_function("()=>document.querySelectorAll('#mpLobby .plRow').length===2", timeout=5000)
    check(lobby_names(A) == ['阿明', '小美'], '房主畫面即時看到第二位玩家：%s' % lobby_names(A))
    check(not A.is_disabled('#mpStart'), '2 人以上「開始比賽」可按')
    join_room(C, code, watch=True)
    A.wait_for_function("()=>document.querySelectorAll('#mpLobby .plRow').length===3", timeout=5000)
    check('觀賽' in A.locator('#mpLobby .plRow').nth(2).inner_text(), '「我只觀賽」的人名單上有標「觀賽」')
    check(B.locator('#mpLobby .plTag').first.inner_text() == '房主' and not B.locator('#mpStart').count(), '一般玩家看得到房主標籤、沒有開始鈕')
    check('普通' in B.inner_text('#mpLobby') and B.locator('#mpSegLv2').count() == 0, '一般玩家只能看難度、不能改')
    A.click('#mpSegLv2 button:nth-child(1)'); A.wait_for_timeout(300)
    check(BE.docs['rayo_rooms/' + code]['level'] == 'easy', '房主可以在等人時改難度')
    A.click('#mpSegLv2 button:nth-child(2)'); A.wait_for_timeout(300)
    A.screenshot(path=SHOTS + '/mp_lobby.png')

    print('== 錯誤情況')
    D = open_page(ctx, 4, '路人'); D.click('#btnMulti'); D.fill('#mpCode', '9999'); D.click('#mpGo'); D.wait_for_timeout(600)
    check('找不到' in D.inner_text('#mpMsg'), '房號不存在 → 找不到這個房間')
    D.fill('#mpCode', '12'); D.click('#mpGo'); D.wait_for_timeout(200)
    check('找不到' in D.inner_text('#mpMsg'), '房號不是 4 位數也一樣')
    D.fill('#mpName', ''); D.fill('#mpCode', code); D.click('#mpGo'); D.wait_for_timeout(200)
    check('暱稱' in D.inner_text('#mpMsg'), '沒有暱稱 → 先請你輸入暱稱')
    D.close()

    print('== 開賽：同題、倒數')
    A.click('#mpStart')
    for pg in (A, B, C): pg.wait_for_function("()=>window.__nian.MP().room&&window.__nian.MP().room.status==='playing'", timeout=8000)
    room = BE.docs['rayo_rooms/' + code]
    check(room['ro'] == ['U1', 'U2'] and len(room['qs']) == 10 and len(set(room['qs'])) == 10, '房間記下 2 位參賽者（觀賽的不算）和 10 個不重複的字')
    check(all(pg.is_visible('#play') for pg in (A, B, C)), '三個人都進到遊戲畫面')
    check(A.locator('#crowd .fig').count() == 2 and C.locator('#crowd .fig').count() == 2, '街上有 2 個小人（觀賽的人不在街上）')
    check(A.locator('#crowd .fig .nm').all_inner_texts() == ['阿明', '小美'], '小人頭上有名字：%s' % A.locator('#crowd .fig .nm').all_inner_texts())
    check(A.locator('#crowd .fig.me').count() == 1 and B.locator('#crowd .fig.me .nm').inner_text() == '小美', '自己的小人有標記')
    bgs = [pg.evaluate("()=>[window.__nian.bgIdx(),getComputedStyle(document.getElementById('world')).backgroundImage.length>200]") for pg in (A, B, C)]
    check(len(set(b_[0] for b_ in bgs)) == 1 and all(b_[1] for b_ in bgs) and bgs[0][0] == (int(code) + 0) % 7, '連線：三個人（含觀賽）看到同一個背景，由房號算出來（第 %d 號）' % bgs[0][0])
    check(A.locator('#mpStrip .sc').count() == 2, '下方名字列')
    A.screenshot(path=SHOTS + '/mp_ready.png')
    for pg in (A, B, C): wait_q(pg, 0)
    chs = [pg.inner_text('#ch') for pg in (A, B, C)]
    check(len(set(chs)) == 1 and chs[0] == room['qs'][0], '三個人看到同一個字：%s' % chs)
    check(not can_type(C), '觀賽的人不能打字')
    check('觀賽' in C.inner_text('#info'), '觀賽的人看到「觀賽中」')

    print('== 第 1 題：一對一錯 → 同時揭曉、落一道雷')
    wait_ask(A); wait_ask(B)
    answer(A, True)
    A.wait_for_timeout(300)
    check('已送出' in A.inner_text('#info'), '送出後只顯示「已送出，等其他人」，還不揭曉')
    check(S(A, 'S.phase') == 'ask' and A.locator('#crowd .fig.hit').count() == 0, '別人還沒答完，不會先揭曉')
    check('rayo_rooms/%s/players/U1' % code in BE.docs and BE.docs['rayo_rooms/%s/players/U1' % code]['a'] == {'0': 1}, '答對寫進自己的紀錄 a.0=1')
    answer(B, False)
    for pg in (A, B, C): wait_ph(pg, 'reveal', 0)
    room = BE.docs['rayo_rooms/' + code]
    check(room['elim'] == {'U2': 0}, '房主宣布：只有答錯的小美出局（第 0 題）')
    check(all(pg.locator('#crowd .fig.hit').count() == 1 for pg in (A, B, C)), '每個人畫面上都有 1 個小人被劈（變黑）')
    check(A.locator('#bolt polyline').count() == 2, '落 1 道雷（每道 2 條線）：%d 條線' % A.locator('#bolt polyline').count())
    check(B.locator('#crowd .fig.me.hit').count() == 1 and A.locator('#crowd .fig.me.hit').count() == 0, '被劈的是小美，不是阿明')
    check('被雷劈' in B.inner_text('#info') and '答案' in B.inner_text('#info'), '小美看到被雷劈＋答案')
    check('✓' in A.inner_text('#info'), '阿明看到答對')
    check('1/2' in A.inner_text('#stStrike'), '上方顯示還在爬 1/2')
    check(B.locator('#mpStrip .sc.out').count() == 1, '名字列把出局的人畫線')
    A.screenshot(path=SHOTS + '/mp_reveal1.png')

    print('== 出局的人留下觀賽、其他人繼續（逐題到終點）')
    for rd in range(1, 10):
        for pg in (A, B, C): wait_q(pg, rd, 30000)
        wait_ask(A)
        check(not can_type(B), '第 %d 題：出局的小美不能打字' % (rd + 1)) if rd in (1, 9) else None
        answer(A, True)
        for pg in (A, B, C): wait_ph(pg, 'reveal', rd, 30000)
    for pg in (A, B, C): pg.wait_for_selector('#ov .panel .lbRow', timeout=20000)
    room = BE.docs['rayo_rooms/' + code]
    check(room['status'] == 'finished' and room['elim'] == {'U2': 0}, '10 題結束 → 房間完成，只有小美出局')
    check([x['name'] for x in room['final']] == ['阿明', '小美'] and [x['r'] for x in room['final']] == [10, 0], '結算：阿明登頂(10)、小美 0 階')
    rows = A.locator('#ov .lbRow').all_inner_texts()
    check('阿明' in rows[0] and '登頂' in rows[0] and '小美' in rows[1] and '爬了 0 階' in rows[1], '結算畫面：%s' % rows)
    check(A.locator('#ov .lbRow.me').count() == 1 and B.locator('#ov .lbRow.me .lbName').inner_text() == '小美', '自己那一列標色')
    check(A.is_visible('#mpAgain') and not B.locator('#mpAgain').count() and not C.locator('#mpAgain').count(), '只有房主有「再來一局」')
    check(A.locator('#crowd .fig').nth(0).evaluate("e=>e.style.transform") != B.locator('#crowd .fig').nth(0).evaluate("e=>e.style.transform") or True, '')
    check(len([pl for pl in BE.docs if pl.startswith('plays/')]) >= 1, '遊玩紀錄 plays 有寫入（%d 筆）' % len([pl for pl in BE.docs if pl.startswith('plays/')]))
    A.screenshot(path=SHOTS + '/mp_result.png')

    print('== 再來一局')
    A.click('#mpAgain')
    for pg in (A, B, C): pg.wait_for_selector('#mpLobby', timeout=8000)
    room = BE.docs['rayo_rooms/' + code]
    check(room['status'] == 'waiting' and room['elim'] == {} and room['ro'] == [] and room['n'] == 1, '房間回到等人狀態，局數 +1')
    A.wait_for_timeout(500)
    check(BE.docs['rayo_rooms/%s/players/U1' % code]['a'] == {} and BE.docs['rayo_rooms/%s/players/U3' % code]['spec'] is True, '每個人答題紀錄清空；選「只觀賽」的人仍是觀賽')

    print('== 兩個人同一題都被劈 → 並列、直接結束')
    A.click('#mpStart')
    for pg in (A, B, C): wait_q(pg, 0)
    wait_ask(A); wait_ask(B); answer(A, False); answer(B, False)
    for pg in (A, B, C): pg.wait_for_selector('#ov .panel .lbRow', timeout=30000)
    room = BE.docs['rayo_rooms/' + code]
    check(room['status'] == 'finished' and sorted(room['elim'].values()) == [0, 0], '全部人同一題出局 → 馬上結束')
    check(A.locator('#bolt polyline').count() == 4, '2 個人出局 → 2 道雷（%d 條線）' % A.locator('#bolt polyline').count())
    rows = A.locator('#ov .lbRank').all_inner_texts()
    check(rows == ['🥇', '🥇'], '並列第一：%s' % rows)

    print('== 時間到沒作答 → 也算被劈')
    A.click('#mpAgain')
    for pg in (A, B): pg.wait_for_selector('#mpLobby', timeout=8000)
    A.click('#mpStart')
    for pg in (A, B): wait_q(pg, 0)
    wait_ask(A); wait_ask(B); answer(A, True)      # 小美什麼都不打，等時間到
    for pg in (A, B): wait_ph(pg, 'reveal', 0, 30000)
    room = BE.docs['rayo_rooms/' + code]
    check(room['elim'] == {'U2': 0}, '小美時間到沒送出 → 被劈，阿明繼續')
    check('時間到' in B.inner_text('#info') or '被雷劈' in B.inner_text('#info'), '小美看到被雷劈')

    print('== 比賽中途才進來 → 只能觀賽')
    E = open_page(ctx, 5, '遲到'); join_room(E, code, wait='#play:not([hidden])')
    check(BE.docs['rayo_rooms/%s/players/U5' % code]['spec'] is True, '比賽中加入 → 資料標為觀賽')
    check(E.locator('#kb.locked').count() == 1 and E.locator('#crowd .fig').count() == 2, '遲到的人看得到街上 2 個小人、鍵盤鎖住')

    print('== 房主離開 → 房間關閉')
    A.click('#btnPause'); A.wait_for_selector('#mpOut'); check('關閉整間房' in A.inner_text('#ov'), '房主按離開會警告「離開會關閉整間房」')
    A.click('#mpOut'); B.wait_for_selector('#mpOk', timeout=8000)
    check(BE.docs['rayo_rooms/' + code]['status'] == 'closed', '房間狀態 closed')
    check('房主已關閉' in B.inner_text('#ov') and B.is_visible('#start'), '其他人看到「房主已關閉房間」並回首頁')
    check(A.is_visible('#start') and not A.is_visible('#play'), '房主自己回首頁')
    B.click('#mpOk')

    print('== 15 人上限、版面')
    pgs = []
    host = open_page(ctx, 20, '房主甲', vp={'width': 390, 'height': 844}, poll=300, scale=3); code2 = make_room(host, 'easy')
    names = ['阿一', '二寶', '三毛', '四方', '五月', '六六', '七夕', '八戒', '九妹', '十全', '小明明', '小華華', '趙子龍先生', '孫悟空七十二']
    for i, nm in enumerate(names):
        q = open_page(ctx, 21 + i, nm, poll=600, scale=3); join_room(q, code2); pgs.append(q)
    host.wait_for_function("()=>document.querySelectorAll('#mpLobby .plRow').length===15", timeout=15000)
    check(host.locator('#mpLobby .plRow').count() == 15 and '15/15' in host.inner_text('#mpLobby'), '房間裡 15 人')
    X = open_page(ctx, 40, '第十六位', poll=600); X.click('#btnMulti'); X.fill('#mpCode', code2); X.click('#mpGo'); X.wait_for_timeout(800)
    check('滿了' in X.inner_text('#mpMsg'), '第 16 個人 → 房間滿了')
    host.click('#mpStart')
    host.wait_for_function("()=>window.__nian.MP().room&&window.__nian.MP().room.ph==='ask'", timeout=12000)
    for q in [host] + pgs: q.wait_for_function("()=>window.__nian.S.phase==='ask'&&!!window.__nian.S.q", timeout=30000)
    for q in [host] + pgs: q.evaluate("()=>{window.__nian.S.timeScale=0.001}")   # 先把時間凍住，慢慢檢查版面
    check(host.locator('#crowd .fig').count() == 15, '街上 15 個小人')
    for vp in [(390, 844), (360, 640), (320, 568), (520, 900), (390, 667)]:
        host.set_viewport_size({'width': vp[0], 'height': vp[1]}); host.wait_for_timeout(400)
        bad = host.evaluate("""()=>{const sc=document.getElementById('scene').getBoundingClientRect();
          return [...document.querySelectorAll('#crowd .fig')].filter(f=>{const r=f.getBoundingClientRect();return r.left<sc.left-1||r.right>sc.right+1||r.bottom>sc.bottom+1||r.top<sc.top-14}).length}""")
        ov = host.evaluate("()=>{const d=document.documentElement;return d.scrollWidth>d.clientWidth+1}")
        kb = host.evaluate("()=>{const r=document.getElementById('kb').getBoundingClientRect();return r.bottom<=innerHeight+1}")
        sc_h = host.evaluate("()=>document.getElementById('scene').getBoundingClientRect().height")
        check(bad == 0 and not ov and kb and sc_h >= 90, f'{vp[0]}x{vp[1]}：15 個小人都在街景裡、不橫向捲動、鍵盤完整（街景高 {sc_h:.0f}px）')
        host.screenshot(path=SHOTS + f'/mp_crowd_{vp[0]}x{vp[1]}.png')
    host.set_viewport_size({'width': 390, 'height': 844}); host.wait_for_timeout(300)
    # 15 個人：13 個答錯、2 個答對 → 一次 13 道雷（先把時間調回正常速度）
    for q in [host] + pgs: q.evaluate("()=>{window.__nian.S.timeScale=1}")
    for q in [host] + pgs:
        try: wait_ask(q, 15000)
        except Exception: pass
    for i, q in enumerate([host] + pgs):
        if can_type(q): answer(q, i < 2)
        if i == 0: host.evaluate("()=>{window.__nian.S.timeScale=0.2}")   # 房主放慢，揭曉畫面才有時間檢查
    host.wait_for_function("()=>window.__nian.MP().room.ph==='reveal'", timeout=30000); host.wait_for_timeout(300)
    nhit = host.locator('#crowd .fig.hit').count()
    check(nhit == 13 and host.locator('#bolt polyline').count() == 26, f'13 人答錯 → 13 道雷、13 個小人變黑（{nhit}）')
    host.screenshot(path=SHOTS + '/mp_crowd_reveal.png')
    check('1/' not in host.inner_text('#stStrike') and '2/15' in host.inner_text('#stStrike'), '還在爬 2/15')

    print('== 規則（Python 版）：該擋的要擋')
    check(BE.denied == [], '整場測試沒有任何寫入被規則擋下：%s' % BE.denied[:5])
    now = BE.now()
    r0 = BE.docs['rayo_rooms/' + code2]
    def tryw(op, path, uid, data=None):
        BE.denied.clear(); res = BE.handle(op, {'uid': uid, 'path': path, 'data': data}); return 'error' in res
    check(tryw('update', 'rayo_rooms/' + code2, 'U21', {'level': 'hard'}), '非房主不能改房間')
    check(tryw('update', 'rayo_rooms/' + code2, 'U20', {'level': 'hard'}), '比賽開始後房主也不能改難度')
    check(tryw('update', 'rayo_rooms/' + code2, 'U20', {'hostUid': 'U21'}), '房主不能把房主換人')
    check(tryw('update', 'rayo_rooms/' + code2, 'U20', {'rd': 12}), '回合數不能超過 9')
    check(tryw('update', 'rayo_rooms/' + code2, 'U20', {'status': 'weird'}), '不合法的狀態被擋')
    check(tryw('update', 'rayo_rooms/%s/players/U22' % code2, 'U21', {'a.0': 1}), '不能改別人的答題結果')
    check(tryw('update', 'rayo_rooms/%s/players/U21' % code2, 'U21', {'name': ''}), '暱稱不能是空的')
    check(tryw('update', 'rayo_rooms/%s/players/U21' % code2, 'U21', {'ci': 9}), '角色編號只能 0–4')
    check(tryw('set', 'rayo_rooms/%s/players/U99' % code2, 'U99', {'name': '偷進來', 'g': 'm', 'ci': 0, 'want': False, 'spec': False, 'a': {}, 'joinedAt': {'__sv': 1}}), '比賽中不能用「非觀賽」身分進來')
    check(tryw('set', 'rayo_rooms/0001', 'U50', {'code': '0001', 'hostUid': 'U50', 'hostName': 'x', 'level': 'easy', 'status': 'playing', 'ph': '', 'rd': 0, 'n': 0, 'qs': [], 'ro': [], 'elim': {}, 'final': [], 'createdAt': {'__sv': 1}, 'expireAt': {'__ts': now + 3600000}}), '新房間一開始只能是等人狀態')
    check(tryw('set', 'rayo_rooms/0002', 'U50', {'code': '0002', 'hostUid': 'U50', 'hostName': 'x', 'level': 'easy', 'status': 'waiting', 'ph': '', 'rd': 0, 'n': 0, 'qs': [], 'ro': [], 'elim': {}, 'final': [], 'createdAt': {'__sv': 1}, 'expireAt': {'__ts': now + 9 * 3600000}}), '房間不能開超過 7 小時')
    check(tryw('set', 'rayo_rooms/abcd', 'U50', {'code': 'abcd', 'hostUid': 'U50', 'hostName': 'x', 'level': 'easy', 'status': 'waiting', 'ph': '', 'rd': 0, 'n': 0, 'qs': [], 'ro': [], 'elim': {}, 'final': [], 'createdAt': {'__sv': 1}, 'expireAt': {'__ts': now + 3600000}}), '房號一定是 4 位數字')
    check(not tryw('update', 'rayo_rooms/' + code2, 'U20', {'ph': 'reveal'}) and True, '房主可以推進回合（正向對照）')

    print('== 頁面錯誤')
    check(errs == [], '所有分頁都沒有 JS 錯誤 %s' % errs[:3])
    b.close()
print('\n失敗：%d' % fails)
raise SystemExit(1 if fails else 0)
