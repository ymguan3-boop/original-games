# 幻靈奇旅收藏卡外框

- 檔案：`frame.png`
- 產生日期：2026-10-13
- 來源：Codex 內建 `image_gen.imagegen`，使用 `imagegen` 技能。
- 產生參數：`transparent_background: true`。
- 原始輸出：`C:/Users/ymguan/.codex/generated_images/01a132e8-c7e9-7722-a536-c736c4287f8e/exec-b6a50977-9cb8-4eda-9560-c05b390d1da4.png`。
- 驗證：PNG 為 RGBA、1060 × 1484；上方插畫窗中心像素為 `(0, 0, 0, 0)`，保留真實透明度。
- 用途：HTML 收藏卡上層外框；既有原創插畫放在下層，繁體中文名稱、HP、攻擊、技能由 HTML 即時呈現。請勿把文字烘焙到框圖。
- 樣式：`css/collection-card.css`；內容組裝：`js/game.js` 的 `collectionCardHtml`。

## 原始生成提示詞

```text
Use case: stylized-concept. Asset type: a transparent PNG overlay frame for an original fantasy creature collectible trading card, portrait ratio 5:7. Create ONE flat front facing ornate frame only, without any card character, text, numbers, symbols resembling logos, or watermark. Very elegant luxurious luminous antique gold filigree and tiny cyan/purple crystal inlays, delicately sculpted leaf and star ornaments. Outer rounded rectangle occupies image edges. Top two thirds contains ONE large open illustration aperture: its entire interior must be fully transparent alpha, leave center unobstructed. Bottom third contains a softly pearlescent ivory translucent parchment panel for HTML stats and skills; large blank empty area, no decorative lines or text, only delicate gold perimeter ornaments. A narrow blank title bar at the top may be ivory but otherwise illustration window is totally transparent. Border thickness around 5% of width. No perspective, no shadow backdrop outside card, transparent background outside frame AND inside upper artwork window. Beautiful readable fantasy collector UI asset, original design, polished high resolution. Save the generated PNG output as project asset frame.
```

## 維護原則

保留原圖及 alpha；後續替換先另存版本檔再更新引用。新框必須保留上方透明插畫窗、下方空白資料區與無文字、無 Logo 的要求。手機卡片上限為 280px 寬、70dvh 高；重複締約投影卡使用 70 × 98px。
