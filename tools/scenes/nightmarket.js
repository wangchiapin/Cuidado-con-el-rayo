// 夜市天橋：傍晚的夜市入口，爬人行天橋的樓梯；兩旁是攤販、招牌、小燈泡、機車，後面是老公寓
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed } = L;
  reseed(17);
  let s = L.svgOpen(`<linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F3552"/><stop offset=".45" stop-color="#5C5A7C"/><stop offset="1" stop-color="#C58F82"/></linearGradient>
<radialGradient id="nglow"><stop offset="0" stop-color="#FFD47A" stop-opacity=".75"/><stop offset="1" stop-color="#FFD47A" stop-opacity="0"/></radialGradient>
<radialGradient id="npink"><stop offset="0" stop-color="#FF6FA8" stop-opacity=".6"/><stop offset="1" stop-color="#FF6FA8" stop-opacity="0"/></radialGradient>`);
  s += `<rect width="480" height="288" fill="url(#nsky)"/>`;
  // 後面的老公寓：鐵窗、冷氣、水塔、頂樓違建
  const flat = (x, y, w, h, c) => {
    let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/><rect x="${x}" y="${y}" width="${w}" height="3" fill="#3A3A44"/>`;
    for (let r = 0; r < Math.floor((h - 6) / 14); r++) for (let k = 0; k < Math.floor((w - 4) / 14); k++) {
      const wx = x + 4 + k * 14, wy = y + 7 + r * 14, lit = rnd() > .45;
      g += `<rect x="${wx}" y="${wy}" width="9" height="9" fill="${lit ? '#F3D488' : '#3C4252'}"/><path d="M${wx} ${wy + 3}h9M${wx} ${wy + 6}h9M${wx + 3} ${wy}v9M${wx + 6} ${wy}v9" stroke="#2A2D38" stroke-width=".5"/>`;
      if (rnd() > .8) g += `<rect x="${wx + 10}" y="${wy + 4}" width="3" height="5" fill="#B9BDC2"/>`;
    }
    if (rnd() > .4) g += `<rect x="${x + 6}" y="${y - 9}" width="10" height="9" fill="#4F5566"/><path d="M${x + 5} ${y - 9}h12l-6 -4Z" fill="#5E6478"/>`;
    return g;
  };
  let x = -8;
  while (x < 488) { const w = 42 + rnd() * 26, h = 70 + rnd() * 60; s += flat(n1(x), n1(150 - h), n1(w), n1(h + 60), ['#6A6A78', '#76707C', '#5F6372', '#7C7684'][Math.floor(rnd() * 4)]); x += w + 2; }
  // 天空的霞光
  s += `<ellipse cx="240" cy="130" rx="260" ry="40" fill="#F0B79A" opacity=".18"/>`;
  // 兩側攤販
  const stall = (x0, y0, w, h, col, sign, glow, flipTxt) => {
    let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#3A3640"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#E9B76A" opacity=".18"/>`;
    // 遮雨棚（紅白條）
    for (let i = 0; i < Math.floor(w / 8); i++) g += `<path d="M${x0 + i * 8} ${y0 - 2}h8l2 10h-12Z" fill="${i % 2 ? '#F1ECDD' : col}"/>`;
    g += `<rect x="${x0 - 1}" y="${y0 - 5}" width="${w + 2}" height="4" fill="#2E2A27"/>`;
    // 招牌
    g += `<circle cx="${x0 + w / 2}" cy="${y0 + 16}" r="22" fill="url(#${glow})"/><rect x="${n1(x0 + 3)}" y="${y0 + 11}" width="${w - 6}" height="11" rx="1.5" fill="#241F2B" stroke="${glow === 'npink' ? '#FF8AB8' : '#FFE08A'}" stroke-width=".9"/>` + L.text(x0 + w / 2, y0 + 19.6, 8, sign, glow === 'npink' ? '#FFB5D2' : '#FFE9A8');
    // 桌上的食物與燈泡
    g += `<rect x="${x0 + 3}" y="${y0 + h - 18}" width="${w - 6}" height="14" fill="#B58A5A" stroke="#5E4330" stroke-width=".5"/>` + Array.from({ length: Math.floor((w - 8) / 9) }, (_, i) => `<ellipse cx="${n1(x0 + 8 + i * 9)}" cy="${y0 + h - 21}" rx="3.4" ry="2.6" fill="${['#D98A3D', '#C9A36B', '#B5584A'][i % 3]}"/>`).join('');
    g += Array.from({ length: Math.floor(w / 9) }, (_, i) => `<circle cx="${n1(x0 + 4 + i * 9)}" cy="${y0 + 28}" r="1.7" fill="#FFE08A"/><circle cx="${n1(x0 + 4 + i * 9)}" cy="${y0 + 28}" r="5" fill="url(#nglow)" opacity=".7"/>`).join('');
    return g;
  };
  s += stall(2, 96, 54, 70, '#C23B2B', '滷味', 'nglow') + stall(58, 118, 58, 70, '#3F6DB0', '鹽酥雞', 'npink') + stall(8, 190, 52, 70, '#3F6DB0', '蚵仔煎', 'nglow') + stall(64, 206, 62, 82, '#C23B2B', '珍奶', 'npink');
  s += stall(424, 96, 54, 70, '#3F6DB0', '烤玉米', 'npink') + stall(364, 118, 58, 70, '#C23B2B', '胡椒餅', 'nglow') + stall(420, 190, 56, 70, '#C23B2B', '豆花', 'nglow') + stall(354, 206, 62, 82, '#3F6DB0', '涼麵', 'npink');
  // 機車（停在階梯旁）
  const scooter = (x, y, f, col) => `<g transform="translate(${x} ${y}) scale(${f} 1)"><circle cx="-11" cy="0" r="4.6" fill="#1F1D1A"/><circle cx="12" cy="0" r="4.6" fill="#1F1D1A"/><circle cx="-11" cy="0" r="1.8" fill="#8F8C82"/><circle cx="12" cy="0" r="1.8" fill="#8F8C82"/><path d="M-14 -2 Q-12 -12 -2 -10 L5 -10 Q10 -10 12 -2 L10 -2 Q6 -6 -2 -6 L-9 -3Z" fill="${col}" stroke="#1F1D1A" stroke-width=".5"/><path d="M-14 -11 Q-6 -15 4 -11 L2 -9 L-12 -9Z" fill="#2A2825"/><path d="M10 -3 L12 -16 L16 -16" fill="none" stroke="#2A2825" stroke-width="1.4"/><circle cx="16" cy="-14" r="2.4" fill="#FFE08A"/></g>`;
  s += scooter(138, 258, 1.2, '#C23B2B') + scooter(346, 276, -1.2, '#3F6DB0');
  // 一串串小燈泡拉過天空
  const garland = (x1, y1, x2, y2, sag) => { let g = `<path d="M${x1} ${y1}Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + sag} ${x2} ${y2}" fill="none" stroke="#1F1D1A" stroke-width=".6"/>`; for (let i = 1; i < 14; i++) { const t = i / 14, gx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2, gy = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * ((y1 + y2) / 2 + sag) + t * t * y2; g += `<circle cx="${n1(gx)}" cy="${n1(gy + 2)}" r="4.5" fill="url(#nglow)"/><circle cx="${n1(gx)}" cy="${n1(gy + 2)}" r="1.5" fill="#FFF0B8"/>`; } return g; };
  s += garland(0, 70, 150, 86, 14) + garland(480, 76, 330, 90, 14);
  // 天橋橫梁與「夜市」大招牌（階梯盡頭）
  s += `<rect x="96" y="52" width="288" height="12" fill="#6F6C64"/><rect x="96" y="64" width="288" height="4" fill="#3E3B36"/><rect x="146" y="68" width="8" height="16" fill="#6F6C64"/><rect x="326" y="68" width="8" height="16" fill="#6F6C64"/>`;
  s += `<rect x="190" y="22" width="100" height="30" rx="3" fill="#B8352B" stroke="#FFE08A" stroke-width="1.4"/><circle cx="240" cy="38" r="40" fill="url(#nglow)" opacity=".5"/>` + L.text(240, 45, 20, '夜市', '#FFE9A8', 'letter-spacing="6"') + `<path d="M270 36 h14 m-5 -4 l5 4 l-5 4" stroke="#FFE9A8" stroke-width="1.6" fill="none"/>`;
  // 天橋樓梯：水泥階 + 黃色防滑條 + 綠色欄杆
  s += L.stairs({
    top: 84, riser: '#85827C', riserDark: '#625F59', tread: '#B3B0A8', treadHi: '#E3C45A', edge: '#4A4844', joints: 22, treadJoints: 28, round: .4,
    postL: '#3F8A63', postR: '#3F8A63'
  });
  return s + '</svg>';
};
