/**
 * 第一大關的純資料設定。
 *
 * 本檔不存放 React、DOM、CSS 或 localStorage 操作，讓畫面、狀態機與測試
 * 都可以引用同一份不可變設定。
 */

export type SchoolGrade = 3 | 4;

export type QuestionDomain =
  | "number-sense"
  | "addition-subtraction"
  | "multiplication"
  | "division"
  | "measurement"
  | "time"
  | "geometry"
  | "mixed";

export type EquipmentSlot = "weapon" | "armor" | "charm";

export type GameScreenState =
  | "booting"
  | "title"
  | "chapter-intro"
  | "battle-intro"
  | "battle"
  | "victory"
  | "defeat"
  | "travel"
  | "checkpoint"
  | "shop"
  | "chapter-complete"
  | "paused"
  | "fatal-error";

export type BattlePhase =
  | "presenting-question"
  | "awaiting-answer"
  | "answer-locked"
  | "showing-correct-feedback"
  | "player-attacking"
  | "showing-wrong-feedback"
  | "enemy-attacking"
  | "checking-outcome"
  | "loading-next-question";

export interface StatModifiers {
  readonly attack?: number;
  readonly defense?: number;
  readonly maxHp?: number;
}

export type ConsumableEffect =
  | {
      readonly type: "heal";
      readonly amount: number;
    }
  | {
      readonly type: "show-concept-hint";
    };

interface BaseShopItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
  /** 0 代表遊戲開始即可購買；n 代表通過第 n 小關後解鎖。 */
  readonly unlockAfterLevel: number;
  readonly maxOwned: number;
  readonly iconKey: string;
  readonly purchaseSfxKey: string;
}

export interface ConsumableShopItem extends BaseShopItem {
  readonly kind: "consumable";
  readonly effect: ConsumableEffect;
}

export interface EquipmentShopItem extends BaseShopItem {
  readonly kind: "equipment";
  readonly slot: EquipmentSlot;
  readonly modifiers: StatModifiers;
}

export type ShopItem = ConsumableShopItem | EquipmentShopItem;

export interface QuestionPoolQuery {
  readonly grades: readonly SchoolGrade[];
  readonly curriculumCodes: readonly string[];
  readonly domains: readonly QuestionDomain[];
  /** 1 是入門，5 是本章最高難度；由題庫匯入器映射到自己的難度欄位。 */
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly minPoolSize: number;
  readonly requireThreeChoices: true;
  readonly requireExplanation: true;
}

export interface BossPhase {
  readonly id: string;
  readonly name: string;
  /** 敵人 HP 首次降到此比例以下時進入；只改演出，不改題目難度或傷害。 */
  readonly enterAtHpRatio: number;
  readonly visualFxKey: string;
}

export interface EnemyConfig {
  readonly id: string;
  readonly name: string;
  readonly maxHp: number;
  /** 玩家答錯時的基礎傷害，實際傷害會扣除裝備防禦。 */
  readonly wrongAnswerDamage: number;
  readonly artKey: string;
  readonly hitSfxKey: string;
  readonly attackSfxKey: string;
  readonly defeatFxKey: string;
  readonly bossPhases?: readonly BossPhase[];
}

export interface LevelConfig {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly objective: string;
  readonly isBoss: boolean;
  readonly enemy: EnemyConfig;
  readonly questionPool: QuestionPoolQuery;
  readonly firstClearCoinReward: number;
  readonly travelCopy: string;
  readonly recommendedUpgradeIds: readonly string[];
}

export interface ChapterConfig {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly subtitle: string;
  readonly sceneArtKey: string;
  readonly battleMusicKey: string;
  readonly bossMusicKey: string;
  readonly levels: readonly LevelConfig[];
}

