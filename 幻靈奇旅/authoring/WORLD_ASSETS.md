# 初光鎮場景與居民資產

全部 3D 資產以 Blender 5.2 原生網格、材質、骨架製作；未匯入舊版遊戲模型。網頁以 GLB 載入，Three.js 僅負責顯示與遊戲執行。

## 內容

- `models/world/town.glb`：初光鎮完整室外，包含六棟建築、地面、道路、廣場、樹木、長椅與花草。
- `models/world/*-interior.glb`：照護所、巡護局、研究所、道館、星穹挑戰塔、居民民房，共六間家具配置不同的室內。前牆開放、兩側採低牆，適合固定俯視鏡頭。
- `models/world/arena.glb`：獨立的三對三擂台，沒有家具阻擋。
- `models/npcs/`：九位角色各自的七骨架 GLB，皆有 `Idle`、`Walk` 動畫。
- `models/props/`：三種靈核、星霧果、回復瓶、進階石，共六項；靈核採晶體與軌道環造型。
- `portraits/`：九位角色的原創 SVG 半身立繪，各三種表情（一般、開心、嚴肅）。
- `data/world.json`：模型路徑、出生點、建物、門口、室內出生與出口、家具碰撞、擂台及道具映射。
- `data/npcs.json`：角色位置、立繪、對話、功能及漫步半徑。

## 重建

在專案根目錄執行：

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python 'authoring/world.py'
```

`world.py` 會重建其負責的 GLB、JSON 與立繪。若已在 JSON 修改出生點或對話，請先將修改回填作者程式，避免重建時被覆寫。

所有資料座標採 Three.js 的 X／Y 上／Z 朝前。建築 `entrance`、室內 `spawn`／`exit` 及 NPC `interiorPosition` 為 `[x,z]`；戶外 `position` 為 `[x,y,z]`。碰撞採軸對齊的 `{x,z,w,d}` 中心尺寸。

## 抽驗紀錄

`world-review.cjs` 使用實際 Chromium WebGL 與 GLTFLoader，記錄於 `world-review.json`，並輸出三張場景、人物及室內截圖。城鎮約 86,832 個三角形，合批後 15 個材質繪製批次；九位 NPC 均載入七根骨頭及兩支動畫。這是桌面瀏覽器資產抽驗，不等同實機手機幀率測試。

`dawnlight-world.blend` 保留初次整批建模的可編輯場景；後續新增獨立擂台的完整來源在 `world.py`，再次執行即可一併重建至 Blend。
