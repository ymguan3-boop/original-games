# 陀螺材質貼圖來源

- 供應者：內建 image_gen，非 Google IMAGEN。
- 玩家已明確同意：「改用內建 image_gen 製作材質」。
- 生成：2026-11-15。兩次生成，第一張原始圖與修正圖均保留在 authoring/spin-arena/materials-v2/，不併入線上執行素材。
- 生圖來源：generated-atlas-source.png；修正版：generated-atlas-refined.png。
- 遊戲使用：surface-atlas-v3.webp，1024×1024；僅做尺寸與格式轉換，沒有用程式繪製取代生圖。
- 區塊：左上紅色金屬烤漆、右上暖金、左下銀鋼、右下深灰橡膠。
- 無第三方照片被下載或直接貼到模型；參考網址見 ../material-reference-20261115.md。
- 實際套用於 spin-arena-models.js 建構之模型，UV 僅取各區塊內側，避免取樣跨色。未改變任何頂點位置、輪廓、尺寸或碰撞半徑。
- 匯出 GLB 內含 JPEG 貼圖資料、UV、PBR metalness/roughness/clearcoat；預覽重新載入 GLB 驗證成功。JPEG 僅為 GLB 的內嵌編碼，不依賴外部 JPG 網址。
- 檢查：原造型及材質版的頂點資料數量與雜湊一致；69 個模型部件使用貼圖，GLB 內嵌 1 張圖。

## 初次提示詞

Create a production game material texture atlas, a square image divided into exactly four equally sized square quadrants with no gutters, labels, text, borders or objects. These are FLAT orthographic seamless material color textures for a polished fantasy battle spinning top, NOT a product render. Upper left quadrant: deep ruby-red candy enamel over fine metallic flake, subtly mottled rich carmine with extremely fine micrograin, no large highlights. Upper right quadrant: luxurious warm champagne gold metal, very fine subtle parallel brushing and small hue variation, no large highlights. Lower left quadrant: cool silver steel, delicate fine brushing and minute wear, no large highlights. Lower right quadrant: charcoal black dense vulcanized rubber, extremely fine soft grain, low contrast. Each quadrant filled edge to edge with its one material texture. Consistent neutral diffuse lighting, no directional shadow, no baked reflections, no visible seams or letters, no jewelry, no toy shapes, no emblems. The texture atlas will be sampled and tiled on actual 3D geometry; physical reflection and gloss are provided separately in the game. Detailed yet clean premium handcrafted collectible finish. Keep red deeply saturated and gold metallic warm rather than flat yellow plastic.

## 修正提示詞

Edit this flat four-quadrant game material atlas. Preserve the exact four equal quadrant layout. Preserve upper-left ruby red microflake enamel, lower-left silver fine-brushed steel, lower-right charcoal rubber. CHANGE ONLY upper-right gold: make it smooth polished champagne gold with EXTREMELY subtle low-contrast micrograin; remove the coarse horizontal streaks that resemble wood grain. It must read as clean luxury gold metal, not wood, yellow plastic, or stone. Flat diffuse albedo color, no baked gradients, no highlights or shadows, no object shapes, no labels, no borders. Maintain the red color depth and existing layout exactly.
