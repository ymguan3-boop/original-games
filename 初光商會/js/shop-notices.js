import {readyStaffEvolutions} from './staff-evolution.js?v=20261114-v57r3';
import {shelfTypes} from './furniture.js?v=20261114-v57r3';
import {decorTypes} from './decorations.js?v=20261114-v57r3';
import {isPromoterLineage} from './promoter-lineage.js?v=20261114-v57r3';
import {buildNotice} from './build-notices.js?v=20261114-v57r3';
import {pendingRewards} from './reward-collection.js?v=20261114-v57r3';
import {activeEvent} from './economy-v2.js?v=20261114-v57r3';
import {commissionNotice} from './commissions.js?v=20261114-v57r3';
// 所有層級讀取相同狀態；可執行提醒不因開啟選單而消失。
export function shopNotices(game,s,seen={}){
 const buildIds=[...shelfTypes,...decorTypes].filter(t=>(t.level||1)<=s.level&&!(seen.build||[]).includes(t.id)).map(t=>t.id);
 const hireIds=game.data.hirePool.filter(h=>!h.evolutionOnly&&!isPromoterLineage(game.data,h.spiritId||h.id)&&h.level<=s.level&&!s.employees.some(e=>e.baseId===h.id)&&!(seen.staff||[]).includes(h.id)).map(h=>h.id);
 const evolutionIds=readyStaffEvolutions(game.data,s.employees).map(e=>e.id),rewards=pendingRewards(game,s),build=buildNotice(game,s,seen.build),market=activeEvent(s);
 const racks=build?.kind==='rack'||shelfTypes.some(t=>buildIds.includes(t.id)),furniture=decorTypes.some(t=>t.group==='furniture'&&buildIds.includes(t.id)),decor=decorTypes.some(t=>t.group==='decor'&&buildIds.includes(t.id));
 const exhaustedIds=s.employees.filter(e=>e.role!=='standby'&&e.fatigue>=100).map(e=>e.id);
 return {exhaustedIds,buildIds,hireIds,evolutionIds,rewards,build,racks,furniture,decor,staff:!!(hireIds.length||evolutionIds.length||exhaustedIds.length),tasks:!!(s.event||market||rewards.total),shop:!!(commissionNotice(s)&&(s.commissionBoard?.unread||rewards.orders))};
}
