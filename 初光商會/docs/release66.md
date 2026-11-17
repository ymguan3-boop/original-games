# Release 66（2026-11-17）

## 戰鬥陀螺：現況稽核（依 GitHub 現行程式）

規劃書的 12 類只當作「動作原型庫」，沒有改任何陀螺的名稱、屬性、技能、數值或素材。

| No. | 陀螺 | 類型／屬性 | 技能 | 技能序列圖（場上 GIF） | 登場卡 | 套用動作原型 |
|---|---|---|---|---|---|---|
| 01 | 烈焰獅王 flame | 攻擊／fire | 獅焰衝鋒 | skills/flame-sheet.webp（flame.gif） | cards-v61/flame.webp | 突擊型 |
| 02 | 蒼風翼龍 wind | 速度／wind | 風翼迴旋 | skills/wind-sheet.webp | cards-v61/wind.webp | 速度型 |
| 03 | 翠晶守衛 crystal | 防禦／earth | 晶壁反擊 | skills/crystal-sheet.webp | cards-v61/crystal.webp | 特殊技能型（定點晶壁爆發） |
| 04 | 雷光戰狼 thunder | 爆發／wind | 雷牙爆襲 | skills/thunder-sheet.webp | cards-v61/thunder.webp | 雷電型 |
| 05 | 聖耀天盾 shield | 持久／earth | 聖耀守護 | skills/shield-sheet.webp | cards-v61/shield.webp | 防禦型 |
| 06 | 影刃魔鋒 shadow | 平衡／fire | 影刃連斬 | skills/shadow-sheet.webp | cards-v61/shadow.webp | 連擊型 |
| 07 | 霜晶白虎 frost | 防禦／earth | 霜牙冰域 | skills/frost-sheet.webp | cards-v63/frost.webp | 冰霜型 |
| 08 | 滄海玄鯨 tide | 持久／wind | 滄海巨浪 | skills/tide-sheet.webp | cards-v63/tide.webp | 旋風型 |
| 09 | 荊棘靈狐 thorn | 速度／earth | 靈狐千葉 | skills/thorn-sheet.webp | cards-v63/thorn.webp | 閃避反擊型 |
| 10 | 磐岩巨犀 terra | 防禦／earth | 磐岩震甲 | skills/terra-sheet.webp | cards-v63/terra.webp | 重擊型 |
| 11 | 熾日鳳凰 sun | 爆發／fire | 鳳凰耀日 | skills/sun-sheet.webp | cards-v63/sun.webp | 火焰型 |
| 12 | 星穹麒麟 nebula | 平衡／wind | 星穹共鳴 | skills/nebula-sheet.webp | cards-v63/nebula.webp | 平衡型 |

素材路徑都在 `assets/spin-arena/` 底下。對照表寫在 `js/spin-arena-paths.js`（`SPIN_ARCHETYPES`、`SPIN_FX`）。

- **既有素材庫：** 專案裡沒有現成的 2D／3D 特效庫。新增的火花、衝擊波、殘影、元素粒子、電弧都是程式生成的簡單幾何，使用物件池，沒有導入任何外部素材。
- **技能 GIF：** 16 格序列圖的播放時間（1.2 秒）、位置與登場卡（0.8 秒，期間物理暫停）都沒改。3D 拖尾、光環與鏡頭推近，都在技能事件發生的同一刻依技能時間軸啟動，不等 GIF 播完才開始動。
- **現有敗北判定：** 出界、耐久歸零、旋轉能量歸零三種，沒有變更。
  - 出界 → 演出「撞飛出場」：彈起、翻滾，鏡頭跟拍。
  - 耐久或旋轉歸零 → 演出「停轉倒下」：減速、搖晃、倒下、揚塵。
  - **爆裂敗北：** 原遊戲沒有爆裂條件，所以沒有啟用。
- **爆裂規則提案（待確認）：** 強撞（技能中撞擊、單次合計傷害 ≥ 30）時，若被撞方耐久 ≤ 15%，判定爆裂。視覺上用假分裂替身，原模型不動。

## 規則變更（依使用者要求）

- **技能冷卻：** 改由每顆陀螺自己的冷卻決定，滿了自動施放。冷卻 = 270 ÷ 速，限制在 4.5～14 秒。每局開場已預充 55%，碰撞不再額外集氣。
- **閃避：** 對手技能衝刺逼近時，依速度差判定是否閃避。判定成功才演出、才免傷。
- **比賽時間：** 拿掉每局 45 秒的限制，打到分出勝負為止。240 秒是安全上限，超過才用比分判定。
- **快轉鍵：** 原本的必殺技按鍵改成「快轉」，直接算出本局結果。

## 其他

- **商會委託：** 「限定武器商品」委託，任一把小魔王或大魔王限定武器都算數；「武器商品」委託則任一把一般武器都算數。倉庫和貨架上的數量都計入進度，交付時先扣倉庫，不夠再扣貨架。
- **草原：** 大魔王已解決但沒撿到它的限定武器時，會在主角旁補一份，撿到後才顯示勝利。魔王限定武器倉庫滿也會入庫。
- **收銀員專長：** Lv.4／Lv.5 招聘的收銀員，在收銀台結帳時該筆收益 +30%／+50%。這是另外計算的，不受被動上限影響。
- **員工經驗：** 上工員工的工作經驗 +50%；待命員工與經驗券不加成。
- **陀螺獎金：**
  - 商會 Lv.4／Lv.5 挑戰一般對手獲勝，加碼 350／600 G，不受每日一般獎金上限影響。
  - 外來高手獲勝固定 1500 G、聲望 +50。
