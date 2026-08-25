# 怪物角色語音設計

怪物台詞的唯一來源是 `app/data/monsterDialogues.json`，畫面字幕與預錄音檔共用同一份文字，避免改了台詞卻播放舊語音。

- 10 隻怪物各自指定角色聲線，不再只用兩個聲音輪流播放。
- 一般怪物使用較短、口語、有停頓與擬聲詞的句子；第 10 關魔王保留較長、沉穩的開場白。
- 登場、受傷、攻擊、落敗各有不同語速、音高與音量方向。
- 播放怪物語音時，BGM 暫降至原音量的 28%，結束後自動恢復。
- `public/audio/voice/monster-voice-manifest.json` 記錄每個角色、台詞、聲線與生成參數；`tools/generate_game_voices.py --force --monsters-only` 可原子式重建 60 段怪物語音。
