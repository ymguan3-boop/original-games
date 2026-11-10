/* Entry checks shared by the state machine, tutorial and visible controls. */
export const canStartTutorial=s=>!(s.shelves||[]).length;
export function openingBlocker(s){if(!(s.shelves||[]).length)return '請先在店內擺放至少一座貨架，才能開始營業。';if(!s.promoter)return '請先聘請一位門口宣傳員，首次聘請免費。';return '';}
export const promoterHireCost=(s,p)=>!s.promoter&&!s.promoterFirstHireClaimed?0:p.cost;
