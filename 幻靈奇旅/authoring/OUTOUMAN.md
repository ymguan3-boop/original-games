# 歐頭慢 Blender V2 整合

2026-10-27：採用玩家指定的 `outoman/v2/assets/outoman-game.glb`，遊戲檔為 `models/spirits/outoman-v2.glb`。可編輯母檔仍保留於獨立 `outoman/v2/blender/outoman-master.blend` 與 `outoman-game.blend`，不刪除玩家來源工程。模型室、一般場景、初光挑戰、擂台及無盡洞穴共用此 GLB。

保留 `pikachu` 收藏／隊伍識別碼、`electric` 套裝解鎖、技能名稱、能力、稀有度及存檔。圖鑑說明更新為虎紋銀紅裝甲造型；新肖像 `cards/art/outoman-v2.webp` 使用內建 image_gen 參考實際 Blender 預覽生成。生成提示與來源記錄在 `data/outoman-v2.json`。

GLB 有 Idle、Walk、Run、Hit、Attack、Ultimate 六組骨架與形變動畫，139,996 個三角形、76,525 個頂點、19 根骨架、12 種材質。`js/outoman-v2-fx.js` 依原工作室的手腕位置 `wristL (0,-0.15,0.15)` 發射光束；Attack 白光／Ultimate 七色光束於動作 38%–82% 階段顯示。每個實例固定 9 個特效 mesh，幾何重複使用，離場釋放獨立材質與幾何。

初光挑戰原每 5 秒發射、持續 2 秒、命中麻痺 2 秒，以及投球 30% 翻滾閃避的規則保留。挑戰使用新腕骨的相同出光位置；GLB 動作調速對齊該 2 秒演出，實際碰撞光束不重複疊加。

舊遊戲版程序模型與舊肖像在新版本抽驗後移除；不重複打包高面數 Blender 母檔、生成原圖與測試截圖。[驗證紀錄](../survivors/docs/validation-v29.md)。
