# 官胖遊戲整合

`infernape` 為舊存檔及圖鑑 No.035 的相容 ID；顯示名稱已由彗拳巨猿改為官胖。

- 紅卡：`cardFrame: red`
- 念屬性：`element: psychic`、`type: 念`
- 傳說：`rarity: 傳說`、`role: legendary`
- 魔王：`stageLabel: 魔王`
- 模型：`models/spirits/guanpang.glb`（21 骨、9 個動作，含表情）
- 肖像：`cards/art/guanpang.webp`（768 × 768，由同一模型渲染）
- 普攻：震地斧擊 → `Attack`，約 1.1 秒
- 大絕：天墜裂地 → `Ultimate`，約 2.73 秒

保留原有 HP、攻擊力、能量消耗、圖鑑編號、羈絆與前階連結，避免既有存檔失去角色。
`js/guanpang-combat-vfx.js` 已接入遊戲 actor 與模型室；大絕落地後才顯示地面震波。

來源為同目錄的 `build-blender.py`。以 Blender 背景執行後，將輸出的 `models/characters/guanpang-blender.glb` 複製至 `models/spirits/guanpang.glb`，再更新兩份 manifest 的統計。原生 `.blend` 保留在本機製作目錄。

驗證包含實際遊戲載入、紅卡肖像、模型室九個動作、兩個技能綁定、對戰攻擊與落地效果時序；瀏覽器與遊戲錯誤列表皆為空。
