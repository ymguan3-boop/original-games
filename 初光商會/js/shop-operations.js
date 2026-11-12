import {decorEffects,obstacles} from './decorations.js?v=20261112-v31f';
import {purchaseChance} from './economy-v2.js?v=20261112-v31f';
import {shelfTypes,shelfKind,shelfCapacity,shelfDefinition,ownsUniqueShelf} from './furniture.js?v=20261112-v31f';
import {isLayoutValid,walkable,findPath,ENTRANCE,CHECKOUT,dimensions} from './nav.js?v=20261112-v31f';
import {resolveCustomerComplaint} from './customer-complaints.js?v=20261112-v31f';
import {chapterObjectives,autoChapterConstruction,beginChapterConstruction,finishChapterConstruction} from './shop-chapters.js?v=20261112-v31f';
import {passive,jobPower,dailyTrack} from './management.js?v=20261112-v31f';
const check=(v,m)=>{if(!v)throw Error(m)},clamp=n=>Math.max(0,Math.min(100,n));
export function react(s,e,kind,seconds=5){if(!e)return;e.reaction=kind;e.feedbackKind=kind;e.reactionSeq=(e.reactionSeq||0)+1;e.reactionUntil=s.totalTime+seconds;}
export function upgradeSeconds(level){return [0,0,30,60,90,150,180,210,240,270,300][level]??30;}
function validLayout(g,s,shelves){const all=obstacles({...s,shelves});check(isLayoutValid(all,s.level),'配置重疊物件或阻擋通路');check(g.actors(s).every(a=>walkable(a,all,s.level)),'位置與角色重疊');if(s.forge)check(findPath(ENTRANCE,s.forge.station,all,s.level)!==null,'請保留鍛造工作位置與通路');}
export function shopAction(g,s,type,p){
 s.shelfStorage||=[];
 if(type==='resolveCustomerComplaint')return resolveCustomerComplaint(g,s,p);
 if(type==='upgrade'){
  check(!s.upgradeProject,'店面正在施工');const l=g.data.levels[s.level];check(l,'商會已達最高級');check(chapterObjectives(s,g.data.levels).ready,'尚未完成本章主線營業目標');check(s.totals.revenue>=l.revenue&&s.satisfaction>=l.satisfaction&&s.totals.days>=l.days,`需營業額 ${l.revenue} G、滿意度 ${l.satisfaction}、日結 ${l.days} 次`);beginChapterConstruction(g,s);return '已安排施工，倒數完成後店面才會升級';
 }
 if(!['purchaseShelf','storeShelf','placeShelf','sellShelf'].includes(type))return null;
 check(s.phase!=='open'||s.layoutPause,'請先進入布置模式');
 if(type==='purchaseShelf'){
  const kind=shelfTypes.find(t=>t.id===p.type);check(kind,'貨架類型無效');check(s.level>=kind.level,'商會等級尚未解鎖此貨架');check(!kind.unique||!ownsUniqueShelf(s,kind.id),'限定武器櫃限購一座（含收納中）');check(s.shelfStorage.length<50,'收納空間最多 50 座');const price=kind.cost;g.pay(s,price);s.stats.expenses+=price;const id=`rack-${++s.serial}`;s.shelfStorage.push({id,type:kind.id,sku:kind.sku,stock:0,rotation:0,purchasePrice:price});s.lastPurchasedShelf=id;g.log(s,`購入${kind.name} ${price} G，尚未放置。`);return '貨架已購入；取消放置時會留在收納區';
 }
 if(type==='storeShelf'){
  const sh=s.shelves.find(x=>x.id===p.shelfId);check(sh,'貨架不存在');check(!s.customers.some(c=>c.basket.some(b=>b.shelfId===sh.id)),'顧客正在選購這座貨架');check(s.shelfStorage.length<50,'貨架收納空間已滿');const shelves=s.shelves.filter(x=>x!==sh);validLayout(g,s,shelves);for(const e of s.employees)if(e.workTask?.shelfId===sh.id){if(e.workTask.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;}s.inventory[sh.sku]+=sh.stock;const saved={...sh,type:shelfKind(sh),stock:0,purchasePrice:sh.purchasePrice??g.data.config.shelfCost};delete saved.x;delete saved.z;s.shelfStorage.push(saved);s.shelves=shelves;s.undo=null;for(const a of g.actors(s))a.path=[];g.log(s,`${shelfTypes.find(t=>t.id===saved.type)?.name}已撤銷至收納，架上商品已回庫房。`);return '貨架已收納，可再次放置或半價販售';
 }
 const sh=s.shelfStorage.find(x=>x.id===p.shelfId);check(sh,'收納貨架不存在');
 if(type==='sellShelf'){
  const price=Math.floor((sh.purchasePrice??g.data.config.shelfCost)/2);s.gold+=price;s.stats.furnitureSales=(s.stats.furnitureSales||0)+price;s.shelfStorage=s.shelfStorage.filter(x=>x!==sh);g.log(s,`販售收納貨架 +${price} G（購入半價）。`);return `已販售貨架，收入 ${price} G`;
 }
 check(s.shelves.length<2+Math.min(s.level,5)*2,'店內貨架已滿');const placed={...sh,x:p.x,z:p.z,rotation:p.rotation||0};validLayout(g,s,[...s.shelves,placed]);s.shelves.push(placed);s.shelfStorage=s.shelfStorage.filter(x=>x!==sh);s.undo=null;/* 新貨架立刻上架，不必等補貨員 */g.autoStock(s,placed);{const qty=Math.min(s.inventory[placed.sku]||0,shelfCapacity(placed)-placed.stock);s.inventory[placed.sku]-=qty;placed.stock+=qty;}for(const a of g.actors(s))a.path=[];return '貨架已放置，未重複扣款';
}
export function operationsTick(g,s,dt){
 if(!s.upgradeProject&&!s.layoutPause)autoChapterConstruction(g,s);
 if(s.phase==='open'){const n=g.data.management.noStaff,power=jobPower(g,s,'cleaner'),target=power?100:n.cleanTarget;s.satisfaction=clamp(s.satisfaction+decorEffects(s).satisfaction*dt);if(s.satisfaction<target)s.satisfaction=Math.min(target,s.satisfaction+n.cleanPerSecond*(1+power)*(1+passive(g,s,'clean'))*dt);}
 if(s.upgradeProject){s.upgradeProject.remaining=Math.max(0,s.upgradeProject.remaining-dt);if(!s.upgradeProject.remaining){const previous=s.level;s.level=s.upgradeProject.to;s.upgradeProject=null;finishChapterConstruction(g,s,previous);g.log(s,`裝修完成！商會升至 Lv.${s.level} ${g.data.levels[s.level-1].name}。`);}}
 for(const e of s.employees)if(e.reactionUntil&&e.reactionUntil<=s.totalTime){e.reaction='idle';e.feedbackKind=null;e.reactionUntil=0;}
}
export function operationalEvent(g,s,id,title,description,role='cashier'){
 if((s.cooldowns[id]||0)>s.totalTime)return;s.cooldowns[id]=s.totalTime+45;g.log(s,title+'：'+description);return;/* 營運狀況交給員工自動處理，不再彈事件 */
 const event={id,title,description,role,employeeId:g.role(s,role)?.id,instanceId:`op-${++s.serial}`,cooldown:45,effect:'clean',effectValue:1,choices:[{id:'help',label:'協助安撫 · 40 G，滿意度 +4',cost:40,mood:8,satisfaction:4,xp:6},{id:'coach',label:'免費溝通與排班提醒',cost:0,mood:3,satisfaction:1,xp:2}]};if(!s.event)s.event=event;else{ s.incidents||=[];if(s.incidents.length<6&&!s.incidents.some(e=>e.id===id))s.incidents.push(event);}
}
function angry(g,s,c,reason){
 if(c.state==='Angry'||c.state==='Leave')return;c.basket=[];c.state='Angry';c.path=[];c.timer=0;c.emotion='angry';c.angerReason=reason;s.stats.lost++;const old=s.satisfaction;s.satisfaction=clamp(s.satisfaction-1);if(old>s.satisfaction)g.notice(s,c.id,'滿意 -1','bad');s.memories[c.personality]={day:s.day,satisfied:false,reason};const shortage=reason.includes('缺貨');operationalEvent(g,s,shortage?'stockout':'queue-complaint',shortage?'顧客找不到商品':'顧客生氣了',`${c.name}：${reason}。商品已退回陳列，不會計為收入。`,shortage?'stocker':'cashier');
}
function leave(g,s,c){c.state='Leave';c.timer=0;c.exitRerouteAt=2;c.path=[];const side={x:CHECKOUT.x-1,z:3};if(Math.hypot(c.x-CHECKOUT.x,c.z-CHECKOUT.z)<.2&&walkable(side,obstacles(s),s.level)){const a=findPath(c,side,obstacles(s),s.level),b=findPath(side,ENTRANCE,obstacles(s),s.level);if(a&&b)c.path=[...a,...b];}if(!c.path.length)g.route(s,c,ENTRANCE);}
/* 收銀由主角負責：巡店時櫃台沒人，結帳變慢 */
const AWAY_SLOWDOWN=1.8;
function cashierAt(g,s){return null;}
function pay(g,s,c,e){
 const saleId='sale-'+c.id;
 if(s.txIds.includes(saleId)||s.ledger.some(x=>x.id===saleId)){c.basket=[];c.state='Paid';c.timer=0;return;}
 if(!c.basket.length)return;

 const listed=c.basket.reduce((n,b)=>n+b.price*b.qty,0),sale=Math.round(listed*(1+passive(g,s,'income'))),cost=Math.round(c.basket.reduce((n,b)=>n+b.cost*b.qty,0)*100)/100;check(c.budget>=listed,'顧客預算不足');for(const b of c.basket){const sh=s.shelves.find(x=>x.id===b.shelfId);check(sh&&sh.stock>=b.qty,'結帳庫存不足');sh.stock-=b.qty;}
 s.txIds.push(saleId);s.stats.units=(s.stats.units||0)+c.basket.reduce((n,b)=>n+b.qty,0);c.budget-=listed;s.gold+=sale;dailyTrack(g,s,'sales',1);dailyTrack(g,s,'gold',sale);s.stats.revenue+=sale;s.stats.cogs=Math.round((s.stats.cogs+cost)*100)/100;s.stats.sales++;s.stats.served++;s.totals.revenue+=sale;s.totals.sales++;s.ledger.push({id:`sale-${c.id}`,day:s.day,customerType:c.customerType||'commoner',revenue:sale,cogs:cost,items:structuredClone(c.basket)});s.ledger=s.ledger.slice(-200);c.purchaseItems=structuredClone(c.basket);c.basket=[];c.state='Paid';c.timer=0;c.emotion='happy';{const previous=s.satisfaction,bonus=(g.role(s,'cleaner')?2:1)*(1+passive(g,s,'satisfaction'));s.satisfaction=clamp(s.satisfaction+bonus);const gained=Math.round((s.satisfaction-previous)*10)/10;if(gained>0)g.notice(s,c.id,`滿意 +${gained}`,'good');}g.xp(s,e,1);g.xp(s,g.role(s,'cleaner'),.5);if(e&&!(e.reactionUntil>s.totalTime&&['training','proud','stressed'].includes(e.feedbackKind)))react(s,e,'work',2);g.log(s,`${c.name}在收銀台完成付款 +${sale} G`);s.memories[c.personality]={day:s.day,satisfied:true,spent:sale};
}
export function stepCustomers(g,s,dt){
 const queue=s.customers.filter(c=>['Queue','Checkout'].includes(c.state)).sort((a,b)=>(a.queueOrder||0)-(b.queueOrder||0));
 queue.forEach((c,i)=>{if(c.state==='Checkout')return;const goal={x:CHECKOUT.x,z:3+i};if(i<Math.floor(dimensions(s.level).height)-4&&(c.queueSlot!==i||!c.path.length&&Math.hypot(c.x-goal.x,c.z-goal.z)>.1)){c.queueSlot=i;g.route(s,c,goal);}});
 /* 已經誤闖收銀台後方的顧客：帶回櫃台前面 */
 for(const c of s.customers){if(c.path.length||Math.abs(c.x-CHECKOUT.x)>1.6||c.z>1.6||['Paid'].includes(c.state)||(c.rescueAt||0)>s.totalTime)continue;c.rescueAt=s.totalTime+1;const out=[{x:CHECKOUT.x+1,z:3},{x:CHECKOUT.x-1,z:3},{x:CHECKOUT.x+2,z:3},{x:CHECKOUT.x+2,z:2}].find(p=>walkable(p,obstacles(s),s.level));if(out)g.route(s,c,out);}
 const cashier=cashierAt(g,s);
 for(const c of [...s.customers]){
  c.timer+=dt;
  // Never leave a departing customer stuck in the shop when a path is blocked.
  c.arrivingNow=false;if(c.arrivalRemaining>0){c.arrivalRemaining=Math.max(0,c.arrivalRemaining-dt);if(c.arrivalRemaining>0)continue;c.arrivingNow=true;}
  if(c.exitingAtDoor){c.exitTravel=(c.exitTravel||0)+dt;if(c.exitTravel>=5)s.customers=s.customers.filter(x=>x.id!==c.id);continue;}
  if(c.state==='Leave'&&Math.hypot(c.x-ENTRANCE.x,c.z-ENTRANCE.z)<.25){c.exitingAtDoor=true;c.exitTravel=0;c.path=[];continue;}
  if(['Cart','Queue','Checkout'].includes(c.state)){c.wait=(c.wait||0)+dt;if(c.wait>c.patience){angry(g,s,c,cashier?'排隊等太久':'沒有收銀員服務');continue;}}
  g.safeMove(s,c,dt*2.2,dt);if(c.path.length&&c.state==='Evaluate'&&(c.blocked||0)>=1.2){const t=s.shelves.find(sh=>sh.id===c.targetShelf);if(t&&Math.hypot(c.x-t.x,c.z-(t.z+1))<1.6){c.path=[];c.blocked=0;c.browsingNear=true;}}if(c.path.length)continue;
  if(c.state==='Enter'||c.state==='Browse'){
   const eligible=s.shelves.filter(sh=>g.available(s,sh)>0&&!c.visited.includes(sh.id));eligible.sort((a,b)=>{const ca=g.data.catalog.find(x=>x.sku===a.sku),cb=g.data.catalog.find(x=>x.sku===b.sku),preferred=['item','weapon','item','material','item','item','weapon','material'][c.personality];return Number(cb.category===preferred)-Number(ca.category===preferred);});const sh=eligible[0];if(!sh){if(!c.stockoutCounted){c.stockoutCounted=true;s.stats.stockouts=(s.stats.stockouts||0)+1;}c.state='OutOfStock';c.emotion='question';c.timer=0;continue;}c.targetShelf=sh.id;c.visited.push(sh.id);c.state='Evaluate';c.timer=0;g.route(s,c,{x:sh.x,z:sh.z+1});
  }else if(c.state==='Evaluate'&&c.timer>1){
   const target=s.shelves.find(sh=>sh.id===c.targetShelf);if(target&&!c.browsingNear&&Math.hypot(c.x-target.x,c.z-(target.z+1))>.15){g.route(s,c,{x:target.x,z:target.z+1});continue;}c.browsingNear=false;
   const sh=s.shelves.find(x=>x.id===c.targetShelf),item=g.data.catalog.find(x=>x.sku===sh?.sku),price=sh?Math.round(s.prices[sh.sku]*shelfDefinition(sh).premium*(1+decorEffects(s).premium)):0,tolerance=(c.personality===4?1.1:1.4)+(g.role(s,'host')?.3:0)+(s.buffs.sales>s.totalTime?.2:0)+(c.memory?.satisfied?.1:c.memory?-.15:0);
   if(sh&&g.available(s,sh)<=0){if(!c.stockoutCounted){c.stockoutCounted=true;s.stats.stockouts=(s.stats.stockouts||0)+1;}c.state='OutOfStock';c.emotion='question';c.timer=0;continue;}if(sh&&g.available(s,sh)>0&&price<=c.budget&&g.random(s)<purchaseChance(s,{type:c.customerType||'commoner',sku:sh.sku,price,ref:item.suggestedRetail*shelfDefinition(sh).premium*(1+decorEffects(s).premium)*(tolerance/1.4)})){c.basket=[{sku:sh.sku,shelfId:sh.id,qty:1,price,cost:s.averageCosts?.[sh.sku]??item.buyCost}];c.state='Cart';c.timer=0;c.wait=0;g.xp(s,g.role(s,'host'),.5);}else{c.state=c.visited.length<s.shelves.length?'Browse':'UnhappyExit';c.timer=0;}
  }else if(c.state==='Cart'){
   if(s.customers.filter(x=>['Queue','Checkout'].includes(x.state)).length>=Math.floor(dimensions(s.level).height)-4)continue;c.state='Queue';c.queueOrder=++s.serial;c.queueSlot=-1;c.timer=0;
  }else if(c.state==='Queue'){
   const first=s.customers.filter(x=>['Queue','Checkout'].includes(x.state)).sort((a,b)=>(a.queueOrder||0)-(b.queueOrder||0))[0];if(first===c&&Math.hypot(c.x-CHECKOUT.x,c.z-CHECKOUT.z)<.1){c.state='Checkout';c.timer=0;}
  }else if(c.state==='Checkout'){
   const duration=g.data.config.checkoutSeconds*(g.managerActive?AWAY_SLOWDOWN:1)/(1+passive(g,s,'checkout'))/(s.buffs.show>s.totalTime||s.buffs.checkout>s.totalTime?1.6:1);if(c.timer>=duration&&Math.hypot(c.x-CHECKOUT.x,c.z-CHECKOUT.z)<.1)pay(g,s,c,cashier);
  }else if(c.state==='Paid'&&c.timer>.6)leave(g,s,c);
  else if(c.state==='Angry'&&c.timer>14&&s.customerChase?.customerId!==c.id)leave(g,s,c);
  else if(['OutOfStock','UnhappyExit','AbandonCart'].includes(c.state)){if(c.timer>=16&&s.customerChase?.customerId!==c.id)angry(g,s,c,c.state==='OutOfStock'?'想買的商品缺貨':'沒有買到合適商品');else c.emotion=c.state==='OutOfStock'?'question':'confused';}
  else if(c.state==='Leave'&&c.timer>=(c.exitRerouteAt||0)){c.exitRerouteAt=c.timer+2;g.route(s,c,ENTRANCE);}
 }
}
