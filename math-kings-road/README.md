# 數戰勇者：王者之路

適合臺灣國小二至四年級的第一人稱數學 RPG。玩家透過三選一答題攻擊怪物、獲得金幣、購買武器與盾牌，並利用護符大絕招拯救數光小鎮。

- 製作人：官毅明
- 現行公開版：https://sinnoh-summer-expedition.kyo1216kimo.chatgpt.site/
- GitHub Pages 預定網址：https://ymguan3-boop.github.io/original-games/math-kings-road/

## 遊戲內容

- 三種難度：國小二年級、三年級、四年級
- 各難度 50 題，共 150 題原創題庫
- 第一大關共 10 戰，第 10 戰為大魔王
- 答對攻擊、答錯受傷、戰勝後獲得金幣
- 商店、武器、盾牌、紙娃娃與四種護符大絕招
- 三頁自動播放繪本、自然語音、戰鬥音效與雙主題 BGM
- 遊戲進度儲存在瀏覽器 `localStorage`

## 本機開發

需要 Node.js 22 以上版本。

```bash
npm install
npm run dev
```

## 建置與 GitHub Pages

```bash
npm run build
```

建置會更新資料夾根目錄的 `index.html` 與 `assets/`。將整個 `math-kings-road/` 資料夾放在 GitHub Pages 的發布分支後，即可由子目錄網址遊玩；所有圖片、語音與音樂路徑都支援 GitHub Pages 子目錄。

## 主要結構

```text
math-kings-road/
├─ index.html          # 可直接由 GitHub Pages 提供的完成版
├─ assets/             # Vite 產生的程式與樣式
├─ src/                # React / TypeScript 遊戲原始碼
├─ audio/              # BGM、故事與怪物語音
├─ monsters/           # 最佳化怪物 WebP
├─ storybook/          # 繪本 WebP
├─ paper-doll/         # 武器、盾牌與紙娃娃 WebP
├─ charms/             # 護符 WebP
├─ npc/                # 村長動作 WebP
└─ docs/               # 架構、美術與題庫來源說明
```

## 授權

程式碼採 MIT License，詳見 `LICENSE-CODE`。圖片、語音與音樂請另見 `ASSET-NOTICE.md`。

