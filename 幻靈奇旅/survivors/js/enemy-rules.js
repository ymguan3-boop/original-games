export const canEnemyUltimate=e=>e.kind==='elite'||e.kind==='boss';
export function warningFor(e,target,time,release=.5){return {x:target.x,z:target.z,radius:e.kind==='boss'?4.5:3,startedAt:time,until:time+Math.max(1.25,release)};}
export const insideWarning=(actor,warning)=>Math.hypot(actor.x-warning.x,actor.z-warning.z)<warning.radius;
