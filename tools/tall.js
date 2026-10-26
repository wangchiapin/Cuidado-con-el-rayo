// 把 480x288 的橫式場景，延伸成手機用的直式滿版背景（480x985）。
// 場景放大 S 倍、放在畫面中間偏上，階梯底端（第 0 階）落在畫面約一半高度；
// 上方：把場景最上面一小條往上拉伸（樹幹、天空自然接上去）；
// 下方：把場景最下面兩階（38 單位，剛好是階梯的整數倍）往下重複貼，階梯就一路接下去。
const TW = 480, TH = 985, S = 1.4, BASE = 514;   // BASE：場景底邊落在畫面的 y 位置
module.exports = { TW, TH, S, BASE, tall };
function tall(svg, o) {
  o = o || {};
  const P = o.tile || 38;                           // 往下重複的那一段高度（必須是 19 的倍數）
  const y0 = o.tileFrom == null ? 288 - P : o.tileFrom;   // 這一段從場景哪裡開始（預設最底下）
  const topT = o.topStrip || 6;
  const m = svg.match(/<defs>[\s\S]*?<\/defs>/);
  const defs = m ? m[0] : '';
  const body = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(defs, '');
  const sceneTop = BASE - 288 * S;                  // 場景頂邊落在畫面的位置
  const T = Math.ceil((sceneTop + 4) / S) + 2;      // 上方要補的高度（場景單位）
  const nTile = Math.ceil((TH - BASE) / S / P) + 1;
  let s = `<svg viewBox="0 0 ${TW} ${TH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}`;
  s += `<defs><clipPath id="tcTop"><rect x="-200" y="0" width="880" height="${topT}"/></clipPath><clipPath id="tcBot"><rect x="140" y="${y0}" width="200" height="${P}"/></clipPath><clipPath id="tcSide"><rect x="-200" y="${288 - (o.sideStrip || 6)}" width="340" height="${o.sideStrip || 6}"/><rect x="340" y="${288 - (o.sideStrip || 6)}" width="340" height="${o.sideStrip || 6}"/></clipPath></defs>`;
  s += `<g transform="translate(${TW / 2} ${BASE}) scale(${S}) translate(${-TW / 2} -288)">`;
  s += `<g id="sc">${body}</g>`;
  // 上方：最上面一小條往上拉長
  s += `<g transform="translate(0 ${-T}) scale(1 ${(T + topT) / topT})"><g clip-path="url(#tcTop)"><use href="#sc"/></g></g>`;
  // 下方：階梯（中間 x 140–340）最下面兩階一段一段往下接；兩側把最下面一小條往下拉長（牆、樹幹自然延伸，不會重複貼出一排排小房子）
  const botT = (TH - BASE) / S + 4;
  for (let j = 1; j <= nTile; j++) s += `<g transform="translate(0 ${(288 - y0) + (j - 1) * P})"><g clip-path="url(#tcBot)"><use href="#sc"/></g></g>`;
  const sb = o.sideStrip || 6, k = (sb + botT) / sb;
  s += `<g transform="translate(0 ${288 - sb}) scale(1 ${k}) translate(0 ${-(288 - sb)})"><g clip-path="url(#tcSide)"><use href="#sc"/></g></g>`;
  s += `</g>`;
  if (o.topFog !== false) s += `<rect x="0" y="0" width="${TW}" height="${Math.round(sceneTop + 40)}" fill="url(#tfog)"/><defs><linearGradient id="tfog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.fog || '#DDE3DF'}" stop-opacity=".55"/><stop offset="1" stop-color="${o.fog || '#DDE3DF'}" stop-opacity="0"/></linearGradient></defs>`;
  s += `<defs><linearGradient id="tvig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${o.vig || '#2A2420'}" stop-opacity="0"/><stop offset="1" stop-color="${o.vig || '#2A2420'}" stop-opacity=".45"/></linearGradient></defs><rect x="0" y="${BASE}" width="${TW}" height="${TH - BASE}" fill="url(#tvig)"/>`;
  return s + '</svg>';
}
