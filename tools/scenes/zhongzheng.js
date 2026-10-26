// 中正紀念堂：白色大理石台階（真的有 89 階）、白牆藍瓦八角屋頂的大殿，兩側是金黃屋頂的國家戲劇院與音樂廳
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed } = L;
  reseed(5);
  let s = L.svgOpen(`<linearGradient id="zsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E9AA6"/><stop offset=".4" stop-color="#C3CBD0"/><stop offset="1" stop-color="#E8E5DA"/></linearGradient>
<pattern id="zblue" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#3F6DB0"/><path d="M0 4Q3 .8 6 4" fill="none" stroke="#2C508A" stroke-width=".7"/></pattern>
<pattern id="zgold" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#D69B35"/><path d="M0 4Q3 .8 6 4" fill="none" stroke="#A8721F" stroke-width=".7"/></pattern>
<pattern id="zstone" width="14" height="7" patternUnits="userSpaceOnUse"><rect width="14" height="7" fill="#D9D5C8"/><path d="M0 .3H14M7 0V3.5M0 3.8H14M0 3.5V7" stroke="#BDB8A8" stroke-width=".5"/></pattern>`);
  s += `<rect width="480" height="288" fill="url(#zsky)"/>`;
  // 遠處的樹
  s += `<path d="M0 90Q60 70 130 86T260 82T400 86T480 80V120H0Z" fill="#9DB0A0"/>`;
  // 左右兩棟：國家戲劇院／音樂廳（宮殿式：金黃屋頂、紅柱、白牆）
  const palace = (x0, flip) => {
    const w = 150, fx = v => flip ? x0 + w - v : x0 + v, X = (a, b) => n1(flip ? x0 + w - b : x0 + a);
    let g = '';
    g += `<rect x="${X(0, w)}" y="140" width="${w}" height="148" fill="#EFEBDF"/>`;
    g += `<path d="M${fx(-6)} 118 L${fx(10)} 92 L${fx(w - 6)} 92 L${fx(w + 4)} 118Z" fill="url(#zgold)" stroke="#8A5A16" stroke-width=".8"/><path d="M${fx(-12)} 136 L${fx(-6)} 118 L${fx(w + 4)} 118 L${fx(w + 10)} 136Z" fill="url(#zgold)" stroke="#8A5A16" stroke-width=".8"/>`;
    g += `<path d="M${fx(26)} 92 L${fx(40)} 76 L${fx(w - 26)} 76 L${fx(w - 12)} 92Z" fill="url(#zgold)" stroke="#8A5A16" stroke-width=".8"/><rect x="${n1(fx(w / 2) - 2)}" y="68" width="4" height="9" fill="#D69B35"/>`;
    g += `<rect x="${X(-4, w + 4)}" y="136" width="${w + 8}" height="5" fill="#8A3A2A"/>`;
    for (let i = 0; i < 6; i++) g += `<rect x="${n1(fx(8 + i * 26) - 4)}" y="141" width="8" height="66" fill="#B8382B" stroke="#6E1F16" stroke-width=".5"/>`;
    for (let i = 0; i < 5; i++) g += L.latticeWin(n1(fx(24 + i * 26) - 8), 152, 16, 34, i % 2 === 0).replace(/#4A3526/g, '#6E1F16');
    g += `<rect x="${X(0, w)}" y="207" width="${w}" height="8" fill="#BDB8A8"/><rect x="${X(0, w)}" y="215" width="${w}" height="73" fill="url(#zstone)"/>`;
    return g;
  };
  s += palace(-30, false) + palace(360, true);
  // 大殿：白色底座、白色牆身、藍色八角形屋頂
  s += '<g transform="translate(0 12)">';
  s += `<rect x="112" y="68" width="256" height="16" fill="#E9E5D8" stroke="#B7B3A6" stroke-width=".6"/><rect x="130" y="60" width="220" height="10" fill="#F2EFE6" stroke="#B7B3A6" stroke-width=".5"/>`;
  s += `<rect x="168" y="30" width="144" height="32" fill="#F4F1E8" stroke="#BDB8A8" stroke-width=".6"/>`;
  for (let i = 0; i < 7; i++) s += `<rect x="${176 + i * 20}" y="34" width="6" height="28" fill="#FBF9F2" stroke="#CFCABB" stroke-width=".4"/>`;
  s += `<rect x="226" y="40" width="28" height="22" fill="#4A4540"/><rect x="229" y="43" width="22" height="19" fill="#C9B88A" opacity=".8"/>`;
  s += `<path d="M146 34 L170 12 L310 12 L334 34Z" fill="url(#zblue)" stroke="#233F70" stroke-width=".8"/><path d="M146 34 Q240 38 334 34 L338 38 Q240 44 142 38Z" fill="#2C508A"/>`;
  s += `<path d="M186 12 L206 -4 L274 -4 L294 12Z" fill="url(#zblue)" stroke="#233F70" stroke-width=".8"/><rect x="238" y="-14" width="4" height="12" fill="#D69B35"/>`;
  s += '</g>';
  // 樹
  const tree = (x, y, r) => `<rect x="${x - 1.4}" y="${y}" width="2.8" height="${r * 1.6}" fill="#5A4636"/><circle cx="${x}" cy="${y}" r="${r}" fill="#5E8050"/><circle cx="${n1(x - r * .55)}" cy="${n1(y + r * .3)}" r="${n1(r * .7)}" fill="#6F9460"/><circle cx="${n1(x + r * .55)}" cy="${n1(y + r * .25)}" r="${n1(r * .7)}" fill="#4F7046"/>`;
  s += tree(124, 200, 11) + tree(356, 206, 11) + tree(104, 256, 13) + tree(376, 262, 13);
  // 大理石台階與白色欄杆
  s += L.stairs({
    top: 82, riser: '#DAD6CB', riserDark: '#BDB8A8', tread: '#F4F2EA', treadHi: '#FFFFFF', edge: '#A9A495', round: .6,
    postL: '#EDEAE0', postR: '#EDEAE0'
  });
  // 欄杆上的柱頭
  for (let i = 0; i <= 10; i++) { const y = 272 - i * 19; s += `<rect x="149" y="${y - 15}" width="7" height="6" fill="#F6F4EC" stroke="#A9A495" stroke-width=".5"/><rect x="324" y="${y - 15}" width="7" height="6" fill="#F6F4EC" stroke="#A9A495" stroke-width=".5"/>`; }
  return s + '</svg>';
};
