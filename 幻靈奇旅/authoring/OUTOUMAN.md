# 歐頭慢模型與初光挑戰

保留 `pikachu` 收藏與隊伍識別碼及 `electric` 套裝解鎖碼；原閃角兔模型與肖像由 `models/native/outouman.js`、`cards/art/outouman-spirit.webp` 取代。此替換不更動原有進化線、稀有度與戰鬥數值。

模型是依使用者三視圖直接以 Three.js r128 建立的關節角色；API 為 `OutoumanSpirit.create({inPlace:true,beamEffects:false})`，回傳 root／update／setMode／dispose／getState。包含 Idle、Walk、Wave、Beam、BeamPose、Throw、Roll、Hurt、Jump；Roll 以輪廓支撐函數保持地面接觸，外層遊戲控制平移。BeamPose 與 Throw 不產生模型內建白光，供遊戲發射彩虹光束或幻靈球。

初光挑戰每 5 秒發射持續 2 秒的彩虹光束，長度 42、半徑 1.1 場景單位。每束鎖定啟動當下方向，碰撞採同一條光束中軸與半徑（加上玩家半徑），翻滾可避開；每束對玩家最多造成一次 2 秒麻痺與投球封鎖。光束使用預建幾何與 7 色材質，結束戰鬥時釋放資源。

玩家球命中當下另以 30% 機率觸發 0.6 秒、3 場景單位的平滑翻滾，顯示透明無底紅字 MISS!! 並略過信任傷害。原本的 20% 首領迴避不會重複套用。

electric 換裝將原主角 GLB 隱藏，在相同玩家根節點顯示歐頭慢，保留碰撞、導航及存檔。投球使用 BeamPose，發射既有實體幻靈球模型；切回其他服裝恢復原主角。

驗收範圍僅兩項：戰鬥機制（光束／麻痺／翻滾閃避）與變身投球，各一次。閃避抽驗固定亂數命中 30% 分支，並非統計估計其機率。首輪工具因到期狀態欄位清除而等待逾時；保留已完成光束紀錄後，只接續其餘步驟，未重複執行光束抽驗。紀錄及原始參考圖留於工作區 artifacts/outouman-spirit，不隨遊戲部署。
