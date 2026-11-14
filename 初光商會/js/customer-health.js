import{CHECKOUT,ENTRANCE,walkable}from'./nav.js?v=20261114-v51';
import{obstacles}from'./decorations.js?v=20261114-v51';
const queue=c=>['Queue','Checkout'].includes(c.state);
export function waitingAtQueue(c){return queue(c)&&Math.hypot(c.x-CHECKOUT.x,c.z-(c.state==='Checkout'?CHECKOUT.z:3+Math.max(0,c.queueSlot||0)))<.6;}
export function customerHealthTick(g,s,realDt){
 s.customerHealthSeconds=(s.customerHealthSeconds||0)+realDt;
 for(const c of s.customers){const p=c.healthPosition,moved=!p||p.state!==c.state||Math.hypot(p.x-c.x,p.z-c.z)>.15;c.healthIdle=moved?0:(c.healthIdle||0)+realDt;if(moved)c.healthPosition={x:c.x,z:c.z,state:c.state};if(!queue(c)||!waitingAtQueue(c))c.wait=0;}
 if(s.customerHealthSeconds<60)return;s.customerHealthSeconds%=60;s.customerHealthChecks=(s.customerHealthChecks||0)+1;let repaired=0;
 for(const c of [...s.customers]){
  if(!queue(c)){c.queueSlot=-1;if(!c.wasWaitingAtQueue&&/排隊|收銀|等太久/.test(c.angerReason||'')){delete c.angerReason;if(c.state==='Angry'){c.state=c.basket?.length?'Cart':'Browse';c.timer=0;c.emotion=null;repaired++;}}}
  if(c.healthIdle<20||c.exitingAtDoor||waitingAtQueue(c)&&c.state!=='Checkout')continue;
  if(!['Enter','Browse','Evaluate','Cart','Queue','Checkout','Paid','Leave'].includes(c.state))continue;
  let goal=c.state==='Leave'?ENTRANCE:{x:CHECKOUT.x+2,z:4};try{const spot=g.freeSpot(s,goal,c);if(walkable(spot,obstacles(s),s.level)){c.x=spot.x;c.z=spot.z;c.path=[];c.blocked=0;c.wait=0;c.timer=0;c.healthIdle=0;c.arrivalRemaining=0;if(c.state==='Leave')g.route(s,c,ENTRANCE);else c.state=c.basket?.length?'Cart':'Browse';repaired++;}}catch{/* Keep the customer and reserved goods if no safe tile exists. */}
 }
 if(repaired)g.log(s,`顧客動線巡檢：已修復 ${repaired} 位顧客的停滯或等待狀態。`);
}
