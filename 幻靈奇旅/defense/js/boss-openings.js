/* Guard Battle only — 10 original stage-opening boss taunts.
   Existing portrait art and boss species IDs stay the source of truth. */
export const BOSS_OPENINGS = Object.freeze({
  "meadow": {
    "boss": "giratina",
    "name": "小黃",
    "line": "嘿！這片草原我罩的！敢踩壞一朵花，我就跳起來……先把你嚇得跌進花圃！"
  },
  "pond": {
    "boss": "articuno",
    "name": "大眼蛙",
    "line": "歡迎光臨青蛙池塘！你以為泡泡只會拿來洗澡？錯了，這裡的泡泡會追著你跑，呱！"
  },
  "waterfall": {
    "boss": "suicune",
    "name": "水仙子",
    "line": "瀑布漂亮吧？慢慢看，待會兒我的潮汐花綻會替你來一場免費的全身沖洗！"
  },
  "orchard": {
    "boss": "zapdos",
    "name": "C老猴",
    "line": "想摘我的果子？先接住三連棍再說！猴王果園可沒有『先吃後付』這回事！"
  },
  "forge": {
    "boss": "raichu",
    "name": "龐克兔",
    "line": "歡迎來到雷鳴搖滾現場！我的電吉他二連擊不收門票，只收你的求饒聲！"
  },
  "desert": {
    "boss": "chimchar",
    "name": "阿宏牛仔",
    "line": "站穩了，菜鳥！這片荒野連風都有準星，我的六芒追星連射可是從不迷路！"
  },
  "observatory": {
    "boss": "monferno",
    "name": "藍金星輝法師",
    "line": "抬頭數星星吧！等我畫完天穹星陣，你會發現連逃跑的路都被我算進星盤了！"
  },
  "night": {
    "boss": "dialga",
    "name": "綠眼蝙怪",
    "line": "月影森林夜景免費，毒光雷彈另計！別緊張，我會讓你一路『綠』到天亮，嘿嘿！"
  },
  "tower": {
    "boss": "pikachu",
    "name": "歐頭慢",
    "line": "登塔別著急，我可是歐頭慢！但我的彩虹光束啊……比你想的快那麼一點點！"
  },
  "abyss": {
    "boss": "mewtwo",
    "name": "水蛟龍王",
    "line": "居然走到了深淵？很好！我已經替你準備好終極海浪浴，保證洗得你連退路都找不到！"
  }
});
export function openingFor(stage) {
  const line = BOSS_OPENINGS[stage?.id];
  return line?.boss === stage?.boss ? line : null;
}
