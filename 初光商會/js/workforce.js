import {preferredJob} from './management.js?v=20261114-v51';
export const RELIEF_RULES={threshold:100,ready:100,interval:0,restCooldown:0,busyFatigue:.12,restRecovery:1/60};
export function recoverResting(g,s,realSeconds){if(!Number.isFinite(realSeconds)||realSeconds<=0)return;for(const e of s.employees)if(e.role==='standby'){e.fatigue=Math.max(0,e.fatigue-realSeconds/60);e.efficiency=g.efficiency(e);}}
export function replaceExhausted(g,s,id,replacementId){const old=s.employees.find(e=>e.id===id);if(!old||old.role==='standby'||old.fatigue<100)throw Error('這位員工尚未累到需要替換。');
 const job=old.role;let fresh=null;const pool=s.employees.filter(e=>e.id!==id&&e.role==='standby'&&e.fatigue<100);
 if(replacementId){fresh=pool.find(e=>e.id===replacementId);if(!fresh)throw Error('替班員工已不在休息中或疲勞已滿。');}else if(pool.length){const min=Math.min(...pool.map(e=>e.fatigue)),ties=pool.filter(e=>Math.abs(e.fatigue-min)<.00001);fresh=ties[Math.floor(g.random(s)*ties.length)];}
 releaseWork(s,old);old.role='standby';old.offDuty=true;old.reaction='sleep';old.exhausted=true;
 if(fresh){fresh.role=job;fresh.exhausted=false;fresh.nextTaskAt=0;fresh.path=[];}
 syncWorkforce(g,s);g.log(s,fresh?`${fresh.name}接替${old.name}，原員工休息中。`:`${old.name}已休息，目前沒有可替班員工。`);return fresh?`已由 ${fresh.name} 替班`:'已安排休息，目前沒有可替班員工';
}
export function releaseWork(s,e){if(e.workTask?.phase==='carry')s.inventory[e.workTask.sku]=(s.inventory[e.workTask.sku]||0)+e.workTask.qty;e.workTask=null;e.path=[];e.blocked=0;if(s.forge?.employeeId===e.id)s.forge.employeeId=null;}
export function syncWorkforce(g,s){
 s.autoRelief??={enabled:false,nextAt:0,lastSwapAt:0};
 for(const e of s.employees){if(e.role==='standby'){releaseWork(s,e);e.offDuty=true;e.reaction='sleep';}else{if(e.offDuty){Object.assign(e,g.freeSpot(s,{x:3,z:3},e));e.path=[];e.shiftStartedAt=s.totalTime;}e.offDuty=false;}}
 for(const ev of [s.event,...(s.incidents||[])].filter(Boolean)){const e=s.employees.find(e=>e.id===ev.employeeId)||s.employees.find(e=>e.role===ev.role);if(!e||e.role==='standby'){ev.remoteResolution=true;if(s.patrolFocus?.eventId===(ev.instanceId||ev.id))s.patrolFocus=null;}}
}
export function workforceTick(g,s,dt){
 if(s.phase!=='open'||s.paused||s.layoutPause)return;syncWorkforce(g,s);
 for(const e of s.employees){if(e.role==='standby')continue;if(e.fatigue<100){const busy=e.workTask||e.role==='host'&&s.customers.length||e.role==='cleaner'&&s.satisfaction<100;if(busy)e.fatigue=Math.min(100,e.fatigue+dt*RELIEF_RULES.busyFatigue);}
 if(e.fatigue>=100){releaseWork(s,e);e.reaction='exhausted';e.exhausted=true;}e.efficiency=g.efficiency(e);}
 if(s.autoRelief?.enabled)for(const e of [...s.employees])if(e.role!=='standby'&&e.fatigue>=100)replaceExhausted(g,s,e.id);
}
