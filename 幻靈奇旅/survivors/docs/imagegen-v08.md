# 生圖素材與使用位置 — 0.8

使用內建 image_gen，透明背景；未使用 CLI 或 API 金鑰。原始輸出保留，圖片以新檔名複製進工作區，未覆蓋原素材。

- `assets/items-v08.png`：4×4 道具圖集。背包、道具商店、生命／攻擊／防禦培育共用。
- `assets/weapons-v08.png`：4×2 武器圖集。永久武器商店、長按武器換裝選單共用。作為物品示意圖；戰場武器模型仍沿用原遊戲GLB。
- `js/item-pictures.js` 定義格子對應；`css/v08.css` 以背景定位呈現，不裁切或改動原始生圖的透明通道。

原始圖集：`製作環境原始生成檔`、`exec-a957b1ea-5039-4681-9ebc-b550066c25cf.png`。

以下記錄完整提示詞。

## 1

Use case: stylized-concept. Asset type: fantasy RPG inventory item sprite atlas, exactly 4 columns x 4 rows, sixteen equal square cells, designed for a dark teal and gold Chinese fantasy game UI. Each individual object centered within its own cell with generous transparent margin; no object crosses cell boundaries. Elegant polished hand-painted 3D game loot icons with readable silhouettes, luminous jewel accents and restrained gold metal fittings. Transparent background. No words, no numbers, no labels, no borders, no characters. Strict row-major order: row1 red healing potion bottle; gold phoenix feather revive potion; violet crystal energy battery; aqua faceted crystal spirit core encased in gold filigree. Row2 blue enhanced faceted spirit core; violet ultimate faceted spirit core; red sword emblem attack charm; violet star skill charm. Row3 blue expanding rings range charm; gold hourglass cooldown charm; emerald shield defense charm; teal crystal capture charm. Row4 turquoise magnet pickup radius charm; gold coin pouch; blue ore crystal; green leaf vitality emblem. Spirit cores are crystalline fantasy relics, never red-and-white balls, never central button or horizontal split. High visual quality matching ornate gold fantasy controls; crisp objects at small sizes. Image aspect square 1024x1024 or higher.

## 2

Use case: stylized-concept. Asset type: a single fantasy RPG weapon inventory sprite atlas, exactly 4 columns by 2 rows, eight equal square cells. Transparent background, no text, no lettering, no numbers, no borders. Each centered complete object fits inside its own cell with ample transparent margin. Crisp premium hand-painted 3D game illustration, gold filigree fittings, rich teal and jewel lighting, readable silhouettes at 48px. Row-major exact order. Top row: a heavy broad two-handed silver greatsword with gold hilt; one curved katana single blade with teal sheath accents; a paired set of short curved silver twin blades; a matched pair of compact fantasy crystal energy pistols in dark blue and gold. Bottom row: same broad greatsword with fiery orange glowing rune edge; same single curved katana with aqua water flowing along the blade; same paired short blades with green forest-leaf glow; same paired compact crystal energy pistols with bright violet thunder channels. A pair occupies ONE cell. Consistent proportions and three-quarter item presentation. Do not use realistic military guns. No backgrounds or shadows extending into neighboring cells. Landscape 2:1 aspect ratio.
