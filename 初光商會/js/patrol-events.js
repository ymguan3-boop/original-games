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
 return !!(employee&&manager&&Number.isFinite(employee.x)&&Number.isFinite(employee.z)&&Number.isFinite(manager.x)&&Number.isFinite(manager.z)&&Math.hypot(manager.x-employee.x,manager.z-employee.z)<=distance);
}
export function sleepEvent(ev){
 return /打瞌睡|睡著|睡覺|打盹|犯睏|打盹兒|發呆|閒得/.test(ev?.title||'');
}
export function applyFreeEventFatigue(s,employee,{direct=8,team=2}={}){
 const changes=[];
 for(const e of s.employees){
  const amount=e.id===employee?.id?direct:team,previous=e.fatigue;
  e.fatigue=Math.min(100,Math.max(0,(e.fatigue||0)+amount));
  const delta=Math.round(e.fatigue-previous);
  if(delta>0)changes.push({id:e.id,name:e.name,delta});
 }
 return changes;
}
export function freeResolutionText(choice){
 return choice?.cost===0?'（體力代價：當事人疲勞 +8、其他員工 +2）':'';
}
