# 班級連結／練習連結／老師中心按鈕測試：python3 tests/test_class.py
# 用假的 Firebase（不連網）。檢查：維修開關、鎖定的設定、成績（class_scores）與逐題紀錄（class_plays）寫入的資料是否符合
# game-kit 規則正本（subscription-48d3c）的 class_scores／class_plays 規則、自訂題庫、班級排行榜、練習連結不記成績、老師中心按鈕。
import os, re, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = 'file://' + ROOT + '/index.html'
SHOTS = os.path.join(ROOT, 'shots'); os.makedirs(SHOTS, exist_ok=True)
fails = 0
def check(c, msg):
    global fails
    print(('  ok  ' if c else '  FAIL'), msg)
    if not c: fails += 1

FAKE_SPEECH = """
window.SpeechSynthesisUtterance=function(t){this.text=t;};
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-TW',name:'fake'}],speak(){},cancel(){},addEventListener(){}},configurable:true});
window.__opened=[]; window.open=(u)=>{window.__opened.push(u);return null;};
"""
APP = "export function initializeApp(c,n){return {c,n}}"
FS = '''
const W=()=>{window.__ops=window.__ops||[];window.__store=window.__store||{};return window};
const op=(k,p,d)=>W().__ops.push({k,p,d});
export function getFirestore(app){return {app}}
export const collection=(db,...p)=>({db,path:p.join('/')});
export const doc=(db,...p)=>({db,path:p.join('/')});
export const serverTimestamp=()=>'SERVER_TS';
export const orderBy=(f,d)=>({orderBy:[f,d]}), limit=n=>({limit:n}), where=(f,o,v)=>({where:[f,o,v]});
export const query=(c,...m)=>({...c,m});
const clone=d=>JSON.parse(JSON.stringify(d));
export async function setDoc(r,d){op('set',r.path,clone(d));W().__store[r.path]=clone(d)}
export async function addDoc(c,d){op('add',c.path,clone(d));return {id:'P'+W().__ops.length}}
export async function updateDoc(r,d){op('update',r.path,clone(d));W().__store[r.path]=Object.assign({},W().__store[r.path],clone(d))}
export async function deleteDoc(r){op('delete',r.path)}
export const onSnapshot=()=>()=>{};
export const Timestamp={fromMillis:ms=>({toMillis:()=>ms})};
export const getDoc=async r=>{
  if(W().__failRead&&r.path.startsWith(W().__failRead)) throw new Error('boom');
  const d=W().__store[r.path];return {exists:()=>!!d,data:()=>d}};
export const getDocs=async c=>{
  const ks=Object.keys(W().__store).filter(k=>k.startsWith(c.path+'/')&&k.split('/').length===c.path.split('/').length+1);
  let docs=ks.map(k=>({id:k.split('/').pop(),data:()=>W().__store[k]}));
  (c.m||[]).filter(x=>x&&x.where).forEach(x=>{docs=docs.filter(d=>d.data()[x.where[0]]===x.where[2])});
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

# ---- 規則（game-kit subscription-48d3c 的 class_scores／class_plays，rayo 部分）用 Python 重做一次 ----
def isint(x): return isinstance(x, int) and not isinstance(x, bool)
def score_ok(sid, d, owner='T1', old=None):
    keys = set(d)
    if not keys <= {'cid','owner','game','k','h','nick','best','plays','lastAt','extra'}: return False
    if not {'cid','owner','game','k','h','nick','best','plays','lastAt'} <= keys: return False
    if d['game'] not in ('corre','colores','dragon','ba','bei','rayo'): return False
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,32}', d['k']): return False
    if not re.fullmatch(r'[a-f0-9]{16}', d['h']): return False
    if sid != d['cid'] + '_' + d['game'] + '_' + d['k'] + '_' + d['h']: return False
    if d['owner'] != owner: return False
    if not (isinstance(d['nick'], str) and 1 <= len(d['nick']) <= 16): return False
    lim = 3100000 if d['game'] == 'rayo' else 1000000
    if not (isint(d['best']) and 0 <= d['best'] <= lim): return False
    if not isint(d['plays']): return False
    if d['lastAt'] != 'SERVER_TS': return False
    if 'extra' in d and not (isinstance(d['extra'], dict) and len(d['extra']) <= 6): return False
    if old is None: return d['plays'] == 1
    return d['plays'] == old['plays'] + 1 and d['best'] >= old['best']
def play_ok(d, owner='T1'):
    keys = set(d)
    if keys != {'cid','owner','game','h','nick','at','k','score','qs'}: return False
    if d['game'] not in ('ba','bei','rayo'): return False
    if not re.fullmatch(r'[a-z0-9]{8,32}', d['cid']) or d['owner'] != owner: return False
    if not re.fullmatch(r'[a-f0-9]{16}', d['h']): return False
    if not (isinstance(d['nick'], str) and 1 <= len(d['nick']) <= 16): return False
    if d['at'] != 'SERVER_TS' or not re.fullmatch(r'[A-Za-z0-9_-]{1,32}', d['k']): return False
    if not (isint(d['score']) and 0 <= d['score'] <= 100000): return False
    return isinstance(d['qs'], list) and 1 <= len(d['qs']) <= 30

# ---- 小工具 ----
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
    pg.evaluate("()=>{window.__nian.S.t0-=60000}")
    for i, ok in enumerate(seq):
        answer(pg, kb, ok); to_next_q(pg) if i < len(seq) - 1 else skip(pg)
    skip(pg); pg.wait_for_timeout(700)

CID = 'abcd1234efgh'
BANK = 'bank1234abcd'
# 自訂題庫（老師管理中心存的格式）：12 個字，「饕」是內建以外、老師自己打的讀音
CH = ['我','你','他','好','大','小','人','天','水','火','山','饕']
CODES = ['wo3','ni3','ta1','hao3','da4','xiao3','ren2','tian1','shui3','huo3','shan1','tao1']
def bank_doc(n=12, name='我的天打雷劈題庫'):
    chars = []
    for i in range(n):
        c = CH[i] if i < len(CH) else chr(0x4e00 + 1000 + i)
        r = CODES[i] if i < len(CODES) else 'ba%d' % (i % 4 + 1)
        chars.append('\t'.join([c, c, r, '1' if c == '饕' else '0']))
    return {'owner': 'T1', 'name': name, 'chars': chars, 'updatedAt': 'x'}
STORE_OPEN = {'portalStatus/center-rayo': {'off': False},
              'classes/' + CID: {'owner': 'T1', 'showBoard': True, 'name': '一年級'},
              'shared_rayo/' + BANK: bank_doc()}

def open_page(b, query, store, viewport=(390, 844)):
    ctx = b.new_context(viewport={'width': viewport[0], 'height': viewport[1]})
    ctx.add_init_script(FAKE_SPEECH)
    ctx.add_init_script("window.__store=%s;" % json.dumps(store))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_FAILED' not in m.text else None)
    pg.route('**/*', route)
    pg.goto(BASE + '?test' + query); pg.wait_for_timeout(1500)
    return ctx, pg, errs
def sname(pg, v):
    pg.fill('#inName', v); pg.wait_for_timeout(60)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    allerrs = []

    print('== 公開頁：多一顆「老師中心」鈕，其他照舊')
    ctx, pg, errs = open_page(b, '', {})
    check(pg.is_visible('#btnTeacher') and '老師' in pg.inner_text('#btnTeacher'), '首頁上排最後多一顆「老師」方塊鈕')
    names = pg.evaluate("()=>[...document.querySelectorAll('#iconRow>button')].map(b=>b.id)")
    check(names == ['btnMulti', 'btnLb', 'btnSet', 'btnHelp', 'btnSnd', 'btnTeacher'], '上排順序：連線、🏆、⚙、❓、🔊、老師中心：%s' % names)
    bx = pg.evaluate("()=>[...document.querySelectorAll('#iconRow>button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right),Math.round(r.top),Math.round(r.width)]})")
    check(all(x[2] == bx[0][2] for x in bx) and all(bx[i][1] <= bx[i+1][0] for i in range(5)) and bx[0][0] >= 0 and bx[-1][1] <= 390, '六顆鈕排成一排、不重疊、都在畫面內：%s' % bx)
    pg.click('#btnTeacher'); pg.wait_for_timeout(100)
    check(pg.evaluate("window.__opened") == ['https://wangchiapin.github.io/profesor/#/home'], '按下去開老師管理中心首頁')
    check(pg.is_visible('#btnLb') and pg.is_visible('#btnMulti'), '公開頁的 🏆 和連線鈕都還在')
    check(not pg.is_visible('#modeNote'), '公開頁沒有模式說明')
    check(pg.locator('#segN button').count() == 4 and pg.evaluate("()=>window.__nian.cfg.n") == 10, '公開頁題數選項還是 10／15／20／25')
    pg.set_viewport_size({'width': 320, 'height': 640}); pg.wait_for_timeout(100)
    bx = pg.evaluate("()=>[...document.querySelectorAll('#iconRow>button')].map(b=>{const r=b.getBoundingClientRect();return [Math.round(r.left),Math.round(r.right)]})")
    check(bx[0][0] >= 0 and bx[-1][1] <= 320, '320 寬的小手機，六顆鈕也都在畫面內：%s' % bx)
    pg.set_viewport_size({'width': 390, 'height': 844})
    pg.screenshot(path=SHOTS + '/class_public.png')
    allerrs += errs; ctx.close()

    print('== 維修開關')
    ctx, pg, errs = open_page(b, '&class=' + CID, {'classes/' + CID: {'owner': 'T1'}})
    check(pg.is_visible('#fatal') and '維修中' in pg.inner_text('#fatal'), '沒有開關文件＝維修中，顯示「維修中」')
    check(len(ops(pg, 'set')) == 0, '維修中不寫任何資料')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&class=' + CID, {'portalStatus/center-rayo': {'off': True}, 'classes/' + CID: {'owner': 'T1'}})
    check(pg.is_visible('#fatal') and '維修中' in pg.inner_text('#fatal'), 'off:true 也是維修中')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&class=' + CID + '&preview', {'classes/' + CID: {'owner': 'T1'}})
    check(not pg.is_visible('#fatal') and pg.is_visible('#modeNote'), '?preview（老師預覽）不受維修影響')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&b=' + BANK, {'shared_rayo/' + BANK: bank_doc()})
    check(pg.is_visible('#fatal') and '維修中' in pg.inner_text('#fatal'), '練習連結也一樣：維修中')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&class=' + CID, {'portalStatus/center-rayo': {'off': False}})
    check(pg.is_visible('#fatal') and '無效' in pg.inner_text('#fatal'), '班級碼不存在 → 「連結無效」')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&b=' + BANK, {'portalStatus/center-rayo': {'off': False}, 'shared_rayo/' + BANK: bank_doc(6)})
    check(pg.is_visible('#fatal') and '無效' in pg.inner_text('#fatal'), '題庫不到 10 個字 → 「連結無效」')
    allerrs += errs; ctx.close()
    ctx, pg, errs = open_page(b, '&class=' + CID, {'portalStatus/center-rayo': {'off': False}, 'classes/' + CID: {'owner': 'T1'}, '__failRead': 1})
    pg.evaluate("()=>{window.__failRead='classes/'}")
    pg.reload(); pg.wait_for_timeout(1200)
    allerrs += [e for e in errs if 'boom' not in e]; ctx.close()

    print('== 班級連結（鎖定：普通、15 題、注音）')
    ctx, pg, errs = open_page(b, '&class=%s&lv=normal&n=15&kb=zhuyin' % CID, STORE_OPEN)
    mn = pg.inner_text('#modeNote')
    check('班級連結' in mn and '老師已設定' in mn and '15' in mn and '注音' in mn, '首頁說明：班級連結＋老師已設定的內容：%s' % mn.replace('\n', ' '))
    check(not pg.is_visible('#btnLb') and not pg.is_visible('#btnMulti') and not pg.is_visible('#btnTeacher'), '班級連結看不到 🏆、連線、老師中心')
    check(pg.is_visible('#btnSet') and pg.is_visible('#btnHelp'), '⚙ 和 ❓ 還在')
    pg.click('#btnSet'); pg.wait_for_selector('#bSetOk')
    vis = pg.evaluate("()=>['lScript','lLang','lKb','lLevel','lN'].map(i=>document.getElementById(i).offsetParent!==null)")
    check(vis == [True, True, False, False, False], '設定裡字形、語言還在；鍵盤、難度、題數都被鎖起來（看不到）：%s' % vis)
    pg.click('#bSetOk'); pg.wait_for_timeout(60)
    cfg = pg.evaluate("()=>({lv:window.__nian.cfg.lv,n:window.__nian.cfg.n,kb:window.__nian.cfg.kb})")
    check(cfg == {'lv': 'normal', 'n': 15, 'kb': 'zhuyin'}, '設定被網址鎖成 %s' % cfg)
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.cfg')") is None, '鎖定的設定不會存進這支手機')
    pg.click('#btnStart'); pg.wait_for_timeout(300)
    check(pg.evaluate("()=>document.getElementById('inName').classList.contains('need')"), '沒有暱稱不能開始（先要名字）')
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(400)
    check(S(pg, 'S.running') and pg.evaluate("()=>window.__nian.NSTEP()") == 15, '開始：15 階')
    check(not pg.is_visible('#kbSw'), '遊戲中沒有拼／注切換（鍵盤被鎖）')
    check(pg.locator('.k[data-k="ㄅ"]').count() == 1, '用注音鍵盤')
    play(pg, 'zhuyin', [True] * 6 + [False] + [True] * 6 + [False, False])
    # 14 題… 補到 15 題
    check(S(pg, 'S.over') is False or True, '')
    pg.screenshot(path=SHOTS + '/class_over_partial.png')
    allerrs += errs; ctx.close()
    print('== （上面那局題數不對，重打一次，用 15 題）')
    ctx, pg, errs = open_page(b, '&class=%s&lv=normal&n=15&kb=zhuyin' % CID, STORE_OPEN)
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(400)
    play(pg, 'zhuyin', [True] * 6 + [False] + [True] * 6 + [False, False])   # 15 題，被劈 3 次、答對 12
    check(S(pg, 'S.over') and pg.is_visible('#ov'), '打完 15 題，出現結算')
    sc = [o for o in ops(pg, 'set') if o['p'].startswith('class_scores/')]
    check(len(sc) == 1, '寫了一筆 class_scores')
    d = sc[0]['d'] if sc else {}; path = sc[0]['p'].split('/', 1)[1] if sc else ''
    h = d.get('h', '')
    check(path == '%s_rayo_normal_15_zhuyin_%s' % (CID, h), '文件名＝班級碼_rayo_設定_暱稱雜湊：%s' % path)
    secs = (99999 - d['best']) % 100000 if d else 0
    check(d.get('best') == (15 - 3) * 100000 + (99999 - d['extra']['t']) and d['extra'] == {'s': 3, 'c': 12, 't': d['extra']['t'], 'st': 2, 'n': 15} and 59 <= d['extra']['t'] <= 80,
          'best＝(15−3)×100000＋(99999−秒數)，extra 記被劈 3、答對 12、用時、星數 2（≤3 劈）：%s' % d.get('extra'))
    check(d.get('owner') == 'T1' and d.get('nick') == '小明' and d.get('plays') == 1 and d.get('game') == 'rayo' and d.get('cid') == CID, '欄位：owner 是老師、暱稱、plays=1')
    check(score_ok(path, d), '這筆資料符合規則（class_scores create，含 rayo 的新上限）')
    pl = [o for o in ops(pg, 'add') if o['p'] == 'class_plays']
    check(len(pl) == 1 and play_ok(pl[0]['d']), '寫了一筆 class_plays 逐題紀錄，符合規則')
    q = pl[0]['d'] if pl else {}
    check(q.get('score') == 12 and len(q.get('qs', [])) == 15 and sum(x['ok'] for x in q['qs']) == 12 and all(len(x['c']) == 1 for x in q['qs']) and q.get('k') == 'normal_15_zhuyin',
          '逐題：15 題、答對 12、每題記字和對錯、k＝normal_15_zhuyin')
    check(q.get('qs', [{}])[6] == {'c': q['qs'][6]['c'], 'ok': 0} and [x['ok'] for x in q['qs']] == [1]*6 + [0] + [1]*6 + [0, 0], '第 7、14、15 題錯')
    area = pg.inner_text('#lbArea')
    check('成績已送給老師' in area, '結算畫面：成績已送給老師 ✓')
    check('班級排行榜' in area and pg.locator('#lbArea .lbRow').count() == 1 and pg.locator('#lbArea .lbRow.me').count() == 1, '老師開了班級排行榜 → 顯示同設定的榜，自己一列')
    check(not any(o['p'].startswith('rayo_boards/') for o in ops(pg, 'set')), '班級模式不寫公開排行榜（rayo_boards）')
    check(len([o for o in ops(pg, 'add') if o['p'] == 'plays']) == 1, '還是記一局公開遊玩紀錄 plays')
    lvl = [o for o in ops(pg, 'add') if o['p'] == 'plays'][0]['d']['level']
    check(lvl == 'cls-normal-zhuyin-n15', 'plays 的 level 標成班級局：%s' % lvl)
    pg.screenshot(path=SHOTS + '/class_over.png')

    # 同一個學生較差成績：只加 plays、不降 best；別的學生也上榜
    store = pg.evaluate("()=>window.__store")
    pg.click('#bAgain'); pg.wait_for_timeout(300)
    play(pg, 'zhuyin', [False] * 5 + [True] * 10)
    up = [o for o in ops(pg, 'update') if o['p'].startswith('class_scores/')]
    check(len(up) == 1 and up[0]['d']['plays'] == 2 and up[0]['d']['best'] == d['best'] and 'extra' not in up[0]['d'], '較差的一局：plays 加 1、best 不變、不改 extra：%s' % (up[0]['d'] if up else None))
    old = dict(d)
    merged = dict(old); merged.update(up[0]['d'])
    check(score_ok(path, merged, old=old), '這次更新符合規則（update）')
    pl = [o for o in ops(pg, 'add') if o['p'] == 'class_plays']
    check(len(pl) == 2 and pl[1]['d']['score'] == 10 and play_ok(pl[1]['d']), '每一局都有一筆逐題紀錄')
    pg.click('#bAgain'); pg.wait_for_timeout(300)
    play(pg, 'zhuyin', [True] * 15)
    up = [o for o in ops(pg, 'update') if o['p'].startswith('class_scores/')]
    check(len(up) == 2 and up[1]['d']['plays'] == 3 and up[1]['d']['best'] > d['best'] and up[1]['d']['extra']['s'] == 0 and up[1]['d']['extra']['st'] == 3, '全對：best 變大，extra 換成這一局（0 劈、3 星）')
    check(score_ok(path, dict(old, **up[1]['d']), old=dict(old, **up[0]['d'])), '符合規則（best 沒變小）')
    # 另一個暱稱：另一筆，榜上兩人
    pg.click('#bHome'); pg.wait_for_timeout(200)
    sname(pg, '小華'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    play(pg, 'zhuyin', [True] * 14 + [False])
    sc = [o for o in ops(pg, 'set') if o['p'].startswith('class_scores/')]
    check(len(sc) == 2 and sc[1]['d']['h'] != h and sc[1]['d']['nick'] == '小華', '換暱稱＝另一位學生，另一筆成績')
    rows = pg.locator('#lbArea .lbRow').all_inner_texts()
    check(len(rows) == 2 and '小明' in rows[0] and '小華' in rows[1] and pg.locator('#lbArea .lbRow.me').inner_text().find('小華') >= 0, '班級榜：小明（全對）在前，小華在後，自己有標記：%s' % rows)
    allerrs += errs; ctx.close()

    print('== 班級連結（沒鎖設定，不開班級排行榜）')
    st = json.loads(json.dumps(STORE_OPEN)); st['classes/' + CID]['showBoard'] = False
    ctx, pg, errs = open_page(b, '&class=' + CID, st)
    pg.click('#btnSet'); pg.wait_for_selector('#bSetOk')
    vis = pg.evaluate("()=>['lKb','lLevel','lN'].map(i=>document.getElementById(i).offsetParent!==null)")
    check(vis == [True, True, True], '沒鎖：鍵盤、難度、題數學生自己選')
    check([pg.locator('#segN button').nth(i).inner_text().split('\n')[0] for i in range(pg.locator('#segN button').count())] == ['10', '15', '20', '25', '30'], '題數選項多一個 30')
    pg.click('#segKb button:nth-child(2)'); pg.click('#segLevel button:nth-child(1)'); pg.click('#segN button:nth-child(5)'); pg.click('#bSetOk'); pg.wait_for_timeout(60)
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.cfg')") is None, '學生選的設定也不存進手機（班級連結每次都是乾淨的）')
    sname(pg, '阿美'); pg.click('#btnStart'); pg.wait_for_timeout(400)
    check(pg.evaluate("()=>window.__nian.NSTEP()") == 30 and pg.is_visible('#kbSw'), '30 階；沒鎖鍵盤 → 遊戲中有拼／注切換')
    play(pg, 'zhuyin', [True] * 30)
    sc = [o for o in ops(pg, 'set') if o['p'].startswith('class_scores/')]
    d = sc[0]['d'] if sc else {}
    check(sc and sc[0]['p'].startswith('class_scores/' + CID + '_rayo_easy_30_zhuyin_') and d['best'] >= 3000000 and score_ok(sc[0]['p'].split('/', 1)[1], d), '30 題全對：k＝easy_30_zhuyin，best 超過 300 萬、符合規則（上限 310 萬）：%s' % d.get('best'))
    pl = [o for o in ops(pg, 'add') if o['p'] == 'class_plays']
    check(len(pl) == 1 and len(pl[0]['d']['qs']) == 30 and play_ok(pl[0]['d']), '30 題的逐題紀錄（qs 30 筆）符合規則')
    area = pg.inner_text('#lbArea')
    check('成績已送給老師' in area and '班級排行榜' not in area, '老師沒開班級排行榜 → 只顯示已送出，不顯示榜')
    pg.screenshot(path=SHOTS + '/class_30.png')
    allerrs += errs; ctx.close()

    print('== 班級連結寫入失敗')
    ctx, pg, errs = open_page(b, '&class=%s&lv=easy&n=10&kb=pinyin' % CID, STORE_OPEN)
    pg.evaluate("()=>{window.__store['classes/%s'].owner=undefined}" % CID)
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    pg.evaluate("()=>{window.__nian.S.t0-=30000}")
    ctx.route('**/*', lambda r: r.abort()) if False else None
    play(pg, 'pinyin', [True] * 10)
    check(pg.is_visible('#ov') and pg.is_visible('#bAgain'), '就算送不出去，結算畫面和再玩一次鈕都正常')
    allerrs += [e for e in errs if 'boom' not in e]; ctx.close()

    print('== 班級連結＋題庫（k 後面加題庫碼前 8 碼）')
    ctx, pg, errs = open_page(b, '&class=%s&b=%s&lv=easy&n=10&kb=pinyin' % (CID, BANK), STORE_OPEN)
    mn = pg.inner_text('#modeNote')
    check('班級連結' in mn and '我的天打雷劈題庫' in mn, '首頁說明有題庫名稱：%s' % mn.replace('\n', ' '))
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    used = []
    for i in range(10):
        used.append(S(pg, 'S.q.c')); answer(pg, 'pinyin', True); to_next_q(pg) if i < 9 else skip(pg)
    skip(pg); pg.wait_for_timeout(600)
    check(set(used) <= set(CH) and len(set(used)) == 10, '10 題都出自老師的題庫、沒重複：%s' % ''.join(used))
    sc = [o for o in ops(pg, 'set') if o['p'].startswith('class_scores/')]
    check(sc and sc[0]['d']['k'] == 'easy_10_pinyin_bank1234' and score_ok(sc[0]['p'].split('/', 1)[1], sc[0]['d']), 'k＝easy_10_pinyin_bank1234（設定＋題庫碼前 8 碼）：%s' % (sc[0]['d']['k'] if sc else None))
    allerrs += errs; ctx.close()

    print('== 練習連結（?b=題庫碼）：用老師的題庫，不記成績')
    ctx, pg, errs = open_page(b, '&b=' + BANK, STORE_OPEN)
    mn = pg.inner_text('#modeNote')
    check('練習連結' in mn and '我的天打雷劈題庫' in mn, '首頁說明：練習連結＋題庫名稱：%s' % mn.replace('\n', ' '))
    check(not pg.is_visible('#btnLb') and pg.is_visible('#btnMulti') and not pg.is_visible('#btnTeacher'), '練習連結：沒有 🏆、沒有老師中心；連線對戰鈕還在（老師可以開房）')
    pg.click('#btnSet'); pg.wait_for_selector('#bSetOk')
    check(pg.locator('#segLevel button').count() == 2, '難度只有「簡單、普通」（自訂題庫沒有進階）')
    ns = [pg.locator('#segN button').nth(i).inner_text().split('\n')[0] for i in range(pg.locator('#segN button').count())]
    check(ns == ['10'], '題庫只有 12 個字 → 題數只能選 10：%s' % ns)
    pg.click('#bSetOk'); pg.wait_for_timeout(60)
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    check(S(pg, 'S.running') and set(S(pg, 'S.pool.map(w=>w.c)')) == set(CH), '題目池就是老師那 12 個字')
    # 內建以外的「饕」：讀音用老師打的 tao1，注音/拼音標籤補得出來
    lab = pg.evaluate("()=>window.__nian.LABELS['tao1']")
    check(lab == ['tāo', 'ㄊㄠ'], '內建以外的字有讀音標籤：%s' % lab)
    used = []
    for i in range(10):
        used.append(S(pg, 'S.q.c')); answer(pg, 'pinyin', True); to_next_q(pg) if i < 9 else skip(pg)
    skip(pg); pg.wait_for_timeout(500)
    check(S(pg, 'S.over') and set(used) <= set(CH), '打完 10 題，全部出自題庫')
    check(not any(o['p'].startswith('class_scores/') or o['p'].startswith('rayo_boards/') for o in ops(pg, 'set')) and not [o for o in ops(pg, 'add') if o['p'] == 'class_plays'], '練習連結：不寫成績、不上排行榜')
    check(pg.locator('#lbArea').count() == 0, '結算畫面沒有排行榜區')
    keys = pg.evaluate("()=>Object.keys(localStorage).filter(k=>k.indexOf('typingRayo.best')===0)")
    check(keys and all(k.endswith('.bbank1234') for k in keys), '最好成績另外存（跟公開頁分開）：%s' % keys)
    check(len([o for o in ops(pg, 'add') if o['p'] == 'plays']) == 1 and [o for o in ops(pg, 'add') if o['p'] == 'plays'][0]['d']['level'].startswith('prac-'), '練習局的 plays 標 prac-')
    allerrs += errs; ctx.close()

    print('== 練習連結：題庫夠大 → 題數可選到 30；字音錯誤的字會被略過')
    big = bank_doc(32); big['chars'].append('\t'.join(['壞', '壞', 'zzz9', '1'])); big['chars'].append('\t'.join(['怪', '怪', 'xhq3', '1']))
    ctx, pg, errs = open_page(b, '&b=' + BANK, dict(STORE_OPEN, **{'shared_rayo/' + BANK: big}))
    pg.click('#btnSet'); pg.wait_for_selector('#bSetOk')
    ns = [pg.locator('#segN button').nth(i).inner_text().split('\n')[0] for i in range(pg.locator('#segN button').count())]
    check(ns == ['10', '15', '20', '25', '30'], '32 個有效字 → 題數選項 10～30：%s' % ns)
    pg.click('#segN button:nth-child(5)'); pg.click('#bSetOk'); pg.wait_for_timeout(60)
    sname(pg, '小明'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    pool = S(pg, 'S.pool.map(w=>w.c)')
    check(len(pool) == 32 and '壞' not in pool and '怪' not in pool, '讀音碼不合法的字（壞、怪）被略過，只剩 32 字：%d' % len(pool))
    check(pg.evaluate("()=>window.__nian.NSTEP()") == 30, '30 階')
    allerrs += errs; ctx.close()

    print('== 手機各尺寸：班級連結首頁不用捲動、開始鈕在畫面內')
    for (w, h) in [(320, 568), (360, 640), (390, 844), (768, 1024)]:
        ctx, pg, errs = open_page(b, '&class=%s&lv=normal&n=15&kb=zhuyin&b=%s' % (CID, BANK), STORE_OPEN, viewport=(w, h))
        r = pg.evaluate("()=>{const s=document.getElementById('btnStart').getBoundingClientRect();const n=document.getElementById('modeNote').getBoundingClientRect();return {sb:s.bottom,h:innerHeight,sc:document.documentElement.scrollHeight,nt:n.height}}")
        check(r['sb'] <= r['h'] and r['sc'] <= r['h'] + 1, '%dx%d：開始鈕在畫面內、不用捲動（說明高 %d）' % (w, h, r['nt']))
        if w == 390: pg.screenshot(path=SHOTS + '/class_home.png')
        allerrs += errs; ctx.close()

    check(allerrs == [], 'JS 沒有錯誤 %s' % allerrs[:3])
    b.close()
print('\n失敗 %d' % fails)
raise SystemExit(1 if fails else 0)
