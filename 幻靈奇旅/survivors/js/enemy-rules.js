export const canEnemyUltimate=e=>e.kind==='elite'||e.kind==='boss';
export function warningFor(e,target,time,release=.5){return {x:target.x,z:target.z,radius:e.kind==='boss'?4.5:3,startedAt:time,until:time+Math.max(1.25,release)};}
export const insideWarning=(actor,warning)=>Math.hypot(actor.x-warning.x,actor.z-warning.z)<warning.radius;

import {HERO_ATTACKS,baseAttackProfile} from './combat-profile.js?v=20261115-v62';
export function enemyAttackProfile(enemy,spec,skills){
 const base=baseAttackProfile(spec,skills);
 if(canEnemyUltimate(enemy))return base;
 const hash=[...(enemy.speciesId||spec?.id||'')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
 const medium=hash%5===0;
 return {type:medium?'area':'melee',range:medium?HERO_ATTACKS.blades.range:1.15,ranged:false};
}
export function enemyCanHit(enemy,target,profile){return !!target&&Math.hypot(enemy.x-target.x,enemy.z-target.z)<=profile.range;}
