# 排行榜＋遊玩紀錄測試：python3 tests/test_leaderboard.py
# 用假的 Firebase（不連網），檢查：暱稱、遊玩紀錄 visits／plays、排行榜寫入的資料是否符合 firestore.rules.txt 的 rayo_boards 規則、
# 前 10 名顯示、較差成績不蓋掉最好成績、沒有暱稱時先問暱稱、首頁排行榜三個分頁。
import os, re, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
URL = 'file://' + ROOT + '/index.html?test'
SHOTS = os.path.join(ROOT, 'shots'); os.makedirs(SHOTS, exist_ok=True)
fails = 0
def check(c, msg):
    global fails
    print(('  ok  ' if c else '  FAIL'), msg)
    if not c: fails += 1

FAKE_SPEECH = """
window.__spoken=[];
window.SpeechSynthesisUtterance=function(t){this.text=t;};
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-TW',name:'fake'}],speak:u=>window.__spoken.push(u.text),cancel(){},addEventListener(){}},configurable:true});
"""
# ---- 假 Firebase：記下所有寫入（window.__ops），讀取則從 window.__store 拿 ----
APP = "export function initializeApp(c,n){return {c,n}}"
FS = '''
const W=()=>{window.__ops=window.__ops||[];window.__store=window.__store||{};return window};
const op=(k,p,d)=>W().__ops.push({k,p,d});
export function getFirestore(app){return {app}}
export const collection=(db,...p)=>({db,path:p.join('/')});
export const doc=(db,...p)=>({db,path:p.join('/')});
export const serverTimestamp=()=>'SERVER_TS';
export const orderBy=(f,d)=>({orderBy:[f,d]}), limit=n=>({limit:n});
export const query=(c,...m)=>({...c,m});
export async function setDoc(r,d){op('set',r.path,JSON.parse(JSON.stringify(d)));W().__store[r.path]=d}
export async function addDoc(c,d){op('add',c.path,d);return {id:'P'+W().__ops.length}}
export async function updateDoc(r,d){op('update',r.path,d)}
export async function deleteDoc(r){op('delete',r.path)}
export const onSnapshot=()=>()=>{};
export const Timestamp={fromMillis:ms=>({toMillis:()=>ms})};
export const getDoc=async r=>{const d=W().__store[r.path];return {exists:()=>!!d,data:()=>d}};
export const getDocs=async c=>{
  if(W().__failTop) throw new Error('boom');
  const ks=Object.keys(W().__store).filter(k=>k.startsWith(c.path+'/')&&k.split('/').length===c.path.split('/').length+1);
  let docs=ks.map(k=>({id:k.split('/').pop(),data:()=>W().__store[k]}));
  docs.sort((a,b)=>b.data().rank-a.data().rank);
  const lim=(c.m||[]).find(x=>x&&x.limit); if(lim) docs=docs.slice(0,lim.limit);
  return {docs,size:docs.length,forEach:f=>docs.forEach(f)};
};
'''
AUTH = """const a={currentUser:null,authStateReady:async()=>{}};
export const getAuth=()=>a;
export const signInAnonymously=async()=>{a.currentUser={uid:'UID1',isAnonymous:true};return {user:a.currentUser}};"""
def route(r):
    u = r.request.url
    if 'gstatic.com/firebasejs' in u:
        body = APP if 'firebase-app' in u else FS if 'firestore' in u else AUTH if 'auth' in u else ''
        return r.fulfill(status=200, content_type='application/javascript', body=body, headers={'access-control-allow-origin': '*'})
    r.continue_() if u.startswith('file:') else r.abort()

