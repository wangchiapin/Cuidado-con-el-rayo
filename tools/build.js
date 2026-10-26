// 組出單檔 index.html：node tools/build.js
// 讀 src/template.html，塞入單字清單、game-kit 共用零件、人物與九份式石階街景（都用程式畫）
const fs = require('fs'), path = require('path');
const GK = process.env.GAMEKIT || '/home/claude/game-kit';
const root = path.join(__dirname, '..');
const rd = f => fs.readFileSync(f, 'utf8');
let html = rd(path.join(root, 'src/template.html'));

const INK = '#3B3B38';
const WV = 480, HV = 288, YB = 272, SPC = 19, CX = 240;   // 整張街景 480x288 單位；第 0 階的位置、每階間距、中線

// ---------------- 人物（男女各 5 個，5 種膚色；髮型、衣服各不同）----------------
const SKINS = ['#F6D7C0', '#EBC09A', '#D2996B', '#A8714A', '#6F4A33'];
const HAIR = { black: '#2E2A27', dbrown: '#4A3426', brown: '#6B4A32', auburn: '#7A4631', blond: '#C9A55A' };
// 髮型：back 畫在身體後面、front 畫在臉上面
function hairParts(style, hc) {
  const f = (d, extra = '') => `<path d="${d}" fill="${hc}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round" ${extra}/>`;
  const c = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hc}" stroke="${INK}" stroke-width=".8"/>`;
  const fringe = 'M16.5 22 Q15 7 30 7 Q45 7 43.5 22 Q38 14.5 30 15 Q22 14.5 16.5 22Z';
  switch (style) {
    case 'crop': return { back: '', front: f(fringe) };
    case 'side': return { back: '', front: f('M15.5 23 Q13 5 30 5.5 Q47 6 44.5 23 Q42 14 35 12.5 Q25 15 15.5 23Z') };
    case 'wavy': return { back: f('M14 20 Q14 6 30 6 Q46 6 46 20 L46.5 35 Q44 39 41 36 L41 26 L19 26 L19 36 Q16 39 13.5 35Z'), front: f(fringe) };
    case 'curly': return { back: '', front: c(30, 8, 9) + c(20, 12, 8) + c(40, 12, 8) + c(15.5, 20, 5.5) + c(44.5, 20, 5.5) };
    case 'buzz': return { back: '', front: f('M17.5 18 Q18 8.5 30 8.5 Q42 8.5 42.5 18 Q38 12.5 30 12.5 Q22 12.5 17.5 18Z') };
    case 'long': return { back: f('M13.5 20 Q13 5 30 5 Q47 5 46.5 20 L47.5 54 Q47.5 58 43 58 L17 58 Q12.5 58 12.5 54Z'), front: f(fringe) };
    case 'pony': return { back: f('M42 15 Q55 16 53 34 Q52 46 46 48 Q49 36 44 27Z'), front: f(fringe) + `<circle cx="43" cy="17" r="2" fill="#B5584A"/>` };
    case 'bun': return { back: c(30, 3, 7), front: f(fringe) };
    case 'bob': return { back: f('M14.5 20 Q14 6 30 6 Q46 6 45.5 20 L46.5 33 Q45 37 41 36 L19 36 Q15 37 13.5 33Z'), front: f('M16 22 Q15 7 30 7 Q45 7 44 22 L41 17 Q30 14.5 19 17Z') };
    case 'bigcurly': return { back: c(14, 22, 8) + c(46, 22, 8) + c(18, 11, 10) + c(42, 11, 10) + c(30, 5, 11), front: c(22, 14, 6) + c(30, 11, 6.5) + c(38, 14, 6) };
  }
}
function charSVG(c) {
  const sk = c.skin, hp = hairParts(c.style, c.hair);
  return `<svg viewBox="0 -6 60 102" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<ellipse cx="30" cy="91.5" rx="15" ry="2.6" fill="#CFC7B2" opacity=".75"/>
${hp.back}
<rect x="18" y="66" width="10" height="23" rx="3" fill="${c.pants}" stroke="${INK}" stroke-width=".9"/><rect x="32" y="66" width="10" height="23" rx="3" fill="${c.pants}" stroke="${INK}" stroke-width=".9"/>
<ellipse cx="23" cy="89.5" rx="6.5" ry="3" fill="${INK}"/><ellipse cx="37" cy="89.5" rx="6.5" ry="3" fill="${INK}"/>
<rect x="10.5" y="49" width="4.5" height="14" rx="2" fill="${sk}" stroke="${INK}" stroke-width=".8"/><circle cx="12.8" cy="65" r="3.6" fill="${sk}" stroke="${INK}" stroke-width=".8"/>
<rect x="45" y="49" width="4.5" height="14" rx="2" fill="${sk}" stroke="${INK}" stroke-width=".8"/><circle cx="47.2" cy="65" r="3.6" fill="${sk}" stroke="${INK}" stroke-width=".8"/>
<rect x="9" y="38" width="7" height="13" rx="3" fill="${c.shirt}" stroke="${INK}" stroke-width=".9"/><rect x="44" y="38" width="7" height="13" rx="3" fill="${c.shirt}" stroke="${INK}" stroke-width=".9"/>
<rect x="15" y="37" width="30" height="31" rx="6" fill="${c.shirt}" stroke="${INK}" stroke-width="1"/>
<ellipse class="soot" cx="30" cy="52" rx="15" ry="16" fill="${INK}" opacity=".28"/>
<rect x="26" y="32" width="8" height="8" fill="${sk}" stroke="${INK}" stroke-width=".8"/>
<circle cx="15.5" cy="24" r="2.6" fill="${sk}" stroke="${INK}" stroke-width=".8"/><circle cx="44.5" cy="24" r="2.6" fill="${sk}" stroke="${INK}" stroke-width=".8"/>
<circle cx="30" cy="22" r="14" fill="${sk}" stroke="${INK}" stroke-width="1"/>
<ellipse class="soot" cx="30" cy="22" rx="14" ry="14" fill="${INK}" opacity=".22"/>
${hp.front}
<g class="en"><circle cx="24" cy="24" r="1.7" fill="${INK}"/><circle cx="36" cy="24" r="1.7" fill="${INK}"/></g>
<g class="ex"><path d="M20.8 20.8 L27.2 27.2 M27.2 20.8 L20.8 27.2 M32.8 20.8 L39.2 27.2 M39.2 20.8 L32.8 27.2" stroke="${INK}" stroke-width="1.9" stroke-linecap="round" fill="none"/></g>
<circle cx="20.5" cy="29" r="2.6" fill="#E8A598" opacity=".35"/><circle cx="39.5" cy="29" r="2.6" fill="#E8A598" opacity=".35"/>
<path class="mn" d="M27 30 Q30 32.6 33 30" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path class="mx" d="M27.5 32 Q30 29.4 32.5 32" stroke="${INK}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
</svg>`;
}
const CHARS = {
  m: [
    { skin: SKINS[0], hair: HAIR.blond, style: 'crop', shirt: '#A9BDB8', pants: '#7B7F86' },
    { skin: SKINS[1], hair: HAIR.black, style: 'side', shirt: '#D8CBB0', pants: '#6A6F73' },
    { skin: SKINS[2], hair: HAIR.brown, style: 'wavy', shirt: '#C98F7C', pants: '#6F7480' },
    { skin: SKINS[3], hair: HAIR.black, style: 'curly', shirt: '#9AA89A', pants: '#76706A' },
    { skin: SKINS[4], hair: HAIR.black, style: 'buzz', shirt: '#E6DFCC', pants: '#5F6670' }
  ].map(charSVG),
  f: [
    { skin: SKINS[0], hair: HAIR.auburn, style: 'long', shirt: '#E2C7C0', pants: '#7B7F86' },
    { skin: SKINS[1], hair: HAIR.black, style: 'pony', shirt: '#A6BAA5', pants: '#6A6F73' },
    { skin: SKINS[2], hair: HAIR.dbrown, style: 'bun', shirt: '#A9B8C9', pants: '#74706A' },
    { skin: SKINS[3], hair: HAIR.black, style: 'bob', shirt: '#D9B96F', pants: '#6F7480' },
    { skin: SKINS[4], hair: HAIR.black, style: 'bigcurly', shirt: '#E6DFCC', pants: '#5F6670' }
  ].map(charSVG)
};

