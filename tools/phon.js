// 數字聲調拼音（ni3、nv3、lve4）→ 注音／帶調號拼音
const INIT = { b:'ㄅ', p:'ㄆ', m:'ㄇ', f:'ㄈ', d:'ㄉ', t:'ㄊ', n:'ㄋ', l:'ㄌ', g:'ㄍ', k:'ㄎ', h:'ㄏ', j:'ㄐ', q:'ㄑ', x:'ㄒ', zh:'ㄓ', ch:'ㄔ', sh:'ㄕ', r:'ㄖ', z:'ㄗ', c:'ㄘ', s:'ㄙ' };
const FIN = { a:'ㄚ', o:'ㄛ', e:'ㄜ', ai:'ㄞ', ei:'ㄟ', ao:'ㄠ', ou:'ㄡ', an:'ㄢ', en:'ㄣ', ang:'ㄤ', eng:'ㄥ', er:'ㄦ',
  i:'ㄧ', ia:'ㄧㄚ', io:'ㄧㄛ', ie:'ㄧㄝ', iao:'ㄧㄠ', iu:'ㄧㄡ', ian:'ㄧㄢ', in:'ㄧㄣ', iang:'ㄧㄤ', ing:'ㄧㄥ', iong:'ㄩㄥ',
  u:'ㄨ', ua:'ㄨㄚ', uo:'ㄨㄛ', uai:'ㄨㄞ', ui:'ㄨㄟ', uan:'ㄨㄢ', un:'ㄨㄣ', uang:'ㄨㄤ', ong:'ㄨㄥ',
  v:'ㄩ', ve:'ㄩㄝ', van:'ㄩㄢ', vn:'ㄩㄣ' };
const TONE_MARK = { 1:'', 2:'ˊ', 3:'ˇ', 4:'ˋ' };
// y、w 開頭的零聲母寫法 → 標準韻母
const YW = { yi:'i', ya:'ia', yo:'io', ye:'ie', yao:'iao', you:'iu', yan:'ian', yin:'in', yang:'iang', ying:'ing', yong:'iong',
  yu:'v', yue:'ve', yuan:'van', yun:'vn', wu:'u', wa:'ua', wo:'uo', wai:'uai', wei:'ui', wan:'uan', wen:'un', wang:'uang', weng:'ong' };
function split(syl) { // syl 不含聲調數字；回傳 [聲母, 韻母]
  if (YW[syl]) return ['', YW[syl]];
  if (syl === 'ye') return ['', 'ie'];
  let ini = '';
  for (const k of ['zh', 'ch', 'sh']) if (syl.startsWith(k)) { ini = k; break; }
  if (!ini && INIT[syl[0]]) ini = syl[0];
  let fin = syl.slice(ini.length);
  if ('jqx'.includes(ini) && /^u/.test(fin)) fin = 'v' + fin.slice(1); // ju→jü
  if (['zh', 'ch', 'sh', 'r', 'z', 'c', 's'].includes(ini) && fin === 'i') fin = ''; // zhi、zi 的 i
  return [ini, fin];
}
function toZhuyin(code) {
  const m = /^([a-z]+)([1-5])$/.exec(code); if (!m) return null;
  const [ini, fin] = split(m[1]);
  if (fin !== '' && !FIN[fin]) return null;
  if (m[1] === 'er') return m[2] === '5' ? '˙ㄦ' : 'ㄦ' + TONE_MARK[m[2]];
  const z = (ini ? INIT[ini] : '') + (fin ? FIN[fin] : '');
  return m[2] === '5' ? '˙' + z : z + TONE_MARK[m[2]];
}
const MARKS = { a:'āáǎà', e:'ēéěè', i:'īíǐì', o:'ōóǒò', u:'ūúǔù', v:'ǖǘǚǜ' };
function toPinyin(code) {
  const m = /^([a-z]+)([1-5])$/.exec(code); if (!m) return null;
  let s = m[1], t = +m[2];
  if (t === 5) return s.replace(/v/g, 'ü');
  let idx = s.search(/[ae]/); if (idx < 0) idx = s.indexOf('ou') >= 0 ? s.indexOf('o') : -1;
  if (idx < 0) { // 沒有 a、e、ou：標在最後一個母音
    let last = -1; for (let i = 0; i < s.length; i++) if ('aeiouv'.includes(s[i])) last = i; idx = last;
  }
  const ch = s[idx]; if (idx < 0 || !MARKS[ch]) return null; const rep = MARKS[ch][t - 1];
  return (s.slice(0, idx) + rep + s.slice(idx + 1)).replace(/v/g, 'ü');
}
module.exports = { toZhuyin, toPinyin };
