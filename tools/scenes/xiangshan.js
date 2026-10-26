// 台北象山步道：一路往上爬石階，遠方是信義區與台北 101
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed, canopy } = L;
  reseed(21);
  let s = L.svgOpen(`<linearGradient id="xsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E9AA2"/><stop offset=".4" stop-color="#C5CCCA"/><stop offset="1" stop-color="#E6E3D6"/></linearGradient>
<linearGradient id="x101" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7F9C9B"/><stop offset=".5" stop-color="#A9C0BC"/><stop offset="1" stop-color="#7B9795"/></linearGradient>
<linearGradient id="xhaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E2E0D4" stop-opacity="0"/><stop offset="1" stop-color="#E2E0D4" stop-opacity=".8"/></linearGradient>`);
  s += `<rect width="480" height="288" fill="url(#xsky)"/>`;
  // 遠山（台北盆地四周的山）
  s += `<path d="M0 84 Q50 56 110 74 Q170 52 240 70 Q320 48 390 70 Q440 58 480 72 L480 130 L0 130Z" fill="#A5B6B0"/>
<path d="M0 96 Q80 76 160 92 Q250 72 340 90 Q420 78 480 92 L480 130 L0 130Z" fill="#94A9A2"/>`;
  // 信義區的樓群
  for (let x = 40; x < 450; x += 7 + rnd() * 9) {
    const h = 8 + rnd() * 26, w = 5 + rnd() * 8, y = 102 - h;
    s += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h + 8)}" fill="${['#B7C3C2', '#A9B8B9', '#C4CCC8', '#9FB0B3'][Math.floor(rnd() * 4)]}"/>`;
    if (rnd() > .6) s += `<rect x="${n1(x + 1)}" y="${n1(y + 2)}" width="${n1(w - 2)}" height="1.2" fill="#E6EBE6" opacity=".7"/>`;
  }
  // 台北 101：八節竹節造型（每節往上稍微變寬）+ 尖塔
  const bx = 372, by = 108;
  s += `<rect x="${bx - 11}" y="${by - 7}" width="22" height="11" fill="#7F9DA2"/><rect x="${bx - 8}" y="${by - 12}" width="16" height="6" fill="#88A6AA"/>`;
  const sh = 10.6;
  for (let k = 0; k < 8; k++) {
    const yb = by - 12 - k * sh, yt = yb - sh, wb = 5.2, wt = 7.4;
    s += `<path d="M${n1(bx - wb)} ${n1(yb)}L${n1(bx - wt)} ${n1(yt)}L${n1(bx + wt)} ${n1(yt)}L${n1(bx + wb)} ${n1(yb)}Z" fill="#7C9EA5" stroke="#5B7C84" stroke-width=".4"/>
<path d="M${n1(bx - wt + 1.6)} ${n1(yt + 1)}L${n1(bx - wb + 1)} ${n1(yb - 1)}" stroke="#B7D0D3" stroke-width="1.1" opacity=".6"/><path d="M${n1(bx + wt - 1.2)} ${n1(yt + 1)}L${n1(bx + wb - .8)} ${n1(yb - 1)}" stroke="#58777E" stroke-width="1.1" opacity=".6"/>`;
  }
  const ty = by - 12 - 8 * sh;
  s += `<path d="M${bx - 4.5} ${n1(ty + .5)}L${bx - 2.6} ${n1(ty - 9)}L${bx + 2.6} ${n1(ty - 9)}L${bx + 4.5} ${n1(ty + .5)}Z" fill="#88A6AA" stroke="#5B7C84" stroke-width=".4"/><path d="M${bx} ${n1(ty - 9)}V${n1(ty - 24)}" stroke="#5E7A80" stroke-width="1.2"/><circle cx="${bx}" cy="${n1(ty - 24)}" r="1" fill="#C23B2B"/>`;
  s += `<rect x="0" y="70" width="480" height="48" fill="url(#xhaze)"/>`;
  // 左右森林
  const g1 = ['#3E5C3C', '#4B6B45', '#587A4C', '#35523A'];
  s += `<path d="M-10 92 Q70 84 150 112 L150 288 L-10 288Z" fill="#3A573B"/>` + canopy(-10, 150, 92, 288, g1, 11);
  s += `<path d="M330 118 Q420 90 490 98 L490 288 L330 288Z" fill="#3A573B"/>` + canopy(330, 490, 96, 288, g1, 11);
  // 樹幹
  for (const x of [20, 62, 112, 354, 408, 452]) s += `<rect x="${x}" y="${120 + rnd() * 40}" width="4.5" height="${150}" fill="#4B3A2C"/><path d="M${x + 1} 130V288" stroke="#3A2C22" stroke-width=".6"/>`;
  s += canopy(10, 140, 120, 160, ['#4E7149', '#5F8454'], 9) + canopy(340, 470, 126, 166, ['#4E7149', '#5F8454'], 9);
  // 六巨石
  const rock = (x, y, w, h, c) => `<path d="M${x} ${y + h}Q${x - 3} ${y + h * .35} ${x + w * .25} ${y + 1}Q${x + w * .55} ${y - h * .12} ${x + w * .85} ${y + h * .18}Q${x + w + 4} ${y + h * .6} ${x + w} ${y + h}Z" fill="${c}" stroke="#6F6C62" stroke-width=".7"/><path d="M${x + w * .2} ${y + h * .35}Q${x + w * .5} ${y + h * .2} ${x + w * .8} ${y + h * .4}" fill="none" stroke="#BEBBAE" stroke-width="1.6" opacity=".55"/><ellipse cx="${n1(x + w * .3)}" cy="${n1(y + h * .22)}" rx="${n1(w * .22)}" ry="${n1(h * .1)}" fill="#7F9A68" opacity=".7"/>`;
  s += rock(338, 150, 70, 52, '#A9A89C') + rock(392, 188, 52, 40, '#9C9B90') + rock(330, 224, 46, 34, '#B0AFA3');
  // 步道最上面的木造觀景台與欄杆
  s += `<rect x="148" y="70" width="184" height="14" fill="#9A7A5A"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M${148 + i * 16.7} 70V84" stroke="#7A5C42" stroke-width=".6"/>`).join('') + `<rect x="148" y="60" width="184" height="2.4" fill="#8A6A4C"/><rect x="148" y="67" width="184" height="2" fill="#8A6A4C"/>` + Array.from({ length: 20 }, (_, i) => `<rect x="${149 + i * 9.8}" y="58" width="2.2" height="14" fill="#7A5C42"/>`).join('');
  // 石階
  s += L.stairs({
    top: 80, riser: '#9D9A8C', riserDark: '#7C796E', tread: '#D2CEC0', treadHi: '#E8E5D8', edge: '#7B7769', joints: 14, treadJoints: 18,
    postL: '#8D9498', postR: '#8D9498',
    extra: (i, y) => (rnd() > .45 ? `<ellipse cx="${n1(162 + rnd() * 150)}" cy="${y + 4.6}" rx="${n1(5 + rnd() * 8)}" ry="1.3" fill="#7F9A68" opacity=".55"/>` : '')
  });
  // 路邊的蕨類與小灌木
  for (let y = 110; y < 288; y += 36) s += L.bush(146, y + 6, 6, '#4F7A46', '#6E9A5A') + L.bush(334, y + 20, 6, '#4F7A46', '#6E9A5A');
  // 山嵐
  s += L.cloudy(120, 98, 70, .3) + L.cloudy(380, 118, 60, .28);
  return s + '</svg>';
};
