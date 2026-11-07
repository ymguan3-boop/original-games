/* Shared employee incident targeting, proximity rules and the real non-gold fatigue cost. */
export function eventEmployee(s,ev){
 if(!ev)return null;
 return s.employees.find(e=>e.id===ev.employeeId)||s.employees.find(e=>e.role===ev.role)||null;
}
export function managerNearEmployee(s,ev,distance=1.65){
 // Inventory shortage and missing cashier require a real management action;
 // approaching an employee must never silently dismiss these problems.
 if(['stockout','queue-complaint','no-cashier'].includes(ev?.id))return false;
 const employee=eventEmployee(s,ev),manager=s.manager;
 const reach=ev?.role==='cashier'?Math.max(distance,2.15):distance; // the counter physically separates the cashier from the aisle
 return !!(employee&&manager&&Number.isFinite(employee.x)&&Number.isFinite(employee.z)&&Number.isFinite(manager.x)&&Number.isFinite(manager.z)&&Math.hypot(manager.x-employee.x,manager.z-employee.z)<=reach);
}
export function sleepEvent(ev){
 return /打瞌睡|睡著|睡覺|打盹|犯睏|打盹兒|發呆|閒得/.test(ev?.title||'');
}
/* 免費處理需在班夥伴投入精神；休息夥伴不受影響。 */
export function applyFreeEventFatigue(s,lead,{direct=8,team=2}={}){const changes=[];for(const e of s.employees){if(e.role==='standby')continue;const previous=e.fatigue||0;e.fatigue=Math.min(100,previous+(e.id===lead?.id?direct:team));if(e.fatigue>previous)changes.push({id:e.id,delta:Math.round((e.fatigue-previous)*100)/100});}return changes;}
export function freeResolutionText(){return '';}
