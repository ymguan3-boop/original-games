# 火猴守護者

`models/native/fire-monkey.js` 為可編輯的原生 Three.js 模型來源，無外部模型載入。

| 存檔 ID | 名稱 | 模型鍵 | 肖像 |
|---|---|---|---|
| raikou | C囝仔 | fire-monkey://raikou | cards/art/fire-monkey-c-kid.webp |
| zapdos | C老猴 | fire-monkey://zapdos | cards/art/fire-monkey-c-elder.webp |

兩者卡片均為火屬性、稀有、守護者、紫色外框。保留原有存檔 ID、取得條件及戰鬥數值；數字階級分別 1、2，顯示使用 `stageLabel`，不額外改動原有進化連結。

`FireMonkeySpirit.create({stage:1|2,inPlace:true})` 為每個角色建立獨立控制器；資產快取只存工廠。`setMode()` 支援 Idle、Walk、Attack、Fireball、StaffCombo、React、Hurt、Jump；`update(dt)` 平滑混合關節姿勢，`dispose()` 釋放該實例的幾何與材質。

肩、肘、腕、髖、膝、踝各兩個關節，加九節尾巴。手腳短段互相重疊，關節父子階層保持連接，待機及行走時手臂向下。臉部包含眨眼與小猴缺牙、吐舌表情。

待機時每隔 7–12 秒會選擇該階特色動作，行走保留排程，回到待機後才觸發；動作結束再排下一次。C囝仔火球動作 1.9 秒，0.65 秒離手；C老猴 2.25 秒三連棍，0.46／0.97／1.48 秒完成橫掃、反向斜擊與劈落。遊戲遊走在特色動作期間暫停移動，收勢後平順繼續。

靜態零件按同一關節與材質合併；火球、火焰皆預先建立並重用。C囝仔 61 meshes／31,704 triangles；C老猴 82 meshes／38,060 triangles。模型室及圖鑑 3D 檢視共用同一控制器來源。

替換後移除原 raikou／zapdos 的兩個 GLB 與兩張舊肖像；原始參考圖及產製工作檔保留在專案外的 artifacts，不列入網站載入資產。這些調整限制本次新增成本，並不代表已量測所有裝置的 FPS。
