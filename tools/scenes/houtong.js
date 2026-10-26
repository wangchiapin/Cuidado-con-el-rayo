// 猴硐貓村：山坡上的小房子、鐵皮屋頂、瑞三選煤場遺址、貓橋，還有到處都是貓
module.exports = function (C) {
  const L = require('./lib.js')(C);
  const { n1, rnd, reseed } = L;
  reseed(14);
  let s = L.svgOpen(`<linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8F9CA3"/><stop offset=".4" stop-color="#C5CCCA"/><stop offset="1" stop-color="#E6E3D6"/></linearGradient>
<pattern id="hzinc" width="5" height="6" patternUnits="userSpaceOnUse"><rect width="5" height="6" fill="#4F83AE"/><path d="M0 0V6M2.5 0V6" stroke="#3A6688" stroke-width=".6"/></pattern>
<pattern id="hzinc2" width="5" height="6" patternUnits="userSpaceOnUse"><rect width="5" height="6" fill="#B65A48"/><path d="M0 0V6M2.5 0V6" stroke="#8A3E30" stroke-width=".6"/></pattern>
<pattern id="hzinc3" width="5" height="6" patternUnits="userSpaceOnUse"><rect width="5" height="6" fill="#5F8F6C"/><path d="M0 0V6M2.5 0V6" stroke="#46704F" stroke-width=".6"/></pattern>`);
  s += `<rect width="480" height="288" fill="url(#hsky)"/>`;
  // 後面的山
  s += `<path d="M-10 120 L-10 40 Q50 20 110 44 Q180 14 250 38 Q330 6 400 34 Q450 24 490 42 L490 130Z" fill="#8FA58E"/><path d="M-10 130 L-10 70 Q60 50 130 72 Q220 44 300 70 Q390 50 490 72 L490 140Z" fill="#7B9680"/>`;
  s += L.cloudy(90, 70, 70, .35) + L.cloudy(400, 84, 70, .3);
  // 瑞三選煤場遺址：一層一層往山上疊的水泥結構，有一排排方窗與煙囪
  const ruin = (x, y, w, h, c) => { let g = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="#6F6C64" stroke-width=".6"/>`; for (let i = 0; i < Math.floor(w / 13); i++) g += `<rect x="${n1(x + 4 + i * 13)}" y="${y + 5}" width="7" height="${n1(h - 11)}" fill="#4F4B44"/>`; return g + `<path d="M${x + 6} ${y + h}v-6M${x + w * .6} ${y}v5" stroke="#B0643C" stroke-width="2" opacity=".5"/>`; };
  s += ruin(30, 92, 150, 30, '#A5A39A') + ruin(48, 68, 118, 26, '#B0AEA4') + ruin(70, 46, 82, 24, '#BAB8AD') + `<rect x="168" y="30" width="9" height="62" fill="#9C998F" stroke="#6F6C64" stroke-width=".5"/><rect x="166" y="28" width="13" height="4" fill="#7E7B72"/>`;
  s += `<path d="M180 108 L250 74" stroke="#7E7B72" stroke-width="3"/><path d="M180 112 L250 78" stroke="#8F8C82" stroke-width="1" />`;
  // 貓橋（右上）：橫跨的天橋 + 一隻大貓
  s += `<rect x="330" y="86" width="150" height="7" fill="#C9B77A" stroke="#7A6A38" stroke-width=".6"/><rect x="330" y="76" width="150" height="2" fill="#7A6A38"/>` + Array.from({ length: 16 }, (_, i) => `<rect x="${332 + i * 9.4}" y="76" width="1.6" height="10" fill="#7A6A38"/>`).join('') + `<rect x="350" y="93" width="6" height="40" fill="#8F8C82"/><rect x="430" y="93" width="6" height="40" fill="#8F8C82"/>`;
  const cat = (x, y, c, k = 1, face = 1) => `<g transform="translate(${n1(x)} ${n1(y)}) scale(${k * face} ${k})"><path d="M-6 0 q-7 -2 -8 -10" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="0" cy="-5" rx="7" ry="6" fill="${c}"/><circle cx="4.5" cy="-13" r="4.6" fill="${c}"/><path d="M1 -16.5 l1 -4.4 l3 3 M6 -17 l2.6 -3.4 l.6 4.2" fill="${c}"/><circle cx="3.4" cy="-13.5" r=".7" fill="#2E2A27"/><circle cx="6.2" cy="-13.5" r=".7" fill="#2E2A27"/><path d="M-3 0 v3 M3 0 v3" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>${c === '#D98A3D' ? '<path d="M-2 -9 l1 4 M2 -9 l1 4" stroke="#A8601F" stroke-width=".8"/>' : ''}</g>`;
  s += cat(396, 76, '#D98A3D', 1.6, 1);
  // 山坡小屋：鐵皮屋頂
  const house = (x, y, w, h, wall, roof, flip) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${wall}" stroke="#7B756A" stroke-width=".5"/><path d="M${x - 3} ${y} L${x + w / 2} ${y - 10} L${x + w + 3} ${y}Z" fill="url(#${roof})" stroke="#3B3B38" stroke-width=".5"/><rect x="${n1(x + w * .2)}" y="${y + h * .3}" width="${n1(w * .22)}" height="${n1(h * .34)}" fill="#6F7C7E"/><rect x="${n1(x + w * .6)}" y="${y + h * .3}" width="${n1(w * .22)}" height="${n1(h * .34)}" fill="${rnd() > .5 ? '#E8CF9E' : '#6F7C7E'}"/><path d="M${x + w * .2} ${y + h * .64}h${n1(w * .22)}" stroke="#7B756A" stroke-width=".8"/>`;
  const rf = ['hzinc', 'hzinc2', 'hzinc3'], wl = ['#E9DFC8', '#D7C9A8', '#C6D5CF', '#E3D2C3'];
  s += `<path d="M-10 118 Q70 108 150 150 L150 288 L-10 288Z" fill="#6E8A66"/><path d="M490 124 Q410 112 330 156 L330 288 L490 288Z" fill="#6E8A66"/>`;
  for (let j = 0; j < 5; j++) { s += house(8 + (j % 2) * 8, 118 + j * 34, 56, 26, wl[j % 4], rf[j % 3]) + house(74, 130 + j * 34, 56, 24, wl[(j + 1) % 4], rf[(j + 2) % 3]); s += house(346 + (j % 2) * 8, 126 + j * 34, 56, 26, wl[(j + 2) % 4], rf[(j + 1) % 3]) + house(412, 138 + j * 34, 56, 24, wl[(j + 3) % 4], rf[j % 3]); }
  // 貓咪們（屋頂、牆頭、階梯兩側）
  s += cat(40, 118, '#E6E0D2', 1.15) + cat(110, 130, '#2E2A27', 1.1, -1) + cat(136, 200, '#D98A3D', 1.25) + cat(22, 232, '#8F8A80', 1.15, -1) + cat(372, 126, '#2E2A27', 1.1) + cat(438, 138, '#E6E0D2', 1.1, -1) + cat(342, 232, '#D98A3D', 1.3, -1) + cat(456, 214, '#C9A36B', 1.15);
  // 鐵軌與礦車（左下）
  s += `<path d="M0 282H64M0 286H64" stroke="#6F6C64" stroke-width="1.3"/>` + Array.from({ length: 7 }, (_, i) => `<rect x="${2 + i * 9}" y="281" width="3" height="7" fill="#5E4330"/>`).join('') + `<path d="M8 262 h46 l-4 18 h-38Z" fill="#3E3B36" stroke="#1F1D1A" stroke-width=".6"/><path d="M12 262 q8 -9 16 -2 q8 -8 16 0 q4 2 6 2Z" fill="#2A2825"/><circle cx="18" cy="282" r="3.2" fill="#2A2825"/><circle cx="44" cy="282" r="3.2" fill="#2A2825"/>`;
  // 水泥階梯 + 生鏽鐵欄杆
  s += L.stairs({
    top: 84, riser: '#9C978C', riserDark: '#7A766B', tread: '#D3CDBE', treadHi: '#EAE5D8', edge: '#7A766B', joints: 18, treadJoints: 24,
    postL: '#A5593A', postR: '#A5593A',
    extra: (i, y) => (rnd() > .5 ? `<ellipse cx="${n1(166 + rnd() * 150)}" cy="${y + 4.6}" rx="${n1(5 + rnd() * 8)}" ry="1.3" fill="#7F9A68" opacity=".5"/>` : '')
  });
  // 兩旁的芭蕉與花
  const banana = (x, y, f) => Array.from({ length: 6 }, (_, i) => `<path d="M${x} ${y}Q${n1(x + f * (10 + i * 5))} ${n1(y - 20 - i * 3)} ${n1(x + f * (22 + i * 8))} ${n1(y - 4 + i * 4)}" fill="none" stroke="${i % 2 ? '#5E8F4E' : '#78A860'}" stroke-width="4" stroke-linecap="round"/>`).join('');
  s += banana(146, 270, -1) + banana(334, 250, 1);
  return s + '</svg>';
};
