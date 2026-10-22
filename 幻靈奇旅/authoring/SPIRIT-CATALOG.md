# 圖鑑排序與既有招式映射

版本：2026-10-20。只調整展示順序、001–061 編號與有證據的招式名稱；穩定 ID、進階規則、屬性、HP、power/cost 均保留。

## 共用介面

`const catalog = SpiritCatalog.create(await fetch("data/spirit-catalog.json").then(r => r.json()));`

- `catalog.sort(spirits)`：新陣列、家族與分支相鄰，輸入不變動。
- `catalog.number(id)`：三位數字；`catalog.get(id)`：該筆圖鑑規格。
- `catalog.skill(id, skillOrIndex)`：招式 animation/mode、nativeAttack、duration、source。
- `catalog.attack(id, skillOrIndex, availableModes)`：可傳實際 clips 的名稱陣列或 actions 物件；缺指定動作時回傳明確 fallback=true / nativeAttack=false。
- duration=null 時優先讀實際 clip.duration；有固定時長者為來源控制器定義。

## 排序與完整動作表

沿用原始家族出現順序，將所有 previous / next / evolvesTo 關係合併排序；不改進階關係。舊資料的歐頭慢 → 霆冠躍兔僅有單向 previous，仍相鄰，未補造新的進階條件。金魚國王與金魚皇后同列小金魚後面。未來新卡從 062 起追加，勿重新編號既有 61 隻。

