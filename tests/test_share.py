# 天打雷劈「分享成績」＋ ?ref=share 來訪追蹤 測試：python3 tests/test_share.py
import os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = 'file://' + ROOT + '/index.html'
fails = 0
def check(c, msg):
    global fails
    print(('  ok  ' if c else '  FAIL'), msg)
    if not c: fails += 1

APP = "export function initializeApp(c,n){return {c,n}}"
FS = '''
const DB=(window.__db=window.__db||{});
const op=(k,p,d)=>(window.__ops=window.__ops||[]).push({k,p,d});
export function getFirestore(app){return {app}}
export const collection=(db,...p)=>({db,path:p.join('/')});
export const doc=(db,...p)=>({db,path:p.join('/')});
export const serverTimestamp=()=>'SERVER_TS';
export async function setDoc(r,d){ op('set',r.path,d); DB[r.path]=JSON.parse(JSON.stringify(d)); }
export async function addDoc(c,d){op('add',c.path,d);return {id:'P'+(window.__ops.length)}}
export async function updateDoc(r,d){op('update',r.path,d)}
export const getDoc=async(r)=>({exists:()=>r.path in DB,data:()=>DB[r.path]});
export const getDocs=async(q)=>({docs:[],size:0,forEach(){}});
export const query=(...a)=>a,where=()=>0,orderBy=()=>0,limit=(n)=>n,onSnapshot=()=>()=>{},deleteDoc=async()=>{},increment=()=>0,runTransaction=async()=>{},writeBatch=()=>({}),Timestamp={now:()=>({}),fromDate:()=>({}),fromMillis:(m)=>({ms:m})},arrayUnion=()=>0,startAfter=()=>0,getCountFromServer=async()=>({data:()=>({count:0})}),documentId=()=>'id',enableIndexedDbPersistence=async()=>{};
'''
AUTH = """const a={currentUser:null,authStateReady:async()=>{}};
export const getAuth=()=>a,GoogleAuthProvider=class{};
export const signInAnonymously=async()=>{a.currentUser={uid:(window.__uid||'UID1'),isAnonymous:true};return {user:a.currentUser}};
export const onAuthStateChanged=(x,cb)=>{setTimeout(()=>cb(a.currentUser),0);return()=>{}};
export const signInWithPopup=async()=>{},signOut=async()=>{},signInWithCredential=async()=>{},setPersistence=async()=>{},browserLocalPersistence={};"""
def route(r):
    u = r.request.url
    if u.startswith('file:'): return r.continue_()
    if 'gstatic.com/firebasejs' in u:
        body = APP if 'firebase-app' in u else FS if 'firestore' in u else AUTH if 'auth' in u else ''
        return r.fulfill(status=200, content_type='application/javascript', body=body)
    r.abort()

STUB = """(()=>{ window.__shared=[]; window.__copied=[]; window.__mode='share'; window.__shareDelay=0;
  Object.defineProperty(navigator,'share',{configurable:true,get(){ return (window.__mode==='copy'||window.__mode==='fail') ? undefined : async d=>{ window.__shared.push(d);
    if(window.__mode==='abort'){ const e=new Error('x'); e.name='AbortError'; throw e; }
    if(window.__mode==='boom'){ throw new Error('boom'); }
    if(window.__shareDelay) await new Promise(r=>setTimeout(r,window.__shareDelay)); } }});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{ writeText: async t=>{ if(window.__mode==='fail') throw new Error('no'); window.__copied.push(t); } }});
  document.execCommand=()=>false;
  window.SpeechSynthesisUtterance=function(t){this.text=t;};
  Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'zh-TW',name:'fake'}],speak(){},cancel(){},addEventListener(){}},configurable:true});
  try{ localStorage.setItem('typingRayo.name','阿寶'); }catch(e){}
})();"""

URL_SHARE = 'https://wangchiapin.github.io/Cuidado-con-el-rayo/?ref=share'

def open_page(p, query='?test', settings=None):
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.add_init_script(STUB)
    if settings:
        for k, v in settings.items():
            pass
        ctx.add_init_script("try{localStorage.setItem('hanziGames.settings',%s)}catch(e){}" % json.dumps(json.dumps(settings)))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
    ctx.route('**/*', route)
    pg.goto(BASE + query); pg.wait_for_timeout(1500)
    return b, pg, errs

def finish_with(pg, correct, strikes):
    pg.click('#btnStart'); pg.wait_for_timeout(400)
    pg.evaluate("([c,s])=>{ const n=window.__nian; n.S.correct=c; n.S.strikes=s; n.finish(); }", [correct, strikes]); pg.wait_for_timeout(400)

