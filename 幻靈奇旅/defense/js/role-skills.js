/* 幻靈守護戰 V2.0 only. 61 independent skill profiles. Do not mutate the shared adventure/arena catalog. */
export const ROLE_META = Object.freeze({
  "warrior": {
    "label": "戰士",
    "icon": "⚔️",
    "basic": "melee",
    "range": 1.7
  },
  "archer": {
    "label": "弓箭手",
    "icon": "🏹",
    "basic": "ranged",
    "range": 5.1
  },
  "mage": {
    "label": "法師",
    "icon": "🔮",
    "basic": "magic",
    "range": 8.5
  },
  "priest": {
    "label": "牧師",
    "icon": "✚",
    "basic": "heal_or_magic",
    "range": 8.5
  },
  "support": {
    "label": "輔助技能卡",
    "icon": "✨",
    "basic": "none",
    "range": 0
  }
});
export const ROLE_SKILLS = Object.freeze({
  "crown-sparrow": {"name": "羽冠麻雀王", "role": "archer", "ultimate": {"name": "百羽風舞・落葉風暴", "kind": "area", "power": 2.8, "radius": 4.5, "description": "分身旋風集中爆發，範圍傷害", "cooldown": 18}},
  "crown-rooster": {"name": "鳳冠雄雞王", "role": "warrior", "ultimate": {"name": "鳳鳴天火・烈羽風暴", "kind": "blast", "power": 3.2, "radius": 4, "description": "火鳥掠過戰場引發大爆炎", "cooldown": 18}},
  "zhaocai": {"name": "招財", "role": "archer", "ultimate": {"name": "金幣雨", "kind": "area", "power": 2.2, "radius": 4, "description": "撒出超多金幣大範圍攻擊", "cooldown": 18}},
  "zhaocai-2": {"name": "招財・魔導師", "role": "mage", "ultimate": {"name": "招財領域", "kind": "area", "power": 3, "radius": 6, "description": "金色招財法陣攻擊全範圍敵人", "cooldown": 18}},
  "zhaocai-3": {"name": "招財・守護者", "role": "warrior", "ultimate": {"name": "榮耀守護", "kind": "heal", "heal": 0.3, "targets": 99, "immune": 6, "description": "高舉盾牌，全隊免疫所有狀態 6 秒並回復 30% 血量", "cooldown": 24}},
  "bulbasaur": {
    "name": "青螺靈",
    "role": "warrior",
    "ultimate": {
      "name": "青螺共鳴",
      "kind": "area",
      "power": 1.6,
      "radius": 2,
      "description": "周身殼光震波，獲得12%生命護盾",
      "shield": 0.12,
      "cooldown": 17
    }
  },
  "ivysaur": {
    "name": "紫羽螺",
    "role": "warrior",
    "ultimate": {
      "name": "紫羽共鳴",
      "kind": "cone",
      "power": 2.2,
      "radius": 2,
      "description": "紫羽扇形斬擊並擊退",
      "knock": 1.3,
      "cooldown": 17
    }
  },
  "venusaur": {
    "name": "赤鎧螺王",
    "role": "warrior",
    "ultimate": {
      "name": "赤鎧共鳴",
      "kind": "area",
      "power": 2.4,
      "radius": 3,
      "description": "赤鎧共鳴，周身打擊與20%減傷",
      "guard": 0.2,
      "duration": 6,
      "cooldown": 17
    }
  },
  "charmander": {
    "name": "剝皮辣椒雞",
    "role": "archer",
    "ultimate": {
      "name": "辣椒投擲",
      "kind": "single",
      "power": 2.6,
      "radius": 0,
      "description": "辣椒高速投擲單體",
      "status": "burn",
      "duration": 3,
      "cooldown": 17
    }
  },
  "charmeleon": {
    "name": "雙椒辣椒雞",
    "role": "archer",
    "ultimate": {
      "name": "雙翼連投",
      "kind": "chain",
      "power": 1.8,
      "radius": 2,
      "description": "兩顆辣椒連續追射不同敵人",
      "targets": 2,
      "status": "burn",
      "duration": 3,
      "cooldown": 17
    }
  },
  "charizard": {
    "name": "豐椒辣椒雞王",
    "role": "archer",
    "ultimate": {
      "name": "烈焰辣椒雨",
      "kind": "blast",
      "power": 2.2,
      "radius": 3.2,
      "description": "烈焰辣椒雨落在密集敵群",
      "status": "burn",
      "duration": 3,
      "cooldown": 17
    }
  },
  "squirtle": {
    "name": "小芝麻",
    "role": "priest",
    "ultimate": {
      "name": "淨帽共鳴",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "治療生命比例最低的友軍25%",
      "heal": 0.25,
      "targets": 1,
      "cooldown": 18
    }
  },
  "wartortle": {
    "name": "絨芝麻",
    "role": "priest",
    "ultimate": {
      "name": "絨芝共鳴",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "治療兩名最低血量友軍各25%",
      "heal": 0.25,
      "targets": 2,
      "cooldown": 18
    }
  },
  "blastoise": {
    "name": "星冠芝麻",
    "role": "priest",
    "ultimate": {
      "name": "星冠共鳴",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "治療三名最低血量友軍各25%，並加護盾",
      "heal": 0.25,
      "targets": 3,
      "shield": 0.1,
      "cooldown": 18
    }
  },
  "chikorita": {
    "name": "沒花鹿",
    "role": "priest",
    "ultimate": {
      "name": "金蕊共鳴",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "最低血量友軍恢復30%生命",
      "heal": 0.3,
      "targets": 1,
      "cooldown": 18
    }
  },
  "bayleef": {
    "name": "花鹿米",
    "role": "priest",
    "ultimate": {
      "name": "花葉共鳴",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "最低血量友軍治療25%並持續恢復",
      "heal": 0.25,
      "targets": 1,
      "regen": 0.02,
      "duration": 5,
      "cooldown": 18
    }
  },
  "meganium": {
    "name": "藏鏡鹿",
    "role": "priest",
    "ultimate": {
      "name": "花冠映照",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "治療最低血量三友軍各20%，基地恢復5%",
      "heal": 0.2,
      "targets": 3,
      "baseHeal": 0.05,
      "cooldown": 18
    }
  },
  "cyndaquil": {
    "name": "A1",
    "role": "mage",
    "ultimate": {
      "name": "集能大光波",
      "kind": "line",
      "power": 2.6,
      "radius": 2,
      "description": "集能大光波直線貫穿",
      "targets": 4,
      "cooldown": 19
    }
  },
  "quilava": {
    "name": "A傑特",
    "role": "mage",
    "ultimate": {
      "name": "紅色能量球",
      "kind": "blast",
      "power": 3.5,
      "radius": 1.8,
      "description": "紅色能量球爆發，單體主傷害",
      "splashMultiplier": 0.35,
      "cooldown": 19
    }
  },
  "typhlosion": {
    "name": "假維斯",
    "role": "mage",
    "ultimate": {
      "name": "藍色能量球",
      "kind": "blast",
      "power": 2.2,
      "radius": 3,
      "description": "藍色能量球範圍減速",
      "status": "slow",
      "duration": 3,
      "cooldown": 19
    }
  },
  "totodile": {
    "name": "小肥象",
    "role": "warrior",
    "ultimate": {
      "name": "大耳飛翔",
      "kind": "single",
      "power": 2.5,
      "radius": 0,
      "description": "大耳飛翔，鎖定單一敵人衝撞",
      "cooldown": 17
    }
  },
  "croconaw": {
    "name": "小飛",
    "role": "warrior",
    "ultimate": {
      "name": "大耳飛翔",
      "kind": "chain",
      "power": 1.9,
      "radius": 2,
      "description": "飛行衝撞至多兩個目標",
      "targets": 2,
      "cooldown": 17
    }
  },
  "feraligatr": {
    "name": "阿拉肥",
    "role": "warrior",
    "ultimate": {
      "name": "大耳飛翔",
      "kind": "single",
      "power": 3,
      "radius": 0,
      "description": "高空重壓與15%生命護盾",
      "shield": 0.15,
      "cooldown": 17
    }
  },
  "treecko": {
    "name": "小麻",
    "role": "archer",
    "ultimate": {
      "name": "絨羽小旋風",
      "kind": "cone",
      "power": 1.8,
      "radius": 2.4,
      "description": "絨羽小旋風前方扇射",
      "cooldown": 17
    }
  },
  "grovyle": {
    "name": "咕咕",
    "role": "archer",
    "ultimate": {
      "name": "晨曦啼鳴",
      "kind": "cone",
      "power": 1.6,
      "radius": 2.6,
      "description": "晨曦啼鳴音波，造成減速",
      "status": "slow",
      "duration": 3,
      "cooldown": 17
    }
  },
  "sceptile": {
    "name": "小鷹",
    "role": "archer",
    "ultimate": {
      "name": "幼鷹撲擊",
      "kind": "single",
      "power": 3,
      "radius": 0,
      "description": "幼鷹撲擊優先威脅最高者",
      "target": "strongest",
      "cooldown": 17
    }
  },
  "torchic": {
    "name": "汪汪犬",
    "role": "warrior",
    "ultimate": {
      "name": "汪汪水彈",
      "kind": "single",
      "power": 2.6,
      "radius": 0,
      "description": "近戰守衛拋出蓄力水彈",
      "cooldown": 17
    }
  },
  "combusken": {
    "name": "浪鳴犬",
    "role": "warrior",
    "ultimate": {
      "name": "雙頭激流",
      "kind": "chain",
      "power": 2.2,
      "radius": 2,
      "description": "雙頭激流接連攻擊兩敵",
      "targets": 2,
      "cooldown": 17
    }
  },
  "blaziken": {
    "name": "三瀾犬",
    "role": "warrior",
    "ultimate": {
      "name": "三瀾海嘯",
      "kind": "cone",
      "power": 2.2,
      "radius": 3,
      "description": "三瀾海嘯向前大範圍沖擊",
      "status": "slow",
      "duration": 2,
      "cooldown": 17
    }
  },
  "mudkip": {
    "name": "小熊",
    "role": "warrior",
    "ultimate": {
      "name": "烈焰咆哮",
      "kind": "area",
      "power": 1.4,
      "radius": 2,
      "description": "烈焰咆哮周身震懾並使敵人弱化",
      "status": "weaken",
      "duration": 3,
      "cooldown": 17
    }
  },
  "marshtomp": {
    "name": "壯熊",
    "role": "warrior",
    "ultimate": {
      "name": "熔岩震地",
      "kind": "area",
      "power": 2,
      "radius": 3,
      "description": "熔岩震地擊退周圍敵人",
      "knock": 1.6,
      "cooldown": 17
    }
  },
  "swampert": {
    "name": "大熊",
    "role": "warrior",
    "ultimate": {
      "name": "熔岩大劍",
      "kind": "blast",
      "power": 3.5,
      "radius": 2.2,
      "description": "熔岩大劍對主目標重擊並濺射",
      "splashMultiplier": 0.4,
      "guard": 0.2,
      "duration": 5,
      "cooldown": 17
    }
  },
  "turtwig": {
    "name": "小貓娘",
    "role": "warrior",
    "ultimate": {
      "name": "貓爪亂舞",
      "kind": "single",
      "power": 2.4,
      "radius": 0,
      "description": "貓爪亂舞，密集單體斬擊",
      "cooldown": 17
    }
  },
  "grotle": {
    "name": "靈貓姬",
    "role": "warrior",
    "ultimate": {
      "name": "月牙三連斬",
      "kind": "single",
      "power": 3,
      "radius": 0,
      "description": "月牙三連斬，快速單體連段",
      "cooldown": 17
    }
  },
  "torterra": {
    "name": "雙刃貓女",
    "role": "warrior",
    "ultimate": {
      "name": "影刃旋風",
      "kind": "area",
      "power": 2.6,
      "radius": 3,
      "description": "影刃旋風近身範圍斬擊",
      "guard": 0.1,
      "duration": 4,
      "cooldown": 17
    }
  },
  "chimchar": {
    "name": "阿宏牛仔",
    "role": "support",
    "ultimate": {
      "name": "六芒追星連射",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "六芒追星連射：六發追星彈壓制強敵",
      "cooldown": 20
    }
  },
  "monferno": {
    "name": "藍金星輝法師",
    "role": "support",
    "ultimate": {
      "name": "天穹星陣",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "天穹星陣：全場凍結與控制",
      "cooldown": 20
    }
  },
  "infernape": {
    "name": "官胖",
    "role": "support",
    "ultimate": {
      "name": "天墜裂地",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "天墜裂地：全場範圍傷害與擊退",
      "cooldown": 20
    }
  },
  "piplup": {
    "name": "雛鳥",
    "role": "archer",
    "ultimate": {
      "name": "振翅飛翔",
      "kind": "single",
      "power": 2.2,
      "radius": 0,
      "description": "振翅飛翔射出羽刃",
      "cooldown": 17
    }
  },
  "prinplup": {
    "name": "青羽鳥",
    "role": "archer",
    "ultimate": {
      "name": "振翅飛翔",
      "kind": "chain",
      "power": 1.5,
      "radius": 3,
      "description": "青羽分裂追擊三敵",
      "targets": 3,
      "cooldown": 17
    }
  },
  "empoleon": {
    "name": "天翼王",
    "role": "archer",
    "ultimate": {
      "name": "振翅飛翔",
      "kind": "line",
      "power": 2.2,
      "radius": 2,
      "description": "天翼羽刃直線貫穿",
      "targets": 5,
      "cooldown": 17
    }
  },
  "articuno": {
    "name": "大眼蛙",
    "role": "mage",
    "ultimate": {
      "name": "泡泡連彈",
      "kind": "chain",
      "power": 0.65,
      "radius": 2,
      "description": "五顆泡泡連彈及緩速",
      "targets": 5,
      "status": "slow",
      "duration": 2,
      "cooldown": 19
    }
  },
  "zapdos": {
    "name": "C老猴",
    "role": "warrior",
    "ultimate": {
      "name": "三連棍",
      "kind": "single",
      "power": 3,
      "radius": 0,
      "description": "金箍棒三連打與擊退",
      "knock": 1.4,
      "cooldown": 17
    }
  },
  "moltres": {
    "name": "冒險蛙",
    "role": "warrior",
    "ultimate": {
      "name": "迴旋葉風",
      "kind": "cone",
      "power": 2.4,
      "radius": 3,
      "description": "高速迴旋葉風前方扇形打擊",
      "cooldown": 17
    }
  },
  "raikou": {
    "name": "C囝仔",
    "role": "mage",
    "ultimate": {
      "name": "大火球",
      "kind": "blast",
      "power": 3,
      "radius": 2,
      "description": "大火球造成中心爆炸",
      "status": "burn",
      "duration": 3,
      "cooldown": 19
    }
  },
  "entei": {
    "name": "水毛蟲",
    "role": "mage",
    "ultimate": {
      "name": "吐絲結網",
      "kind": "area",
      "power": 1.5,
      "radius": 3,
      "description": "吐絲結網束縛群敵",
      "status": "slow",
      "duration": 3,
      "cooldown": 19
    }
  },
  "suicune": {
    "name": "水仙子",
    "role": "mage",
    "ultimate": {
      "name": "潮汐花綻",
      "kind": "cone",
      "power": 1.8,
      "radius": 3,
      "description": "潮汐花綻扇形魔法",
      "status": "slow",
      "duration": 3,
      "cooldown": 19
    }
  },
  "kyogre": {
    "name": "小金魚",
    "role": "mage",
    "ultimate": {
      "name": "翻身細水柱",
      "kind": "single",
      "power": 2.3,
      "radius": 0,
      "description": "翻身射出單體細水柱",
      "cooldown": 19
    }
  },
  "groudon": {
    "name": "金魚國王",
    "role": "mage",
    "ultimate": {
      "name": "金色水光束砲",
      "kind": "line",
      "power": 3,
      "radius": 2,
      "description": "金色水光束砲穿透敵群",
      "targets": 5,
      "cooldown": 19
    }
  },
  "rayquaza": {
    "name": "金魚皇后",
    "role": "mage",
    "ultimate": {
      "name": "珍珠水光束砲",
      "kind": "blast",
      "power": 2.6,
      "radius": 2.5,
      "description": "珍珠水光束擊中後降防",
      "status": "weaken",
      "duration": 4,
      "cooldown": 19
    }
  },
  "dialga": {
    "name": "綠眼蝙怪",
    "role": "support",
    "ultimate": {
      "name": "毒光雷彈",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "毒光雷彈：全場中毒與虛弱",
      "cooldown": 20
    }
  },
  "palkia": {
    "name": "大朋",
    "role": "warrior",
    "ultimate": {
      "name": "高空衝撞",
      "kind": "blast",
      "power": 2.8,
      "radius": 3,
      "description": "高空衝撞落地範圍爆發",
      "cooldown": 17
    }
  },
  "giratina": {
    "name": "小黃",
    "role": "warrior",
    "ultimate": {
      "name": "跳撞",
      "kind": "single",
      "power": 2.5,
      "radius": 0,
      "description": "小黃跳撞單體突進",
      "cooldown": 17
    }
  },
  "pikachu": {
    "name": "歐頭慢",
    "role": "support",
    "ultimate": {
      "name": "彩虹光束",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "彩虹光束：直線長距離貫穿",
      "cooldown": 20
    }
  },
  "mew": {
    "name": "小飯團",
    "role": "support",
    "ultimate": {
      "name": "紫波連環",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "紫波連環：依損血情況治療全隊及基地",
      "cooldown": 20
    }
  },
  "wigglytuff": {
    "name": "小山",
    "role": "support",
    "ultimate": {
      "name": "小山震地",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "小山震地：全隊短時間護盾",
      "cooldown": 20
    }
  },
  "blissey": {
    "name": "光鳳鷹",
    "role": "support",
    "ultimate": {
      "name": "鳳羽連射",
      "kind": "support",
      "power": 0,
      "radius": 0,
      "description": "鳳羽連射：全隊短時間攻速加倍",
      "cooldown": 20
    }
  },
  "raichu": {
    "name": "龐克兔",
    "role": "warrior",
    "ultimate": {
      "name": "電吉他二連擊",
      "kind": "single",
      "power": 3,
      "radius": 0,
      "description": "電吉他連續二擊，近身出手",
      "status": "stun",
      "duration": 0.7,
      "cooldown": 17
    }
  },
  "caterpie": {
    "name": "銅寶箱",
    "role": "warrior",
    "ultimate": {
      "name": "銅寶共鳴",
      "kind": "single",
      "power": 1.5,
      "radius": 0,
      "description": "銅寶箱近身撞擊與護盾",
      "shield": 0.15,
      "cooldown": 17
    }
  },
  "metapod": {
    "name": "銀寶箱",
    "role": "warrior",
    "ultimate": {
      "name": "銀寶共鳴",
      "kind": "area",
      "power": 2,
      "radius": 2,
      "description": "銀寶箱震波及防禦提升",
      "guard": 0.2,
      "duration": 5,
      "cooldown": 17
    }
  },
  "butterfree": {
    "name": "金寶箱",
    "role": "warrior",
    "ultimate": {
      "name": "金寶共鳴",
      "kind": "area",
      "power": 2.8,
      "radius": 3,
      "description": "金寶箱環狀爆發",
      "knock": 1.3,
      "cooldown": 17
    }
  },
  "weedle": {
    "name": "破書",
    "role": "mage",
    "ultimate": {
      "name": "破書共鳴",
      "kind": "single",
      "power": 2,
      "radius": 0,
      "description": "破書共鳴帶來持續傷害",
      "status": "poison",
      "duration": 3,
      "cooldown": 19
    }
  },
  "kakuna": {
    "name": "論語",
    "role": "mage",
    "ultimate": {
      "name": "論語共鳴",
      "kind": "area",
      "power": 2,
      "radius": 2.4,
      "description": "論語文字陣使敵人攻速下降",
      "status": "slow",
      "duration": 3,
      "cooldown": 19
    }
  },
  "beedrill": {
    "name": "辭海",
    "role": "mage",
    "ultimate": {
      "name": "辭海共鳴",
      "kind": "blast",
      "power": 2.4,
      "radius": 3.1,
      "description": "辭海文字光束範圍降防",
      "status": "weaken",
      "duration": 4,
      "cooldown": 19
    }
  },
  "mewtwo": {
    "name": "水蛟龍王",
    "role": "mage",
    "ultimate": {
      "name": "盤旋怒濤龍息",
      "kind": "cone",
      "power": 3,
      "radius": 4,
      "description": "盤旋怒濤龍息大範圍掃射",
      "status": "slow",
      "duration": 3,
      "cooldown": 19
    }
  },
  "jigglypuff": {
    "name": "三色蛋",
    "role": "priest",
    "ultimate": {
      "name": "回滿",
      "kind": "heal",
      "power": 0,
      "radius": 0,
      "description": "完全治療最危急友軍，單局限定一次",
      "heal": 1,
      "targets": 1,
      "once": true,
      "cooldown": 18
    }
  }
});
export const ULTIMATE_SPACING = 1.8; // at most one heavy ultimate every 1.8s (ally/support/boss share the gate)
export const ULTIMATE_EFFECT_LIMIT = 8; // cap expensive simultaneous effect targets
export const roleFor = (id) => ROLE_META[ROLE_SKILLS[id]?.role] || ROLE_META.warrior;
export const ultimateFor = (id) => ROLE_SKILLS[id]?.ultimate || null;
export const roleLabel = (id) => { const r=roleFor(id);return r.icon+' '+r.label; };
export const ultimateDescription = (id) => ultimateFor(id)?.description || '專屬技能';
export const basicReach = (id) => roleFor(id).range;
export const isPriest = (id) => ROLE_SKILLS[id]?.role === 'priest';
export const isSupportRole = (id) => ROLE_SKILLS[id]?.role === 'support';
