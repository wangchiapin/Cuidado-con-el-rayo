// 每個場景的微調：ground＝地面顏色 [左牆腳, 中間, 右牆腳]（從場景最底下一排取樣）；
// fx＝細節層設定（tools/detail.js）：glows 光暈、shafts 光線、motes 小粒子、birds 飛鳥、smoke 煙、mist 霧色、grade 整體色調、puddle 水窪
module.exports = {
  jiufen: { ground: ['#85583A', '#A49C8A', '#945B49'],
    fx: { seed: 3, glows: 16, glowColors: ['#FFB35A', '#FF8A5A'], glowR: 20, glowOp: .45, motes: 10, moteColor: '#FFD890', moteR: 1, mist: '#E8DCCB', mistOp: .15, grade: '#FF9A4D', gradeOp: .05, puddle: '#9FB0B8', groundLine: '#2A140A', vig: '#2A1208', birds: 1 } },
  xiangshan: { ground: ['#4B6642', '#9C998B', '#3F5B3D'],
    fx: { seed: 5, shafts: 6, shaftOp: .2, motes: 14, moteColor: '#A8CE72', moteR: 1.6, mist: '#E2EEE4', mistOp: .17, grade: '#6FB36A', gradeOp: .05, birds: 2, birdColor: '#2F3B2D', vig: '#0F2410' } },
  zhongzheng: { ground: ['#D9D5C8', '#DAD6CB', '#D9D5C8'],
    fx: { seed: 7, shafts: 3, shaftOp: .12, motes: 6, moteColor: '#fff', birds: 5, birdColor: '#5A5E66', mist: '#fff', mistOp: .2, grade: '#9CC3FF', gradeOp: .035, puddle: '#BFD6EC', groundLine: '#6B665A', vig: '#3A4660' } },
  longshan: { ground: ['#858073', '#8D887C', '#858073'],
    fx: { seed: 9, smoke: 6, glows: 12, glowColors: ['#FFC26B'], glowR: 18, glowOp: .4, motes: 10, moteColor: '#F6D98B', mist: '#E4DCD0', mistOp: .13, grade: '#FF7A5A', gradeOp: .04, birds: 1, puddle: '#A9B4BA', vig: '#2A0C08' } },
  alishan: { ground: ['#784939', '#5E4330', '#7C4C3C'],
    fx: { seed: 13, shafts: 8, shaftOp: .3, motes: 16, moteColor: '#D4E8A4', moteR: 1.4, mist: '#EAF2EC', mistOp: .2, grade: '#6FA58A', gradeOp: .05, birds: 1, vig: '#0C1A10' } },
  houtong: { ground: ['#938F75', '#9B968B', '#B8BDAD'],
    fx: { seed: 17, glows: 6, glowColors: ['#FFD48A'], glowR: 26, glowOp: .3, motes: 8, moteColor: '#FFF2C8', birds: 4, birdColor: '#3C3A36', mist: '#E8E8DA', mistOp: .15, grade: '#E3B36A', gradeOp: .045, puddle: '#B6C3C6', vig: '#2C2A18' } },
  nightmarket: { ground: ['#906F65', '#84817B', '#906F65'],
    fx: { seed: 21, glows: 20, glowColors: ['#FF6A8A', '#FFC857', '#7AD7FF'], glowR: 24, glowOp: .32, motes: 18, moteColor: '#FFE9A6', moteR: 1.1, mist: '#FFB6C8', mistOp: .09, grade: '#5A4BC4', gradeOp: .05, puddle: '#FF9AB0', groundLine: '#000', vig: '#0A0820' } }
};
