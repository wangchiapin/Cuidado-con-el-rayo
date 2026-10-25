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
<g class="ex"><path d="M21.6 21.8 L26.4 26.2 M26.4 21.8 L21.6 26.2 M33.6 21.8 L38.4 26.2 M38.4 21.8 L33.6 26.2" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" fill="none"/></g>
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

// ---------------- 九份式山城石階（由下往上，第 0 階在最下面，第 10 階是山頂茶樓）----------------
function world(idp) {
  const lantern = (x, y) => `<line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y}" stroke="${INK}" stroke-width=".5"/>
<circle cx="${x}" cy="${y + 4}" r="8" fill="#E8B96F" opacity=".22"/>
<ellipse cx="${x}" cy="${y + 4.5}" rx="3.4" ry="4.4" fill="#B5584A" stroke="${INK}" stroke-width=".5"/>`;
  const walls = ['#CDBFA8', '#D6CCB6', '#C4B79F', '#D2C6AE'];
  let s = `<svg viewBox="0 0 ${WV} ${HV}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><linearGradient id="${idp}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#96A0A4"/><stop offset=".35" stop-color="#C6CBC4"/><stop offset="1" stop-color="#E4DFCF"/></linearGradient></defs>
<rect width="${WV}" height="${HV}" fill="url(#${idp}sky)"/>
<path d="M0 100 L0 52 Q60 24 120 48 Q190 10 260 44 Q330 16 400 46 Q450 32 480 50 L480 100Z" fill="#B4BAB3"/>
<path d="M0 100 L0 68 Q70 44 140 64 Q220 36 300 62 Q390 40 480 66 L480 100Z" fill="#A3AAA2"/>`;
  // 左右兩排房子
  for (let j = 0, y = 62; y < HV; j++, y += 50) {
    const lit = (a, b2) => ((j + a) % 3 === b2 ? '#EBD4A3' : '#8E979B');
    const win = (x, yy, c) => `<rect x="${x}" y="${yy}" width="17" height="19" fill="${c}" stroke="${INK}" stroke-width=".5"/>`;
    s += `<rect x="0" y="${y}" width="150" height="50" fill="${walls[j % 4]}"/><rect x="0" y="${y}" width="160" height="4" fill="#7B756A"/>
${win(18, y + 14, lit(0, 0))}${win(62, y + 14, lit(1, 1))}${win(106, y + 14, (j % 2 ? '#6B665D' : lit(2, 2)))}
<rect x="330" y="${y}" width="150" height="50" fill="${walls[(j + 2) % 4]}"/><rect x="320" y="${y}" width="160" height="4" fill="#7B756A"/>
${win(350, y + 14, lit(1, 2))}${win(394, y + 14, (j % 2 ? lit(2, 0) : '#6B665D'))}${win(438, y + 14, lit(0, 1))}
${lantern(162, y + 4)}${lantern(318, y + 4)}`;
  }
  // 石階路面
  s += `<rect x="156" y="62" width="168" height="${HV - 62}" fill="#E3DCCB"/>`;
  for (let y = 66; y < HV; y += 6) s += `<line x1="156" x2="324" y1="${y}" y2="${y}" stroke="#DCD5C2" stroke-width=".5"/>`;
  s += `<line x1="156" y1="62" x2="156" y2="${HV}" stroke="#8A8678" stroke-width="1.2"/><line x1="324" y1="62" x2="324" y2="${HV}" stroke="#8A8678" stroke-width="1.2"/>`;
  // 山頂茶樓（第 10 階）
  s += `<rect x="170" y="40" width="140" height="41" fill="#CFC1A8"/>
<path d="M146 46 Q240 8 334 46 L326 54 Q240 24 154 54Z" fill="#6F6A60"/><path d="M178 56 Q240 40 302 56 L298 60 Q240 48 182 60Z" fill="#7B756A"/>
<rect x="220" y="58" width="40" height="23" fill="#4A4540"/><rect x="224" y="61" width="32" height="20" fill="#E8CF9E" opacity=".75"/>
<rect x="222" y="50" width="36" height="7" fill="${INK}"/><path d="M228 53.5 L252 53.5" stroke="#E4CDB8" stroke-width=".7"/>
${lantern(194, 60)}${lantern(286, 60)}`;
  // 每一階的平台
  for (let i = 0; i <= 10; i++) {
    const y = YB - i * SPC;
    s += `<rect x="150" y="${y + 3.5}" width="180" height="3" fill="#B3AA93"/><rect x="150" y="${y - 3.5}" width="180" height="7" rx="1" fill="#F8F4E8" stroke="#8F866F" stroke-width=".6"/>
<rect x="152" y="${y - 11}" width="3" height="14" fill="#8A6F55"/><rect x="325" y="${y - 11}" width="3" height="14" fill="#8A6F55"/>`;
  }
  return s + '</svg>';
}
const CLOUDS = `<svg viewBox="0 0 360 64" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<g fill="#7C8386">${[[30, 10, 30], [88, 4, 34], [150, 12, 30], [212, 2, 36], [276, 10, 32], [338, 4, 34]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
<g fill="#9AA0A0">${[[56, 28, 22], [120, 26, 24], [186, 30, 22], [250, 28, 24], [318, 28, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g></svg>`;
const HERO = world('h');

html = html.replace('<!--WORLD-->', world('w')).replace('<!--HERO-->', HERO).replace(/<!--CLOUDS-->/g, CLOUDS)
  .replace(/__YB__/g, String(YB)).replace(/__SPC__/g, String(SPC)).replace(/__CX__/g, String(CX)).replace(/__WV__/g, String(WV)).replace(/__HV__/g, String(HV));

// ---- 資料與共用零件 ----
const words = rd(path.join(root, 'data/words.json'));
const GAME = 'rayo';   // 遊戲代號（靜音設定用）
const part = n => rd(path.join(GK, 'parts', n));
html = html.replace('/*__WORDS__*/', () => words)
  .replace('/*__CHARS__*/', () => JSON.stringify(CHARS))
  .replace('/*__SETTINGS__*/', () => part('settings.js'))
  .replace('/*__MUTE__*/', () => part('mute.js').replace(/__GAME__/g, GAME).replace(/__POS__/g, 'right:10px;top:10px').replace(/__MOUNT__/g, ''))
  .replace('/*__COPY__*/', () => part('copyright.js'))
  .replace('/*__VOICEHINT__*/', () => part('voicehint.js'))
  .replace('/*__PLAYS__*/', () => '');   // Firebase 遊玩紀錄先不接（之後要接再放回 game-kit 的 plays.js）

fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', Math.round(html.length / 1024) + 'KB');
