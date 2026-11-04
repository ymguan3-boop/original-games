/* Guard Battle only — the ten stage-opening boss lines, their voice profiles and dialog colours.
   One short line per boss (8–18 Chinese characters). Species IDs (`boss`) stay the source of truth for the model and card.
   `voice` is data for the pre-generated speech files in defense/audio/boss/ (made by defense/tools/make-boss-voices.cjs):
   voiceName / voiceKey pick the TTS voice, pitch and rate shape it, audioFile is what the game plays, ttsText is what was
   spoken. `theme` colours the country-style dialog frame from each boss's own palette; `portrait` names the generated 2D comic artwork.
   Full tables: docs/十關魔王語音與對話設計.md. */
const YUNJHE = 'zh-TW-YunJheNeural', HSIAOCHEN = 'zh-TW-HsiaoChenNeural';
const voice = (key, o) => Object.freeze({voiceName: o.voiceName || YUNJHE, voiceKey: key, genderFeel: o.gender, ageFeel: o.age, tone: o.tone,
  speed: o.speedLabel, emotion: o.emotion, pitch: o.pitch, rate: o.rate, notes: o.notes, audioFile: 'audio/boss/' + key + '.mp3', ttsText: o.say});
const theme = (wood, paper, accent, ink, glow) => Object.freeze({wood, paper, accent, ink, glow});

