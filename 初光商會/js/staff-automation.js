import {employeeSpot,employeePath} from './staff-routing.js';
import {obstacles,decorEffects} from './decorations.js';
import {findPath,walkable} from './nav.js';
const stations={cashier:{x:10,z:1},stocker:{x:3,z:3},warehouse:{x:2,z:3},smith:{x:2,z:5},host:{x:5,z:9},sales:{x:5,z:4},security:{x:11,z:6},cleaner:{x:3,z:7},standby:{x:3,z:1}};
/* The rear wall is z=1. Each resting worker gets their own place and is never
 * mistaken for an idling / slacking employee at an active work station. */
export function restingPositions(s){
 const resting=s.employees.filter(e=>e.role==='standby').sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 return new Map(resting.map((e,i)=>[e.id,{x:2+i%7,z:1+Math.floor(i/7)}]));
}
export function sendToRest(g,s,e){
 const preferred=restingPositions(s).get(e.id);if(!preferred)return false;
 const targets=new Set([...s.employees.filter(a=>a!==e&&a.role==='standby'&&!(a.path||[]).length).map(a=>`${Math.round(a.x)},${Math.round(a.z)}`)]);
 const target=employeeSpot(g,s,e,preferred,targets);
 if(!target)return false;
 if(Math.hypot(target.x-e.x,target.z-e.z)<.25){e.path=[];e.reaction='sleep';return true;}
 const path=employeePath(s,e,target);
 if(path!==null){e.path=path;e.reaction='walk';return true;}
 return false;
}
const wandering=(s,e)=>{
 const shelves=s.shelves||[],i=(e.patrolStep||0),next=()=>{e.patrolStep=i+1;};
 const patterns={
  cashier:[stations.cashier],
  stocker:[stations.stocker,...shelves.map(sh=>({x:sh.x,z:sh.z+1})),{x:2,z:4}],
  warehouse:[stations.warehouse,{x:2,z:4},{x:3,z:4}],
  smith:[stations.smith,{x:3,z:5},{x:2,z:6}],
  host:[{x:5,z:9},{x:6,z:8},{x:7,z:9}],
  sales:[...shelves.map(sh=>({x:sh.x+1,z:sh.z+1})),{x:7,z:6}],
  security:[{x:11,z:7},{x:7,z:9},{x:5,z:9}],
  cleaner:[{x:3,z:6},{x:7,z:8},{x:8,z:3}],
 };
 const points=patterns[e.role]||[{x:4,z:5},{x:7,z:6},{x:6,z:8}];
 for(let k=0;k<points.length;k++){
  const index=(i+1+k)%points.length,p=points[index];
  if(Math.hypot(p.x-e.x,p.z-e.z)<.65)continue;
  next();return p;
 }
 next();return null;
};
export function autoAssign(g,s){
 const candidates=s.employees.filter(e=>e.fatigue<90),capacity=g.data.levels[s.level-1].capacity,chosen=new Map(),used=new Set(),roles=['cashier','stocker','warehouse','sales','host','smith','security','cleaner'];
 if(s.forge){const smith=candidates.find(e=>e.id===s.forge.employeeId);if(smith){chosen.set(smith.id,'smith');used.add('smith');}}
 for(let i=0;chosen.size<Math.min(capacity,candidates.length);i++){
  const role=roles.find(r=>!used.has(r))||'stocker',list=candidates.filter(e=>!chosen.has(e.id));
  list.sort((a,b)=>Number(b.role===role)-Number(a.role===role)||b.workLevel-a.workLevel||a.fatigue-b.fatigue);
  if(!list.length)break;chosen.set(list[0].id,role);used.add(role);
 }
 for(const e of s.employees){const role=chosen.get(e.id)||'standby';if(e.role!==role&&e.workTask){if(e.workTask.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;}e.role=role;e.path=[];e.nextTaskAt=0;}
 const targets=new Set();
 for(const e of s.employees){const preferred=e.role==='standby'?restingPositions(s).get(e.id):stations[e.role]||{x:5,z:5},spot=employeeSpot(g,s,e,preferred,targets);if(spot){g.route(s,e,spot);targets.add(`${spot.x},${spot.z}`);}}
 g.log(s,`一鍵排班完成：${chosen.size} 位上班、${s.employees.length-chosen.size} 位到後方休息區。`);
 return '已分配職務；休息員工至後方排隊，在班員工會工作或巡視。';
}
export function staffAutomation(g,s,dt){
 if(s.phase!=='open')return;
 const rear=restingPositions(s);
 for(const e of s.employees){
  if(e.fatigue>=95&&e.role!=='standby'){
   if(e.workTask?.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;
   e.workTask=null;e.role='standby';e.path=[];e.nextTaskAt=0;
   g.log(s,`${e.name}疲勞過高，自動退至後方休息區。`);
  }
  if(e.role==='standby'){
   const target=rear.get(e.id)||restingPositions(s).get(e.id);
   if(!target)continue;
   if((e.path||[]).length&&(e.blocked||0)<2){e.reaction='walk';continue;}
   if(Math.hypot(e.x-target.x,e.z-target.z)>.35)sendToRest(g,s,e);
   else{e.path=[];e.reaction='sleep';}
   continue;
  }
  // Only a named slacking incident allows an on-duty worker to stand still.
  if(s.event?.id==='cashier-idle'&&(s.event.employeeId===e.id||!s.event.employeeId&&e.role==='cashier')){
   e.path=[];e.reaction='bored';continue;
  }
  if(e.workTask){e.reaction='work';continue;}
  if((e.path||[]).length&&(e.blocked||0)<2){e.reaction='walk';continue;}
  if((e.path||[]).length){e.path=[];e.nextTaskAt=0;}
  if(e.role==='cashier'){if(Math.hypot(e.x-10,e.z-1)>.18)g.route(s,e,stations.cashier);e.reaction='work';continue;}
  if(e.role==='smith'&&s.forge?.employeeId===e.id){e.reaction='work';continue;}
  if((e.nextTaskAt||0)>s.totalTime){e.reaction='work';continue;}
  e.nextTaskAt=s.totalTime+2.5;
  const preferred=wandering(s,e);
  if(preferred){const spot=employeeSpot(g,s,e,preferred);if(spot)g.route(s,e,spot);}
  e.reaction=(e.path||[]).length?'walk':'work';
 }
}
