export type EquipmentSlot = "weapon" | "armor" | "charm";

export type UltimateKind =
  | "egg-yolk-lazy"
  | "giant-leek-flurry"
  | "pearl-boba-guard"
  | "eraser-rescue";

export type ItemEffect =
  | { type: "heal"; amount: number }
  | { type: "attackBonus"; amount: number }
  | { type: "damageReduction"; amount: number }
  | { type: "maxHpBonus"; amount: number }
  | { type: "eliminateWrongAnswer"; uses: number }
  | { type: "preventWrongHit"; uses: number }
  | { type: "coinBonus"; multiplier: number };

export type GameItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  unlockAfterStage: number;
  kind: "consumable" | "equipment";
  slot?: EquipmentSlot;
  icon: string;
  artKey: string;
  effects: readonly ItemEffect[];
  ultimate?: UltimateKind;
};

/** Stage-one shop inventory. Values are deliberately small so math remains the focus. */
export const GAME_ITEMS = [
  {
    id: "mountain-rice-ball",
    name: "山林飯糰",
    description: "戰鬥中回復 30 點體力。",
    price: 18,
    unlockAfterStage: 1,
    kind: "consumable",
    icon: "🍙",
    artKey: "item-rice-ball",
    effects: [{ type: "heal", amount: 30 }],
  },
  {
    id: "giant-leek-sword",
    name: "大蔥神劍",
    description: "揮舞時很有氣勢，答對額外造成 4 點傷害。",
    price: 26,
    unlockAfterStage: 1,
    kind: "equipment",
    slot: "weapon",
    icon: "🥬",
    artKey: "weapon-giant-leek",
    effects: [{ type: "attackBonus", amount: 4 }],
  },
  {
    id: "pot-lid-shield",
    name: "鍋蓋勇者盾",
    description: "叮叮噹噹也很可靠，每次受傷減少 2 點。",
    price: 28,
    unlockAfterStage: 1,
    kind: "equipment",
    slot: "armor",
    icon: "🍳",
    artKey: "armor-pot-lid",
    effects: [{ type: "damageReduction", amount: 2 }],
  },
  {
    id: "plum-focus-candy",
    name: "梅子專心糖",
    description: "下一題去除一個錯誤選項。",
    price: 28,
    unlockAfterStage: 2,
    kind: "consumable",
    icon: "🔴",
    artKey: "item-plum-candy",
    effects: [{ type: "eliminateWrongAnswer", uses: 1 }],
  },
  {
    id: "owl-feather",
    name: "領角鴞羽毛",
    description: "抵擋一次答錯時受到的攻擊。",
    price: 38,
    unlockAfterStage: 4,
    kind: "consumable",
    icon: "🪶",
    artKey: "item-owl-feather",
    effects: [{ type: "preventWrongHit", uses: 1 }],
  },
  {
    id: "cedar-practice-sword",
    name: "紅檜練習劍",
    description: "答對時額外造成 6 點傷害。",
    price: 62,
    unlockAfterStage: 1,
    kind: "equipment",
    slot: "weapon",
    icon: "🗡️",
    artKey: "weapon-cedar-sword",
    effects: [{ type: "attackBonus", amount: 6 }],
  },
  {
    id: "firefly-wand",
    name: "螢火算術杖",
    description: "答對時額外造成 10 點傷害。",
    price: 96,
    unlockAfterStage: 7,
    kind: "equipment",
    slot: "weapon",
    icon: "✨",
    artKey: "weapon-firefly-wand",
    effects: [{ type: "attackBonus", amount: 10 }],
  },
  {
    id: "giant-pencil-blade",
    name: "超長鉛筆劍",
    description: "先算再寫最後出招，答對額外造成 8 點傷害。",
    price: 64,
    unlockAfterStage: 3,
    kind: "equipment",
    slot: "weapon",
    icon: "✏️",
    artKey: "weapon-giant-pencil",
    effects: [{ type: "attackBonus", amount: 8 }],
  },
  {
    id: "rattan-round-shield",
    name: "月桃藤圓盾",
    description: "每次受到的傷害減少 4 點。",
    price: 70,
    unlockAfterStage: 3,
    kind: "equipment",
    slot: "armor",
    icon: "🛡️",
    artKey: "armor-rattan-shield",
    effects: [{ type: "damageReduction", amount: 4 }],
  },
  {
    id: "star-hero-shield",
    name: "星紋英雄盾",
    description: "原創紅白藍星紋圓盾，每次受傷減少 5 點。",
    price: 72,
    unlockAfterStage: 4,
    kind: "equipment",
    slot: "armor",
    icon: "⭐",
    artKey: "armor-star-hero-shield",
    effects: [{ type: "damageReduction", amount: 5 }],
  },
  {
    id: "clouded-leopard-cloak",
    name: "雲紋披風",
    description: "最大體力增加 20 點。",
    price: 105,
    unlockAfterStage: 8,
    kind: "equipment",
    slot: "armor",
    icon: "🧥",
    artKey: "armor-cloud-cloak",
    effects: [{ type: "maxHpBonus", amount: 20 }],
  },
  {
    id: "egg-yolk-lazy-charm",
    name: "蛋黃哥懶懶護符",
    description: "放出森林嫩芽蛋黃哥，敵人打瞌睡並跳過下一次攻擊。",
    price: 76,
    unlockAfterStage: 1,
    kind: "equipment",
    slot: "charm",
    icon: "🥚",
    artKey: "charm-egg-yolk",
    ultimate: "egg-yolk-lazy",
    effects: [],
  },
  {
    id: "giant-leek-ultimate-charm",
    name: "大蔥嗆辣護符",
    description: "使用後蓄積蔥香，下一次答對題目會連續攻擊兩次。",
    price: 84,
    unlockAfterStage: 1,
    kind: "equipment",
    slot: "charm",
    icon: "🥬",
    artKey: "charm-giant-leek",
    ultimate: "giant-leek-flurry",
    effects: [],
  },
  {
    id: "pearl-boba-ultimate-charm",
    name: "珍珠泡泡盾護符",
    description: "召喚兩顆珍珠泡泡，抵擋接下來兩次答錯攻擊。",
    price: 92,
    unlockAfterStage: 2,
    kind: "equipment",
    slot: "charm",
    icon: "🧋",
    artKey: "charm-pearl-boba",
    ultimate: "pearl-boba-guard",
    effects: [],
  },
  {
    id: "eraser-rescue-charm",
    name: "橡皮擦救援護符",
    description: "擦掉一個錯誤答案，下一題只留下兩個選項。",
    price: 68,
    unlockAfterStage: 3,
    kind: "equipment",
    slot: "charm",
    icon: "🧽",
    artKey: "charm-eraser-rescue",
    ultimate: "eraser-rescue",
    effects: [],
  },
] as const satisfies readonly GameItem[];

export type GameItemId = (typeof GAME_ITEMS)[number]["id"];

export const getItemById = (id: string): GameItem | undefined =>
  GAME_ITEMS.find((item) => item.id === id);

export const getUnlockedItems = (completedStage: number): readonly GameItem[] =>
  GAME_ITEMS.filter((item) => item.unlockAfterStage <= completedStage);
