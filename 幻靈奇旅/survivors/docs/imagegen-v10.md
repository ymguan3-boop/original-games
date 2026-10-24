# 0.10 圖集

使用內建 image_gen 生圖工具，透明背景。原圖保留於 `製作環境原始生成檔`，複製至遊戲 `assets/status-items-v10.png`，未修改原生圖的像素或透明通道。以CSS背景位置及Canvas來源矩形取用4×2圖格。

圖格依序為：蝕毒雙刃、霹靂雙槍、緩速單刀、霜晶雙槍、震嶽大劍、幻靈經驗雙倍晶、靈核召喚機、毒素瓶（備用）。實際使用於商店、背包、換裝及轉蛋動畫；武器示意圖不取代原GLB戰鬥模型。

完整提示詞：

> Create a production fantasy RPG transparent inventory icon atlas, exactly 4 columns by 2 rows, eight isolated icons in equal square cells, clear padding inside every cell. Square overall atlas canvas 1536 by 768 or any exact 2:1 ratio. Rich hand painted 3D game item render, ornate warm gold filigree edges, luminous colorful crystal, dark teal fantasy game aesthetic, crisp at 48 pixels. No text, numbers, letters, symbols resembling a red white capture ball, no characters, no UI backgrounds or card frames. Real transparent alpha around each icon; do not draw checkerboard. Row 1 left to right: 1) forest poison twin daggers dripping emerald venom; 2) golden lightning paralysis twin pistols with yellow electric arcs; 3) ocean slowing curved single blade with deep blue water ribbons; 4) icy freeze twin pistols with cyan ice crystal barrels. Row 2 left to right: 5) heavy golden knockback greatsword with amber shockwave; 6) double pet experience consumable, a beautiful violet and gold crystal hourglass with two ascending luminous stars; 7) ornate spirit summoning machine, small turquoise crystal core suspended between gold carved crescent supports on a pedestal, no ball or red white sphere; 8) green poison vial with purple sparkling particles. Use identical visual lighting, scale and generous separation across all eight cells. Each object entirely contained in its cell.
