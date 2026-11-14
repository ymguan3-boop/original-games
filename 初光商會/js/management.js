import{trayOffers,salesShelves,saleShelf,returnShelfStock,migrateMaterialTrays,isMaterialTray}from'./material-tray.js?v=20261114-v46';
import {canStartTutorial} from './shop-entry-rules.js?v=20261114-v46';
/* 簡化經營規則：四職務、在班名額、專屬被動、自動工作、每日任務與舊存檔遷移。
 * 所有數值都放在 data/management.json，這裡只有規則。 */
import {shelfCapacity,accepts} from './furniture.js?v=20261114-v46';
import {applyFortune} from './fortune-cards.js?v=20261114-v46';
export const WORK_JOBS=['stocker','host','cleaner'];
const LEGACY_ROLES={sales:'host',warehouse:'stocker',smith:'stocker',security:'cleaner',cashier:'host'};
export const legacyRole=r=>LEGACY_ROLES[r]||r;
export const capacityOf=(g,s)=>g.data.levels[s.level-1]?.capacity||1;
export const onDuty=s=>s.employees.filter(e=>e.role!=='standby');
export const traitOf=(g,e)=>g.data.management.traits[e.baseId]||null;
export const preferredJob=(g,e)=>legacyRole(traitOf(g,e)?.preferredJob||'host');
export const stageIndex=e=>Math.min(2,e.evolutionHistory?.length||0);
export function passiveValue(g,e){const t=traitOf(g,e);if(!t)return 0;return (e.role===t.preferredJob?t.boosted:t.base)[stageIndex(e)];}
export function dragonTask(g,s){if(!s.dragonTask)return null;const d=g.data.management.dragon,on=s.employees.some(e=>e.spiritId===d.spiritId&&e.role!=='standby');return on?d.tasks.find(t=>t.id===s.dragonTask&&t.level<=s.level)||null:null;}
/* 全店被動合計。只算在班員工，並設上限，避免疊到破壞平衡 */
export function passive(g,s,kind){const m=g.data.management;let sum=0;for(const e of onDuty(s))if(e.fatigue<100&&traitOf(g,e)?.kind===kind)sum+=passiveValue(g,e);const task=dragonTask(g,s);if(task?.kind===kind)sum+=task.value;return Math.min(sum,m.passiveCap);}
/* 同職務第二人起遞減；擅長職務效率 +25%，其他職務維持 100% */
export function jobPower(g,s,job){const m=g.data.management,team=1+passive(g,s,'team'),list=onDuty(s).filter(e=>e.role===job&&e.fatigue<100).map(e=>g.efficiency(e)*(preferredJob(g,e)===job?1+m.preferredBonus:1)).sort((a,b)=>b-a);return list.reduce((n,v,i)=>n+v*m.teamFalloff**i,0)*team;}
export function dateKey(g,now=Date.now()){return new Date(now).toLocaleDateString('en-CA',{timeZone:g.data.management.daily.timeZone});}
export function dailyState(g,s,now=Date.now()){const date=dateKey(g,now);if(s.dailyTaskState?.date!==date)s.dailyTaskState={date,sales:0,gold:0,exp:0,claimed:{},bonus:false};return s.dailyTaskState;}
export function dailyTrack(g,s,key,amount){if(amount>0)dailyState(g,s)[key]+=amount;}
export function dailyTasks(g,s){const d=s.dailyTaskState?.date===dateKey(g)?s.dailyTaskState:{sales:0,gold:0,exp:0,claimed:{},bonus:false};return {tasks:g.data.management.daily.tasks.map(t=>({...t,value:Math.floor(d[t.id]||0),done:(d[t.id]||0)>=t.target,claimed:!!d.claimed[t.id]})),bonus:d.bonus};}
export function managementAction(g,s,type,p){
 if(type==='fortuneCard')return applyFortune(g,s,p);
 if(type==='rackReminder'){s.rackReminder={category:p.category,day:s.day};return '已記下：打烊整備時會提醒你布置貨架';}
 const m=g.data.management,assert=(v,msg)=>{if(!v)throw Error(msg);};
 if(type==='claimDaily'){const state=dailyState(g,s),task=m.daily.tasks.find(t=>t.id===p.id);assert(task&&(state[task.id]||0)>=task.target&&!state.claimed[task.id],'任務未完成或已領取');state.claimed[task.id]=true;s.gold+=task.reward;s.stats.rewards+=task.reward;return `獲得 ${task.reward} G`;}
 if(type==='claimDailyBonus'){const state=dailyState(g,s);assert(m.daily.tasks.every(t=>state.claimed[t.id])&&!state.bonus,'三項任務領完才能領全勤獎勵');state.bonus=true;s.gold+=m.daily.bonusGold;s.stats.rewards+=m.daily.bonusGold;s.xpTickets=(s.xpTickets||0)+m.daily.bonusTickets;return `全勤獎勵：${m.daily.bonusGold} G 與經驗券`;}
 if(type==='useXpTicket'){const e=s.employees.find(x=>x.id===p.employeeId);assert(e&&(s.xpTickets||0)>0,'沒有可用的經驗券');s.xpTickets--;g.xp(s,e,m.daily.ticketXp);return `${e.name} 獲得 ${m.daily.ticketXp} EXP`;}
 if(type==='lockAssignment'){const e=s.employees.find(x=>x.id===p.employeeId);assert(e,'找不到員工');e.lockedAssignment=!e.lockedAssignment;s.autoStaffAt=0;return e.lockedAssignment?'已關閉自動分配，職務固定不動':'已開啟自動分配：人手不足時會自動替補';}
 if(type==='setDragonTask'){assert(s.employees.some(e=>e.spiritId===m.dragon.spiritId),'需要水蛟龍王');const task=m.dragon.tasks.find(t=>t.id===p.id);assert(task&&task.level<=s.level,'任務尚未解鎖');s.dragonTask=task.id;return `水蛟龍王開始「${task.name}」`;}
 if(type==='setLayoutPause'){s.layoutPause=!!p.value;for(const a of [...s.employees,...s.customers])a.path=[];return s.layoutPause?'布置模式：商店暫停':'繼續營業';}
 if(type==='setShelfGoods'){const sh=s.shelves.find(x=>x.id===p.shelfId),c=g.data.catalog.find(x=>x.sku===p.sku);assert(sh&&c&&c.unlockStoreLevel<=s.level&&accepts(sh,c),'這座貨架不能賣這項商品');assert(!s.customers.some(x=>x.basket.some(b=>b.shelfId===sh.id)),'顧客正在選購，請稍候');if(isMaterialTray(sh)){g.autoStock(s,sh);return '左右各半固定販售鐵礦與木材，已檢查兩側補貨';}if(sh.sku!==c.sku){s.inventory[sh.sku]+=sh.stock;sh.stock=0;sh.sku=c.sku;}g.autoStock(s,sh);return `改賣 ${c.displayName}`;}
 if(type==='tutorial'){s.tutorialState=p.done?{...s.tutorialState,step:'done',done:true}:{...s.tutorialState,...(p.patch||{})};return '教學進度已保存';}
 return null;
}
/* 沒有員工時系統仍低速運作，玩家不會被卡住 */
export function systemRestock(g,s,dt){const n=g.data.management.noStaff;s.systemRestockTimer=(s.systemRestockTimer||0)+dt;if(s.systemRestockTimer<n.restockInterval)return;s.systemRestockTimer=0;const sh=salesShelves(s).find(x=>x.autoRestock!==false&&x.stock<shelfCapacity(x)&&s.inventory[x.sku]>0);if(!sh)return;const qty=Math.min(n.restockQty,s.inventory[sh.sku],shelfCapacity(sh)-sh.stock);s.inventory[sh.sku]-=qty;sh.stock+=qty;}
export function workXp(g,s,dt){const x=g.data.management.xp;for(const e of s.employees)if(e.role==='standby'||e.fatigue<100)g.xp(s,e,x.perSecond*dt*(e.role==='standby'?x.reserveRate:1));}
export function eventGap(g,s){const m=g.data.management.events,calm=dragonTask(g,s)?.kind==='calm'?dragonTask(g,s).value:0;return (m.minGap+g.random(s)*m.jitter)/(1-calm)*(s.speed||1);}
export function eventAllowed(g,s){return false; /* Periodic events now use foreground real-time clock, not accelerated simulation. */}
/* 舊存檔只補欄位，不刪任何貨架、家具、員工或金幣 */
export function migrateState(g,s){
 const m=g.data.management;if((s.schemaVersion||1)>m.schemaVersion)throw Error('存檔來自較新版本，請更新遊戲');
 s.txIds??=[];s.ledger??=[];s.history??=[];if(s.promoter&&s.employees.some(e=>e.spiritId===s.promoter.id||e.baseId===s.promoter.id)){s.promoter=null;g.log(s,'原宣傳員已是店內員工，保留員工並解除重複宣傳職務。');}
 if((s.schemaVersion||1)>=m.schemaVersion&&s.tutorialState)return false;
 if((s.schemaVersion||1)>=2&&s.tutorialState){s.schemaVersion=m.schemaVersion;return true;}
 if(g.storage&&!g.storage.getItem(g.key+'.pre-v2'))g.storage.setItem(g.key+'.pre-v2',JSON.stringify(s));
 for(const e of s.employees){e.role=legacyRole(e.role);e.wage=0;e.fatigue=Math.max(0,Math.min(100,Number(e.fatigue)||0));e.lockedAssignment=!!e.lockedAssignment;if(e.role==='standby'||!WORK_JOBS.includes(e.role))e.role='standby';if(e.workTask&&e.role!=='stocker'){if(e.workTask.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;}}
 const cap=capacityOf(g,s),order=['cashier','stocker','host','cleaner'],duty=onDuty(s).sort((a,b)=>order.indexOf(a.role)-order.indexOf(b.role)||b.workLevel-a.workLevel);for(const e of duty.slice(cap)){if(e.workTask?.phase==='carry')s.inventory[e.workTask.sku]+=e.workTask.qty;e.workTask=null;e.role='standby';e.path=[];}
 s.unpaidWages=0;s.forge&&(s.forge.employeeId=null);s.xpTickets??=0;s.layoutPause=false;
 const veteran=(s.totals?.days||0)>0||(s.totals?.sales||0)>0||s.tutorialSeen?.['first-day-done'];
 s.tutorialState??=veteran?{step:'done',done:true,version:1}:{step:'welcome',done:false,version:1};
 s.cooldowns.autoEvent=Math.max(s.cooldowns.autoEvent||0,s.totalTime+m.events.firstDelay);
 s.schemaVersion=m.schemaVersion;return true;
}
