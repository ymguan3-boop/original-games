import {employeeSpot} from './staff-routing.js';
import {obstacles,decorEffects} from './decorations.js';
import {findPath,walkable} from './nav.js';
const stations={cashier:{x:10,z:1},stocker:{x:3,z:3},warehouse:{x:1,z:3},smith:{x:2,z:5},host:{x:5,z:9},sales:{x:5,z:4},security:{x:11,z:6},cleaner:{x:3,z:7},standby:{x:3,z:8}};
export function autoAssign(g,s){const candidates=s.employees.filter(e=>e.fatigue<90),capacity=g.data.levels[s.level-1].capacity,chosen=new Map(),used=new Set(),roles=['cashier','stocker','warehouse','sales','host','smith','security','cleaner'];
 if(s.forge){const smith=candidates.find(e=>e.id===s.forge.employeeId);if(smith){chosen.set(smith.id,'smith');used.add('smith');}}
 for(let i=0;chosen.size<Math.min(capacity,candidates.length);i++){const role=roles.find(r=>!used.has(r))||'stocker';const list=candidates.filter(e=>!chosen.has(e.id));list.sort((a,b)=>Number(b.role===role)-Number(a.role===role)||b.workLevel-a.workLevel||a.fatigue-b.fatigue);if(!list.length)break;chosen.set(list[0].id,role);used.add(role);}
 const targets=new Set();for(const e of s.employees){const role=chosen.get(e.id)||'standby';if(e.role!==role&&e.workTask){if(e.workTask.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;}e.role=role;const preferred=stations[role],spot=employeeSpot(g,s,e,preferred,targets);if(spot){g.route(s,e,spot);targets.add(`${spot.x},${spot.z}`);}e.nextTaskAt=0;}
 g.log(s,`一鍵排班完成：${chosen.size} 位上班、${s.employees.length-chosen.size} 位休息。`);return '已分配職務；開店後自動到站、補貨與服務';
}
export function staffAutomation(g,s,dt){if(s.phase!=='open')return;for(const e of s.employees){if(e.fatigue>=95||e.workTask)continue;if(e.path?.length&&(e.blocked||0)<2)continue;if(e.path?.length){e.path=[];e.nextTaskAt=0;}if(e.role==='cashier'){if(Math.hypot(e.x-10,e.z-1)>.18)g.route(s,e,stations.cashier);continue;}if(e.role==='smith'&&s.forge?.employeeId===e.id)continue;if((e.nextTaskAt||0)>s.totalTime)continue;e.nextTaskAt=s.totalTime+2;
 let target=stations[e.role];if(['security','cleaner','sales'].includes(e.role)){const points=e.role==='sales'?s.shelves.map(sh=>({x:sh.x+1,z:sh.z})):e.role==='cleaner'?[{x:3,z:6},{x:7,z:8},{x:8,z:3}]:[{x:11,z:7},{x:5,z:9}];e.patrolStep=((e.patrolStep||0)+1)%Math.max(1,points.length);target=points[e.patrolStep]||target;}
 if(target&&Math.hypot(e.x-target.x,e.z-target.z)>.2){const spot=employeeSpot(g,s,e,target);if(spot)g.route(s,e,spot);}e.reaction=e.role==='standby'?'sleep':'work';
}}