with sync_playwright() as p:
    # 1) 單人結算：西文
    b, pg, errs = open_page(p, settings={'lang': 'es', 'script': 'trad'})
    finish_with(pg, 8, 2)
    check(pg.is_visible('#ov') and pg.is_visible('#bShare'), '結算畫面有分享鈕')
    txt = pg.inner_text('#bShare')
    check('分享成績' in txt and 'Compartir resultado' in txt, '鈕上有「分享成績」與西文小字：%r' % txt)
    ids = pg.evaluate("[...document.querySelectorAll('#ov .btns button')].map(b=>b.id)")
    check(ids == ['bAgain', 'bShare', 'bHome'], '順序：再玩一次、分享、主選單：%s' % ids)
    check(pg.evaluate("document.getElementById('bShare').classList.contains('btn-restart')") is False, '不用 .btn-restart')
    check(pg.evaluate("getComputedStyle(document.getElementById('bShare')).borderTopWidth") == '2px', '空心外框 2px')
    check(pg.evaluate("getComputedStyle(document.getElementById('bShare')).backgroundColor") == 'rgb(255, 255, 255)', '白底')
    pg.click('#bShare'); pg.wait_for_timeout(300)
    sh = pg.evaluate("window.__shared")
    check(len(sh) == 1 and sh[0]['url'] == URL_SHARE, '分享網址是公開頁＋?ref=share：%s' % [s.get('url') for s in sh])
    check('8/10' in sh[0]['text'] and '2 rayos' in sh[0]['text'], '西文句子含 8/10 與 2 rayos：%s' % sh[0]['text'])
    check('天打雷劈' in sh[0]['title'], '標題含中文遊戲名：%s' % sh[0]['title'])
    check(pg.inner_text('#bShare') == txt, '分享成功後按鈕文字不變')
    pg.evaluate("window.__mode='abort'"); pg.click('#bShare'); pg.wait_for_timeout(300)
    check('複製失敗' not in pg.inner_text('#bShare') and '已複製' not in pg.inner_text('#bShare') and pg.evaluate("window.__copied.length") == 0, '玩家關掉選單：不顯示失敗、不複製')
    pg.evaluate("window.__mode='boom'"); pg.click('#bShare'); pg.wait_for_timeout(300)
    check(pg.evaluate("window.__copied.length") == 1 and URL_SHARE in pg.evaluate("window.__copied[0]"), '分享出錯：改複製（含連結）')
    check('已複製' in pg.inner_text('#bShare') and 'Copiado' in pg.inner_text('#bShare'), '顯示「已複製 Copiado」')
    pg.wait_for_timeout(2500)
    check(pg.inner_text('#bShare') == txt, '2.2 秒後文字還原')
    pg.evaluate("window.__mode='copy'; window.__copied.length=0"); pg.click('#bShare'); pg.wait_for_timeout(300)
    check(pg.evaluate("window.__copied.length") == 1, '不支援分享選單：複製')
    pg.wait_for_timeout(2500)
    pg.evaluate("window.__mode='fail'"); pg.click('#bShare'); pg.wait_for_timeout(300)
    check('複製失敗' in pg.inner_text('#bShare') and 'No se pudo copiar' in pg.inner_text('#bShare'), '複製也失敗：顯示「複製失敗」')
    pg.wait_for_timeout(2500)
    pg.evaluate("window.__mode='share'; window.__shared.length=0; window.__shareDelay=600")
    pg.evaluate("for(let i=0;i<3;i++) document.getElementById('bShare').click()"); pg.wait_for_timeout(900)
    check(pg.evaluate("window.__shared.length") == 1, '連點三下只送一次：%d' % pg.evaluate("window.__shared.length"))
    check(not errs, '沒有網頁錯誤 %s' % errs)
    b.close()

    # 2) 英文、全對
    b, pg, errs = open_page(p, settings={'lang': 'en', 'script': 'trad'})
    finish_with(pg, 10, 0)
    pg.click('#bShare'); pg.wait_for_timeout(300)
    t = pg.evaluate("window.__shared[0].text")
    check('everything right' in t and 'once' in t, '英文全對句子：%s' % t)
    check('Share result' in pg.inner_text('#bShare'), '英文小字 Share result')
    b.close()
    b, pg, errs = open_page(p, settings={'lang': 'en', 'script': 'trad'})
    finish_with(pg, 6, 4)
    pg.click('#bShare'); pg.wait_for_timeout(300)
    t = pg.evaluate("window.__shared[0].text")
    check('6/10' in t and '4 times' in t, '英文句子：%s' % t)
    b.close()

    # 3) 簡體（只有中文）
    b, pg, errs = open_page(p, settings={'lang': 'zh', 'script': 'simp'})
    finish_with(pg, 8, 2)
    check('分享成绩' in pg.inner_text('#bShare'), '簡體鈕：分享成绩：%r' % pg.inner_text('#bShare'))
    pg.click('#bShare'); pg.wait_for_timeout(300)
    t = pg.evaluate("window.__shared[0].text")
    check('答对' in t and '雷劈' in t and '答對' not in t, '簡體句子：%s' % t)
    pg.evaluate("window.__mode='boom'"); pg.click('#bShare'); pg.wait_for_timeout(300)
    check('已复制' in pg.inner_text('#bShare'), '簡體：已复制：%r' % pg.inner_text('#bShare'))
    b.close()
    # 繁體只有中文
    b, pg, errs = open_page(p, settings={'lang': 'zh', 'script': 'trad'})
    finish_with(pg, 8, 2)
    pg.click('#bShare'); pg.wait_for_timeout(300)
    t = pg.evaluate("window.__shared[0].text")
    check('答對 8/10 題，被雷劈 2 次' in t, '繁體句子：%s' % t)
    b.close()

    # 4) 答對 0 題不顯示
    b, pg, errs = open_page(p, settings={'lang': 'es', 'script': 'trad'})
    finish_with(pg, 0, 10)
    check(pg.is_visible('#ov') and pg.locator('#bShare').count() == 0, '答對 0 題：沒有分享鈕')
    b.close()

    # 5) 連線結算
    b, pg, errs = open_page(p, settings={'lang': 'es', 'script': 'trad'})
    def mp(pg, r_mine, uid='ME', inroster=True):
        pg.evaluate("""([r,uid,ir])=>{ const n=window.__nian, M=n.MP(); M.uid=uid; M.host=false; M.on=true;
          M.room={n:1,status:'finished',ro:ir?[uid,'X']:['X'],final:ir?[{uid:uid,name:'阿寶',r:r},{uid:'X',name:'小明',r:3}]:[{uid:'X',name:'小明',r:3}],elim:{},cid:''}; n.mpResults(); }""", [r_mine, uid, inroster]); pg.wait_for_timeout(300)
    mp(pg, 7)
    check(pg.is_visible('#mpShare'), '連線結算：爬了 7 階 → 有分享鈕')
    ids = pg.evaluate("[...document.querySelectorAll('#ov .btns button')].map(b=>b.id)")
    check(ids.index('mpShare') < ids.index('mpLeaveBtn'), '分享在離開之前：%s' % ids)
    pg.click('#mpShare'); pg.wait_for_timeout(300)
    t = pg.evaluate("window.__shared[0]")
    check('7/10' in t['text'] and t['url'] == URL_SHARE and 'multijugador' in t['text'], '連線句子：%s' % t['text'])
    mp(pg, 10)
    pg.evaluate("window.__shared.length=0"); pg.click('#mpShare'); pg.wait_for_timeout(300)
    check('cima' in pg.evaluate("window.__shared[0].text"), '登頂句子：%s' % pg.evaluate("window.__shared[0].text"))
    mp(pg, 0)
    check(pg.locator('#mpShare').count() == 0, '連線結算：0 階不顯示')
    mp(pg, 5, inroster=False)
    check(pg.locator('#mpShare').count() == 0, '連線結算：不在名單（觀賽）不顯示')
    check(not errs, '沒有網頁錯誤 %s' % errs)
    b.close()

    # 6) ?ref=share 追蹤
    def ops(pg): return pg.evaluate("window.__ops||[]")
    b, pg, errs = open_page(p, query='?test&ref=share', settings={'lang': 'es', 'script': 'trad'})
    pg.wait_for_timeout(1500)
    v = [o for o in ops(pg) if o['p'].startswith('visits/')]
    check(len(v) == 1 and v[0]['d'].get('ref') == 'share', '打開 ?ref=share：visit 帶 ref=share：%s' % [o['d'] for o in v])
    pg.click('#btnStart'); pg.wait_for_timeout(1200)
    pl = [o for o in ops(pg) if o['p'] == 'plays']
    check(len(pl) >= 1 and pl[0]['d'].get('ref') == 'share', '開始玩：play 帶 ref=share：%s' % [o['d'] for o in pl])
    b.close()
    b, pg, errs = open_page(p, settings={'lang': 'es', 'script': 'trad'})
    pg.wait_for_timeout(1500)
    v = [o for o in ops(pg) if o['p'].startswith('visits/')]
    check(len(v) == 1 and 'ref' not in v[0]['d'], '沒帶 ref：visit 沒有 ref 欄位')
    b.close()
    for bad, want in [('&ref=SHARE', 'share'), ('&ref=a%20b', None), ('&ref=' + 'x' * 17, None), ('&ref=%3Cb%3E', None)]:
        b, pg, errs = open_page(p, query='?test' + bad, settings={'lang': 'es', 'script': 'trad'})
        pg.wait_for_timeout(1500)
        v = [o for o in ops(pg) if o['p'].startswith('visits/')]
        check(len(v) == 1 and v[0]['d'].get('ref') == want, '記號 %s → %s：%s' % (bad, want, [o['d'].get('ref') for o in v]))
        b.close()

print('FAILS', fails); sys.exit(1 if fails else 0)
