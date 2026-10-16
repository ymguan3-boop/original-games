# 使用者原生 Three.js 家族整合

- 鳥族：`piplup → prinplup → empoleon` 對應 雛鳥 → 青羽鳥 → 天翼王。
- 象族：`totodile → croconaw → feraligatr` 對應 小肥象 → 小飛 → 阿拉肥。
- 穩定 ID、存檔、階段、潮屬性、HP、攻擊力、進化鏈均保留；僅外觀、名稱及自然活動改為新來源。
- 原始參數與動作：`models/native/birds-blueprint.js`、`elephants-blueprint.js`，逐位元保留使用者原始 JavaScript。
- `families.js` 以使用者象族 builder 的共用格式建構，保留兩族原生幾何密度。離線使用本機 Three r128，沒有 CDN。
- 圓角方塊依 Three.js rounded-cube projection 本機相容實作；原有 lathe、shell、star 幾何保留。r128 不支援新版數值 sheen，因此保留粗糙度與材質主色；象族 felt 凹凸比例由原範例 1.6 調整為 0.025，避免遊戲比例下凹凸過強。
- 同一材質與同一動畫樞紐內合併靜態網格，保持頂點索引、法線、UV、原始三角形數與所有關節；不同關節絕不合併。來源快取只建構一次，個體複製共用 geometry/material，各自使用 AnimationMixer。
- `native://ID` 由既有 `asset()` 載入器辨識，遊戲、3D 圖鑑、模型室共用同一來源與動畫。

## 完整動作與自然活動

鳥原始動作：移動、坐下、準備起飛、飛翔；額外以坐下別名提供 Idle。
象原始動作：站立、移動、坐下、準備起飛、用耳朵飛翔（耳根／耳傾、象鼻三節、手腳與尾巴一起連動）。
額外 Landing 為 Fly 至 Sit 的 1.5 秒 smoothstep 逐關節位置、縮放及 quaternion slerp，不是靜態替代模型。

自然活動循環為 Walk → Takeoff → Fly → Landing → Sit → Idle。飛行高度由來源 body.position 提供，root 始終落在地面錨點；行走與飛行使用相同地圖碰撞檢查，避開建物。切換使用 0.65 秒淡入淡出，不把角色位置瞬間拉高或歸零。

## 審核入口

`model-preview.html?subject=piplup`（其餘可替換成六個穩定 ID），動作列可逐一選擇，`HeroReview.play('Fly')` 亦可控制。
遊戲收藏卡 → 查看 3D 模型，會提供全部動作按鈕。

`qa/native-families/structure.json` 僅是無瀏覽器的結構／有限矩陣抽樣記錄，不代表視覺或實機驗收。瀏覽器驗收集中由總指揮執行單一輪。

`asset-manifest.json.models` 延續既有 GLB 清單格式，原生來源獨立列在 nativeModels/nativeSources；不得將 native:// 當成 GLB 網路網址。

舊六份 GLB 僅在全部資料引用（含 card-art referenceModel）更新後才可刪除。來源 ZIP 中的影片、render 及重複 GLB 不複製到遊戲 repo。

注意：`authoring/spirits.py` 是舊 GLB 批次產生器，重新執行會生成舊形體；本族應以 models/native 為編輯來源，重建其他家族時需保留本族既有 native:// 資料列。
