// 把 480x288 的橫式場景，做成「從最底下往上爬」的直式長背景（480 寬、高度隨題數變）。
// 階梯數 N = 題數（10／15／20／25）。原本的場景剛好是 10 階；要更多階，就把場景中段（階梯第 7～2 階、95 單位＝5 階）重複貼，
// 重複的地方階梯接得上；上方最頂端一小條往上拉長（天空），最底下接一段地面（第 0 階下面就是平地，不再是無限的階梯）。
const TW = 480, HV = 288, YB = 272, SPC = 19;
const T = 60;          // 上方拉長出來的高度（天空）
const GB = 30;         // 圖片最底下那段地面（再往下由遊戲用同色鋪滿）
const YC = 139;        // 中段開始（第 7 階的平台，必須是 YB - 整數×19）
const P = 95;          // 重複貼的高度（5 階）
const NS = [10, 15, 20, 25];
const worldH = N => T + HV + SPC * (N - 10) + GB;
const y0Of = N => T + SPC * (N - 10) + YB;     // 第 0 階平台在圖上的位置
// 地面顏色：[左, 中, 右]，左右是牆腳、中間是階梯下面的地，橫向漸層（遊戲裡圖片下方用同樣的漸層鋪滿）
const groundStops = g => `<stop offset="0" stop-color="${g[0]}"/><stop offset=".26" stop-color="${g[0]}"/><stop offset=".38" stop-color="${g[1]}"/><stop offset=".62" stop-color="${g[1]}"/><stop offset=".74" stop-color="${g[2]}"/><stop offset="1" stop-color="${g[2]}"/>`;
const groundCss = g => `linear-gradient(to right,${g[0]} 0,${g[0]} 26%,${g[1]} 38%,${g[1]} 62%,${g[2]} 74%,${g[2]} 100%)`;
module.exports = { groundCss, TW, HV, T, GB, NS, worldH, y0Of, tall };
function tall(svg, o, N) {
  o = o || {};
  const E = SPC * (N - 10), reps = E / P, H = worldH(N);
  const topT = o.topStrip || 6, ground = o.ground || ['#6E655A', '#6E655A', '#6E655A'];
  const m = svg.match(/<defs>[\s\S]*?<\/defs>/);
  const defs = m ? m[0] : '';
  const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(defs, '');
  let s = `<svg viewBox="0 0 ${TW} ${H}" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}`;
  s += `<defs><g id="sc">${body}</g>`;
  s += `<clipPath id="cTop"><rect x="-200" y="0" width="880" height="${topT}"/></clipPath>`;
  s += `<clipPath id="cA"><rect x="-200" y="0" width="880" height="${YC}"/></clipPath>`;
  s += `<clipPath id="cM"><rect x="-200" y="${YC}" width="880" height="${P}"/></clipPath>`;
  s += `<clipPath id="cB"><rect x="-200" y="${YC}" width="880" height="${HV - YC}"/></clipPath>`;
  s += `<linearGradient id="tfog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.fog || '#DDE3DF'}" stop-opacity=".55"/><stop offset="1" stop-color="${o.fog || '#DDE3DF'}" stop-opacity="0"/></linearGradient>`;
  s += `<linearGradient id="gfl" x1="0" y1="0" x2="1" y2="0">${groundStops(ground)}</linearGradient></defs>`;
  s += `<g transform="scale(1 ${T / topT})"><g clip-path="url(#cTop)"><use href="#sc"/></g></g>`;                       // 最上面一小條往上拉長
  s += `<g transform="translate(0 ${T})"><g clip-path="url(#cA)"><use href="#sc"/></g></g>`;                         // 上半段（含終點的建築）
  for (let j = 0; j < reps; j++) s += `<g transform="translate(0 ${T + j * P})"><g clip-path="url(#cM)"><use href="#sc"/></g></g>`;   // 中段重複
  s += `<g transform="translate(0 ${T + E})"><g clip-path="url(#cB)"><use href="#sc"/></g></g>`;                     // 下半段（第 0 階）
  const gy = T + E + HV;
  s += `<rect x="0" y="${gy}" width="${TW}" height="${GB}" fill="url(#gfl)"/>`;
  if (o.topFog !== false) s += `<rect x="0" y="0" width="${TW}" height="${T + 90}" fill="url(#tfog)"/>`;
  return s + '</svg>';
}
