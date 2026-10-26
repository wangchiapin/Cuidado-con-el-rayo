// 艋舺龍山寺：紅牆、燕尾脊與剪黏屋脊、銅鑄龍柱、石獅、香爐與燈籠
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed } = L;
  reseed(9);
  let s = L.svgOpen(`<linearGradient id="lsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8C969D"/><stop offset=".4" stop-color="#C4C9C6"/><stop offset="1" stop-color="#E6E1D3"/></linearGradient>
<radialGradient id="lglow"><stop offset="0" stop-color="#F3B25C" stop-opacity=".5"/><stop offset="1" stop-color="#F3B25C" stop-opacity="0"/></radialGradient>
<pattern id="ltile" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#B04A36"/><path d="M0 4Q3 .8 6 4" fill="none" stroke="#7F2E20" stroke-width=".7"/></pattern>
<pattern id="lgran" width="16" height="7" patternUnits="userSpaceOnUse"><rect width="16" height="7" fill="#8E897D"/><path d="M0 .3H16M8 0V3.5M0 3.8H16M0 3.5V7" stroke="#6F6A60" stroke-width=".5"/></pattern>`);
  s += `<rect width="480" height="288" fill="url(#lsky)"/>`;
  // 後面的城市大樓（萬華）
  for (let x = -5; x < 480; x += 22 + rnd() * 14) { const h = 30 + rnd() * 40; s += `<rect x="${n1(x)}" y="${n1(100 - h)}" width="${n1(18 + rnd() * 12)}" height="${n1(h + 30)}" fill="${['#B8BDBA', '#A9B0AF', '#C1C4BE'][Math.floor(rnd() * 3)]}"/>`; }
  // 兩側護龍（紅牆 + 瓦屋頂 + 石雕窗）
  const wing = (x0, flip) => {
    const w = 128, X = v => n1(flip ? x0 + w - v : x0 + v);
    let g = `<rect x="${x0}" y="96" width="${w}" height="192" fill="#A8372A"/><rect x="${x0}" y="96" width="${w}" height="6" fill="#7E2A20"/>`;
    g += `<path d="M${X(-6)} 102 L${X(0)} 84 L${X(w - 10)} 84 L${X(w + 6)} 102Z" fill="url(#ltile)" stroke="#6E2418" stroke-width=".7"/><path d="M${X(w + 6)} 102 Q${X(w + 16)} 96 ${X(w + 14)} 86 Q${X(w + 4)} 92 ${X(w - 6)} 92Z" fill="#B04A36" stroke="#6E2418" stroke-width=".6"/>`;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const wx = n1(flip ? x0 + w - 36 - i * 38 : x0 + 12 + i * 38), wy = 118 + j * 54;
      g += `<rect x="${wx}" y="${wy}" width="26" height="34" fill="#7E2A20"/><rect x="${n1(+wx + 2)}" y="${wy + 2}" width="22" height="30" fill="#C9B77E"/><path d="M${n1(+wx + 2)} ${wy + 12}H${n1(+wx + 24)}M${n1(+wx + 2)} ${wy + 22}H${n1(+wx + 24)}M${n1(+wx + 13)} ${wy + 2}V${wy + 32}" stroke="#7E2A20" stroke-width="1.3"/><circle cx="${n1(+wx + 13)}" cy="${wy + 17}" r="4" fill="none" stroke="#7E2A20" stroke-width="1.1"/>`;
    }
    g += `<rect x="${x0}" y="270" width="${w}" height="18" fill="#7E786C"/>`;
    return g;
  };
  s += wing(-8, false) + wing(360, true);
  // 屋簷下的燈籠
  s += [10, 42, 74, 106].map((x, i) => L.lantern(x + 6, 104 + (i % 2) * 3, 1, '#C23B2B', 'lglow')).join('') + [372, 404, 436, 468].map((x, i) => L.lantern(x - 4, 104 + (i % 2) * 3, 1, '#C23B2B', 'lglow')).join('');
  // 三川殿：紅牆、金色屋頂與燕尾脊
  s += '<g transform="translate(0 15)">';
  s += `<rect x="112" y="60" width="256" height="30" fill="#7E786C"/><rect x="118" y="52" width="244" height="12" fill="url(#lgran)"/>`;
  s += `<rect x="130" y="32" width="220" height="34" fill="#B3382B" stroke="#6E1F16" stroke-width=".6"/>`;
  for (let i = 0; i < 3; i++) s += `<rect x="${166 + i * 52}" y="40" width="30" height="26" fill="#5A1A12"/><rect x="${169 + i * 52}" y="43" width="24" height="23" fill="#8F2A1F" stroke="#D9A441" stroke-width=".6"/><circle cx="${181 + i * 52}" cy="54" r="1.4" fill="#D9A441"/>`;
  // 銅鑄龍柱
  for (const x of [150, 204, 276, 330]) s += `<rect x="${x - 4.5}" y="36" width="9" height="30" fill="#6D5A36" stroke="#3E321C" stroke-width=".5"/>` + Array.from({ length: 5 }, (_, k) => `<path d="M${x - 4.5} ${40 + k * 6}Q${x} ${37 + k * 6} ${x + 4.5} ${42 + k * 6}" fill="none" stroke="#A98F53" stroke-width="1.2"/>`).join('') + `<circle cx="${x}" cy="35" r="3.2" fill="#8F7840"/>`;
  // 屋頂：三層，兩端翹起的燕尾脊 + 剪黏
  s += `<path d="M104 36 Q112 30 130 32 L350 32 Q368 30 376 36 Q372 22 356 24 L124 24 Q108 22 104 36Z" fill="url(#ltile)" stroke="#6E2418" stroke-width=".8"/>`;
  s += `<path d="M120 24 Q128 8 150 12 L330 12 Q352 8 360 24Z" fill="#B04A36" stroke="#6E2418" stroke-width=".8"/><path d="M148 12 Q158 -6 190 -2 L290 -2 Q322 -6 332 12Z" fill="url(#ltile)" stroke="#6E2418" stroke-width=".8"/>`;
  s += `<path d="M108 30 Q96 24 94 8 Q104 16 118 22" fill="#2F8F7F" stroke="#1B5E52" stroke-width=".7"/><path d="M372 30 Q384 24 386 8 Q376 16 362 22" fill="#2F8F7F" stroke="#1B5E52" stroke-width=".7"/>`;
  // 屋脊剪黏：龍、寶珠、小人物
  s += `<circle cx="240" cy="-8" r="6" fill="#D9A441" stroke="#8A5A16" stroke-width=".6"/>`;
  const figs = ['#2F8F7F', '#D9A441', '#E8E3D2', '#C23B2B'];
  for (let x = 160; x < 330; x += 9) s += `<rect x="${x}" y="${5 + Math.abs(Math.sin(x)) * -3}" width="4.6" height="7" rx="1.6" fill="${figs[Math.floor(rnd() * 4)]}" stroke="#5A3A1A" stroke-width=".3"/>`;
  for (let x = 134; x < 346; x += 12) s += `<rect x="${x}" y="${19 - Math.abs(Math.cos(x)) * 2}" width="5" height="6" rx="1.4" fill="${figs[Math.floor(rnd() * 4)]}" stroke="#5A3A1A" stroke-width=".3"/>`;
  s += `<path d="M164 8 q10 -10 22 -2 q8 6 18 -4" fill="none" stroke="#2F8F7F" stroke-width="2.4" stroke-linecap="round"/><path d="M276 4 q10 8 20 0 q10 -8 20 2" fill="none" stroke="#D9A441" stroke-width="2.4" stroke-linecap="round"/>`;
  s += L.lantern(160, 62, 1.1, '#C23B2B', 'lglow') + L.lantern(320, 62, 1.1, '#C23B2B', 'lglow') + L.lantern(240, 64, 1.1, '#C23B2B', 'lglow');
  s += '</g>';
  // 花崗岩石階與欄杆
  s += L.stairs({
    top: 82, riser: '#8E897D', riserDark: '#6F6A60', tread: '#C9C4B6', treadHi: '#E2DED1', edge: '#6F6A60', joints: 16, treadJoints: 20,
    postL: '#A8372A', postR: '#A8372A'
  });
  // 石獅（左右兩隻）
  const lion = (x, y, f) => `<rect x="${x - 7}" y="${y}" width="14" height="18" fill="#8E897D" stroke="#5E5A50" stroke-width=".5"/><rect x="${x - 9}" y="${y - 3}" width="18" height="4" fill="#A19C8F" stroke="#5E5A50" stroke-width=".5"/><ellipse cx="${x}" cy="${y - 10}" rx="6" ry="7.5" fill="#A19C8F" stroke="#5E5A50" stroke-width=".5"/><circle cx="${x + f * 1}" cy="${y - 17}" r="5" fill="#A19C8F" stroke="#5E5A50" stroke-width=".5"/><circle cx="${x + f * 3}" cy="${y - 18}" r=".8" fill="#2A2A28"/><path d="M${x + f * 1} ${y - 14}q${f * 3} 2 ${f * 5} 0" stroke="#5E5A50" stroke-width=".7" fill="none"/><circle cx="${x - f * 2}" cy="${y - 11}" r="3" fill="#8E897D"/>`;
  s += lion(140, 232, 1) + lion(340, 232, -1);
  // 香爐與煙
  s += `<path d="M346 190 q6 -10 0 -20 q-6 -10 2 -22" fill="none" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/><path d="M356 192 q-5 -9 1 -18 q6 -9 -1 -20" fill="none" stroke="#fff" stroke-width="2.4" opacity=".3" stroke-linecap="round"/>`;
  s += `<path d="M340 192 h24 l-3 16 h-18Z" fill="#7B6A3A" stroke="#3E321C" stroke-width=".6"/><rect x="338" y="189" width="28" height="4" rx="1.5" fill="#9A8446" stroke="#3E321C" stroke-width=".5"/><path d="M344 208 l-3 8 M360 208 l3 8" stroke="#3E321C" stroke-width="1.6"/><path d="M346 195h16M347 200h14" stroke="#A98F53" stroke-width=".8"/>`;
  return s + '</svg>';
};
