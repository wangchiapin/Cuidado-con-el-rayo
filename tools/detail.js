// 背景「細節層」：加在 tall.js 做好的直式長背景上面（用整張圖的座標畫，所以不會有重複貼圖的接縫）。
// 做的事：階梯立體感（每階陰影、兩側暗角、石面斑點）、地面細節、霧氣層、光線、飄動的小粒子、飛鳥、煙、整體色調與暗角。
// 全部畫在階梯左右兩側或半透明，不會蓋住階梯的位置（階梯 x 150–330 是遊戲邏輯，不能動）。
module.exports = function detail(fx, N, g) {
  fx = fx || {};
  const { TW, T, E, H, y0, gy, SPC } = g;
  let seed = fx.seed || 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const n1 = v => Math.round(v * 10) / 10;
  const side = () => (rnd() < .5 ? 6 + rnd() * 136 : 338 + rnd() * 136);   // 階梯左右兩側的 x
  const colors = fx.glowColors || ['#FFC27A'];
  let defs = `<filter id="fxb1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="fxb3" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="fxb7" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
<linearGradient id="fxsdL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="fxsdR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="fxvgL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${fx.vig || '#000'}" stop-opacity=".30"/><stop offset="1" stop-color="${fx.vig || '#000'}" stop-opacity="0"/></linearGradient>
<linearGradient id="fxvgR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${fx.vig || '#000'}" stop-opacity=".30"/><stop offset="1" stop-color="${fx.vig || '#000'}" stop-opacity="0"/></linearGradient>
<linearGradient id="fxbot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
<linearGradient id="fxstep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".30"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<linearGradient id="fxshaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D8" stop-opacity="0"/><stop offset=".3" stop-color="#FFF6D8" stop-opacity="1"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></linearGradient>`;
  colors.forEach((c, i) => { defs += `<radialGradient id="fxgl${i}"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset=".45" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`; });
  let b = '';
  const yTop = T + 74;
  // ---- 1. 階梯立體感 ----
  b += `<rect x="150" y="${yTop}" width="40" height="${gy - yTop}" fill="url(#fxsdL)"/><rect x="290" y="${yTop}" width="40" height="${gy - yTop}" fill="url(#fxsdR)"/>`;
  for (let i = 0; i <= N; i++) {
    const y = y0 - i * SPC;
    b += `<rect x="156" y="${n1(y + 3.5)}" width="168" height="8" fill="url(#fxstep)"/>`;                                   // 踏面下緣往下的陰影
    const tint = (rnd() - .5) * .08;
    b += `<rect x="156" y="${n1(y - 3.5)}" width="168" height="${SPC}" fill="${tint > 0 ? '#fff' : '#000'}" opacity="${n1(Math.abs(tint) * 100) / 100}"/>`;   // 每階深淺略不同
    for (let k = 0; k < 7; k++) b += `<rect x="${n1(158 + rnd() * 160)}" y="${n1(y - 2.5 + rnd() * (SPC - 6))}" width="${n1(1 + rnd() * 3)}" height=".7" fill="#000" opacity="${n1(.07 + rnd() * .1)}"/>`;   // 石面斑點、細縫
    if (rnd() < .5) b += `<path d="M${n1(170 + rnd() * 140)} ${n1(y - 3)}l${n1(2 + rnd() * 3)} ${n1(2 + rnd() * 3)}l${n1(-1 + rnd() * 3)} ${n1(2 + rnd() * 2)}" stroke="#000" stroke-width=".5" fill="none" opacity=".16"/>`;   // 裂痕
  }
  b += `<ellipse cx="240" cy="${gy}" rx="105" ry="5" fill="#000" opacity=".22" filter="url(#fxb3)"/>`;                      // 階梯底下接地的陰影
  // ---- 2. 地面細節（只畫在圖最底下那段地面裡）----
  const gl = fx.groundLine || '#000';
  b += `<g opacity=".16" stroke="${gl}" stroke-width=".6" fill="none"><path d="M0 ${gy + 9}H${TW}M0 ${gy + 21}H${TW}"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${n1(i * 56 + rnd() * 20)} ${gy + 9}V${gy + 21}"/><path d="M${n1(i * 56 + 28 + rnd() * 20)} ${gy + 21}V${gy + g.GB}"/>`).join('')}</g>`;
  if (fx.puddle) b += `<ellipse cx="82" cy="${gy + 15}" rx="30" ry="3.2" fill="${fx.puddle}" opacity=".35"/><ellipse cx="402" cy="${gy + 20}" rx="24" ry="2.6" fill="${fx.puddle}" opacity=".3"/>`;
  // ---- 3. 霧氣層（越高越多，讓往上爬有高度感）----
  const nm = Math.round(H / 95);
  for (let i = 0; i < nm; i++) {
    const y = T + 50 + (i + rnd() * .8) * ((gy - T - 120) / nm), hi = 1 - y / H;
    b += `<ellipse cx="${n1(rnd() * TW)}" cy="${n1(y)}" rx="${n1(110 + rnd() * 110)}" ry="${n1(7 + rnd() * 9)}" fill="${fx.mist || '#fff'}" opacity="${n1((fx.mistOp || .13) * (.6 + hi))}" filter="url(#fxb7)"/>`;
  }
  // ---- 4. 光暈（燈籠、招牌、夕陽）----
  for (let i = 0, n = fx.glows || 0; i < n; i++) {
    const ci = Math.floor(rnd() * colors.length), r = (fx.glowR || 20) * (.7 + rnd() * .7);
    b += `<circle cx="${n1(side())}" cy="${n1(T + 90 + rnd() * (y0 - T - 110))}" r="${n1(r)}" fill="url(#fxgl${ci})" opacity="${fx.glowOp || .4}"/>`;
  }
  // ---- 5. 光線（斜斜照下來的光柱）----
  for (let i = 0, n = fx.shafts || 0; i < n; i++) {
    const x = rnd() * TW, y = T + rnd() * (gy - T - 260), w = 14 + rnd() * 24, len = 190 + rnd() * 120;
    b += `<g transform="translate(${n1(x)} ${n1(y)}) rotate(${n1(-18 + rnd() * 6)})" opacity="${n1((fx.shaftOp || .16) * (.6 + rnd() * .6))}" filter="url(#fxb3)"><rect x="${-w / 2}" y="0" width="${n1(w)}" height="${n1(len)}" fill="url(#fxshaft)"/></g>`;
  }
  // ---- 6. 飄動的小粒子（落葉、火星、灰塵、亮點）----
  for (let i = 0, n = Math.round((fx.motes || 0) * H / 400); i < n; i++) {
    const r = (fx.moteR || 1.2) * (.6 + rnd() * .9);
    b += `<circle cx="${n1(side())}" cy="${n1(T + 30 + rnd() * (gy - T - 50))}" r="${n1(r)}" fill="${fx.moteColor || '#fff'}" opacity="${n1(.35 + rnd() * .5)}"/>`;
  }
  // ---- 7. 飛鳥 ----
  for (let i = 0, n = Math.round((fx.birds || 0) * H / 400); i < n; i++) {
    const cx = rnd() * TW, cy = T + 10 + rnd() * (gy - T - 160);
    for (let k = 0, m = 2 + Math.floor(rnd() * 3); k < m; k++) {
      const x = cx + k * 11 + rnd() * 5, y = cy + (k % 2) * 6 + rnd() * 4, s = .8 + rnd() * .5;
      b += `<path d="M${n1(x)} ${n1(y)}q${n1(3 * s)} ${n1(-3.4 * s)} ${n1(6 * s)} 0q${n1(3 * s)} ${n1(-3.4 * s)} ${n1(6 * s)} 0" fill="none" stroke="${fx.birdColor || '#3C3A36'}" stroke-width=".9" stroke-linecap="round" opacity=".6"/>`;
    }
  }
  // ---- 8. 煙（線香、炊煙）----
  for (let i = 0, n = fx.smoke || 0; i < n; i++) {
    const x = side(), y = y0 + 6 - rnd() * (y0 - T - 140), h = 70 + rnd() * 60;
    b += `<path d="M${n1(x)} ${n1(y)}c${n1(-8 + rnd() * 6)} ${n1(-h * .25)} ${n1(8 + rnd() * 6)} ${n1(-h * .5)} ${n1(-2 + rnd() * 4)} ${n1(-h * .75)}s${n1(6 + rnd() * 6)} ${n1(-h * .2)} ${n1(rnd() * 4)} ${n1(-h * .3)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".3" filter="url(#fxb1)"/>`;
  }
  // ---- 8b. 打散重複感：中段每重複一次，光影深淺和色偏略有不同 ----
  const P = 95, reps = (SPC * (N - 10)) / P;
  for (let j = 0; j < reps + 1; j++) {
    const y = T + 139 + j * P - 20, k = rnd();
    b += `<rect x="-30" y="${y}" width="${TW + 60}" height="${P}" fill="${k < .35 ? '#000' : k < .7 ? '#fff' : (fx.grade || '#fff')}" opacity="${n1(.05 + rnd() * .07)}" filter="url(#fxb7)"/>`;
  }
  // ---- 9. 整體色調、左右暗角、底部壓暗 ----
  if (fx.grade) b += `<rect x="0" y="0" width="${TW}" height="${gy}" fill="${fx.grade}" opacity="${fx.gradeOp || .05}"/>`;
  b += `<rect x="0" y="0" width="120" height="${gy}" fill="url(#fxvgL)"/><rect x="${TW - 120}" y="0" width="120" height="${gy}" fill="url(#fxvgR)"/>`;
  b += `<rect x="0" y="${gy - 90}" width="${TW}" height="90" fill="url(#fxbot)"/>`;
  return { defs, body: b };
};
