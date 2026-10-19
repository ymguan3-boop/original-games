# 主角（小男孩）模型來源

遊戲主角 `models/hero.glb` 與挑戰塔武器 `models/tower/kid-*.glb` 都由這個資料夾的 Three.js 原始碼產生（取代原本的 Blender `hero.blend`）。

| 檔案 | 內容 |
|---|---|
| `kid-model.js` | 角色藍圖：頭、上下半身、可動關節、五官與表情、手部掛點 `propR/propL/fxR/fxL`；造型節點（冒險套裝、鹹蛋超人、冒險服背心、小飯團圍巾） |
| `props.js` | 手持武器：大劍、短刀、手槍、槍口火光（原點 = 握點，+Z = 刃／劍身方向） |
| `kid-actions.js` | 19 個動作的姿勢函式；武器連擊含雙手 IK 與防穿透避讓 |
| `actions.baked.js` | `kid-actions.js` 的離線烘焙結果（`node bake-actions.js`，約 2 分鐘） |
| `check-weapons.js` | 武器穿透檢查（每一格與格間內插） |
| `builder.js` | 把藍圖建成 Three.js 物件與動畫 |
| `preview.html` | 模型與動作預覽頁 |
| `export-game.html` | 匯出遊戲用 GLB（降低面數、同關節同材質網格合併、動作改成遊戲名稱） |
| `../../js/hero-costumes.js` | 主遊戲、挑戰塔、模型室及本目錄預覽／匯出共用衣裝貼合；以目前胸口局部輪廓修正制服色塊、完整背心及肩帶 |
| `check-costume-fit.cjs` | 直接讀取目前 GLB，量測制服面積、肩帶間距、20 個動作中的胸口掛載穩定性；不代表畫面驗收 |

## 套裝對應（遊戲 costume id → 造型節點）

- `healing` 冒險套裝 ← `outfitHat`、`outfitCape`、`outfitCapeArmL/R`（帽子＋披風，披風袖套跟著手臂）
- `electric` 鹹蛋超人變身套裝 ← `outfitUltraHead`、`outfitUltraBody`；另由遊戲把制服配件（`userData.part.uo`）隱藏、衣褲與頭部以外的皮膚換成 `ultraSilver`／`ultraRed` 材質
- `adventure` 冒險服 ← `outfitVest`（黃色背心＋後背包）
- `mist` 小飯團同行 ← `outfitScarf`（圍巾）
- `sound` 小山蝴蝶套裝 ← 遊戲程式加上的小山背包與肩帶

衣裝共用模組從目前模型量取軀幹輪廓，直接掛在 `chest` 的局部座標；不使用舊主角高 2.55 的固定補片座標。淺藍／深藍制服改為同一表面的互補斜切色塊，避免兩個近乎重疊的筒身。冒險服保留原背包、袋蓋、口袋與釦子，重新貼合背心和肩帶；小山背包、肩帶、環繞蝴蝶三個入口共用。

本次執行時修復保留 `models/hero.glb`、所有動作及武器掛點。原始預覽與後續 GLB 匯出也會套用同一修復；只修改衣裝時不需要重新烘焙動作。可在遊戲根目錄執行 `node authoring/kid-hero/check-costume-fit.cjs`，結果寫入 `qa/costume-fit-structure.json`。

## 動畫名稱

Idle、Walk、Run、Wave、Throw、Attack、Hurt、Roll（原地）、Celebrate、JumpCelebrate、Disappointed、GroundPoundDisappointed，
以及挑戰塔用的 SwordReady／SwordCombo、BladesReady／BladesCombo、GunsReady／GunsCombo、KnifeReady／KnifeCombo。

## 重新匯出

1. 修改後執行 `node bake-actions.js`（必要時 `node check-weapons.js` 確認武器不穿透）。
2. 以支援 `PUT /__save/<路徑>` 的本機開發伺服器開啟 `export-game.html`，檔案會寫到 `_export/game/`。
3. 把 `hero.glb` 複製到 `models/`，`kid-sword/blade/gun/flash.glb` 複製到 `models/tower/`，並更新 `js/game.js` 的資產版本參數。
