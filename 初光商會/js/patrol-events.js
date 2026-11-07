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
/* 疲勞系統已取消，保留函式讓舊呼叫維持相容 */
export function applyFreeEventFatigue(){return [];}
export function freeResolutionText(){return '';}
