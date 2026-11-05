/* Explicit event routing: customer shortages and business tasks can be handled
 * by their own controls. Only a genuinely personal manager intervention is
 * forced into the walk-through patrol mode. */
const PHYSICAL_PATROL_IDS=new Set(['cashier-idle']);
export function requiresManagerPatrol(event){
 return !!event&&(event.requiresPatrol===true||PHYSICAL_PATROL_IDS.has(event.id));
}
export function patrolEventInstructions(event,{patrol=false}={}){
 if(!requiresManagerPatrol(event))return null;
 return patrol
  ? '已經在主管巡店：使用左下搖桿走近發生事件的員工，系統會自動處理並顯示完成通知。'
  : '這項事件需要主管親自到場：請進入主管巡店，操作主角靠近該員工，將自動完成處理。';
}