| 編號 | ID | 幻靈 | 技能（動作） | 狀態 |
|---|---|---|---|---|
| 001 | bulbasaur | 青螺靈 | 殼光輕擊 → React；青螺共鳴 → React | 既有生活動作備援 |
| 002 | ivysaur | 紫羽螺 | 紫羽切波 → React；紫羽共鳴 → React | 既有生活動作備援 |
| 003 | venusaur | 赤鎧螺王 | 赤鎧旋刃 → React；赤鎧共鳴 → React | 既有生活動作備援 |
| 004 | charmander | 剝皮辣椒雞 | 椒香啄擊 → React；暖椒共鳴 → React | 既有生活動作備援 |
| 005 | charmeleon | 雙椒辣椒雞 | 雙椒連啄 → React；雙椒熱舞 → React | 既有生活動作備援 |
| 006 | charizard | 豐椒辣椒雞王 | 豐椒旋翼 → React；百椒暖焰 → React | 既有生活動作備援 |
| 007 | squirtle | 小芝麻 | 芝麻輕撞 → React；淨帽共鳴 → React | 既有生活動作備援 |
| 008 | wartortle | 絨芝麻 | 絨毛旋舞 → React；絨芝共鳴 → React | 既有生活動作備援 |
| 009 | blastoise | 星冠芝麻 | 星冠躍擊 → React；星冠共鳴 → React | 既有生活動作備援 |
| 010 | chikorita | 沒花鹿 | 花芽輕擊 → Pulse；金蕊共鳴 → Pulse | 既有專屬動作 |
| 011 | bayleef | 花鹿米 | 櫻花輕舞 → Pulse；花葉共鳴 → Pulse | 既有專屬動作 |
| 012 | meganium | 藏鏡鹿 | 櫻鏡流光 → Pulse；花冠映照 → Pulse | 既有專屬動作 |
| 013 | cyndaquil | A1 | 集能小光波 → Punch；集能大光波 → PunchNova | 既有專屬動作 |
| 014 | quilava | A傑特 | 胸口紅色光束 → ChestBeam；紅色能量球 → ChestNova | 既有專屬動作 |
| 015 | typhlosion | 假維斯 | 掌心藍色光束 → PalmBeam；藍色能量球 → PalmNova | 既有專屬動作 |
| 016 | totodile | 小肥象 | 大耳拍動 → Fly；大耳飛翔 → Fly | 既有生活動作備援 |
| 017 | croconaw | 小飛 | 大耳拍動 → Fly；大耳飛翔 → Fly | 既有生活動作備援 |
| 018 | feraligatr | 阿拉肥 | 大耳拍動 → Fly；大耳飛翔 → Fly | 既有生活動作備援 |
| 019 | treecko | 苔點蜥 | 森光輕擊 → Attack；苔點共鳴 → Attack | 通用 Attack |
| 020 | grovyle | 蕨帆蜥 | 森光輕擊 → Attack；蕨帆共鳴 → Attack | 通用 Attack |
| 021 | sceptile | 翠環森蜥 | 森光輕擊 → Attack；翠環共鳴 → Attack | 通用 Attack |
| 022 | torchic | 燈茸雀 | 焰光輕擊 → Attack；燈茸共鳴 → Attack | 通用 Attack |
| 023 | combusken | 霞羽鶴 | 焰光輕擊 → Attack；霞羽共鳴 → Attack | 通用 Attack |
| 024 | blaziken | 曦焰長羽 | 焰光輕擊 → Attack；曦焰共鳴 → Attack | 通用 Attack |
| 025 | mudkip | 泡泡蛙 | 潮光輕擊 → Attack；泡泡共鳴 → Attack | 通用 Attack |
| 026 | marshtomp | 荷盞蛙 | 潮光輕擊 → Attack；荷盞共鳴 → Attack | 通用 Attack |
| 027 | swampert | 滄瀾角蛙 | 潮光輕擊 → Attack；滄瀾共鳴 → Attack | 通用 Attack |
| 028 | turtwig | 籽背鼴 | 森光輕擊 → Attack；籽背共鳴 → Attack | 通用 Attack |
| 029 | grotle | 石芽獾 | 森光輕擊 → Attack；石芽共鳴 → Attack | 通用 Attack |
| 030 | torterra | 嶺苔山獾 | 森光輕擊 → Attack；嶺苔共鳴 → Attack | 通用 Attack |
| 031 | chimchar | 星火猿 | 焰光輕擊 → Attack；星火共鳴 → Attack | 通用 Attack |
| 032 | monferno | 銅爐猿 | 焰光輕擊 → Attack；銅爐共鳴 → Attack | 通用 Attack |
| 033 | infernape | 彗拳巨猿 | 焰光輕擊 → Attack；彗拳共鳴 → Attack | 通用 Attack |
| 034 | piplup | 雛鳥 | 振翅拍動 → Fly；振翅飛翔 → Fly | 既有生活動作備援 |
| 035 | prinplup | 青羽鳥 | 振翅拍動 → Fly；振翅飛翔 → Fly | 既有生活動作備援 |
| 036 | empoleon | 天翼王 | 振翅拍動 → Fly；振翅飛翔 → Fly | 既有生活動作備援 |
| 037 | articuno | 大眼蛙 | 普通撞擊 → Bump；泡泡吐息 → Bubbles；泡泡連彈 → Bubbles | 既有專屬動作 |
| 038 | moltres | 冒險蛙 | 普通側踢 → Kick；葉鏢投擲 → Boomerang；迴旋葉風 → Boomerang | 既有專屬動作 |
| 039 | raikou | C囝仔 | 小火球 → Attack；大火球 → Ultimate | 既有專屬動作 |
| 040 | zapdos | C老猴 | 伸棍打 → Attack；三連棍 → Ultimate | 既有專屬動作 |
| 041 | entei | 水毛蟲 | 頭槌水彈 → Attack；吐絲結網 → Ultimate | 既有專屬動作 |
| 042 | suicune | 水仙子 | 水球推擊 → Attack；水之花綻 → Ultimate | 既有專屬動作 |
| 043 | kyogre | 小金魚 | 水彈 → Attack；翻身細水柱 → Ultimate | 既有專屬動作 |
| 044 | groudon | 金魚國王 | 水彈 → Attack；翻身金色粗水柱 → Ultimate | 既有專屬動作 |
| 045 | rayquaza | 金魚皇后 | 水彈 → Attack；翻身珍珠粗水柱 → Ultimate | 既有專屬動作 |
| 046 | dialga | 時砂巨象 | 鋼光輕擊 → Attack；時砂共鳴 → Attack | 通用 Attack |
| 047 | palkia | 月瀾海馬 | 潮光輕擊 → Attack；月瀾共鳴 → Attack | 通用 Attack |
| 048 | giratina | 暮影六翼鹿 | 影光輕擊 → Attack；暮影共鳴 → Attack | 通用 Attack |
| 049 | pikachu | 歐頭慢 | 白色光波 → BeamPose；彩虹光束 → BeamPose | 既有專屬動作 |
| 050 | raichu | 霆冠躍兔 | 雷光輕擊 → Attack；霆冠共鳴 → Attack | 通用 Attack |
| 051 | mew | 小飯團 | 飯團滾擊 → Roll；紫波連環 → Wave | 既有專屬動作 |
| 052 | wigglytuff | 小山 | 木頭人驚跳 → Jump；小山震地 → Jump | 既有專屬動作 |
| 053 | blissey | 光鳳鷹 | 振翼光波 → WingBurst；鳳羽連射 → FeatherVolley | 既有專屬動作 |
| 054 | caterpie | 銅寶箱 | 銅箱輕撞 → React；銅寶共鳴 → React | 既有生活動作備援 |
| 055 | metapod | 銀寶箱 | 銀箱震擊 → React；銀寶共鳴 → React | 既有生活動作備援 |
| 056 | butterfree | 金寶箱 | 金箱猛撞 → React；金寶共鳴 → React | 既有生活動作備援 |
| 057 | weedle | 破書 | 書角輕撞 → React；破書共鳴 → React | 既有生活動作備援 |
| 058 | kakuna | 論語 | 書卷震擊 → React；論語共鳴 → React | 既有生活動作備援 |
| 059 | beedrill | 辭海 | 辭海重擊 → React；辭海共鳴 → React | 既有生活動作備援 |
| 060 | mewtwo | 水蛟龍王 | 龍咬水彈 → Attack；盤旋怒濤龍息 → Ultimate | 既有專屬動作 |
| 061 | jigglypuff | 夢鈴絨球 | 夢光輕擊 → Attack；夢鈴共鳴 → Attack | 通用 Attack |

