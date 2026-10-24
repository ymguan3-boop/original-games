# 0.6 生圖資產與演出參考

2026-10-24，使用內建 image_gen 工具，未使用 CLI。透明圖保留 alpha，原檔留在 Codex generated_images，遊戲引用的版本已複製至 assets。

| 資產 | 遊戲用途 |
|---|---|
| assets/weapon-switch-v06.png | 與翻滾同尺寸的長按武器選擇鍵 |
| assets/spirit-core-v06.png | 轉蛋動態召喚、靈核球操作鍵、召喚入口 |
| assets/summon-sky-v06.png | 靈舟與浮島背景，配合縮放、穿越、粒子及俯衝動畫 |

## 武器鍵完整提示詞

Use case: stylized-concept. Create ONE new game UI button asset (not a sheet). Reference image is style only: match its ornate circular gold rim, four turquoise gem points, deep teal center and vivid cyan magic glow. New subject: crossed elegant sword and twin daggers with a small cyan circular switching arrow wrapping them, clearly indicating SELECT / SWITCH WEAPON. Front facing, centered, circular, equal width and height, strong crisp silhouette readable at 50px, luxurious polished fantasy mobile RPG style, painted 3D icon. Transparent background outside the single round medallion, generous 4% transparent margin, no shadow box, no letters or words, no other icons. Preserve a circular silhouette like the roll icon in reference.

樣式參考：assets/action-buttons-v03.png，已先檢視原圖。

## 靈核球完整提示詞

Use case: stylized-concept. Single original fantasy game SPIRIT CORE ORB icon, centered on transparent background. Intricate flowing gold filigree cage around a fully translucent turquoise faceted spherical crystal, with a tiny glowing six pointed cyan star suspended inside. Four curved gold claw arcs wrapping organically, gold crown finials north/south, exquisite RPG UI quality, front facing, readable at 48px. Entire orb one crystal material, NO equatorial seam, NO horizontal dividing band, NO central button, NO red color, NO white lower hemisphere, NO Pokemon or Pokeball appearance, no text. Circular 1:1 icon with 8% transparent padding.

## 召喚天空完整提示詞

Use case: stylized-concept. Original mobile fantasy RPG summoning cinematic background, vertical portrait composition. Magical dawn sky over distant floating rock islands, a small ornate GOLD AND TEAL fantasy airship high at the top third gliding through clouds, bright turquoise celestial summoning vortex below center, long beams of sunrise, cascading star particles. Strong parallax-ready layers and dramatic depth, deep navy to emerald and gold palette matching a cave fantasy game. Leave broad clear sky center for animated spirit crystal overlays. Polished painterly anime fantasy game background. No characters, no letters, no logo, no machine, no Pokeball, no divided spheres, no Pokemon elements, original design.

## 演出參考

白貓的飛空艇登場、下落與稀有度變化節奏可見 [GameWith 演出整理](https://gamewith.jp/shironeko/article/show/287486) 與 [Mobile01 中文試玩](https://www.mobile01.com/topicdetail.php?f=675&t=4262125)。本模式據此設計自己的靈舟、靈核、光色與卡片揭曉流程，未使用白貓美術或影片。這是節奏參考，不宣稱複製其完整演出。

原遊戲進化演出則改編本機原始 js/game.js 的 playEvolutionSequence，保留約3.02秒換模、4.28秒結束的白光加速旋轉流程；僅移植顯示函式與樣式，未接入原存檔。
