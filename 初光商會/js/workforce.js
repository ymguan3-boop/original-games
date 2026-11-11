import {preferredJob} from './management.js?v=20261111-portrait-v24';
export const RELIEF_RULES={threshold:85,ready:30,interval:30,restCooldown:60,busyFatigue:.12,restRecovery:.4};
export function releaseWork(s,e){if(e.workTask?.phase==='carry')s.inventory[e.workTask.sku]=(s.inventory[e.workTask.sku]||0)+e.workTask.qty;e.workTask=null;e.path=[];e.blocked=0;if(s.forge?.employeeId===e.id)s.forge.employeeId=null;}
export function syncWorkforce(g,s){
 s.autoRelief??={enabled:false,nextAt:0,lastSwapAt:0};
 for(const e of s.employees){if(e.role==='standby'){releaseWork(s,e);e.offDuty=true;e.reaction='sleep';}else{if(e.offDuty){Object.assign(e,g.freeSpot(s,{x:3,z:3},e));e.path=[];e.shiftStartedAt=s.totalTime;}e.offDuty=false;}}
 for(const ev of [s.event,...(s.incidents||[])].filter(Boolean)){const e=s.employees.find(e=>e.id===ev.employeeId)||s.employees.find(e=>e.role===ev.role);if(!e||e.role==='standby'){ev.remoteResolution=true;if(s.patrolFocus?.eventId===(ev.instanceId||ev.id))s.patrolFocus=null;}}
}
export function workforceTick(g,s,dt){
 if(s.phase!=='open'||s.paused||s.layoutPause)return;syncWorkforce(g,s);
 const queue=s.customers.some(c=>['Cart','Queue','Checkout'].includes(c.state));
 for(const e of s.employees){if(e.role==='standby')e.fatigue=Math.max(0,e.fatigue-dt*RELIEF_RULES.restRecovery);else{const busy=e.workTask||e.role==='host'&&s.customers.length||e.role==='cleaner'&&s.satisfaction<100;if(busy)e.fatigue=Math.min(100,e.fatigue+dt*RELIEF_RULES.busyFatigue);}e.efficiency=g.efficiency(e);}
 const control=s.autoRelief;if(!control.enabled||s.totalTime<control.nextAt)return;control.nextAt=s.totalTime+RELIEF_RULES.interval;
 const tired=s.employees.filter(e=>e.role!=='standby'&&!e.lockedAssignment&&e.fatigue>=RELIEF_RULES.threshold&&(e.reliefUntil||0)<=s.totalTime).sort((a,b)=>b.fatigue-a.fatigue);
 for(const old of tired){const fresh=s.employees.filter(e=>e.role==='standby'&&!e.lockedAssignment&&e.fatigue<=RELIEF_RULES.ready&&(e.reliefUntil||0)<=s.totalTime).sort((a,b)=>Number(preferredJob(g,b)===old.role)-Number(preferredJob(g,a)===old.role)||a.fatigue-b.fatigue)[0];if(!fresh)break;
  const job=old.role;releaseWork(s,old);old.role='standby';old.offDuty=true;old.reaction='sleep';old.reliefUntil=s.totalTime+RELIEF_RULES.restCooldown;fresh.role=job;fresh.nextTaskAt=0;fresh.reliefUntil=s.totalTime+RELIEF_RULES.restCooldown;control.lastSwapAt=s.totalTime;syncWorkforce(g,s);g.log(s,`${fresh.name}接替${old.name}，疲勞夥伴離店休息。`);break;
 }
}
