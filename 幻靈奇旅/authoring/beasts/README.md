# 火熊三階與貓娘三階

| 存檔 ID | 名稱 | 模型 | 取代 |
|---|---|---|---|
| mudkip | 小熊（1 階，火） | `models/spirits/fire-bear-1.glb` | 泡泡蛙 |
| marshtomp | 壯熊（2 階，火） | `models/spirits/fire-bear-2.glb` | 荷盞蛙 |
| swampert | 大熊（3 階，火） | `models/spirits/fire-bear-3.glb` | 滄瀾角蛙 |
| turtwig | 小貓娘（1 階，森） | `models/spirits/cat-girl-1.glb` | 籽背鼴 |
| grotle | 靈貓姬（2 階，森） | `models/spirits/cat-girl-2.glb` | 石芽獾 |
| torterra | 雙刃貓女（3 階，森） | `models/spirits/cat-girl-3.glb` | 嶺苔山獾 |

保留原存檔 ID、HP／攻擊、稀有度與靠羈絆進階的規則；熊系改為火屬性（原本是潮），貓娘維持森屬性。肖像由模型算圖（`cards/art/*-portrait.webp`）。

## 骨架

- 貓娘三階與大熊：主角小男孩骨架（`../kid-hero/`），關節、掛點、五官切換節點相同；以 root 等比例縮放與頭部反向縮放調整頭身比，腿長與手臂長另外整條縮放（髖／肩為中心，動作照常，腳底貼地由烘焙重算）。
- 小熊、壯熊：四足骨架（body / head / jaw / 四條腿各三節 / tailFlame），自訂對角步與跳躍步。

## 招式

| 角色 | 普攻 | 大絕 |
|---|---|---|
| 小熊 | 火爪拍：後腳立起、右前掌帶火拍下 | 烈焰咆哮：仰頭吸氣、朝前噴火左右掃過 |
| 壯熊 | 火焰衝撞：壓低蓄力、全身冒火猛衝 | 熔岩震地：立起雙掌怒吼、重重拍地震出火柱 |
| 大熊 | 霸體：雙臂交叉蓄力後張開怒吼，全身發光；攻擊、防禦各 +30%，持續 2 回合 | 熔岩大劍：背上拔劍、躍起劈下（刃口朝地）、一排火柱 |
| 小貓娘 | 貓貓拳：蓋下肉球印 | 貓爪亂舞：連抓四下後撲向前方 |
| 靈貓姬 | 疾風斬：由右往左水平橫斬 | 月牙三連斬 |
| 雙刃貓女 | 雙刃橫斬：雙刀一起水平橫掃 | 影刃旋風 |

動作名稱：Idle／Walk／Run／Attack／Ultimate／Hurt／React，主角骨架另有 Wave／Jump。大熊全部動作維持微蹲；雙刃貓女的站立、行走、跑步是模特兒台步（雙腳不交叉）。

## 遊戲整合

- 霸體（`skill.buff`）：`js/game.js` 的 `applyBuff` 對自己加上 `armor` 狀態（攻擊 ×1.3、受到的傷害 ÷1.3，持續 2 回合），並讓身體材質微微發光；狀態結束時還原。霸體本身仍會造成一半威力的傷害，避免敵方大熊只放增益不出手。
- `js/spirit-combat.js`：大熊的霸體不射出火系投射物。

## 檔案

- `beasts-model.js`、`beasts-actions.js`：參數藍圖與動作烘焙；`export-beasts.html`：用本機開發伺服器匯出 GLB 與肖像；`preview.html`：即時預覽（含特效）；`ref/`：原畫。
