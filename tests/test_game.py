# 打字遊戲（雷劈版）測試：python3 tests/test_game.py   （Playwright + Chromium，file://，擋外部網路，假語音）
import os, sys, json
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
def route(r):
    r.continue_() if r.request.url.startswith('file:') else r.abort()

def type_code(pg, code, kb, tone=True):
    if kb == 'pinyin':
        for ch in code[:-1]: pg.click(f'.k[data-k="{ch}"]')
    else:
        zy = pg.evaluate("c=>window.__nian.LABELS[c][1]", code)
        for ch in zy.rstrip('ˊˇˋ'): pg.click(f'.k[data-k="{ch}"]')
    if tone: pg.click(f'.k[data-k="T{code[-1]}"]')

def S(pg, expr): return pg.evaluate("()=>{const S=window.__nian.S;return " + expr + "}")
def skip(pg):  # 跳過目前的揭曉／移動等待
    pg.evaluate("()=>{window.__nian.S.phaseT=0}"); pg.wait_for_timeout(130)
def to_next_q(pg):
    skip(pg); skip(pg)
def answer(pg, kb, ok):
    r = S(pg, 'S.q.r')
    if ok: type_code(pg, r[0], kb)
    else:
        pg.click('.k[data-k="x"]'); pg.click('.k[data-k="x"]'); pg.click('.k[data-k="T1"]')
    pg.wait_for_timeout(60)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, has_touch=False, device_scale_factor=2)
    ctx.add_init_script(FAKE_SPEECH)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.on('console', lambda m: errs.append('console:' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_FAILED' not in m.text else None)
    pg.route('**/*', route)

    print('== 首頁與選角色')
    pg.goto(URL); pg.wait_for_timeout(500)
    check(pg.is_visible('#start') and not pg.is_visible('#play'), '首頁顯示、遊戲畫面隱藏')
    check('雷' in pg.inner_text('#tTitle'), '標題有「雷」')
    check(pg.locator('#segGender button').count() == 2, '性別兩個選項（男生／女生）')
    check(pg.locator('#segScript button').count() == 2 and pg.locator('#segLang button').count() == 3 and pg.locator('#segKb button').count() == 2 and pg.locator('#segLevel button').count() == 3, '其他選項的按鈕數量')
    check(pg.is_visible('#btnStart'), '開始鈕在首頁可見（不用捲動）')
    chars = pg.evaluate("()=>{const n=s=>{const d=document.createElement('div');d.innerHTML=s;return d.innerHTML};const c=window.__CHARS__;return {m:c.m.map(n),f:c.f.map(n),raw:c}}")
    raw = chars.pop('raw')
    check(len(chars['m']) == 5 and len(chars['f']) == 5 and len(set(raw['m'] + raw['f'])) == 10, '男女各 5 個人物，10 個都不一樣')
    import re
    skins = lambda lst: [re.search(r'<circle cx="30" cy="22" r="14" fill="(#[0-9A-Fa-f]{6})"', s).group(1) for s in lst]
    check(len(set(skins(raw['m']))) == 5 and len(set(skins(raw['f']))) == 5, '男、女各自 5 種不同膚色')
    pg.click('#segGender button:nth-child(1)'); pg.wait_for_timeout(100)
    m_html = pg.inner_html('#heroChar')
    check(m_html in chars['m'], '選男生：首頁預覽是男生人物')
    pg.click('#btnRoll'); pg.wait_for_timeout(100)
    check(pg.inner_html('#heroChar') != m_html and pg.inner_html('#heroChar') in chars['m'], '按骰子：換成另一個男生人物')
    pg.click('#segGender button:nth-child(2)'); pg.wait_for_timeout(100)
    check(pg.inner_html('#heroChar') in chars['f'], '選女生：預覽換成女生人物')
    pg.screenshot(path=SHOTS + '/1_start.png')

    print('== 拼音鍵盤、開局')
    pg.click('#segKb button:nth-child(1)'); pg.click('#segLevel button:nth-child(2)')
    pg.click('#btnStart'); pg.wait_for_timeout(400)
    check(pg.is_visible('#play') and pg.locator('#kb .k').count() == 31, f'拼音鍵盤 31 鍵，實際 {pg.locator("#kb .k").count()}')
    check(S(pg, 'S.step') == 0 and S(pg, 'S.strikes') == 0 and S(pg, 'S.q.c'), '開局：第 0 階、0 次雷劈、有題目')
    check(abs(S(pg, 'S.T') - 10) < .01, '普通難度：10 秒')
    check(pg.inner_html('#player').startswith('<svg') and pg.inner_html('#player') in chars['f'], '遊戲裡的人物就是選的女生人物')
    pg.wait_for_timeout(1200)
    check(S(pg, 'S.tLeft') < 9.2, f'倒數在走（剩 {S(pg,"S.tLeft"):.1f} 秒）')
    check(float(pg.evaluate("()=>document.getElementById('timerBar').style.transform.match(/scaleX\\(([\\d.]+)/)[1]")) < .92, '倒數線在縮短')
    pg.screenshot(path=SHOTS + '/2_play_pinyin.png')

    print('== 輸入規則')
    pg.click('.k[data-k="T2"]'); pg.wait_for_timeout(60)
    check(S(pg, 'S.locked') is False and S(pg, 'S.strikes') == 0, '還沒打字就按聲調鍵：不送出、不算錯')
    pg.click('.k[data-k="a"]'); pg.click('.k[data-k="b"]'); pg.click('.k[data-k="BK"]')
    check(pg.inner_text('#typedTxt') == 'a', '退格鍵有效')
    pg.click('.k[data-k="BK"]')
    r = S(pg, 'S.q.r'); q = S(pg, 'S.q.c')
    y0 = pg.evaluate("()=>document.getElementById('player').getBoundingClientRect().bottom")
    type_code(pg, r[0], 'pinyin', tone=False); pg.wait_for_timeout(100)
    check(S(pg, 'S.phase') == 'ask' and S(pg, 'S.locked') is False, '只打字母、沒按聲調鍵：不會送出（要打聲調）')
    pg.click(f'.k[data-k="T{r[0][-1]}"]'); pg.wait_for_timeout(100)
    check(S(pg, 'S.phase') == 'reveal' and S(pg, 'S.correct') == 1 and S(pg, 'S.strikes') == 0, f'打對 {q} {r[0]}：馬上判定，答對 +1、沒被雷劈')
    check('✓' in pg.inner_text('#info'), '顯示 ✓ 和讀音')
    check(pg.evaluate("()=>document.getElementById('kb').classList.contains('locked')"), '揭曉時鍵盤變淡（鎖住）')
    b0 = S(pg, 'S.buf'); pg.click('.k[data-k="a"]'); check(S(pg, 'S.buf') == b0, '揭曉中按鍵不會有反應')
    check(not pg.evaluate("()=>document.getElementById('player').classList.contains('hit')"), '答對：人物沒有被雷劈')
    skip(pg)
    check(S(pg, 'S.phase') == 'move' and S(pg, 'S.step') == 1, '答對後往上走一階（step=1）')
    pg.wait_for_timeout(900); skip(pg)
    check(S(pg, 'S.phase') == 'ask' and S(pg, 'S.q.c') != q, '走完進入下一題，換新字')
    y1 = pg.evaluate("()=>document.getElementById('player').getBoundingClientRect().bottom")
    check(y1 < y0 - 8, f'人物真的往上走了（腳底 {y0:.0f}px → {y1:.0f}px）')

    print('== 答錯：被雷劈、還是往上走')
    answer(pg, 'pinyin', False); pg.wait_for_timeout(100)
    check(S(pg, 'S.strikes') == 1 and S(pg, 'S.correct') == 1 and S(pg, 'S.phase') == 'reveal', '答錯：被雷劈 1 次、不加分')
    check(pg.evaluate("()=>document.getElementById('player').classList.contains('hit')"), '人物變成被劈的樣子（眼睛 ×、焦黑）')
    check(pg.evaluate("()=>document.getElementById('bolt').classList.contains('on')") and 'polyline' in pg.inner_html('#bolt'), '有畫出閃電')
    check('ans' in pg.inner_html('#info'), '顯示正確讀音：' + pg.inner_text('#info').replace('\n', ' '))
    check('⚡1' in pg.inner_text('#stStrike'), 'HUD 顯示被雷劈 1 次')
    pg.screenshot(path=SHOTS + '/3_strike.png')
    skip(pg); check(S(pg, 'S.step') == 2, '被劈後還是往上走一階（step=2）')
    skip(pg)
    for n_ in range(3):   # 連續被劈：每一次閃電都要重新播放（不是只有第一次）
        answer(pg, 'pinyin', False); pg.wait_for_timeout(80)
        ani = pg.evaluate("()=>{const b=document.getElementById('bolt');return b.getAnimations().map(a=>[a.animationName,a.currentTime])}")
        check(len(ani) == 1 and ani[0][0] == 'bolt' and ani[0][1] < 400, f'連續第 {n_+2} 次被劈：閃電重新播放（{ani}）')
        check(pg.evaluate("()=>document.getElementById('player').classList.contains('hit')") and pg.evaluate("()=>document.getAnimations().some(a=>a.animationName==='fl')"), f'連續第 {n_+2} 次：人物被劈、畫面閃光')
        to_next_q(pg)
    skip(pg) if S(pg, 'S.phase') != 'ask' else None

    print('== 時間到')
    r = S(pg, 'S.q.r')
    type_code(pg, r[0], 'pinyin', tone=False)
    pg.evaluate("()=>{window.__nian.S.tLeft=.05}"); pg.wait_for_timeout(300)
    check(S(pg, 'S.strikes') == 5 and S(pg, 'S.phase') == 'reveal', '打了字母但時間到、沒送出：算錯，被雷劈')
    check('時間到' in pg.inner_text('#info'), '顯示「時間到！」')
    to_next_q(pg)
    r = S(pg, 'S.q.r')
    pg.wait_for_timeout(100)
    pg.evaluate("()=>{window.__nian.S.tLeft=.05}"); pg.wait_for_timeout(300)
    check(S(pg, 'S.strikes') == 6, '完全沒打也是被雷劈')
    to_next_q(pg)

    print('== 暫停')
    pg.click('#btnPause'); pg.wait_for_timeout(50); t0 = S(pg, 'S.tLeft'); pg.wait_for_timeout(1100)
    check(pg.is_visible('#ov') and abs(S(pg, 'S.tLeft') - t0) < .05, '暫停時倒數不動')
    pg.click('#bResume'); pg.wait_for_timeout(500)
    check(S(pg, 'S.tLeft') < t0, '繼續後倒數又在走')

    print('== 多音字與 ü')
    pg.evaluate("()=>{const S=window.__nian.S;S.q=window.__nian.BYCH['行'];S.buf='';S.tLeft=S.T}")
    type_code(pg, 'hang2', 'pinyin'); pg.wait_for_timeout(100)
    check(S(pg, 'S.correct') == 2 and S(pg, 'S.strikes') == 6, '「行」打 háng 也算對')
    to_next_q(pg)
    pg.evaluate("()=>{const S=window.__nian.S;S.q=window.__nian.BYCH['女'];S.buf='';S.tLeft=S.T}")
    for ch in 'nu': pg.click(f'.k[data-k="{ch}"]')
    pg.click('.k[data-k="T3"]'); pg.wait_for_timeout(100)
    check(S(pg, 'S.strikes') == 7, '「女」打 nu3（沒有 ü）算錯')
    to_next_q(pg)
    pg.evaluate("()=>{const S=window.__nian.S;S.q=window.__nian.BYCH['女'];S.buf='';S.tLeft=S.T}")
    pg.click('.k[data-k="n"]'); pg.click('.k[data-k="v"]'); pg.click('.k[data-k="T3"]'); pg.wait_for_timeout(100)
    check(S(pg, 'S.correct') == 3 and 'ü' in pg.inner_text('#typedTxt'), '「女」打 nü3（ü 鍵）算對，輸入列顯示 ü')

    print('== 打完 10 階，結算')
    pg.click('#btnPause'); pg.click('#bHome'); pg.wait_for_timeout(200)
    pg.click('#btnStart'); pg.wait_for_timeout(300)
    seq = [True, True, False, True, True, True, False, True, True, True]   # 2 次被劈
    for i, ok in enumerate(seq):
        check(S(pg, 'S.step') == i, f'第 {i+1} 題開始時在第 {i} 階') if i in (0, 9) else None
        answer(pg, 'pinyin', ok)
        to_next_q(pg) if i < 9 else skip(pg)
    pg.wait_for_timeout(200)
    check(S(pg, 'S.step') == 10 and S(pg, 'S.phase') == 'end', '答完 10 題：站到山頂（step=10）')
    skip(pg); pg.wait_for_timeout(300)
    check(pg.is_visible('#ov') and S(pg, 'S.over'), '出現結算畫面')
    txt = pg.inner_text('#ov')
    check('8/10' in txt and '⚡2' in txt, '結算：答對 8/10、被雷劈 2 次')
    check(pg.locator('#ov .stars').inner_text().count('★') == 3 and pg.evaluate("()=>document.querySelectorAll('#ov .stars .off').length") == 1, '被劈 2 次 → 2 顆星')
    check(pg.locator('#ov .chip').count() == 2, '列出答錯的 2 個字供複習')
    check(pg.evaluate("()=>localStorage.getItem('typingRayo.best.normal.pinyin')") == '2', '最少被劈次數存起來（2）')
    pg.screenshot(path=SHOTS + '/6_over.png')
    pg.click('#bAgain'); pg.wait_for_timeout(300)
    check(S(pg, 'S.step') == 0 and S(pg, 'S.strikes') == 0 and not S(pg, 'S.over') and not pg.is_visible('#ov'), '再玩一次：重新開始')
    # 全對
    for i in range(10):
        answer(pg, 'pinyin', True); to_next_q(pg) if i < 9 else skip(pg)
    skip(pg); pg.wait_for_timeout(300)
    check('★' in pg.inner_text('#ov') and pg.evaluate("()=>document.querySelectorAll('#ov .stars .off').length") == 0, '全對 → 3 顆星')
    check('新紀錄' in pg.inner_text('#ov') and pg.evaluate("()=>localStorage.getItem('typingRayo.best.normal.pinyin')") == '0', '比上次少被劈 → 新紀錄')
    pg.click('#bHome'); pg.wait_for_timeout(200)

    print('== 實體鍵盤')
    check('鍵盤' in pg.inner_text('#tHow') and '1～4' in pg.inner_text('#tHow'), '首頁有「可以用實體鍵盤」的提示')
    pg.click('#segKb button:nth-child(1)'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    check(pg.locator('.k[data-k="T3"]').inner_text().strip() == 'ǎ' and pg.locator('.k[data-k="T1"]').inner_text().strip() == 'ā', '拼音聲調鍵只顯示聲調符號（ā á ǎ à）')
    r = S(pg, 'S.q.r')[0]
    pg.keyboard.type(r[:-1]); pg.wait_for_timeout(50)
    check(pg.inner_text('#typedTxt') == r[:-1].replace('v', 'ü'), '實體鍵盤打字母會進輸入列')
    pg.keyboard.down('Backspace'); pg.keyboard.up('Backspace'); pg.keyboard.type(r[-2]); pg.wait_for_timeout(50)
    check(pg.inner_text('#typedTxt') == r[:-1].replace('v', 'ü'), '實體鍵盤 Backspace 有效')
    pg.keyboard.press('Digit' + r[-1]); pg.wait_for_timeout(100)
    check(S(pg, 'S.phase') == 'reveal' and S(pg, 'S.correct') == 1, '實體鍵盤按數字鍵送出聲調 → 判定正確')
    to_next_q(pg)
    r = S(pg, 'S.q.r')[0]
    # 模擬電腦開著中文輸入法：key 變成 Process，但實體鍵位 code 還在
    pg.evaluate("""c=>{for(const ch of c) document.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',code:'Key'+ch.toUpperCase(),keyCode:229,bubbles:true,cancelable:true}));}""", r[:-1])
    check(pg.inner_text('#typedTxt') == r[:-1].replace('v', 'ü'), '開著中文輸入法（key=Process）也能用實體鍵位打字')
    pg.evaluate("""()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Process',code:'Space',keyCode:229,bubbles:true,cancelable:true}))""")
    pg.wait_for_timeout(100)
    check(S(pg, 'S.phase') == 'reveal', '空白鍵（一聲）送出')
    to_next_q(pg)
    pg.keyboard.down('KeyA'); 
    pg.keyboard.press('KeyA'); pg.wait_for_timeout(30)
    check(pg.evaluate("()=>document.querySelector('#kb .k[data-k=\"a\"]').classList.contains('dn')"), '按實體鍵時，畫面上對應的鍵會亮一下')
    pg.click('#btnPause'); pg.click('#bHome'); pg.wait_for_timeout(200)

    print('== 注音鍵盤')
    pg.click('#segKb button:nth-child(2)'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    n = pg.locator('#kb .k').count()
    check(n == 37 + 1 + 4, f'注音鍵盤：37 符號＋⌫＋4 聲調 = 42，實際 {n}')
    check(pg.locator('.k[data-k="T2"]').inner_text().strip() == 'ˊ' and pg.locator('.k[data-k="T1"]').inner_text().strip() == 'ˉ', '注音聲調鍵只顯示聲調符號（ˉ ˊ ˇ ˋ）')
    r = S(pg, 'S.q.r'); type_code(pg, r[0], 'zhuyin'); pg.wait_for_timeout(100)
    check(S(pg, 'S.correct') == 1 and S(pg, 'S.strikes') == 0, '注音輸入 ' + S(pg, 'S.q.c') + ' 判定正確')
    pg.screenshot(path=SHOTS + '/4_play_zhuyin.png')
    to_next_q(pg)
    pg.click('#kbSw [data-kb="pinyin"]'); pg.wait_for_timeout(100)
    check(pg.locator('#kb .k').count() == 31, '遊戲中可切回拼音鍵盤')
    pg.click('#btnPause'); pg.click('#bHome'); pg.wait_for_timeout(200)

    print('== 難度時間、簡體＋西文')
    pg.click('#segLevel button:nth-child(1)'); pg.click('#btnStart'); pg.wait_for_timeout(300)
    check(abs(S(pg, 'S.T') - 15) < .01, '簡單：15 秒')
    pg.click('#btnPause'); pg.click('#bHome'); pg.wait_for_timeout(200)
    pg.click('#segLevel button:nth-child(3)'); pg.click('#segScript button:nth-child(2)'); pg.click('#segLang button:nth-child(2)')
    check('Cuidado' in pg.inner_text('#tTitle') and '别被雷劈到' in pg.inner_text('#tTitle'), '簡體＋西文標題')
    pg.click('#btnStart'); pg.wait_for_timeout(300)
    check(abs(S(pg, 'S.T') - 10) < .01, '進階：10 秒')
    w = pg.evaluate("()=>{const S=window.__nian.S;const w=S.pool.find(x=>x.s);S.q=w;document.getElementById('ch').textContent=w.s;return w}")
    check(w['c'] != w['s'], '簡體模式出簡體字：' + w['s'])
    pg.evaluate("()=>{window.__nian.S.tLeft=.05}"); pg.wait_for_timeout(300)
    check('时间到' in pg.inner_text('#info') and '¡Se acabó' in pg.inner_text('#info'), '簡體＋西文的提示：' + pg.inner_text('#info').replace('\n', ' '))
    pg.screenshot(path=SHOTS + '/5_simp_es.png')
    check(not errs, 'JS 沒有錯誤 ' + str(errs[:3]))

    print('== 10 階全部看得到')
    pg.click('#btnPause'); pg.click('#bHome'); pg.wait_for_timeout(200); pg.click('#btnStart'); pg.wait_for_timeout(300)
    pos = pg.evaluate("""()=>{const n=window.__nian,S=n.S,sc=document.getElementById('scene').getBoundingClientRect(),pl=document.getElementById('player');
      const out=[];for(let i=0;i<=10;i++){S.step=i;n.placePlayer(false);const r=pl.getBoundingClientRect();out.push([r.top-sc.top,r.bottom-sc.top,r.left-sc.left,r.right-sc.left,sc.height,sc.width]);}return out}""")
    check(all(p_[0] >= 0 and p_[1] <= p_[4] and p_[2] >= 0 and p_[3] <= p_[5] for p_ in pos), '第 0～10 階，人物每一階都完整在場景內')
    check(all(pos[i][1] > pos[i+1][1] + 3 for i in range(10)), '每往上一階，人物都在畫面更高的位置')
    pg.evaluate("()=>{window.__nian.S.step=5;window.__nian.placePlayer(false);window.__nian.S.tLeft=.05}"); pg.wait_for_timeout(300)
    pg.screenshot(path=SHOTS + '/7_mid.png')

    print('== 各尺寸版面')
    for (w_, h_) in [(320, 568), (360, 640), (375, 667), (390, 844), (768, 1024), (1280, 800)]:
        pg2 = ctx.new_page(); pg2.set_viewport_size({'width': w_, 'height': h_}); pg2.route('**/*', route)
        errs2 = []; pg2.on('pageerror', lambda e: errs2.append(str(e)[:200]))
        pg2.goto(URL); pg2.wait_for_timeout(300)
        pg2.evaluate("()=>localStorage.clear()")
        pg2.click('#btnStart'); pg2.wait_for_timeout(500)
        g = pg2.evaluate("""()=>{const r=id=>document.getElementById(id).getBoundingClientRect();
          return {scene:r('scene'),kb:r('kb'),player:r('player'),board:r('board'),typed:r('typed'),hud:r('hud'),ih:innerHeight,iw:innerWidth,sw:document.documentElement.scrollWidth}}""")
        ok = g['kb']['bottom'] <= g['ih'] + 1 and g['scene']['height'] >= 90 and g['player']['top'] >= g['scene']['top'] and g['player']['bottom'] <= g['scene']['bottom'] + 1 and g['sw'] <= g['iw'] + 1
        ok = ok and g['board']['bottom'] <= g['kb']['top'] + 1 and g['typed']['bottom'] <= g['kb']['top'] + 1
        check(ok and not errs2, f'{w_}x{h_}：鍵盤在畫面內、場景高 {g["scene"]["height"]:.0f}px、人物在場景內、沒有橫向捲動')
        allin = pg2.evaluate("""()=>{const n=window.__nian,S=n.S,sc=document.getElementById('scene').getBoundingClientRect(),pl=document.getElementById('player');let ok=true;
          for(let i=0;i<=10;i++){S.step=i;n.placePlayer(false);const r=pl.getBoundingClientRect();if(r.top<sc.top||r.bottom>sc.bottom+1||r.left<sc.left||r.right>sc.right)ok=false;}S.step=0;n.placePlayer(false);return ok}""")
        check(allin, f'{w_}x{h_}：10 階人物都在場景內')
        pg2.evaluate("()=>{window.__nian.S.tLeft=.05}"); pg2.wait_for_timeout(300)
        pg2.screenshot(path=SHOTS + f'/8_{w_}x{h_}.png')
        pg2.close()
    b.close()
print('\n失敗', fails)
sys.exit(1 if fails else 0)
