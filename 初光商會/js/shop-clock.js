/* 商會的遊戲時間：每天 07:00 開門、20:00 打烊。打烊後顯示結算，按「新的一天」直接回到 07:00。 */
export const OPEN_MIN=7*60,CLOSE_MIN=20*60;
export function clockMinutes(s,cfg){if(s.phase!=='open')return s.phase==='report'?CLOSE_MIN:OPEN_MIN;return OPEN_MIN+Math.min(1,(s.time||0)/(cfg.dayDuration||180))*(CLOSE_MIN-OPEN_MIN);}
export function clockText(s,cfg){const m=Math.floor(clockMinutes(s,cfg)),hh=String(Math.floor(m/60)).padStart(2,'0'),mm=String(m%60).padStart(2,'0');return `${hh}:${mm}`;}
export function clockLabel(s,cfg){return s.phase==='report'?'打烊結算':s.phase==='open'?(s.layoutPause?'暫停營業':'營業中'):'準備開店';}
/* 升級條件的平均達成率（每項最多算 100%） */
export function upgradeProgress(info){if(info.last)return 100;const g=info.goals;return Math.round(g.reduce((n,x)=>n+Math.min(1,x.target?x.value/x.target:1),0)/g.length*100);}
