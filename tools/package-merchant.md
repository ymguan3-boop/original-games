# 商會 runtime 打包

在本 worktree 執行：

```powershell
node tools/package-merchant.mjs
node tools/package-merchant.mjs --dest sites/public/shop --main-path ../game/
node tools/package-merchant.mjs --dest sites/public/shop --main-path ../game/ --dry-run
```

預設來源為同層 `original-games/初光商會`，可用 `--source` 改指定。路徑參數相對於執行時工作目錄。主遊戲必須另行交付到對應的 sibling 資料夾；此工具不複製主遊戲。

工具以 index 的 HTML/CSS 與 ES module import 建立閉包，追蹤靜態圖像及 GLB 外部 buffer/image。動態路徑由現行貨架、裝潢、商品、牆面 registry 枚舉，再補上樓地板、內裝、任務、事件、HTML 功能圖示等有限變體。新增動態載入種類時，請同步更新腳本 Dynamic adapters 區塊。腳本僅 import 無副作用的宣告模組，不載入 app/scene。

`runtime-manifest.json` 記錄檔案大小、SHA-256、納入理由、主遊戲直接依賴與未解依賴。缺檔時 exit code 1。外部主遊戲依賴對 authoring sibling 驗證；主遊戲自己的遞迴依賴仍由主遊戲包負責。主遊戲路徑替換只作用於目的 runtime 文字檔。

預設用已安裝 Python/Pillow 產生衍生素材：外部 PNG 轉 WebP q88、method6，保留透明，貼圖最大1024、預覽最大512。GLB 內嵌 PNG 縮至最大1024並 optimize PNG，維持原 MIME；重排 bufferViews 並對齊4bytes，每個非圖片 bufferView（模型、骨架、動畫等）的位元組串接 SHA-256 必須不變。GLB 未省至少5%時保留來源原檔。`--no-compress` 可停用轉檔。既有 WebP 不再轉碼。

目的檔案會更新，來源從不改動；只刪除前次 runtime-manifest 列出且新版不再使用的檔案（驗證絕對路徑仍位於目的目錄內），不刪任意其他檔案。發布建議使用全新 staging 目錄。manifest 的總量只計 runtime 檔案，不含 manifest 本身，不公開本機絕對路徑。作者來源、Blender、review、證據、測試、工具與舊版 pilot 不會因廣泛複製資料夾而混入。

打包後仍須以 HTTP 啟動目的目錄，實測開店、商品、裝潢、五級商會及返回主遊戲；檔案閉包通過不等同互動與 GPU 驗收。
