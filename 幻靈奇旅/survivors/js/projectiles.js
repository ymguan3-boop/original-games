// One homing path drives both the visual tip and the collision, for both factions.
export function advanceProjectile(p,target,dt){
 p.life-=dt;if(!target||target.hp<=0||target.rewarded||target.capturePending){p.life=0;return false;}
 p.tx=target.x;p.tz=target.z;const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),step=Math.max(0,p.speed*dt);
 if(d<=step+(target.radius||.45)){p.x=target.x;p.z=target.z;p.life=0;return true;}
 if(p.life<=0)return false;p.x+=dx/d*step;p.z+=dz/d*step;return false;
}

// Swept collision prevents fast piercing bolts from tunnelling through enemies.
export function advancePiercing(p,enemies,dt,time=0){
 const from={x:p.x,z:p.z},remaining=Math.max(0,p.range-(p.travelled||0)),step=Math.min(remaining,Math.max(0,p.speed*dt));
 p.x+=p.vx*step;p.z+=p.vz*step;p.travelled=(p.travelled||0)+step;p.life-=dt;p.hitIds||=[];
 const hits=[];for(const e of enemies){if(e.hp<=0||e.rewarded||e.capturePending||e.weakUntil>time||p.hitIds.includes(e.id))continue;
  const dx=e.x-from.x,dz=e.z-from.z,along=Math.max(0,Math.min(step,dx*p.vx+dz*p.vz));
  if(Math.hypot(dx-along*p.vx,dz-along*p.vz)>(e.radius||.45)+(p.width||.22))continue;
  p.hitIds.push(e.id);hits.push({e,along});
 }
 if(p.travelled>=p.range-.001)p.life=0;return hits.sort((a,b)=>a.along-b.along).map(h=>h.e);
}