export const BOSS_OPENINGS = Object.freeze({
  meadow: {
    portrait: 'assets/boss-portraits/meadow.webp',
    boss: 'giratina', name: '小黃', line: '嘿！先追上我再說！',
    theme: theme('#a8742a', '#fff1a8', '#7ec850', '#4a3314', '#ffe14a'),
    voice: voice('meadow', {gender: '男孩', age: '約 7～10 歲', tone: '活潑淘氣', speedLabel: '偏快，尾音俏皮', emotion: '愛惡作劇的小朋友', pitch: '+70Hz', rate: '+14%', say: '嘿！先追上我再說！', notes: '像追著你跑的小孩，結尾上揚。'}),
  },
  pond: {
    portrait: 'assets/boss-portraits/pond.webp',
    boss: 'articuno', name: '大眼蛙', line: '呱！別把池水弄髒喔！',
    theme: theme('#4d8a6a', '#d9f7e4', '#3fb8c9', '#1f4a45', '#9ef0e6'),
    voice: voice('pond', {gender: '男孩', age: '約 8～10 歲', tone: '圓潤柔軟', speedLabel: '中快', emotion: '可愛、護池塘', pitch: '+45Hz', rate: '+6%', say: '呱！別把池水弄髒喔！', notes: '開頭帶青蛙擬聲「呱」，比小黃更圓潤。'}),
  },
  waterfall: {
    portrait: 'assets/boss-portraits/waterfall.webp',
    boss: 'suicune', name: '水仙子', line: '水花會替我迎接你。',
    theme: theme('#6b97b8', '#e6f6ff', '#f1d96a', '#27495f', '#bfeaff'),
    voice: voice('waterfall', {voiceName: HSIAOCHEN, gender: '少女／年輕女性', age: '約 18～22 歲', tone: '溫柔清亮、帶仙氣', speedLabel: '偏慢，像吟唱', emotion: '優雅、空靈', pitch: '+8Hz', rate: '-12%', say: '水花會替我迎接你。', notes: '唯一的女聲；整體放慢，尾音拉長。'}),
  },
  orchard: {
    portrait: 'assets/boss-portraits/orchard.webp',
    boss: 'zapdos', name: 'C老猴', line: '想過關？先接我一招！',
    theme: theme('#a8602a', '#ffe0b0', '#e2573c', '#4a2a12', '#ffb04a'),
    voice: voice('orchard', {gender: '男孩／年輕男聲', age: '約 10～15 歲', tone: '機靈挑釁', speedLabel: '快，語尾上挑', emotion: '頑皮、愛逞強', pitch: '+35Hz', rate: '+18%', say: '想過關？先接我一招！', notes: '帶猴子的機靈感，句尾挑釁。'}),
  },
  forge: {
    portrait: 'assets/boss-portraits/forge.webp',
    boss: 'raichu', name: '龐克兔', line: '來吧！聽我的雷鳴節拍！',
    theme: theme('#5a3f8a', '#ece0ff', '#e7ff3a', '#241a3c', '#6fb7ff'),
    voice: voice('forge', {gender: '中性偏少年', age: '約 15～18 歲', tone: '搖滾、張揚', speedLabel: '中快，有節奏', emotion: '自信、喊麥感', pitch: '+20Hz', rate: '+10%', say: '來吧！聽我的雷鳴節拍！', notes: '像舞台上開場喊話，字字有重拍。'}),
  },
  desert: {
    portrait: 'assets/boss-portraits/desert.webp',
    boss: 'chimchar', name: '阿宏牛仔', line: '荒野規矩，由我來定。',
    theme: theme('#8a5a30', '#f3d9a8', '#b8472f', '#3e2412', '#ffcf6a'),
    voice: voice('desert', {gender: '少年', age: '約 14～17 歲', tone: '瀟灑自信', speedLabel: '中慢，吐字清楚', emotion: '西部英雄感', pitch: '+8Hz', rate: '-4%', say: '荒野規矩，由我來定。', notes: '稍微壓低，帶一點牛仔的懶洋洋。'}),
  },
  observatory: {
    portrait: 'assets/boss-portraits/observatory.webp',
    boss: 'monferno', name: '藍金星輝法師', line: '星光，已經替我回答了。',
    theme: theme('#2f4a8a', '#dde6ff', '#e6bd45', '#17244a', '#9fc0ff'),
    voice: voice('observatory', {gender: '青年男聲', age: '約 25～30 歲', tone: '穩定、神秘', speedLabel: '偏慢，像宣告預言', emotion: '知性、篤定', pitch: '-4Hz', rate: '-14%', say: '星光，已經替我回答了。', notes: '句中停頓，像在念星象。'}),
  },
  night: {
    portrait: 'assets/boss-portraits/night.webp',
    boss: 'dialga', name: '綠眼蝙怪', line: '夜色，最適合狩獵了。',
    theme: theme('#2f4a3a', '#d7ead5', '#8bff4a', '#12201a', '#7dff9a'),
    voice: voice('night', {gender: '中性偏陰柔少年', age: '約 16～20 歲', tone: '低沉、狡黠', speedLabel: '中慢，帶壞笑', emotion: '夜行者的得意', pitch: '-12Hz', rate: '-8%', say: '夜色，最適合狩獵了。', notes: '壓低聲音，尾音輕輕下沉。'}),
  },
  tower: {
    portrait: 'assets/boss-portraits/tower.webp',
    boss: 'pikachu', name: '歐頭慢', line: '別急，我慢慢陪你玩。',
    theme: theme('#8a7ab0', '#fbf3e4', '#6fb9ff', '#3a2f55', '#ffe8ff'),
    voice: voice('tower', {gender: '憨厚男聲', age: '約 18～22 歲', tone: '慢吞吞、呆萌', speedLabel: '刻意放慢', emotion: '反差萌', pitch: '-2Hz', rate: '-28%', say: '別急……我慢慢，陪你玩。', notes: '刻意慢半拍；ttsText 加停頓標點。'}),
  },
  abyss: {
    portrait: 'assets/boss-portraits/abyss.webp',
    boss: 'mewtwo', name: '水蛟龍王', line: '深淵之門，不為弱者而開。',
    theme: theme('#1c3f66', '#d3e6f5', '#58d6ff', '#0c1d33', '#6fe0ff'),
    voice: voice('abyss', {gender: '成熟男聲', age: '約 40～50 歲', tone: '低沉宏亮、王者威嚴', speedLabel: '中慢，帶壓迫感', emotion: '最終頭目', pitch: '-26Hz', rate: '-14%', say: '深淵之門，不為弱者而開。', notes: '最低沉的一位，視角略仰視。'}),
  },
});

export function openingFor(stage) {
  const line = BOSS_OPENINGS[stage?.id];
  return line?.boss === stage?.boss ? line : null;
}
export const MAX_OPENING_CHARS = 18, OPENING_SECONDS = [3.2, 4.2];