export interface GameSaveV1 {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly currentChapterId: string;
  /** 下一個要進入的小關；1 到 10。通關後仍保存為 10，另由 chapterCompleted 判斷。 */
  readonly nextLevelOrder: number;
  readonly chapterCompleted: boolean;
  readonly clearedLevelIds: readonly string[];
  readonly player: {
    readonly currentHp: number;
    readonly coins: number;
    readonly inventory: Readonly<Record<string, number>>;
    readonly equipped: Readonly<Partial<Record<EquipmentSlot, string>>>;
  };
  readonly settings: {
    readonly musicEnabled: boolean;
    readonly soundEffectsEnabled: boolean;
    readonly reducedMotion: boolean;
    readonly highContrast: boolean;
    readonly textScale: 1 | 1.15 | 1.3;
  };
}

export const GAME_SAVE_SCHEMA_VERSION = 1 as const;
export const GAME_SAVE_KEY = "math-hero-local-save:v1";
export const GAME_SAVE_BACKUP_KEY = "math-hero-local-save:backup:v1";

export const BATTLE_TUNING = {
  playerBaseStats: {
    maxHp: 100,
    attack: 26,
    defense: 0,
  },
  /** 正確傷害 = 基礎攻擊 + weapon.attack + charm.attack，無亂數、無爆擊。 */
  minimumDamage: 1,
  /** 答錯傷害 = max(1, 關卡基礎傷害 - armor.defense)。 */
  postVictoryHealRatio: 0.25,
  defeatRetryHpRatio: 0.6,
  maxConsecutiveWrongBeforeHintOffer: 2,
  questionRepeatWindow: 12,
  timersMs: {
    answerLock: 250,
    feedback: 900,
    playerAttack: 650,
    enemyAttack: 700,
    victory: 1_100,
    travel: 1_600,
    reducedMotionTransition: 200,
  },
} as const;

export const STARTING_STATE = {
  coins: 0,
  inventory: {
    "healing-herb": 1,
  },
  equipped: {},
} as const;

export const SHOP_ITEMS = [
  {
    id: "healing-herb",
    name: "回復藥草",
    description: "戰鬥中回復 40 HP；不會消耗答題回合。",
    kind: "consumable",
    effect: { type: "heal", amount: 40 },
    price: 16,
    unlockAfterLevel: 0,
    maxOwned: 5,
    iconKey: "item-healing-herb",
    purchaseSfxKey: "sfx-shop-buy",
  },
  {
    id: "concept-scroll",
    name: "提示卷軸",
    description: "顯示本題的觀念提示，但不直接揭露答案。",
    kind: "consumable",
    effect: { type: "show-concept-hint" },
    price: 20,
    unlockAfterLevel: 1,
    maxOwned: 3,
    iconKey: "item-concept-scroll",
    purchaseSfxKey: "sfx-shop-buy",
  },
  {
    id: "oak-number-blade",
    name: "橡木數字劍",
    description: "正確答案的攻擊力 +7。",
    kind: "equipment",
    slot: "weapon",
    modifiers: { attack: 7 },
    price: 50,
    unlockAfterLevel: 2,
    maxOwned: 1,
    iconKey: "equipment-oak-number-blade",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "leaf-buckler",
    name: "葉紋圓盾",
    description: "答錯受到的傷害 -4。",
    kind: "equipment",
    slot: "armor",
    modifiers: { defense: 4 },
    price: 60,
    unlockAfterLevel: 3,
    maxOwned: 1,
    iconKey: "equipment-leaf-buckler",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "forest-trail-boots",
    name: "森林旅靴",
    description: "最大 HP +12。",
    kind: "equipment",
    slot: "charm",
    modifiers: { maxHp: 12 },
    price: 70,
    unlockAfterLevel: 4,
    maxOwned: 1,
    iconKey: "equipment-forest-trail-boots",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "iron-equation-blade",
    name: "鐵鑄算式劍",
    description: "正確答案的攻擊力 +14。",
    kind: "equipment",
    slot: "weapon",
    modifiers: { attack: 14 },
    price: 115,
    unlockAfterLevel: 5,
    maxOwned: 1,
    iconKey: "equipment-iron-equation-blade",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "scholar-cloak",
    name: "學者斗篷",
    description: "答錯受到的傷害 -7。",
    kind: "equipment",
    slot: "armor",
    modifiers: { defense: 7 },
    price: 110,
    unlockAfterLevel: 6,
    maxOwned: 1,
    iconKey: "equipment-scholar-cloak",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "courage-badge",
    name: "心算勇氣徽章",
    description: "攻擊力 +3、最大 HP +10。",
    kind: "equipment",
    slot: "charm",
    modifiers: { attack: 3, maxHp: 10 },
    price: 125,
    unlockAfterLevel: 7,
    maxOwned: 1,
    iconKey: "equipment-courage-badge",
    purchaseSfxKey: "sfx-shop-equip",
  },
  {
    id: "greater-healing-herb",
    name: "大回復藥草",
    description: "戰鬥中回復 80 HP；不會消耗答題回合。",
    kind: "consumable",
    effect: { type: "heal", amount: 80 },
    price: 42,
    unlockAfterLevel: 8,
    maxOwned: 3,
    iconKey: "item-greater-healing-herb",
    purchaseSfxKey: "sfx-shop-buy",
  },
] as const satisfies readonly ShopItem[];

