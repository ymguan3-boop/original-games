# 幻靈奇旅 × pixelfx 特效系統

把 pixelfx（MIT）的像素特效離線烘成 Sprite Sheet，用同一套引擎接到所有遊戲模式。特效只負責畫面，不改血量、天氣、掉寶、貨幣或存檔。

## 檔案

| 檔案 | 用途 |
|---|---|
| `js/fx/pixelfx-bridge.js` | 共用引擎：物件池、圖集快取與回收、回退、UI 疊層 |
| `js/fx/pixelfx-map.json` | 遊戲事件 → 特效 ID 對照表（由 `authoring/pixelfx-map.src.mjs` 產生） |
| `js/fx/boomerang-chain.js` | 冒險蛙 1 秒連鎖迴旋鏢控制器 |
| `assets/fx/pixelfx/` | 100 張離線圖集、`manifest.json`、`LICENSE`、`NOTICE.md`，約 11.6 MB，依模式分批載入 |
| `authoring/pixelfx-build.mjs` | 離線烘圖工具（只有開發時才跑） |
| `authoring/pixelfx-audit.mjs` | 產生 244 款清冊 `pixelfx-coverage.json` 與 100 列對照 `replacement-audit.csv` |
| `tests/pixelfx-*.test.mjs` | 清冊、引擎、連鎖迴旋鏢的自動測試 |

## 怎麼改特效

1. 編輯 `authoring/pixelfx-map.src.mjs`，規則由上往下比對，第一條符合的生效。
2. 重新產生：

```bash
node authoring/pixelfx-map.src.mjs
PIXELFX_DIR=<pixelfx 收錄目錄> node authoring/pixelfx-build.mjs
node authoring/pixelfx-audit.mjs
node --test tests/
```

玩家端不會執行 npm、Node 或 Claude Skill，只讀靜態 PNG 與 JSON。

## 回退

- 單次關閉：網址加 `?pixelfx=0`
- 長期關閉：`localStorage.setItem('phantom-pixelfx','off')`
- 單張圖集或對照表讀取失敗時，`emit` 回傳 `ok:false`，該次事件自動播原本的特效，遊戲照常進行。

## 冒險蛙連鎖迴旋鏢

- 出手到接回 950 毫秒；擂台實測含倍速約 0.73 秒。
- 主目標 100%，第 2、3 目標 70%、50%（`BoomerangChain.CHAIN_DAMAGE`）；每個目標每次投鏢只結算一次。
- 擂台：目標是敵方名單上真實的待命幻靈，短暫站到主目標兩側承受這一鏢，鏢回手後退場，不改出場順序；只剩一名敵人時單體命中後回手。玩家與 AI 規則相同。
- 守護戰：傷害仍由 `rules.js` 的扇形判定結算，連鎖只負責畫面。冒險蛙不是基礎卡，要合成進化才會出現。
- 洞穴：大絕是治療，不投鏢；普攻沿用原本的追蹤連鎖判定，只加上反彈特效。
- 模型室：目標是木頭人，流程與擂台相同。

## 來源與授權

- pixelfx：https://github.com/patch-gg/pixelfx，固定版本 `a84159688af3ca37a4be05a0d422b94451b2e24e`，MIT。
- 收錄副本：https://github.com/ymguan3-boop/good-open-source-collection
- 不含 Patch Pixel 字型（不屬於 MIT 授權範圍）。
