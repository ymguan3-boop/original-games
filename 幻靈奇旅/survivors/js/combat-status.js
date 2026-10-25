export const STATUS={poison:{name:'中毒',symbol:'☠',color:'#b1ff75',duration:4},burn:{name:'燃燒',symbol:'♨',color:'#ff8b42',duration:4},slow:{name:'緩速',symbol:'≋',color:'#69c5ff',duration:4},paralysis:{name:'麻痺',symbol:'ϟ',color:'#ffe473',duration:.9},freeze:{name:'冰凍',symbol:'❄',color:'#9eeeff',duration:2.4},knockback:{name:'震退',symbol:'»',color:'#ffbd7c',duration:.3},weaken:{name:'虛弱',symbol:'↓',color:'#c6a1ff',duration:4}};
export const CONTROL=['paralysis','freeze','knockback'];
export const hasStatus=(actor,type,time)=>!!(actor?.statuses?.[type]?.until>time);
export const immobilized=(actor,time)=>CONTROL.some(type=>hasStatus(actor,type,time));
export const movementScale=(actor,time)=>immobilized(actor,time)?0:hasStatus(actor,'slow',time)?.5:1;
export function activeStatuses(actor,time){return Object.entries(actor.statuses||{}).filter(([,s])=>s.until>time).map(([type,s])=>({type,...STATUS[type],remaining:Math.max(0,s.until-time)}));}
export function setStatus(actor,type,time,{duration=STATUS[type]?.duration||3,attack=3,element='森',ratio=0,from,distance=1.6}={}){
 if(!STATUS[type]||actor.hp<=0||actor.capturePending)return false;
 if(CONTROL.includes(type)&&(actor.controlImmuneUntil>time||immobilized(actor,time)))return false;
 actor.statuses||={};const previous=actor.statuses[type];actor.statuses[type]={until:time+duration,next:previous&&previous.until>time?previous.next:time+1,attack,element,ratio};
 if(CONTROL.includes(type)){actor.controlImmuneUntil=time+duration+.65;actor.pendingSkill=null;actor.pendingShot=null;actor.pendingMelee=null;actor.warning=null;actor.actionUntil=0;}
 if(type==='knockback'){const dx=actor.x-(from?.x??actor.x),dz=actor.z-(from?.z??actor.z-1),len=Math.hypot(dx,dz)||1;actor.knockback={until:time+duration,vx:dx/len*distance/duration,vz:dz/len*distance/duration};}
 return true;
}
