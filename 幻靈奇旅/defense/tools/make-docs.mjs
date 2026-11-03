/* Writes docs/十關魔王語音與對話設計.md, docs/十關島嶼3D設計規格.md and docs/island-design.json from one table
   (the boss lines live in js/boss-openings.js). Run: node defense/tools/make-docs.mjs */
import {writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {STAGES} from '../js/stages.js';
import {BOSS_OPENINGS} from '../js/boss-openings.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), docs = join(root, 'docs');
mkdirSync(docs, {recursive: true});

/* theme, main colours, terrain keywords, buildings/decor, mood, lighting, landmarks, and the props now in the game */
const ISLANDS = {
  meadow: {theme: '草原型新手島', colors: ['嫩綠', '白花', '暖黃'], terrain: ['大面積草皮', '小土坡', '鄉村小徑'], decor: ['木柵欄', '風車', '穀倉', '白花叢', '乾草堆'], mood: '明亮療癒、適合初學者的可愛農村島', light: '柔和暖陽、高飽和草色', landmarks: ['風車', '穀倉'], props: ['mound', 'whiteFlowers', 'windmill', 'barn', 'fence']},
  pond: {theme: '池塘濕地島', colors: ['青綠', '湖水藍', '白泡泡'], terrain: ['中央大池', '濕地', '小瀑流'], decor: ['睡蓮與荷葉', '木棧橋', '蘆葦', '圓潤石頭', '青蛙雕像'], mood: '生態童話感，水氣與泡泡', light: '清亮日光、水面輕微起伏', landmarks: ['木棧橋', '青蛙雕像'], props: ['boardwalk', 'frogStatue', 'bubbles', 'pond', 'frog']},
  waterfall: {theme: '瀑布花境島', colors: ['水藍', '白', '淡黃'], terrain: ['多層岩壁', '石階', '清潭'], decor: ['瀑布', '水仙花叢', '濕潤岩壁', '彩虹水霧', '漂浮花瓣'], mood: '空靈唯美的森林仙境', light: '潮濕柔光、水霧中的彩虹', landmarks: ['瀑布與彩虹', '石階'], props: ['daffodils', 'stoneSteps', 'rainbow', 'petals', 'waterfallCliff']},
  orchard: {theme: '果園樹屋島', colors: ['橙棕', '葉綠', '果紅黃'], terrain: ['高低差平台', '果樹林'], decor: ['大量果樹', '藤蔓', '木梯', '樹屋', '吊橋', '掉落果實'], mood: '熱帶叢林樂園感', light: '暖橙午後光', landmarks: ['樹屋', '吊橋'], props: ['treehouse', 'ropeBridge', 'fruitTree', 'basket', 'ladder']},
  forge: {theme: '雷電工坊島', colors: ['紫', '電藍', '螢光黃', '黑'], terrain: ['金屬平台', '工業管線'], decor: ['發電線圈', '喇叭', '舞台燈架', '霓虹燈'], mood: '機械搖滾舞台結合工坊', light: '暖橙黃昏加電光', landmarks: ['特斯拉線圈', '舞台燈架'], props: ['teslaCoil', 'speakerStack', 'stageLights', 'house', 'lantern']},
  desert: {theme: '西部荒野島', colors: ['沙棕', '深咖', '酒紅', '夕陽金'], terrain: ['紅土峽谷', '岩台'], decor: ['仙人掌', '木頭酒館', '馬車', '路牌', '木柵欄'], mood: '小鎮式決鬥廣場', light: '夕陽長影、暖金色', landmarks: ['酒館', '馬車與路牌'], props: ['wagon', 'signpost', 'deadTree', 'saloon', 'cactus', 'mesa']},
  observatory: {theme: '觀星法陣島', colors: ['藍', '金', '銀白'], terrain: ['高台', '星盤地面'], decor: ['天文台', '金色法陣', '浮空碎石', '望遠鏡', '星象塔', '流星'], mood: '高貴神祕', light: '暮紫天光、星光點綴', landmarks: ['星盤法陣', '星象塔'], props: ['magicCircle', 'floatRock', 'starTowerSmall', 'shootingStar', 'telescope', 'domeHall']},
  night: {theme: '月夜森林島', colors: ['墨綠', '深紫', '黑藍', '螢光綠'], terrain: ['林地', '枯木區'], decor: ['扭曲樹木', '霧氣', '發光菌菇', '蝙蝠剪影', '毒霧'], mood: '微陰森但仍保有童話風', light: '冷月光、螢光點綴（不閃爍）', landmarks: ['扭曲古樹', '蝙蝠群'], props: ['twistedTree', 'mist', 'bats', 'mushroom', 'pine']},
  tower: {theme: '塔城平台島', colors: ['米白', '淡紫', '彩虹', '柔和藍'], terrain: ['圓形廣場', '雲階'], decor: ['星穹塔', '漂浮石板', '彩色能量紋', '水晶'], mood: '守關塔樓與夢幻天空感', light: '柔和粉紫天光', landmarks: ['星穹塔', '彩色能量廣場'], props: ['starTower', 'plaza', 'floatSlab', 'pillar', 'crystalCluster']},
  abyss: {theme: '深海王座島', colors: ['深海藍', '青黑', '冷白', '雷光藍'], terrain: ['海蝕岩', '深淵裂口'], decor: ['古代海神遺跡', '龍紋祭壇', '巨浪拍岸', '雷雨天空'], mood: '最終關的史詩與危險感', light: '暴風雨冷光、青光祭壇', landmarks: ['龍紋祭壇', '海神拱門'], props: ['dragonAltar', 'ruinArch', 'rift', 'foamRock', 'coral']},
};

const rows = STAGES.map((st, i) => {
  const b = BOSS_OPENINGS[st.id], d = ISLANDS[st.id];
  return {no: i + 1, id: st.id, stage: st.name, boss: b.name, species: b.boss, line: b.line, voice: b.voice, theme: b.theme, pose: b.pose, island: d};
});

let md = `# 十關魔王語音與對話設計

由 \`js/boss-openings.js\` 產生（\`node defense/tools/make-docs.mjs\`）。每位魔王只說 1 句（8～18 字），開場在戰場畫面完成、發牌開始後出現，顯示 3.2～4.2 秒後自動淡出，也可點 × 關閉。

## 對話框

- 鄉村風：木框、麻布紙卡、手繪虛線邊、底部草葉；標題列為「第X關｜關卡名｜魔王名」。
- 底框顏色取自各魔王外觀主色（\`theme\`：木框 wood、紙卡 paper、強調 accent、字色 ink、頭像光暈 glow）。
- 頭像不是圖鑑卡，而是用該魔王自己的 3D 模型（GLB）即時渲染的透明胸像：\`view.portrait(id, pose)\`，每關載入時先渲染一次並快取，開場時嵌入對話框；若渲染失敗才退回圖鑑卡圖。
- 手機直式：框寬滿版、頭像 96px；手機橫向：框寬約 58% 螢幕、貼在上方 HUD 之下，不遮擋卡牌與主戰場。

## 十位魔王

| 關 | 關卡 | 魔王 | 台詞 | 語音（voiceName / 年齡感 / 語氣 / 語速） | pitch / rate | 框色 |
|---|---|---|---|---|---|---|
`;
for (const r of rows) md += `| ${r.no} | ${r.stage} | ${r.boss} | ${r.line} | ${r.voice.voiceName}・${r.voice.ageFeel}・${r.voice.tone}・${r.voice.speed} | ${r.voice.pitch} / ${r.voice.rate} | ${r.theme.wood} / ${r.theme.paper} |\n`;
md += `
### 逐位說明

`;
for (const r of rows) md += `**第${r.no}關｜${r.stage}｜${r.boss}** — 「${r.line}」\n- 聲音：${r.voice.genderFeel}，${r.voice.ageFeel}；${r.voice.tone}；語速${r.voice.speed}；情緒${r.voice.emotion}。${r.voice.notes}\n- 透像姿勢：yaw ${r.pose.yaw}、動作 ${r.pose.action}、取景 zoom ${r.pose.zoom}${r.pose.focus !== undefined ? '、focus ' + r.pose.focus : ''}\n\n`;
md += `## 語音檔

- 資料欄位（每位魔王的 \`voice\`）：\`voiceName\`、\`voiceKey\`、\`genderFeel\`、\`ageFeel\`、\`tone\`、\`speed\`、\`emotion\`、\`pitch\`、\`rate\`、\`notes\`、\`audioFile\`、\`ttsText\`。
- 播放：遊戲讀 \`defense/audio/boss/<voiceKey>.mp3\`；播放時 BGM 自動壓低。若檔案不存在，退回瀏覽器內建的 zh-TW 語音朗讀同一句（音調與語速依 pitch / rate 換算）。尊重「音效靜音」設定。
- 產生：\`defense/tools/make-boss-voices.cjs\` 使用 Edge 神經語音 zh-TW-YunJheNeural（雲哲）產生男聲；水仙子用 zh-TW-HsiaoChenNeural（女聲）。需要先 \`npm i ws\` 再 \`node defense/tools/make-boss-voices.cjs\`（可只指定部分，例如 \`... meadow pond\`）。台詞或聲音改了就重跑一次。
- 背景音樂：守護戰的選島畫面與戰鬥都播放本遊戲主題曲（\`assets/audio/general.mp3\`）。
`;
writeFileSync(join(docs, '十關魔王語音與對話設計.md'), md);

let md2 = `# 十關島嶼 3D 設計規格

由 \`tools/make-docs.mjs\` 的表格產生，同一份資料也輸出成 \`docs/island-design.json\`。「已實作」欄是目前遊戲內已有的標誌性道具（\`js/island-props.js\`；戰場用原尺寸、海圖小島縮小擺放），可直接作為後續 3D 建模或場景製作的依據。

`;
for (const r of rows) {
  const d = r.island;
  md2 += `## 第${r.no}關｜${r.stage}｜${r.boss}：${d.theme}

- 主色：${d.colors.join('、')}
- 地形關鍵字：${d.terrain.join('、')}
- 建築／裝飾：${d.decor.join('、')}
- 氣氛：${d.mood}
- 燈光：${d.light}
- 可辨識地標：${d.landmarks.join('、')}
- 已實作道具：${d.props.map((p) => '\`' + p + '\`').join('、')}

`;
}
writeFileSync(join(docs, '十關島嶼3D設計規格.md'), md2);
writeFileSync(join(docs, 'island-design.json'), JSON.stringify(rows.map((r) => ({stage: r.no, id: r.id, name: r.stage, boss: r.boss, ...r.island})), null, 2) + '\n');
console.log('docs written');
