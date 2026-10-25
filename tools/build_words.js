// 產生打字遊戲的單字清單：node tools/build_words.js
// 資料來源（都在 game-kit 裡，不另外維護一份新字庫）：
//   bank/vocab_levels.json  華語八千詞的詞→等級（這裡只取單字）
//   bank/gt/readings.txt    GoodTeacher 台灣讀音表（[L] 音節→拼音+注音，[C] 多音字讀音）
//   pinyin-pro              GoodTeacher 沒收的字（單音字）用它補讀音
//   opencc-js               簡體字
const fs = require('fs'), path = require('path');
const GK = process.env.GAMEKIT || '/home/claude/game-kit';
const OpenCC = require('opencc-js'), { pinyin } = require('pinyin-pro');
const { toZhuyin, toPinyin } = require('./phon');
const toCn = OpenCC.Converter({ from: 'tw', to: 'cn' });

const vocab = JSON.parse(fs.readFileSync(path.join(GK, 'bank/vocab_levels.json'), 'utf8'));
const L = {}, C = {};
let sec = '';
for (const ln of fs.readFileSync(path.join(GK, 'bank/gt/readings.txt'), 'utf8').replace(/^﻿/, '').split(/\r?\n/)) {
  if (ln === '[L]') { sec = 'L'; continue; }
  if (ln === '[C]') { sec = 'C'; continue; }
  const i = ln.indexOf('='); if (i < 0) continue;
  const k = ln.slice(0, i), v = ln.slice(i + 1);
  if (sec === 'L') { const [py, zy] = v.split(' '); L[k] = [py, zy]; }
  else if (sec === 'C') C[k] = v.split(',');
}

// GoodTeacher 規則實際用到的讀音（slot）：多音字只接受「基本讀音＋規則會改成的讀音」
const usedSlots = {};
for (const ln of fs.readFileSync(path.join(GK, 'bank/gt/rules.csv'), 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1)) {
  const c = ln.split(','); if (c[1] === '改' && c[3] !== '') (usedSlots[c[2]] = usedSlots[c[2]] || new Set()).add(+c[3]);
}
const HAN = /^[一-鿿]$/;
// 台灣常見的「語音／讀音」兩種都對的單字：額外接受的讀音（想加字就加在這裡）
const EXTRA = { '血': ['xue4'], '熟': ['shu2'], '角': ['jue2'], '誰': ['shui2'], '剝': ['bo1'], '薄': ['bao2'], '骨': ['gu2'], '色': ['shai3'] };
const out = [], skipped = [], usedCodes = new Set();
for (const [w, lv] of Object.entries(vocab)) {
  if (!HAN.test(w)) continue;
  let codes;
  if (C[w]) { const sl = usedSlots[w] || new Set(); codes = C[w].filter((x, i) => i === 0 || sl.has(i)); }
  else codes = [pinyin(w, { toneType: 'num', v: true, type: 'array' })[0]];
  // 第一個是基本讀音；輕聲開頭的字（的、了、嗎…）標 n:1，只在困難等級出現
  if (!codes[0] || !toZhuyin(codes[0])) { skipped.push(w + ':' + (codes[0] || '?')); continue; }
  const neutral = /5$/.test(codes[0]);
  const acc = [];
  for (const c of codes) { if (toZhuyin(c) && /[1-5]$/.test(c) && !acc.includes(c)) acc.push(c); if (acc.length >= 3) break; }
  for (const c of (EXTRA[w] || [])) if (toZhuyin(c) && !acc.includes(c)) acc.push(c);
  acc.forEach(c => usedCodes.add(c));
  const s = toCn(w);
  const e = { c: w, lv, r: acc };
  if (neutral) e.n = 1;
  if (s !== w) e.s = s;
  out.push(e);
}
const labels = {};
for (const c of usedCodes) labels[c] = [toPinyin(c), toZhuyin(c)];
// 音節→拼音（無聲調）對照，給遊戲顯示用
fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../data/words.json'), JSON.stringify({ words: out, labels }));
const byLv = {}; out.forEach(e => byLv[e.lv] = (byLv[e.lv] || 0) + 1);
console.log('單字', out.length, '各等級', JSON.stringify(byLv), '略過', skipped.length);
console.log('略過（輕聲或查不到）', skipped.join(' '));
console.log('音節種類', usedCodes.size);