// ---------------- 九份式山城石階街景（畫法在 tools/world.js）----------------
const worldFn = require('./world.js');
const world = idp => worldFn(idp, { INK, WV, HV, YB, SPC });
const CLOUDS = `<svg viewBox="0 0 360 64" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<g fill="#7C8386">${[[30, 10, 30], [88, 4, 34], [150, 12, 30], [212, 2, 36], [276, 10, 32], [338, 4, 34]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
<g fill="#9AA0A0">${[[56, 28, 22], [120, 26, 24], [186, 30, 22], [250, 28, 24], [318, 28, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;
// 7 個背景（九份＋6 個台灣場景），每個都是 480x288 的一張圖，遊戲裡只畫一次、當背景貼著
// 背景存成 bg/ 資料夾裡的圖片檔（檔名帶內容碼，改圖後網址會變，手機不會讀到舊圖）
const SC = { INK, WV, HV, YB, SPC, CX };
const bgSvgs = [world('s')].concat(['xiangshan', 'zhongzheng', 'longshan', 'alishan', 'houtong', 'nightmarket'].map(n => require('./scenes/' + n + '.js')(SC)));
const bgDir = path.join(root, 'bg');
fs.mkdirSync(bgDir, { recursive: true });
fs.readdirSync(bgDir).forEach(f => fs.unlinkSync(path.join(bgDir, f)));
const BGS = bgSvgs.map((svg, i) => {
  const h = require('crypto').createHash('md5').update(svg).digest('hex').slice(0, 6);
  const name = 'bg' + i + '-' + h + '.svg';
  fs.writeFileSync(path.join(bgDir, name), svg);
  return 'bg/' + name;
});

html = html.replace('__BGS__', () => JSON.stringify(BGS)).replace(/<!--CLOUDS-->/g, CLOUDS)
  .replace(/__YB__/g, String(YB)).replace(/__SPC__/g, String(SPC)).replace(/__CX__/g, String(CX)).replace(/__WV__/g, String(WV)).replace(/__HV__/g, String(HV));

// ---- 資料與共用零件 ----
const words = rd(path.join(root, 'data/words.json'));
const GAME = 'rayo';   // 遊戲代號（靜音設定、遊玩紀錄都用這個）
const part = n => rd(path.join(GK, 'parts', n));
html = html.replace('/*__WORDS__*/', () => words)
  .replace('/*__CHARS__*/', () => JSON.stringify(CHARS))
  .replace('/*__SETTINGS__*/', () => part('settings.js'))
  .replace('/*__MULTI__*/', () => rd(path.join(root, 'src/multi.js')))
  .replace('/*__MULTIFB__*/', () => rd(path.join(root, 'src/multi_fb.js')))
  .replace('/*__MUTE__*/', () => part('mute.js').replace(/__GAME__/g, GAME).replace(/__POS__/g, 'right:10px;top:10px').replace(/__MOUNT__/g, ''))
  .replace('/*__COPY__*/', () => part('copyright.js'))
  .replace('/*__VOICEHINT__*/', () => part('voicehint.js'))
  .replace('/*__PLAYS__*/', () => part('plays.js').replace(/REPLACE_GAME_ID/g, GAME));   // 遊玩紀錄（寫到 memorma 的 plays／visits）

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', Math.round(html.length / 1024) + 'KB');