# ---- 把 firestore.rules.txt 裡 rayo_boards 的規則用 Python 重做一次，檢查送出的資料過不過 ----
def rules_ok(board, uid, data, req_uid='UID1', existing=None):
    def isint(x): return isinstance(x, int) and not isinstance(x, bool)
    keys = set(data)
    if board not in ('easy', 'normal', 'hard'): return False
    if not keys <= {'name', 'strikes', 'secs', 'kb', 'rank', 'updatedAt'}: return False
    if not {'name', 'strikes', 'secs', 'rank', 'updatedAt'} <= keys: return False
    if not (isinstance(data['name'], str) and 1 <= len(data['name']) <= 14): return False
    if not (isint(data['strikes']) and 0 <= data['strikes'] <= 10): return False
    if not (isint(data['secs']) and 15 <= data['secs'] <= 3600): return False
    if 'kb' in keys and data['kb'] not in ('pinyin', 'zhuyin'): return False
    if not (isint(data['rank']) and data['rank'] == (10 - data['strikes']) * 100000 + (99999 - data['secs'])): return False
    if data['updatedAt'] != 'SERVER_TS': return False
    if req_uid != uid: return False
    if existing is not None and data['rank'] < existing['rank']: return False
    return True

def ops(pg, k=None): return [o for o in pg.evaluate("window.__ops||[]") if k is None or o['k'] == k]
def S(pg, expr): return pg.evaluate("()=>{const S=window.__nian.S;return " + expr + "}")
def skip(pg):
    pg.evaluate("()=>{window.__nian.S.phaseT=0}"); pg.wait_for_timeout(130)
def to_next_q(pg): skip(pg); skip(pg)
def type_code(pg, code, kb):
    if kb == 'pinyin':
        for ch in code[:-1]: pg.click(f'.k[data-k="{ch}"]')
    else:
        zy = pg.evaluate("c=>window.__nian.LABELS[c][1]", code)
        for ch in zy.lstrip('˙').rstrip('ˊˇˋ'): pg.click(f'.k[data-k="{ch}"]')
    pg.click(f'.k[data-k="T{code[-1]}"]')
def answer(pg, kb, ok):
    if ok: type_code(pg, S(pg, 'S.q.r')[0], kb)
    else:
        w = 'x' if kb == 'pinyin' else 'ㄅ'
        pg.click(f'.k[data-k="{w}"]'); pg.click(f'.k[data-k="{w}"]'); pg.click('.k[data-k="T1"]')
    pg.wait_for_timeout(60)
