// 各個場景共用的小工具：畫 11 個階梯平台（位置跟遊戲邏輯綁定，不能動）、燈籠、植物、窗戶等
module.exports = function (C) {
  const { INK, WV, HV, YB, SPC } = C;
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const reseed = v => { seed = v; };
  const n1 = v => Math.round(v * 10) / 10;
  const FONT = `font-family="'Noto Sans TC','PingFang TC','Microsoft JhengHei',sans-serif"`;

  const svgOpen = defs => `<svg viewBox="0 0 ${WV} ${HV}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs || ''}</defs>`;

  // 石階／木階：11 個平台 y = YB - i*SPC，x 150–330（遊戲裡人物站的位置，不能改）
  function stairs(o) {
    const top = o.top == null ? 62 : o.top;
    let s = `<rect x="156" y="${top}" width="168" height="${HV - top}" fill="${o.riser}"/>`;
    for (let i = 0; i <= 10; i++) {
      const y = YB - i * SPC;
      s += `<rect x="156" y="${y + 3.5}" width="168" height="${SPC - 7}" fill="${o.riser}"/><rect x="156" y="${y + 3.5}" width="168" height="2.4" fill="${o.riserDark}" opacity=".75"/>`;
      if (o.joints) for (let x = 156; x < 324; x += o.joints + rnd() * o.joints) s += `<path d="M${n1(x)} ${y + 6}V${y + SPC - 3.5}" stroke="${o.riserDark}" stroke-width=".5" opacity=".7"/>`;
      s += `<rect x="150" y="${y + 3.5}" width="180" height="2" fill="${o.riserDark}" opacity=".5"/><rect x="150" y="${y - 3.5}" width="180" height="7" rx="${o.round == null ? 1 : o.round}" fill="${o.tread}" stroke="${o.edge}" stroke-width=".6"/><rect x="152" y="${y - 3}" width="176" height="1.6" fill="${o.treadHi}"/>`;
      if (o.treadJoints) for (let x = 160; x < 322; x += o.treadJoints + rnd() * o.treadJoints) s += `<path d="M${n1(x)} ${y - 3}V${y + 3}" stroke="${o.edge}" stroke-width=".5" opacity=".8"/>`;
      if (o.extra) s += o.extra(i, y);
      if (o.postL) s += `<rect x="152" y="${y - 12}" width="2.4" height="15" fill="${o.postL}"/>`;
      if (o.postR) s += `<rect x="325.6" y="${y - 12}" width="2.4" height="15" fill="${o.postR}"/>`;
    }
    if (o.postL) s += `<rect x="153" y="${top}" width="1.6" height="${HV - top}" fill="${o.postL}" opacity=".55"/>`;
    if (o.postR) s += `<rect x="326" y="${top}" width="1.6" height="${HV - top}" fill="${o.postR}" opacity=".55"/>`;
    return s;
  }

  const lantern = (x, y, k = 1, col = '#C23B2B', glow) => {
    const rx = 4.8 * k, ry = 6 * k;
    return (glow ? `<circle cx="${n1(x)}" cy="${n1(y + ry)}" r="${n1(11 * k)}" fill="url(#${glow})"/>` : '') +
      `<line x1="${n1(x)}" y1="${n1(y - 3 * k)}" x2="${n1(x)}" y2="${n1(y)}" stroke="${INK}" stroke-width=".5"/><rect x="${n1(x - 2.4 * k)}" y="${n1(y - .4)}" width="${n1(4.8 * k)}" height="${n1(1.4 * k)}" fill="#D9A441"/>
<ellipse cx="${n1(x)}" cy="${n1(y + ry)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="${col}" stroke="#5A1A12" stroke-width=".5"/><ellipse cx="${n1(x - rx * .38)}" cy="${n1(y + ry)}" rx="${n1(rx * .26)}" ry="${n1(ry * .62)}" fill="#fff" opacity=".28"/>
<rect x="${n1(x - 2.4 * k)}" y="${n1(y + 2 * ry - .8)}" width="${n1(4.8 * k)}" height="${n1(1.4 * k)}" fill="#D9A441"/><line x1="${n1(x)}" y1="${n1(y + 2 * ry + .6)}" x2="${n1(x)}" y2="${n1(y + 2 * ry + 4.5 * k)}" stroke="#D9A441" stroke-width=".7"/>`;
  };
  const text = (x, y, fs, t, fill, extra = '') => `<text x="${n1(x)}" y="${n1(y)}" ${FONT} font-size="${n1(fs)}" font-weight="700" fill="${fill}" text-anchor="middle" ${extra}>${t}</text>`;
  const vtext = (x, y, fs, chars, fill) => chars.split('').map((c, i) => text(x, y + i * fs * 1.12, fs, c, fill)).join('');
  const banner = (x, y, w, chars, bg = '#B8352B', fg = '#FBF3DC') => {
    const fs = w * .66, h = chars.length * fs * 1.12 + 5;
    return `<line x1="${n1(x + w / 2)}" y1="${n1(y - 4)}" x2="${n1(x + w / 2)}" y2="${n1(y)}" stroke="${INK}" stroke-width=".5"/><rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" fill="${bg}" stroke="#3B1A14" stroke-width=".5"/>` + vtext(x + w / 2, y + 3.2 + fs * .85, fs, chars, fg);
  };
  const cloudy = (x, y, w, op = .35) => `<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${n1(w * .16)}" fill="#fff" opacity="${op}"/>`;
  const latticeWin = (x, y, w, h, lit) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#4A3526"/><rect x="${x + 1.2}" y="${y + 1.2}" width="${w - 2.4}" height="${h - 2.4}" fill="${lit ? '#F0D28E' : '#7E8C90'}"/><path d="M${n1(x + w / 3)} ${y}V${y + h}M${n1(x + 2 * w / 3)} ${y}V${y + h}M${x} ${n1(y + h / 2)}H${x + w}" stroke="#4A3526" stroke-width=".9"/>`;
  const bush = (x, y, r, a = '#5E7F4A', b = '#7F9E5E') => `<g fill="${a}"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${n1(r * .7)}"/><ellipse cx="${n1(x - r * .6)}" cy="${n1(y + r * .2)}" rx="${n1(r * .6)}" ry="${n1(r * .5)}" fill="${b}"/><ellipse cx="${n1(x + r * .65)}" cy="${n1(y + r * .15)}" rx="${n1(r * .6)}" ry="${n1(r * .5)}"/></g>`;
  // 一團團樹冠
  const canopy = (x0, x1, y0, y1, cols, step = 9) => {
    let s = '';
    for (let y = y0; y < y1; y += step * .7) for (let x = x0 - 6; x < x1 + 6; x += step * (.7 + rnd() * .6)) s += `<circle cx="${n1(x + rnd() * 5)}" cy="${n1(y + rnd() * 5)}" r="${n1(step * (.55 + rnd() * .5))}" fill="${cols[Math.floor(rnd() * cols.length)]}"/>`;
    return s;
  };
  return { INK, WV, HV, YB, SPC, rnd, reseed, n1, FONT, svgOpen, stairs, lantern, text, vtext, banner, cloudy, latticeWin, bush, canopy };
};