export const CHAPTER_ONE = {
  id: "chapter-1-numberwood",
  order: 1,
  name: "數字森林",
  subtitle: "找回被混沌算龍奪走的計算之光",
  sceneArtKey: "scene-numberwood",
  battleMusicKey: "music-numberwood-battle",
  bossMusicKey: "music-numberwood-boss",
  levels: [
    {
      id: "chapter-1-level-1",
      order: 1,
      name: "萬位林徑",
      objective: "讀寫與比較一萬以內的數",
      isBoss: false,
      enemy: {
        id: "moss-number-slime",
        name: "苔球數字怪",
        maxHp: 26,
        wrongAnswerDamage: 9,
        artKey: "enemy-moss-number-slime",
        hitSfxKey: "sfx-enemy-soft-hit",
        attackSfxKey: "sfx-enemy-bounce",
        defeatFxKey: "fx-leaf-pop",
      },
      questionPool: {
        grades: [3],
        curriculumCodes: ["N-3-1"],
        domains: ["number-sense"],
        difficulty: 1,
        minPoolSize: 8,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 28,
      travelCopy: "數字石碑重新發光，勇者走向林間岔路。",
      recommendedUpgradeIds: ["healing-herb", "concept-scroll"],
    },
    {
      id: "chapter-1-level-2",
      order: 2,
      name: "進退位吊橋",
      objective: "完成含進位、退位的加減計算",
      isBoss: false,
      enemy: {
        id: "pinecone-collector",
        name: "松果搬運怪",
        maxHp: 30,
        wrongAnswerDamage: 10,
        artKey: "enemy-pinecone-collector",
        hitSfxKey: "sfx-enemy-wood-hit",
        attackSfxKey: "sfx-enemy-pinecone-throw",
        defeatFxKey: "fx-pinecone-burst",
      },
      questionPool: {
        grades: [3],
        curriculumCodes: ["N-3-2"],
        domains: ["addition-subtraction"],
        difficulty: 1,
        minPoolSize: 8,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 30,
      travelCopy: "吊橋落下，通往森林深處的道路出現了。",
      recommendedUpgradeIds: ["oak-number-blade"],
    },
    {
      id: "chapter-1-level-3",
      order: 3,
      name: "乘法菇圈",
      objective: "計算二、三位數乘以一位數",
      isBoss: false,
      enemy: {
        id: "nine-cap-mushroom",
        name: "九格菇妖",
        maxHp: 34,
        wrongAnswerDamage: 11,
        artKey: "enemy-nine-cap-mushroom",
        hitSfxKey: "sfx-enemy-soft-hit",
        attackSfxKey: "sfx-enemy-spore",
        defeatFxKey: "fx-spore-stars",
      },
      questionPool: {
        grades: [3],
        curriculumCodes: ["N-3-3"],
        domains: ["multiplication"],
        difficulty: 2,
        minPoolSize: 10,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 34,
      travelCopy: "發亮的菇圈排成箭頭，指向一座石門。",
      recommendedUpgradeIds: ["leaf-buckler"],
    },
    {
      id: "chapter-1-level-4",
      order: 4,
      name: "整除石門",
      objective: "理解除法、餘數與乘除互逆",
      isBoss: false,
      enemy: {
        id: "division-beetle",
        name: "餘數甲蟲",
        maxHp: 38,
        wrongAnswerDamage: 12,
        artKey: "enemy-division-beetle",
        hitSfxKey: "sfx-enemy-shell-hit",
        attackSfxKey: "sfx-enemy-horn-charge",
        defeatFxKey: "fx-shell-spark",
      },
      questionPool: {
        grades: [3],
        curriculumCodes: ["N-3-4", "N-3-5", "R-3-1"],
        domains: ["division"],
        difficulty: 2,
        minPoolSize: 10,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 38,
      travelCopy: "石門上的除號轉正，清泉步道向前延伸。",
      recommendedUpgradeIds: ["leaf-buckler", "forest-trail-boots"],
    },
    {
      id: "chapter-1-level-5",
      order: 5,
      name: "量感清泉",
      objective: "換算長度、容量與重量單位",
      isBoss: false,
      enemy: {
        id: "ruler-lizard",
        name: "量尺蜥蜴",
        maxHp: 42,
        wrongAnswerDamage: 13,
        artKey: "enemy-ruler-lizard",
        hitSfxKey: "sfx-enemy-scale-hit",
        attackSfxKey: "sfx-enemy-tail-swipe",
        defeatFxKey: "fx-water-rings",
      },
      questionPool: {
        grades: [3],
        curriculumCodes: ["N-3-12", "N-3-15", "N-3-16"],
        domains: ["measurement"],
        difficulty: 2,
        minPoolSize: 12,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 42,
      travelCopy: "清泉化為光帶，載著勇者穿過樹根隧道。",
      recommendedUpgradeIds: ["iron-equation-blade"],
    },
    {
      id: "chapter-1-level-6",
      order: 6,
      name: "時計樹洞",
      objective: "處理日、時、分、秒的換算與加減",
      isBoss: false,
      enemy: {
        id: "pendulum-bat",
        name: "鐘擺蝙蝠",
        maxHp: 46,
        wrongAnswerDamage: 14,
        artKey: "enemy-pendulum-bat",
        hitSfxKey: "sfx-enemy-wing-hit",
        attackSfxKey: "sfx-enemy-clock-wave",
        defeatFxKey: "fx-clock-dust",
      },
      questionPool: {
        grades: [3, 4],
        curriculumCodes: ["N-3-17", "N-4-13"],
        domains: ["time"],
        difficulty: 3,
        minPoolSize: 12,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 46,
      travelCopy: "停住的森林時鐘再次走動，樹冠升起石階。",
      recommendedUpgradeIds: ["iron-equation-blade", "scholar-cloak"],
    },
    {
      id: "chapter-1-level-7",
      order: 7,
      name: "大數遺跡",
      objective: "讀寫一億以內的數並取概數",
      isBoss: false,
      enemy: {
        id: "place-value-golem",
        name: "萬位石像",
        maxHp: 50,
        wrongAnswerDamage: 15,
        artKey: "enemy-place-value-golem",
        hitSfxKey: "sfx-enemy-stone-hit",
        attackSfxKey: "sfx-enemy-stone-stomp",
        defeatFxKey: "fx-rune-fragments",
      },
      questionPool: {
        grades: [4],
        curriculumCodes: ["N-4-1", "N-4-4"],
        domains: ["number-sense"],
        difficulty: 3,
        minPoolSize: 12,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 50,
      travelCopy: "巨大位值盤轉動，開啟通往高塔的藤蔓電梯。",
      recommendedUpgradeIds: ["scholar-cloak", "courage-badge"],
    },
    {
      id: "chapter-1-level-8",
      order: 8,
      name: "乘除高塔",
      objective: "完成較大位數的乘除計算",
      isBoss: false,
      enemy: {
        id: "long-calculation-drake",
        name: "直式飛龍",
        maxHp: 56,
        wrongAnswerDamage: 16,
        artKey: "enemy-long-calculation-drake",
        hitSfxKey: "sfx-enemy-scale-hit",
        attackSfxKey: "sfx-enemy-number-flame",
        defeatFxKey: "fx-number-flame-out",
      },
      questionPool: {
        grades: [4],
        curriculumCodes: ["N-4-2"],
        domains: ["multiplication", "division"],
        difficulty: 4,
        minPoolSize: 14,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 56,
      travelCopy: "高塔的算式旗幟展開，遠方王城映入眼簾。",
      recommendedUpgradeIds: ["courage-badge", "greater-healing-herb"],
    },
    {
      id: "chapter-1-level-9",
      order: 9,
      name: "方格城門",
      objective: "運用正方形與長方形的周長、面積公式",
      isBoss: false,
      enemy: {
        id: "grid-knight",
        name: "方格騎士",
        maxHp: 64,
        wrongAnswerDamage: 18,
        artKey: "enemy-grid-knight",
        hitSfxKey: "sfx-enemy-armor-hit",
        attackSfxKey: "sfx-enemy-grid-slash",
        defeatFxKey: "fx-grid-shatter",
      },
      questionPool: {
        grades: [4],
        curriculumCodes: ["S-4-3", "R-4-3"],
        domains: ["geometry"],
        difficulty: 4,
        minPoolSize: 14,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 65,
      travelCopy: "城門化成整齊方格，勇者踏上魔王大殿的長階。",
      recommendedUpgradeIds: ["greater-healing-herb"],
    },
    {
      id: "chapter-1-level-10",
      order: 10,
      name: "混沌算龍之殿",
      objective: "綜合運用本章數感、四則、測量、時間與幾何",
      isBoss: true,
      enemy: {
        id: "chaos-arithmetic-dragon",
        name: "魔王・混沌算龍",
        maxHp: 120,
        wrongAnswerDamage: 22,
        artKey: "boss-chaos-arithmetic-dragon",
        hitSfxKey: "sfx-boss-armor-hit",
        attackSfxKey: "sfx-boss-chaos-breath",
        defeatFxKey: "fx-chapter-light-restored",
        bossPhases: [
          {
            id: "broken-guard",
            name: "算式護甲崩裂",
            enterAtHpRatio: 0.66,
            visualFxKey: "fx-boss-guard-break",
          },
          {
            id: "last-equation",
            name: "最後算式",
            enterAtHpRatio: 0.33,
            visualFxKey: "fx-boss-final-phase",
          },
        ],
      },
      questionPool: {
        grades: [3, 4],
        curriculumCodes: [
          "N-3-2",
          "N-3-3",
          "N-3-5",
          "N-3-12",
          "N-3-17",
          "N-4-1",
          "N-4-2",
          "N-4-13",
          "S-4-3",
        ],
        domains: ["mixed"],
        difficulty: 5,
        minPoolSize: 20,
        requireThreeChoices: true,
        requireExplanation: true,
      },
      firstClearCoinReward: 100,
      travelCopy: "計算之光重返森林，所有道路一起亮了起來。",
      recommendedUpgradeIds: ["greater-healing-herb"],
    },
  ],
} as const satisfies ChapterConfig;

export const CHAPTERS = [CHAPTER_ONE] as const satisfies readonly ChapterConfig[];