## 更名依據

鳥族與象族已被替換但還殘留霜絨／雪幕／月輪／溪鈴／晶鰭／冰瀑舊族招名。依真正存在的 Fly 拍翼／拍耳動作更正為描述性名稱，不宣稱新製作專屬攻擊。火猴只有 Fireball／StaffCombo，移除不存在的連爪名稱；大小招共用同一動作，保留各自既有數值。

| ID | 原名 | 修正 |
|---|---|---|
| totodile [0] | 潮光輕擊 | 大耳拍動 |
| totodile [1] | 溪鈴共鳴 | 大耳飛翔 |
| croconaw [0] | 潮光輕擊 | 大耳拍動 |
| croconaw [1] | 晶鰭共鳴 | 大耳飛翔 |
| feraligatr [0] | 潮光輕擊 | 大耳拍動 |
| feraligatr [1] | 冰瀑共鳴 | 大耳飛翔 |
| piplup [0] | 潮光輕擊 | 振翅拍動 |
| piplup [1] | 霜絨共鳴 | 振翅飛翔 |
| prinplup [0] | 潮光輕擊 | 振翅拍動 |
| prinplup [1] | 雪幕共鳴 | 振翅飛翔 |
| empoleon [0] | 潮光輕擊 | 振翅拍動 |
| empoleon [1] | 月輪共鳴 | 振翅飛翔 |
| zapdos [0] | 金棍三連 | 伸棍打 |
| zapdos [1] | 烈焰棍舞 | 三連棍 |
| raikou [0] | 調皮火球 | 小火球 |
| raikou [1] | 赤焰連爪 | 大火球 |

## 限制

- 舊通用 GLB：只有 Attack 的角色維持原技能名，並未依名稱新建特效／動作。
- 螺、辣椒雞、芝麻、寶箱與書本沒有專屬 Attack，React 只當備援；其既有共鳴等技能名保留，不捏造新動作。
- 原生鳥象 Fly 本身帶內部離地動作；遊戲戰鬥可擷取拍翼／拍耳，或在完整動作後平滑恢復，不應宣稱此生活 clip 為專屬攻擊。
- 小山與小飯團需戰鬥場景提供跳躍／滾動平移；歐頭慢 BeamPose 需遊戲光束特效。
- 此檔與資料映射的檢查只屬技術驗證，不代表全角色視覺或遊戲驗收。

## 其他收藏卡

挑戰塔三種魔物使用獨立系列 T001（forest）、T002（ice）、T003（fire）；與幻靈 001–061 分區，不占用幻靈存檔 ID 或進階序號。`catalog.towerNumber(id)` 回傳此系列編號。
