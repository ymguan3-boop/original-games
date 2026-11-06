const check=(ok,message)=>{if(!ok)throw Error(message);};
export function commissionState(s){return s.commissionBoard??={clock:0,nextAt:12,serial:0,unread:false,entries:[]};}
export function commissionProgress(s,q){return q.kind==='delivery'?Math.min(q.qty,s.inventory[q.sku]||0):Math.min(q.qty,Math.max(0,s.totals.sales-q.startSales));}
export function commissionVisibleEntries(s){
 const b=s.commissionBoard;if(!b)return [];
 // Older save files have no createdDay; retain a still-valid commission only until nextDay.
 return b.entries.filter(q=>
  (q.createdDay===undefined||q.createdDay===s.day)&&q.expiresAt>b.clock&&
  ['active','claimed'].includes(q.status)
 ).sort((a,b)=>Number(b.status==='active')-Number(a.status==='active')||b.createdAt-a.createdAt);
}
export function activeCommissions(s){
 return commissionVisibleEntries(s).filter(q=>q.status==='active');
}
export function commissionNotice(s){
 const b=s.commissionBoard,active=activeCommissions(s);
 return !!b&&active.length>0; // Keep the toolbar badge consistent with the actual live commission count.
}
export function resetCommissionsForNewDay(s){
 const b=commissionState(s);
 // Keep serial and clock for unique IDs and monotonic timers; erase yesterday's messages.
 b.entries=[];b.unread=false;b.nextAt=b.clock+12;
 return b;
}
export function validateCommissions(s,catalog){if(!s.commissionBoard)return;const b=s.commissionBoard;check(Number.isFinite(b.clock)&&b.clock>=0&&Number.isFinite(b.nextAt)&&Number.isInteger(b.serial)&&typeof b.unread==='boolean'&&Array.isArray(b.entries)&&b.entries.length<=12,'委託紀錄無效');check(new Set(b.entries.map(q=>q.id)).size===b.entries.length,'委託 ID 重複');for(const q of b.entries)check((q.createdDay===undefined||Number.isInteger(q.createdDay)&&q.createdDay>=1)&&typeof q.id==='string'&&['delivery','sales'].includes(q.kind)&&['active','claimed','expired'].includes(q.status)&&Number.isInteger(q.qty)&&q.qty>0&&Number.isFinite(q.reward)&&q.reward>0&&Number.isFinite(q.expiresAt)&&Number.isFinite(q.startSales)&&(q.kind!=='delivery'||catalog.some(p=>p.sku===q.sku)),'委託內容無效');}
export function commissionsTick(g,s,dt){if(s.phase!=='open'||s.paused)return;const b=commissionState(s);/* 第一天先跟著招財走完主線，日結後才開始派委託 */if(s.level===1&&!s.totals?.days&&!b.entries.length)return;b.clock+=dt;for(const q of b.entries)if(q.status==='active'&&q.expiresAt<=b.clock){q.status='expired';g.log(s,`${q.client}的委託已到期，沒有扣款或處罰。`);}b.entries=b.entries.filter(q=>q.status!=='expired');if(!activeCommissions(s).length)b.unread=false;if(b.clock<b.nextAt)return;b.nextAt=b.clock+55+Math.floor(g.random(s)*50);if(activeCommissions(s).length>=2)return;
 const level=s.level,kind=g.random(s)<.7?'delivery':'sales',catalog=g.data.catalog.filter(p=>p.unlockStoreLevel<=level&&p.isSellable&&!p.isRestricted),product=catalog[Math.floor(g.random(s)*catalog.length)],qty=kind==='delivery'?3+level*2+Math.floor(g.random(s)*3):2+level*2,duration=150+level*15;
 const clients=['森野採集隊','晨星旅行團','初光研究室','小鎮冒險公會'],client=clients[Math.floor(g.random(s)*clients.length)];
 const q={id:`commission-${++b.serial}`,createdDay:s.day,kind,level,client,sku:kind==='delivery'?product.sku:null,name:kind==='delivery'?product.displayName:'商店成交',qty,reward:kind==='delivery'?Math.ceil(product.buyCost*qty*1.7+level*75):level*180+qty*35,startSales:s.totals.sales,createdAt:b.clock,expiresAt:b.clock+duration,status:'active'};
 b.entries.push(q);b.entries=b.entries.slice(-12);b.unread=true;g.log(s,`${client}傳來限時委託，請查看商會訊息。`);
}
export function commissionAction(g,s,type,p){if(!['readCommissions','claimCommission'].includes(type))return null;const b=commissionState(s);if(type==='readCommissions'){b.unread=false;return '已讀取商會訊息';}const q=b.entries.find(q=>q.id===p.id);check(q&&q.status==='active'&&q.expiresAt>b.clock&&(q.createdDay===undefined||q.createdDay===s.day),'委託已結束或獎勵已領取');check(commissionProgress(s,q)>=q.qty,q.kind==='delivery'?'庫房商品不足，請先採購':'成交目標尚未達成');
 if(q.kind==='delivery'){s.inventory[q.sku]-=q.qty;const product=g.data.catalog.find(p=>p.sku===q.sku),cost=Math.round((s.averageCosts?.[q.sku]??product.buyCost)*q.qty*100)/100;s.stats.revenue+=q.reward;s.stats.cogs=Math.round((s.stats.cogs+cost)*100)/100;s.totals.revenue+=q.reward;s.ledger.push({id:q.id,day:s.day,revenue:q.reward,cogs:cost,items:[{sku:q.sku,qty:q.qty}],kind:'commission'});s.ledger=s.ledger.slice(-200);}else s.stats.rewards+=q.reward;
 s.gold+=q.reward;if(s.phase==='report'&&s.report){Object.assign(s.report,{revenue:s.stats.revenue,cogs:s.stats.cogs,rewards:s.stats.rewards,gold:s.gold,grossProfit:s.stats.revenue-s.stats.cogs,netProfit:s.stats.revenue+(s.stats.furnitureSales||0)-s.stats.cogs-s.stats.wages-s.stats.expenses});if(s.history.at(-1)?.day===s.day)s.history[s.history.length-1]={...s.report};}q.status='claimed';q.claimedAt=b.clock;g.log(s,`完成${q.client}委託，${q.kind==='delivery'?`交付 ${q.name} ${q.qty} 件，`:'成交獎勵'}收到 ${q.reward} G。`);return `委託完成，收到 ${q.reward} G`;
}
