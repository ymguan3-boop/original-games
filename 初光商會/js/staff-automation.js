import {employeeSpot,employeePath} from './staff-routing.js?v=20261113-v36';
import {obstacles,decorEffects} from './decorations.js?v=20261113-v36';
import {findPath,walkable,dimensions} from './nav.js?v=20261113-v36';
import {capacityOf,preferredJob,WORK_JOBS} from './management.js?v=20261113-v37';
const stations={stocker:{x:3,z:3},host:{x:5,z:9},cleaner:{x:3,z:7},standby:{x:3,z:1}};
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
  stocker:[stations.stocker,...shelves.map(sh=>({x:sh.x,z:sh.z+1})),{x:2,z:4}],
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
/* 一鍵最佳配置：鎖定的員工不動，其餘依擅長職務與熟練度排入在班名額 */
export function autoAssign(g,s,auto=false){
 const capacity=capacityOf(g,s),jobs=WORK_JOBS,locked=s.employees.filter(e=>e.lockedAssignment&&e.role!=='standby'),chosen=new Map(locked.map(e=>[e.id,e.role])),count=j=>[...chosen.values()].filter(r=>r===j).length;
 const free=s.employees.filter(e=>!e.lockedAssignment&&e.fatigue<85).sort((a,b)=>b.workLevel-a.workLevel);
 for(const job of jobs){if(chosen.size>=capacity||count(job))continue;const pick=free.find(e=>!chosen.has(e.id)&&preferredJob(g,e)===job)||null;if(pick)chosen.set(pick.id,job);}
 for(const job of jobs){if(chosen.size>=capacity||count(job))continue;const pick=free.find(e=>!chosen.has(e.id));if(pick)chosen.set(pick.id,job);}
 for(const e of free){if(chosen.size>=capacity)break;if(!chosen.has(e.id))chosen.set(e.id,preferredJob(g,e));}
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
  // Only a named slacking incident allows an on-duty worker to stand still.
  if(e.workTask){e.reaction='work';continue;}
  if((e.path||[]).length&&(e.blocked||0)<2){e.reaction='walk';continue;}
  if((e.path||[]).length){e.path=[];e.nextTaskAt=0;}
  /* 大型幻靈固定在寬敞的工作點，不到處走，避免穿過貨架 */
  if(e.spiritId===g.data.management.dragon.spiritId){const zone=g.data.management.dragon.zone;if(Math.hypot(e.x-zone.x,e.z-zone.z)>.6){const spot=employeeSpot(g,s,e,zone);if(spot)g.route(s,e,spot);}e.reaction='work';continue;}
  if((e.nextTaskAt||0)>s.totalTime){e.reaction='work';continue;}
  e.nextTaskAt=s.totalTime+2.5;
  const preferred=wandering(s,e);
  if(preferred){const spot=employeeSpot(g,s,e,preferred);if(spot)g.route(s,e,spot);}
  e.reaction=(e.path||[]).length?'walk':'work';
 }
}
