// 九份山城石階街景（用程式畫，不用圖片）。由 build.js 呼叫：world(idp, {INK, WV, HV, YB, SPC})
// 畫法：遠景（山、海、山坡小屋）→ 兩側老房子（木造、紅磚、灰泥、小店）→ 山頂茶樓 → 石階與鐵欄杆
// 招牌文字都用通用詞（茶樓、芋圓、紅糟…），不使用真實店名。
module.exports = function world(idp, C) {
  const { INK, WV, HV, YB, SPC } = C;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n1 = v => Math.round(v * 10) / 10;
  const FONT = `font-family="'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif"`;
  const id = n => idp + n;

  const P = {
    tile: '#55504A', tileD: '#3A3631', wood: '#86593A', woodD: '#5E3C26', brick: '#A9573F', brickD: '#7D3F2E',
    plaster: ['#DCCDAA', '#D3C19B', '#CBB89A', '#D8C4A6'], red: '#C23B2B', redD: '#7C2018', gold: '#D9A441',
    lit: '#F0D28E', dark: '#4A3526', glass: '#7E8C90', leaf: '#5E7F4A', leafL: '#7F9E5E'
  };

  // ---------- 小零件 ----------
  const lantern = (x, y, k = 1, txt = false) => {
    const rx = 4.8 * k, ry = 6 * k;
    return `<circle cx="${n1(x)}" cy="${n1(y + ry)}" r="${n1(11 * k)}" fill="url(#${id('glow')})"/>
<line x1="${n1(x)}" y1="${n1(y - 3 * k)}" x2="${n1(x)}" y2="${n1(y)}" stroke="${INK}" stroke-width=".5"/>
<rect x="${n1(x - 2.4 * k)}" y="${n1(y - .4)}" width="${n1(4.8 * k)}" height="${n1(1.4 * k)}" fill="${P.gold}"/>
<ellipse cx="${n1(x)}" cy="${n1(y + ry)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${P.red}" stroke="${P.redD}" stroke-width=".5"/>
<ellipse cx="${n1(x - rx * .38)}" cy="${n1(y + ry - ry * .1)}" rx="${n1(rx * .26)}" ry="${n1(ry * .62)}" fill="#E8735A" opacity=".65"/>
<path d="M${n1(x - rx * .55)} ${n1(y + 1.5 * k)} Q${n1(x)} ${n1(y + ry)} ${n1(x - rx * .55)} ${n1(y + 2 * ry - 1.5 * k)} M${n1(x + rx * .55)} ${n1(y + 1.5 * k)} Q${n1(x)} ${n1(y + ry)} ${n1(x + rx * .55)} ${n1(y + 2 * ry - 1.5 * k)}" fill="none" stroke="${P.redD}" stroke-width=".35" opacity=".7"/>
<rect x="${n1(x - 2.4 * k)}" y="${n1(y + 2 * ry - .8)}" width="${n1(4.8 * k)}" height="${n1(1.4 * k)}" fill="${P.gold}"/>
<line x1="${n1(x)}" y1="${n1(y + 2 * ry + .6)}" x2="${n1(x)}" y2="${n1(y + 2 * ry + 4.5 * k)}" stroke="${P.gold}" stroke-width=".7"/>` +
      (txt ? `<text x="${n1(x)}" y="${n1(y + ry - .2)}" ${FONT} font-size="${n1(3.5 * k)}" font-weight="700" fill="#F6D98B" text-anchor="middle">九</text><text x="${n1(x)}" y="${n1(y + ry + 3.6 * k)}" ${FONT} font-size="${n1(3.5 * k)}" font-weight="700" fill="#F6D98B" text-anchor="middle">份</text>` : '');
  };
  // 一排燈籠掛在屋簷下
  const lanternRow = (xs, y, k, txt) => xs.map((x, i) => lantern(x, y + (i % 2) * 3.5, k, txt)).join('');
  // 直式紅布條（一字一格）
  const banner = (x, y, w, chars) => {
    const fs = w * .66, h = chars.length * fs * 1.12 + 5;
    return `<line x1="${n1(x + w / 2)}" y1="${n1(y - 4)}" x2="${n1(x + w / 2)}" y2="${n1(y)}" stroke="${INK}" stroke-width=".5"/>
<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="#B8352B" stroke="#7C2018" stroke-width=".5"/>
<rect x="${n1(x + .9)}" y="${n1(y + .9)}" width="${n1(w - 1.8)}" height="${n1(h - 1.8)}" fill="none" stroke="#E6C27A" stroke-width=".35" opacity=".8"/>` +
      chars.split('').map((c, i) => `<text x="${n1(x + w / 2)}" y="${n1(y + 3.2 + fs * .85 + i * fs * 1.12)}" ${FONT} font-size="${n1(fs)}" font-weight="700" fill="#FBF3DC" text-anchor="middle">${c}</text>`).join('');
  };
  const ovalSign = (x, y, w, t1) => `<line x1="${n1(x)}" y1="${n1(y - 5)}" x2="${n1(x)}" y2="${n1(y - 3.5)}" stroke="${INK}" stroke-width=".5"/>
<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(w * .52)}" fill="#E7BA3C" stroke="#6B4A12" stroke-width=".6"/>
<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w - 1.6)}" ry="${n1(w * .52 - 1.6)}" fill="none" stroke="#8A5A12" stroke-width=".4"/>
<text x="${n1(x)}" y="${n1(y + w * .2)}" ${FONT} font-size="${n1(w * .62)}" font-weight="700" fill="#7A1F16" text-anchor="middle">${t1}</text>`;
  const plaque = (x, y, w, t) => `<ellipse cx="${n1(x)}" cy="${n1(y)}" rx="${n1(w)}" ry="${n1(w * .55)}" fill="#F1ECDD" stroke="#55504A" stroke-width=".6"/>
<text x="${n1(x)}" y="${n1(y + w * .2)}" ${FONT} font-size="${n1(w * .6)}" font-weight="700" fill="#3B3B38" text-anchor="middle">${t}</text>`;
  const boardSign = (x, y, w, h, t) => `<rect x="${n1(x)}" y="${n1(y)}" width="${w}" height="${h}" fill="#2F3A38" stroke="#171C1B" stroke-width=".5"/>` +
    t.split('').map((c, i) => `<text x="${n1(x + w / 2)}" y="${n1(y + 1.5 + (i + 1) * (h - 3) / t.length - 1)}" ${FONT} font-size="${n1(w * .62)}" font-weight="700" fill="#F1ECDD" text-anchor="middle">${c}</text>`).join('');
  const plant = (x, y, w, drop) => {
    let s = '';
    for (let i = 0; i < 9; i++) {
      const px = x + (i / 8) * w + (rnd() - .5) * 3, d = drop * (.4 + rnd() * .7);
      s += `<path d="M${n1(px)} ${n1(y)} q${n1((rnd() - .5) * 4)} ${n1(d * .5)} ${n1((rnd() - .5) * 5)} ${n1(d)}" fill="none" stroke="${i % 2 ? P.leaf : P.leafL}" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    return s;
  };
  const bush = (x, y, r) => `<g fill="${P.leaf}"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${n1(r * .7)}"/><ellipse cx="${n1(x - r * .6)}" cy="${n1(y + r * .2)}" rx="${n1(r * .6)}" ry="${n1(r * .5)}" fill="${P.leafL}"/><ellipse cx="${n1(x + r * .65)}" cy="${n1(y + r * .15)}" rx="${n1(r * .6)}" ry="${n1(r * .5)}"/></g>`;
  const latticeWin = (x, y, w, h, lit) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${P.dark}"/><rect x="${x + 1.2}" y="${y + 1.2}" width="${w - 2.4}" height="${h - 2.4}" fill="${lit ? P.lit : P.glass}"/>` +
    `<path d="M${n1(x + w / 3)} ${y}V${y + h}M${n1(x + 2 * w / 3)} ${y}V${y + h}M${x} ${n1(y + h / 2)}H${x + w}" stroke="${P.dark}" stroke-width=".9"/><rect x="${x - 1.5}" y="${y + h}" width="${w + 3}" height="1.8" fill="#6B665D"/>`;
  const archWin = (x, y, w, h, lit) => `<path d="M${x} ${y + h}V${n1(y + w / 2)}A${n1(w / 2)} ${n1(w / 2)} 0 0 1 ${x + w} ${n1(y + w / 2)}V${y + h}Z" fill="${lit ? P.lit : P.glass}" stroke="#6B3A2A" stroke-width="1.1"/><path d="M${n1(x + w / 2)} ${y}V${y + h}M${x} ${n1(y + h * .55)}H${x + w}" stroke="#6B3A2A" stroke-width=".6"/><rect x="${x - 1.5}" y="${y + h}" width="${w + 3}" height="1.8" fill="#8A8678"/>`;
  const railing = (x, y, w, col) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="1.3" fill="${col}"/><rect x="${x}" y="${y + 9}" width="${w}" height="1.3" fill="${col}"/>`;
    for (let px = x + 1; px < x + w; px += 3.2) s += `<rect x="${n1(px)}" y="${y}" width=".9" height="10" fill="${col}"/>`;
    return s;
  };
  const door = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3A2C22"/><rect x="${x + 2}" y="${y + 2.5}" width="${w - 4}" height="${h - 2.5}" fill="#E8CF9E" opacity=".85"/><path d="M${x + w / 2} ${y + 2.5}V${y + h}" stroke="#3A2C22" stroke-width=".8"/><rect x="${x - 2}" y="${y - 3}" width="${w + 4}" height="3" fill="${P.tile}"/>`;

  // ---------- 遠景 ----------
  let s = `<svg viewBox="0 0 ${WV} ${HV}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
<linearGradient id="${id('sky')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8F9BA1"/><stop offset=".35" stop-color="#C6CBC4"/><stop offset="1" stop-color="#E4DFCF"/></linearGradient>
<linearGradient id="${id('sea')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FA5AB"/><stop offset="1" stop-color="#B7C6C4"/></linearGradient>
<radialGradient id="${id('glow')}"><stop offset="0" stop-color="#F3B25C" stop-opacity=".5"/><stop offset="1" stop-color="#F3B25C" stop-opacity="0"/></radialGradient>
<linearGradient id="${id('eaveSh')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<pattern id="${id('tile')}" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="${P.tile}"/><path d="M0 4Q3 .6 6 4" fill="none" stroke="${P.tileD}" stroke-width=".7"/><path d="M0 1.1H6" stroke="#6B655D" stroke-width=".3"/></pattern>
<pattern id="${id('brick')}" width="10" height="5" patternUnits="userSpaceOnUse"><rect width="10" height="5" fill="${P.brick}"/><path d="M0 .25H10M0 2.75H10M.25 0V2.5M5.25 2.5V5" stroke="${P.brickD}" stroke-width=".5"/><rect x="2" y="3.2" width="3" height="1.2" fill="#B96A50" opacity=".5"/></pattern>
<pattern id="${id('wood')}" width="5" height="12" patternUnits="userSpaceOnUse"><rect width="5" height="12" fill="${P.wood}"/><path d="M0 0V12" stroke="${P.woodD}" stroke-width=".7"/><path d="M2 3V5M3.6 8V10" stroke="#9A6A48" stroke-width=".4"/></pattern>
</defs>
<rect width="${WV}" height="${HV}" fill="url(#${id('sky')})"/>
<rect x="190" y="52" width="300" height="70" fill="url(#${id('sea')})"/>
<path d="M200 58H480M215 64H480M235 71H470" stroke="#C9D5D2" stroke-width=".7" opacity=".7"/>
<ellipse cx="430" cy="55" rx="18" ry="6" fill="#7E8F8C"/><path d="M414 55 Q430 42 446 55Z" fill="#738482"/>
<path d="M-10 120 L-10 52 Q20 30 70 20 Q110 36 150 52 Q190 68 215 122Z" fill="#6E7F74"/>
<path d="M70 20 Q92 44 112 58 Q150 72 190 100 L215 122 L130 122 Q96 70 70 20Z" fill="#7A8B7F" opacity=".75"/>
<path d="M30 70 Q50 56 70 66 M120 78 Q140 70 160 82" fill="none" stroke="#5E6F63" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
  // 山坡上層層疊疊的小屋
  const farHouse = (x, y, w, h) => {
    const c = ['#DCCDAA', '#D8B79A', '#C9D0C2', '#E1D6C0', '#D3A98E'][Math.floor(rnd() * 5)];
    return `<rect x="${n1(x)}" y="${n1(y)}" width="${w}" height="${h}" fill="${c}" stroke="#7B756A" stroke-width=".3"/><path d="M${n1(x - 1)} ${n1(y)}L${n1(x + w / 2)} ${n1(y - 3.5)}L${n1(x + w + 1)} ${n1(y)}Z" fill="${rnd() > .5 ? '#A8553F' : '#7A7268'}"/><rect x="${n1(x + w * .3)}" y="${n1(y + h * .35)}" width="2" height="2.4" fill="${rnd() > .45 ? '#F0D28E' : '#8E979B'}"/>`;
  };
  for (let t = 0; t < 4; t++) for (let x = 14 + t * 5; x < 160 - t * 6; x += 12 + rnd() * 6) s += farHouse(x, 70 + t * 11 + rnd() * 3, 8 + rnd() * 5, 8 + rnd() * 3);
  for (let t = 0; t < 3; t++) for (let x = 340 + t * 8; x < 470; x += 12 + rnd() * 7) s += farHouse(x, 86 + t * 9 + rnd() * 3, 8 + rnd() * 4, 8);
  s += `<path d="M0 108Q60 92 130 108T260 104V124H0Z" fill="#EFEBDD" opacity=".35"/>`;

  // 電線（橫過街上、掛小燈籠）
  const wire = (x1, y1, x2, y2, sag) => `<path d="M${x1} ${y1}Q${n1((x1 + x2) / 2)} ${n1((y1 + y2) / 2 + sag)} ${x2} ${y2}" fill="none" stroke="#35322E" stroke-width=".55" opacity=".7"/>`;

  // ---------- 兩側老房子 ----------
  const SIDE_L = [0, 1, 2, 3, 0], SIDE_R = [1, 0, 3, 2, 1];   // 0 木造 1 紅磚 2 灰泥 3 小店
  const house = (side, y0, h, type, j) => {
    const L = side === 'L', xe = L ? 150 : 330, x0 = L ? 0 : 330, W = 150;
    const dir = L ? -1 : 1;
    const fx = (o, w) => n1(L ? xe - o - w : xe + o);   // o：離街邊的距離
    const lit = k => ((j + k + (L ? 0 : 1)) % 3 === 0);
    let g = '';
    if (type === 0) g += `<rect x="${x0}" y="${y0}" width="${W}" height="${h}" fill="url(#${id('wood')})"/>`;
    else if (type === 1) g += `<rect x="${x0}" y="${y0}" width="${W}" height="${h}" fill="url(#${id('brick')})"/>`;
    else g += `<rect x="${x0}" y="${y0}" width="${W}" height="${h}" fill="${P.plaster[(j + (L ? 0 : 2)) % 4]}"/><path d="M${fx(70, 22)} ${y0 + 8}q6 10 2 24q-4 -8 -2 -24Z M${fx(15, 10)} ${y0 + 22}q4 8 0 16q-3 -6 0 -16Z" fill="#8E8268" opacity=".18"/>`;
    // 屋簷（瓦片 + 陰影）
    const ov = 9 + (j % 3) * 2;
    g += `<rect x="${L ? x0 : xe - ov - 1}" y="${y0}" width="${L ? xe + ov : W + ov}" height="8" fill="url(#${id('tile')})"/><rect x="${L ? x0 : xe - ov - 1}" y="${y0 + 7.4}" width="${L ? xe + ov : W + ov}" height="1.6" fill="#2F2B27"/><rect x="${x0}" y="${y0 + 9}" width="${W}" height="9" fill="url(#${id('eaveSh')})"/>`;
    // 門窗
    if (type === 0) {
      g += latticeWin(fx(14, 15), y0 + 17, 15, 18, lit(0)) + latticeWin(fx(52, 15), y0 + 17, 15, 18, lit(1));
      g += `<g>${railing(fx(10, 24), y0 + 36, 24, '#A8402F')}</g>`;
      g += latticeWin(fx(92, 15), y0 + 17, 15, 18, lit(2));
    } else if (type === 1) {
      g += archWin(fx(14, 13), y0 + 15, 13, 20, lit(1)) + archWin(fx(48, 13), y0 + 15, 13, 20, lit(0)) + archWin(fx(84, 13), y0 + 15, 13, 20, lit(2));
      g += bush(n1(fx(12, 17) + 8.5), y0 + 41, 6.5);
      g += `<rect x="${fx(8, 8)}" y="${y0 + 40}" width="8" height="4" fill="#8A5A3C"/>`;
    } else if (type === 2) {
      g += `<g>${latticeWin(fx(16, 14), y0 + 17, 14, 17, lit(1))}</g><rect x="${fx(14, 3)}" y="${y0 + 17}" width="3" height="17" fill="#6E8F6A"/><rect x="${fx(30, 3)}" y="${y0 + 17}" width="3" height="17" fill="#6E8F6A"/>`;
      g += latticeWin(fx(56, 14), y0 + 17, 14, 17, lit(2)) + archWin(fx(92, 13), y0 + 17, 13, 18, lit(0));
    } else {
      g += door(fx(12, 24), y0 + 18, 24, 26);
      g += `<rect x="${fx(8, 32)}" y="${y0 + 14}" width="32" height="4.5" fill="#B8352B"/><path d="${Array.from({ length: 8 }, (_, q) => `M${n1(+fx(8, 32) + q * 4)} ${y0 + 14}h2v4.5h-2Z`).join('')}" fill="#F1ECDD"/>`;
      g += latticeWin(fx(56, 15), y0 + 18, 15, 17, lit(1)) + latticeWin(fx(92, 15), y0 + 18, 15, 17, lit(0));
    }
    // 排水管
    g += `<rect x="${fx(40 + (j % 2) * 14, 2.4)}" y="${y0 + 8}" width="2.4" height="${h - 8}" fill="#7B756A"/><rect x="${fx(40 + (j % 2) * 14, 3.4) - 0}" y="${y0 + h * .55}" width="3.4" height="1.4" fill="#5E5A52"/>`;
    // 屋簷下的燈籠
    const lx = L ? [xe - 4, xe - 20, xe - 36] : [xe + 4, xe + 20, xe + 36];
    g += lanternRow(lx, y0 + 7.5, 1, j % 2 === 0);
    // 招牌（突出到街上的）
    if (type === 2) g += banner(L ? xe - 14 : xe + 6, y0 + 22, 8, L ? '茶樓' : '芋圓');
    if (type === 3) g += ovalSign(L ? xe - 12 : xe + 12, y0 + 30, 9, '小吃');
    if (type === 1 && j % 2 === 0) g += banner(L ? xe - 12 : xe + 5, y0 + 24, 7, '紅糟');
    if (type === 0 && j === 4) g += plaque(L ? xe - 12 : xe + 12, y0 + 30, 8, '食堂');
    if (type === 0 && j === 0 && L) g += boardSign(xe - 11, y0 + 22, 6, 17, '咖啡');
    // 垂下來的植物
    if ((j + (L ? 0 : 1)) % 2 === 0) g += plant(L ? x0 + 12 : x0 + 60, y0 + 8, 34, 14);
    return g;
  };
  for (let j = 0; j < 5; j++) s += house('L', 64 + j * 45, 45, SIDE_L[j], j);
  for (let j = 0; j < 5; j++) s += house('R', 84 + j * 45, 45, SIDE_R[j], j);
  // 右邊房子上方的海景留白處補一排屋頂
  s += `<rect x="330" y="80" width="150" height="5" fill="#2F2B27"/>`;
  // 電線
  s += wire(0, 40, 160, 76, 14) + wire(480, 52, 330, 94, 12) + wire(60, 70, 420, 82, 26);
  // 電線上的小燈籠
  s += [100, 140, 190, 240, 290, 340, 380].map((x, i) => lantern(x, 70 + 28 * Math.sin(((x - 60) / 360) * Math.PI) * .75 + 6 * 0, .62)).join('');

  // ---------- 石階路面 ----------
  s += `<rect x="156" y="62" width="168" height="${HV - 62}" fill="#B9B1A0"/>`;
  // 山頂茶樓（第 10 階）
  s += `<rect x="168" y="38" width="144" height="44" fill="#CBB690"/><rect x="168" y="38" width="144" height="44" fill="url(#${id('wood')})" opacity=".35"/>
<path d="M142 48 Q240 4 338 48 L330 56 Q240 22 150 56Z" fill="url(#${id('tile')})" stroke="#2F2B27" stroke-width=".8"/><path d="M142 48 Q136 44 134 38 Q142 44 150 45Z M338 48 Q344 44 346 38 Q338 44 330 45Z" fill="#3A3631"/>
<path d="M178 58 Q240 42 302 58 L298 63 Q240 50 182 63Z" fill="url(#${id('tile')})"/>
${latticeWin(176, 62, 16, 18, true)}${latticeWin(288, 62, 16, 18, true)}
<rect x="218" y="60" width="44" height="22" fill="#3A2C22"/><rect x="222" y="63" width="36" height="19" fill="#E8CF9E" opacity=".8"/><path d="M240 63V82M231 63V82M249 63V82" stroke="#3A2C22" stroke-width=".8"/>
<rect x="216" y="50" width="48" height="8" fill="${INK}" stroke="#D9A441" stroke-width=".6"/><text x="240" y="56.6" ${FONT} font-size="6.6" font-weight="700" fill="#E6C27A" text-anchor="middle" letter-spacing="3">茶　樓</text>
${banner(196, 62, 7, '茶')}${banner(277, 62, 7, '點')}
${lanternRow([188, 212, 268, 292], 59, 1, true)}`;
  // 石階面
  seed = 11;
  for (let i = 0; i <= 10; i++) {
    const y = YB - i * SPC;
    // 立面（階與階之間的石壁）
    s += `<rect x="156" y="${y + 3.5}" width="168" height="${SPC - 7}" fill="#A59D8B"/><rect x="156" y="${y + 3.5}" width="168" height="2.4" fill="#8D8573" opacity=".7"/>`;
    for (let x = 156; x < 324; x += 14 + rnd() * 12) s += `<path d="M${n1(x)} ${y + 6}V${y + SPC - 3.5}" stroke="#8D8573" stroke-width=".5" opacity=".7"/>`;
    // 踏面
    s += `<rect x="150" y="${y + 3.5}" width="180" height="2" fill="#6F6859" opacity=".5"/><rect x="150" y="${y - 3.5}" width="180" height="7" rx="1" fill="#E4DDCB" stroke="#8F866F" stroke-width=".6"/><rect x="152" y="${y - 3}" width="176" height="1.6" fill="#F7F3E6"/>`;
    for (let x = 160; x < 322; x += 16 + rnd() * 18) s += `<path d="M${n1(x)} ${y - 3}V${y + 3}" stroke="#A8A08C" stroke-width=".5"/>`;
    if (rnd() > .55) s += `<ellipse cx="${n1(166 + rnd() * 150)}" cy="${y + 4.5}" rx="${n1(5 + rnd() * 6)}" ry="1.2" fill="#7F9A68" opacity=".5"/>`;
    // 欄杆立柱
    s += `<rect x="152" y="${y - 12}" width="2.4" height="15" fill="#3E3A36"/><rect x="325.6" y="${y - 12}" width="2.4" height="15" fill="#A8402F"/>`;
  }
  // 兩側長欄杆
  s += `<rect x="153" y="62" width="1.6" height="${HV - 62}" fill="#2F2B27" opacity=".55"/><rect x="326" y="62" width="1.6" height="${HV - 62}" fill="#8F2F22" opacity=".6"/>`;
  s += `<line x1="150" y1="62" x2="150" y2="${HV}" stroke="#6F6859" stroke-width=".8"/><line x1="330" y1="62" x2="330" y2="${HV}" stroke="#6F6859" stroke-width=".8"/>`;
  // 石獅（右邊柱子上）與菜單看板
  const ly = YB - 3 * SPC;
  s += `<rect x="332" y="${ly - 2}" width="11" height="16" fill="#9C9584" stroke="#6F6859" stroke-width=".5"/><rect x="330.5" y="${ly - 4}" width="14" height="3" fill="#B2AB9A" stroke="#6F6859" stroke-width=".5"/>
<ellipse cx="337.5" cy="${ly - 8}" rx="5.2" ry="4" fill="#A8A190" stroke="#6F6859" stroke-width=".5"/><circle cx="335" cy="${ly - 12}" r="3.4" fill="#A8A190" stroke="#6F6859" stroke-width=".5"/><path d="M332.6 ${ly - 13}q-2 1 -1 3.6" stroke="#6F6859" stroke-width=".6" fill="none"/><circle cx="334.2" cy="${ly - 12.6}" r=".5" fill="#3B3B38"/>`;
  const my = YB - 1 * SPC - 28;
  s += `<rect x="338" y="${my}" width="15" height="30" fill="#F4F0E4" stroke="#8F866F" stroke-width=".5"/><rect x="338" y="${my}" width="15" height="5" fill="#B8352B"/><text x="345.5" y="${my + 4}" ${FONT} font-size="3.6" font-weight="700" fill="#FBF3DC" text-anchor="middle">九份小吃</text>` +
    [0, 1, 2].map(q => `<rect x="340" y="${my + 7 + q * 7.6}" width="5" height="5.4" fill="${['#D3A98E', '#B9A16A', '#A9B48C'][q]}"/><path d="M${347} ${my + 9 + q * 7.6}h4M347 ${my + 11.4 + q * 7.6}h3" stroke="#8F866F" stroke-width=".6"/>`).join('');
  // 路邊的花盆
  s += bush(144, YB + 9, 5) + bush(336, YB - 5 * SPC + 9, 4.6);
  return s + '</svg>';
};
