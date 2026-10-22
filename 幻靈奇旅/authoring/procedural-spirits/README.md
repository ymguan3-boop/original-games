# 剝皮辣椒雞三階／汪汪犬三階（Three.js 程序模型）

| 存檔 ID | 名稱 | 模型 | 備註 |
|---|---|---|---|
| charmander | 剝皮辣椒雞（1 階，焰） | `models/spirits/pepper-chick-1.glb` | 背 1 根辣椒，取代舊 Blender 模型 |
| charmeleon | 雙椒辣椒雞（2 階，焰） | `models/spirits/pepper-chick-2.glb` | 背 2 根、羽毛鱗片 |
| charizard | 豐椒辣椒雞王（3 階，焰） | `models/spirits/pepper-chick-3.glb` | 背 5 根紅尖辣椒、火焰冠 |
| torchic | 汪汪犬（1 階，潮） | `models/spirits/water-dog-1.glb` | 取代燈茸雀 |
| combusken | 浪鳴犬（2 階，潮） | `models/spirits/water-dog-2.glb` | 取代霞羽鶴，雙頭 |
| blaziken | 三瀾犬（3 階，潮） | `models/spirits/water-dog-3.glb` | 取代曦焰長羽，三頭、體型最大 |

- `common.js` 材質與程序幾何（辣椒、羽瓣、葉、金莢、水滴）；`chicks.js`、`dogs.js` 是模型與 8 個動作。
- 每個動作都是「時間 → 姿勢」的純函式：Idle／Walk／Run 為循環（首尾相接），Wave（打招呼，翅膀或前腳由肩膀帶動）、Celebrate、Hurt、Attack、Ultimate 為單次。
- `export.html` 以 30fps 取樣烘焙成節點 TRS 動畫並輸出 GLB；汪汪犬三張肖像由模型算圖（`cards/art/water-dog-N-portrait.webp`）。需本機伺服器支援 `PUT /__save/<path>`，`?only=dog3` 可只匯出一隻。
- 招式：辣椒雞普攻「啄擊」，絕招依階級連丟 3／6／12＋1 根辣椒（一根一根丟）；汪汪犬普攻撲咬（頭數 1／2／3 輪流咬），絕招「汪汪水彈」「雙頭激流」「三瀾海嘯」（三瀾犬先蹲低蓄力再人立）。遊戲內投射物沿用潮／焰屬性的共用特效。