def play(pg, kb, seq):
    """打完 10 階（seq＝每題對或錯），停在結算畫面；再把「開始時間」往前推 60 秒，讓用時像真的一局"""
    pg.evaluate("()=>{window.__nian.S.t0-=60000}")
    for i, ok in enumerate(seq):
        answer(pg, kb, ok); to_next_q(pg) if i < 9 else skip(pg)
    skip(pg); pg.wait_for_timeout(500)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.add_init_script(FAKE_SPEECH)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_FAILED' not in m.text else None)
    pg.route('**/*', route)
    pg.goto(URL); pg.wait_for_timeout(3300)

    print('== 遊玩紀錄：訪客')
    check(pg.evaluate("typeof HGPlays") == 'object', '有 HGPlays（遊玩紀錄零件已放進頁面）')
    vis = [o for o in ops(pg, 'set') if o['p'].startswith('visits/')]
    check(len(vis) == 1 and vis[0]['d']['game'] == 'rayo' and vis[0]['d']['uid'] == 'UID1' and vis[0]['p'].endswith('_rayo_UID1'),
          '開啟頁面 → visits 記一筆，遊戲代號 rayo：%s' % (vis[0]['p'] if vis else None))

    print('== 首頁：暱稱與排行榜鈕')
    check(pg.is_visible('#inName') and pg.is_visible('#btnLb') and pg.is_visible('#btnStart'), '首頁有暱稱欄、🏆 排行榜鈕、開始鈕')
    check(pg.evaluate("()=>document.getElementById('lName').innerText").startswith('暱稱'), '暱稱欄標籤')
    pg.fill('#inName', '  小明   ')
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.name')") == '小明', '暱稱存在手機裡（去掉前後空白）')
    pg.fill('#inName', '一二三四五六七八九十甲乙丙丁戊己')
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.name')") == '一二三四五六七八九十甲乙丙丁', '暱稱最多 14 個字')
    pg.fill('#inName', '小明')

    print('== 首頁排行榜：三個難度分頁')
    pg.evaluate("""()=>{window.__store=window.__store||{};
      const mk=(b,u,n,st,se)=>{window.__store['rayo_boards/'+b+'/entries/'+u]={name:n,strikes:st,secs:se,rank:(10-st)*100000+(99999-se),updatedAt:'x'}};
      mk('normal','A','阿美',0,90); mk('normal','B','阿強',1,60); mk('normal','C','小華',0,70);
      for(let i=0;i<11;i++) mk('hard','H'+i,'高手'+i,i%4,100+i);
      mk('easy','E','新手',3,120);}""")
    pg.click('#btnLb'); pg.wait_for_timeout(500)
    check(pg.is_visible('#lbTabs') and pg.locator('#lbTabs button').count() == 3, '排行榜視窗有簡單／普通／進階三個分頁')
    check(pg.locator('#lbTabs button.on').inner_text().startswith('普通'), '預設停在目前選的難度（普通）')
    rows = pg.locator('#lbBody .lbRow').all_inner_texts()
    check(len(rows) == 3 and '小華' in rows[0] and '阿美' in rows[1] and '阿強' in rows[2], '普通榜：被劈少的在前，一樣再比時間（小華 0次1:10 → 阿美 0次1:30 → 阿強 1次）%s' % rows)
    pg.click('#lbTabs button:nth-child(3)'); pg.wait_for_timeout(400)
    check(pg.locator('#lbBody .lbRow').count() == 10, '進階榜有 11 筆資料，只顯示前 10 名')
    pg.click('#lbTabs button:nth-child(1)'); pg.wait_for_timeout(400)
    check(pg.locator('#lbBody .lbRow').count() == 1 and '新手' in pg.inner_text('#lbBody'), '簡單榜')
    pg.screenshot(path=SHOTS + '/lb_home.png')
    pg.click('#bLbBack'); pg.wait_for_timeout(100)
    check(not pg.is_visible('#ov'), '返回後回到首頁')

    print('== 打完一局：遊玩紀錄＋上榜（普通、拼音、被劈 2 次）')
    pg.click('#segKb button:nth-child(1)'); pg.click('#segLevel button:nth-child(2)')
    pg.click('#btnStart'); pg.wait_for_timeout(500)
    add = ops(pg, 'add')
    check(len(add) == 1 and add[0]['p'] == 'plays' and add[0]['d']['game'] == 'rayo' and add[0]['d']['level'] == 'normal-pinyin' and add[0]['d']['name'] == '小明' and add[0]['d']['done'] is False,
          '按開始 → plays 記一局（game=rayo, level=normal-pinyin, 暱稱）：%s' % json.dumps(add[0]['d'], ensure_ascii=False) if add else 'none')
    play(pg, 'pinyin', [True, True, False, True, True, True, False, True, True, True])
    check(pg.is_visible('#ov') and S(pg, 'S.over'), '出現結算畫面')
    upd = ops(pg, 'update')
    check(len(upd) == 1 and upd[0]['d']['done'] == 'True' or (len(upd) == 1 and upd[0]['d']['done'] is True), '結算 → plays 補上結果')
    check(upd and upd[0]['d']['score'] == 8 and upd[0]['d']['name'] == '小明' and 59 <= upd[0]['d']['secs'] <= 75, '結果：score=答對 8、暱稱、用時約 60 秒：%s' % (upd[0]['d'] if upd else None))
    sets = [o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]
    check(len(sets) == 1 and sets[0]['p'] == 'rayo_boards/normal/entries/UID1', '排行榜寫到 rayo_boards/normal/entries/<裝置編號>')
    d = sets[0]['d'] if sets else {}
    check(d.get('name') == '小明' and d.get('strikes') == 2 and d.get('kb') == 'pinyin' and 59 <= d.get('secs', 0) <= 75, '資料：暱稱、被劈 2 次、鍵盤、用時：%s' % d)
    check(rules_ok('normal', 'UID1', d), '這筆資料符合 firestore.rules.txt 的規則（create）')
    check(set(d) <= {'name', 'strikes', 'secs', 'kb', 'rank', 'updatedAt'}, '沒有多餘欄位')
    txt = pg.inner_text('#lbArea')
    check('新紀錄' in txt and '小明' in txt, '結算畫面顯示「新紀錄」和榜單（有小明）')
    check(pg.locator('#lbArea .lbRow.me').count() == 1, '自己那一列有標記')
    check(pg.locator('#lbArea .lbRow').count() == 4, '榜上共 4 人（原本 3 人＋自己）')
    pg.screenshot(path=SHOTS + '/lb_over.png')

    print('== 比較差的成績不會蓋掉最好成績')
    pg.click('#bAgain'); pg.wait_for_timeout(300)
    n_sets = len([o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')])
    play(pg, 'pinyin', [True, False, False, False, True, True, True, True, True, True])   # 被劈 3 次，比 2 次差
    check(len([o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]) == n_sets, '被劈 3 次（比之前差）→ 沒有再寫入')
    check('沒有超過' in pg.inner_text('#lbArea'), '畫面說「沒有超過你的最佳成績」')
    pg.click('#bAgain'); pg.wait_for_timeout(300)
    play(pg, 'pinyin', [True] * 10)
    sets = [o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]
    check(len(sets) == n_sets + 1 and sets[-1]['d']['strikes'] == 0, '全對（0 次）→ 更新成更好的成績')
    check(rules_ok('normal', 'UID1', sets[-1]['d'], existing={'rank': (10 - 2) * 100000 + (99999 - 60)}), '這筆符合規則（update：rank 沒有變小）')
    check('新紀錄' in pg.inner_text('#lbArea'), '畫面顯示新紀錄')
    pg.click('#bHome'); pg.wait_for_timeout(200)

    print('== 簡單難度、注音鍵盤：各自一個榜')
    pg.click('#segKb button:nth-child(2)'); pg.click('#segLevel button:nth-child(1)')
    pg.click('#btnStart'); pg.wait_for_timeout(400)
    play(pg, 'zhuyin', [True] * 9 + [False])
    sets = [o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]
    check(sets[-1]['p'] == 'rayo_boards/easy/entries/UID1' and sets[-1]['d']['kb'] == 'zhuyin' and sets[-1]['d']['strikes'] == 1, '簡單 → easy 榜，kb=zhuyin，被劈 1 次')
    check(rules_ok('easy', 'UID1', sets[-1]['d']), '符合規則')
    check(pg.evaluate("()=>(window.__ops||[]).filter(o=>o.k==='add').length") == 4, '到現在共記了 4 局 plays（3 局普通＋1 局簡單）')
    pg.click('#bHome'); pg.wait_for_timeout(200)

    print('== 沒有暱稱：先看榜、問暱稱，輸入後才上榜')
    pg.evaluate("()=>{localStorage.removeItem('typingRayo.name')}"); pg.reload(); pg.wait_for_timeout(600)
    pg.evaluate("""()=>{window.__store=window.__store||{};   // 重新整理後假資料會清掉，再放一次進階榜的 11 筆
      for(let i=0;i<11;i++) window.__store['rayo_boards/hard/entries/H'+i]={name:'高手'+i,strikes:i%4,secs:100+i,rank:(10-i%4)*100000+(99999-100-i),updatedAt:'x'};}""")
    check(pg.input_value('#inName') == '', '清掉暱稱後，欄位是空的')
    pg.click('#segKb button:nth-child(1)'); pg.click('#segLevel button:nth-child(3)')
    pg.click('#btnStart'); pg.wait_for_timeout(400)
    before = len([o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')])
    play(pg, 'pinyin', [True] * 10)
    check(pg.is_visible('#lbName') and pg.is_visible('#lbGo'), '結算畫面出現暱稱輸入欄和「上榜」鈕')
    check(len([o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]) == before, '沒有暱稱時不會自己上榜')
    check(pg.locator('#lbArea .lbRow').count() == 10, '仍然看得到進階榜前 10 名')
    pg.click('#lbGo'); pg.wait_for_timeout(300)
    check(len([o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]) == before, '暱稱空白按上榜：不送出')
    pg.fill('#lbName', '小美'); pg.click('#lbGo'); pg.wait_for_timeout(600)
    sets = [o for o in ops(pg, 'set') if o['p'].startswith('rayo_boards/')]
    check(len(sets) == before + 1 and sets[-1]['p'] == 'rayo_boards/hard/entries/UID1' and sets[-1]['d']['name'] == '小美' and rules_ok('hard', 'UID1', sets[-1]['d']), '輸入暱稱後上榜（hard 榜），資料符合規則')
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.name')") == '小美', '暱稱也存起來了')
    pg.click('#bHome'); pg.wait_for_timeout(200)
    check(pg.input_value('#inName') == '小美', '回首頁，暱稱欄已有「小美」')

    print('== 讀不到榜單：遊戲照常、顯示提示')
    pg.evaluate("()=>{window.__failTop=true}")
    pg.click('#btnLb'); pg.wait_for_timeout(500)
    check('暫時無法使用' in pg.inner_text('#lbBody'), '排行榜讀取失敗 → 顯示「暫時無法使用」')
    pg.click('#bLbBack')
    pg.click('#btnStart'); pg.wait_for_timeout(300)
    play(pg, 'pinyin', [True] * 10)
    check(S(pg, 'S.over') and pg.is_visible('#ov') and pg.is_visible('#bAgain'), '榜單壞了，結算畫面和「再玩一次」仍可用')
    pg.evaluate("()=>{window.__failTop=false}")

    print('== 簡體＋西文')
    pg.click('#bHome'); pg.wait_for_timeout(200)
    pg.click('#segScript button:nth-child(2)'); pg.click('#segLang button:nth-child(2)'); pg.wait_for_timeout(200)
    check('昵称' in pg.inner_text('#lName') and 'Apodo' in pg.inner_text('#lName'), '暱稱標籤：简体＋西文')
    pg.click('#btnLb'); pg.wait_for_timeout(500)
    t = pg.inner_text('#ov')
    check('排行榜' in t and 'Clasificación' in t and 'Volver' in t, '排行榜視窗：简体＋西文')
    pg.click('#bLbBack')

    print('== 各尺寸：首頁底部的開始鈕和排行榜鈕都在畫面內')
    for w_, h_ in [(320, 568), (360, 640), (375, 667), (390, 844), (768, 1024), (1280, 800)]:
        pg2 = ctx.new_page(); pg2.set_viewport_size({'width': w_, 'height': h_}); pg2.route('**/*', route)
        pg2.goto(URL); pg2.wait_for_timeout(300)
        r = pg2.evaluate("""()=>{const a=document.getElementById('btnStart').getBoundingClientRect(),b=document.getElementById('btnLb').getBoundingClientRect();
          return {a:[a.left,a.right,a.bottom,a.width],b:[b.left,b.right,b.bottom,b.width],w:innerWidth,h:innerHeight,sx:document.documentElement.scrollWidth}}""")
        ok = r['a'][2] <= r['h'] + 1 and r['b'][2] <= r['h'] + 1 and r['a'][1] <= r['b'][0] + 1 and r['b'][1] <= r['w'] + 1 and r['a'][3] > 150 and r['sx'] <= r['w']
        check(ok, f'{w_}x{h_}：開始鈕（寬 {round(r["a"][3])}）和🏆鈕都在畫面內、沒有橫向捲動')
        pg2.close()

    check(errs == [], f'JS 沒有錯誤 {errs}')
    b.close()
print('\n失敗', fails)
raise SystemExit(1 if fails else 0)
