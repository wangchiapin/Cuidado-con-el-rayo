// 阿里山巨木群棧道：雲霧裡的紅檜巨木、木頭階梯與繩欄杆、蕨類與青苔
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed } = L;
  reseed(31);
  let s = L.svgOpen(`<linearGradient id="asky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AA8A4"/><stop offset=".5" stop-color="#C9D2CA"/><stop offset="1" stop-color="#E4E6DA"/></linearGradient>
<linearGradient id="abark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5E3326"/><stop offset=".45" stop-color="#8E4E39"/><stop offset="1" stop-color="#55291E"/></linearGradient>
<linearGradient id="abark2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7A5E56"/><stop offset=".5" stop-color="#A27E6E"/><stop offset="1" stop-color="#6E5148"/></linearGradient>`);
  s += `<rect width="480" height="288" fill="url(#asky)"/>`;
  // 遠方霧中的樹林（一層比一層淡）
  const forest = (y, col, op, h) => { let g = ''; for (let x = -10; x < 490; x += 9 + rnd() * 9) { const hh = h * (.6 + rnd() * .6); g += `<path d="M${n1(x)} ${y} l${n1(5)} ${n1(-hh)} l5 ${n1(hh)}Z" fill="${col}" opacity="${op}"/>`; } return g; };
  s += forest(120, '#8FA39C', .55, 70) + forest(130, '#7B9189', .7, 64) + forest(142, '#66807A', .85, 58);
  // 正中央遠處那棵大神木（階梯盡頭）
  s += `<path d="M196 150 Q200 80 204 8 L282 8 Q282 80 288 150Z" fill="url(#abark2)"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${208 + i * 8.6} 10Q${210 + i * 8.4} 80 ${206 + i * 9} 148" fill="none" stroke="#5E453D" stroke-width=".9" opacity=".6"/>`).join('');
  s += `<ellipse cx="240" cy="40" rx="50" ry="10" fill="#7F9E6A" opacity=".5"/>`;
  s += L.cloudy(240, 112, 120, .55) + L.cloudy(240, 130, 150, .45);
  // 兩側紅檜巨木（樹皮縱向紋路、底部樹根外擴、青苔）
  const trunk = (x0, x1, flare, grad) => {
    let g = `<path d="M${x0} -6 L${x1} -6 L${x1 + flare} 288 L${x0 - flare} 288Z" fill="url(#${grad || 'abark'})"/>`;
    const w = x1 - x0;
    for (let i = 1; i < 9; i++) { const f = i / 9; g += `<path d="M${n1(x0 + w * f)} -6Q${n1(x0 + w * f + rnd() * 6 - 3)} 140 ${n1(x0 - flare + (w + flare * 2) * f)} 288" fill="none" stroke="#3A1B12" stroke-width="${n1(.7 + rnd() * .9)}" opacity=".55"/>`; }
    for (let k = 0; k < 8; k++) { const yy = 20 + rnd() * 250; const xx = x0 + rnd() * w; g += `<ellipse cx="${n1(xx)}" cy="${n1(yy)}" rx="${n1(4 + rnd() * 7)}" ry="${n1(8 + rnd() * 16)}" fill="#6F8F4E" opacity=".45"/>`; }
    return g;
  };
  s += trunk(104, 128, 7, 'abark2').replace(/opacity=".55"/g, 'opacity=".4"') + trunk(352, 374, 7, 'abark2').replace(/opacity=".55"/g, 'opacity=".4"');
  s += L.cloudy(240, 190, 190, .35);
  s += trunk(-6, 74, 22) + trunk(406, 486, 22);
  // 頭上的樹冠與霧
  for (let x = -10; x < 490; x += 22) s += `<ellipse cx="${n1(x + rnd() * 8)}" cy="${n1(rnd() * 12)}" rx="${n1(20 + rnd() * 14)}" ry="${n1(10 + rnd() * 8)}" fill="${['#46603E', '#566F48', '#3C5438'][Math.floor(rnd() * 3)]}"/>`;
  // 木頭階梯 + 繩欄杆（立柱 + 一條粗繩）
  s += L.stairs({
    top: 84, riser: '#5E4330', riserDark: '#42301F', tread: '#A67F57', treadHi: '#C39B6E', edge: '#3E2C1C', treadJoints: 30, round: 1.4,
    postL: '#6B4E35', postR: '#6B4E35',
    extra: (i, y) => `<path d="M156 ${y - 1}H324" stroke="#7E5E40" stroke-width=".5" opacity=".7"/>` + (rnd() > .5 ? `<ellipse cx="${n1(170 + rnd() * 130)}" cy="${y + 4.6}" rx="${n1(5 + rnd() * 7)}" ry="1.3" fill="#6F8F4E" opacity=".6"/>` : '')
  });
  // 繩子
  s += `<path d="M153 84V288" stroke="#C9B58A" stroke-width="1" stroke-dasharray="2 1.2" opacity=".9"/><path d="M327 84V288" stroke="#C9B58A" stroke-width="1" stroke-dasharray="2 1.2" opacity=".9"/>`;
  // 路邊蕨類
  const fern = (x, y, f) => Array.from({ length: 7 }, (_, i) => { const a = -1.2 + i * .4; return `<path d="M${x} ${y}Q${n1(x + f * Math.cos(a) * 9)} ${n1(y - 9 - Math.abs(Math.sin(a)) * 6)} ${n1(x + f * Math.cos(a) * 18)} ${n1(y - 3 + Math.sin(a) * 6)}" fill="none" stroke="${i % 2 ? '#4E7A44' : '#6E9A56'}" stroke-width="2.6" stroke-linecap="round"/>`; }).join('');
  for (let y = 110; y < 288; y += 40) s += fern(146, y + 8, -1) + fern(334, y + 26, 1);
  // 木製指標牌（只有箭頭，沒有字）
  s += `<rect x="338" y="196" width="9" height="40" fill="#5E4330"/><path d="M330 176 h34 l8 8 l-8 8 h-34Z" fill="#6B4E35" stroke="#3E2C1C" stroke-width=".6"/><path d="M336 184 h26 m-6 -4 l6 4 l-6 4" stroke="#F3E9CF" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
  // 霧
  s += L.cloudy(120, 250, 100, .28) + L.cloudy(380, 260, 90, .25);
  return s + '</svg>';
};
