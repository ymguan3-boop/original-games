import{shelfApproach}from'./nav.js?v=20261117-v67';
import {employeeSpot,employeePath} from './staff-routing.js?v=20261117-v67';
import {obstacles,decorEffects} from './decorations.js?v=20261117-v67';
import {findPath,walkable,dimensions,STATIONS} from './nav.js?v=20261117-v67';
import {capacityOf,preferredJob,WORK_JOBS,traitOf,stageIndex,cashierSkillBonus} from './management.js?v=20261117-v67';
const stations={stocker:{x:3,z:3},host:{x:5,z:9},cleaner:{x:3,z:7},standby:{x:3,z:1},get cashier(){return {...(STATIONS[1]||STATIONS[0]).cashier};}};
/* The rear wall is z=1. Each resting worker gets their own place and is never
 * mistaken for an idling / slacking employee at an active work station. */
export function restingPositions(s){
 const resting=s.employees.filter(e=>e.role==='standby').sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const slots=Math.max(1,Math.floor(dimensions(s.level).width)-4);return new Map(resting.map((e,i)=>[e.id,{x:2+i%slots,z:1+Math.floor(i/slots)}]));
}
export function sendToRest(g,s,e){e.path=[];e.reaction='sleep';e.offDuty=true;return true;}
const wandering=(s,e)=>{
 const shelves=s.shelves||[],i=(e.patrolStep||0),next=()=>{e.patrolStep=i+1;};
 const patterns={
  stocker:[stations.stocker,...shelves.map(sh=>(shelfApproach(sh))),{x:2,z:4}],
  host:[{x:5,z:9},{x:6,z:8},{x:7,z:9}],
  cleaner:[{x:3,z:6},{x:7,z:8},{x:8,z:3}],
 };
 const points=patterns[e.role]||[{x:4,z:5},{x:7,z:6},{x:6,z:8}];
 for(let k=0;k<points.length;k++){
  const index=(i+1+k)%points.length,p={x:Math.min(points[index].x,Math.floor(dimensions(s.level).width)-2),z:Math.min(points[index].z,Math.floor(dimensions(s.level).height)-2)};
  if(Math.hypot(p.x-e.x,p.z-e.z)<.65)continue;
  next();return p;
 }
 next();return null;
};
/* 被動能力對應的職務：補貨、招待、清潔、收銀各自受益的被動 */
const PASSIVE_JOB={restock:'stocker',traffic:'host',satisfaction:'host',patience:'host',clean:'cleaner',checkout:'cashier',income:'cashier'};
/* 某位員工做某職務的上工分數：能力值（稀有度、進化、熟練度、擅長職務加成）× 相關被動 × 疲勞度，越高越優先 */
export function jobScore(g,e,job){
 const m=g.data.management,stage=g.data.spirits.find(x=>x.id===e.spiritId)?.stage||1,tiers={yellow:[1,1.3,1.6],purple:[1.45,2,2.2,2.4],red:[2.6,2.9,3.2]},tier=tiers[e.rarity]||tiers.yellow;
 const ability=Math.min(3,tier[Math.min(stage-1,tier.length-1)]*(1+Math.floor((e.workLevel||1)/10)*.1))*(preferredJob(g,e)===job?1+m.preferredBonus:1);
 const t=traitOf(g,e),own=t?(job===t.preferredJob?t.boosted:t.base)[stageIndex(e)]||0:0,fits=t&&PASSIVE_JOB[t.kind]===job;
 const passiveBoost=(fits?own*3:t?.kind==='xp'?own*.5:0)+(job==='cashier'?cashierSkillBonus(g,e.baseId):0);
 return ability*(1+passiveBoost)*(1-Math.min(100,e.fatigue||0)/100*.6);
}
/* 一鍵最佳配置：鎖定的員工不動；其餘先讓每種職務各有最適合的一人，再依分數補滿在班名額（同職務人數越多加成越少） */
export function autoAssign(g,s,auto=false){
 const capacity=capacityOf(g,s),jobs=WORK_JOBS,locked=s.employees.filter(e=>e.lockedAssignment&&e.role!=='standby'&&e.fatigue<100&&!e.exhaustedUntilDay),chosen=new Map(locked.map(e=>[e.id,e.role])),count=j=>[...chosen.values()].filter(r=>r===j).length;
 const free=s.employees.filter(e=>!e.lockedAssignment&&!e.exhaustedUntilDay&&e.fatigue<85),falloff=g.data.management.teamFalloff||.7;
 const best=list=>{let top=null;for(const e of free){if(chosen.has(e.id))continue;for(const job of list){const v=jobScore(g,e,job)*falloff**count(job);if(!top||v>top.v+1e-9||Math.abs(v-top.v)<=1e-9&&(e.fatigue||0)<(top.e.fatigue||0))top={e,job,v};}}return top;};
 while(chosen.size<capacity){const open=jobs.filter(j=>!count(j)),pick=best(open.length?open:jobs);if(!pick)break;chosen.set(pick.e.id,pick.job);}
 for(const e of s.employees){if(e.lockedAssignment)continue;const role=chosen.get(e.id)||'standby';if(e.role!==role&&e.workTask){if(e.workTask.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;}e.role=role;e.path=[];e.nextTaskAt=0;}
 const targets=new Set();
 for(const e of s.employees){if(e.role==='standby'){sendToRest(g,s,e);continue;}const preferred=e.role==='standby'?restingPositions(s).get(e.id):stations[e.role]||{x:5,z:5},spot=employeeSpot(g,s,e,preferred,targets);if(spot){g.route(s,e,spot);targets.add(`${spot.x},${spot.z}`);}}
 g.log(s,auto?`自動分配：${chosen.size} 位在班。`:`一鍵配置完成：${chosen.size} 位在班。`);
 return `已配置 ${chosen.size} 位在班員工`;
}
export function staffAutomation(g,s,dt){
 if(s.phase!=='open')return;
 const rear=restingPositions(s);
 for(const e of s.employees){
  if(e.role==='standby'){sendToRest(g,s,e);continue;}
  if(e.fatigue>=100){e.path=[];e.reaction='exhausted';continue;}
  // Only a named slacking incident allows an on-duty worker to stand still.
  if(e.workTask){e.reaction='work';continue;}
  if((e.path||[]).length&&(e.blocked||0)<2){e.reaction='walk';continue;}
  if((e.path||[]).length){e.path=[];e.nextTaskAt=0;}
  /* 大型幻靈固定在寬敞的工作點，不到處走，避免穿過貨架 */
  if(e.spiritId===g.data.management.dragon.spiritId){const zone=g.data.management.dragon.zone;if(Math.hypot(e.x-zone.x,e.z-zone.z)>.6){const spot=employeeSpot(g,s,e,zone);if(spot)g.route(s,e,spot);}e.reaction='work';continue;}
  /* 收銀員固定站在收銀台後方：第一位顧 1 號櫃台；主角沒在收銀時，第二位補 0 號 */
  if(e.role==='cashier'){const others=s.employees.filter(x=>x!==e&&x.role==='cashier'),taken=st=>others.some(x=>Math.hypot(x.x-st.cashier.x,x.z-st.cashier.z)<.3),order=s.managerDuty==='cashier'?[STATIONS[1]]:[STATIONS[1],STATIONS[0]],desk=order.find(st=>st&&!taken(st))||null;if(desk&&Math.hypot(e.x-desk.cashier.x,e.z-desk.cashier.z)>.15){if((e.nextTaskAt||0)<=s.totalTime){e.nextTaskAt=s.totalTime+1;g.route(s,e,desk.cashier);}e.reaction=(e.path||[]).length?'walk':'work';continue;}e.facing=-Math.PI/2;e.reaction='work';continue;}
  if((e.nextTaskAt||0)>s.totalTime){e.reaction='work';continue;}
  e.nextTaskAt=s.totalTime+2.5;
  const preferred=wandering(s,e);
  if(preferred){const spot=employeeSpot(g,s,e,preferred);if(spot)g.route(s,e,spot);}
  e.reaction=(e.path||[]).length?'walk':'work';
 }
}
