// One homing path drives both the visual tip and the collision, for both factions.
export function advanceProjectile(p,target,dt){
 p.life-=dt;if(!target||target.hp<=0||target.rewarded||target.capturePending){p.life=0;return false;}
 p.tx=target.x;p.tz=target.z;const dx=target.x-p.x,dz=target.z-p.z,d=Math.hypot(dx,dz),step=Math.max(0,p.speed*dt);
 if(d<=step+(target.radius||.45)){p.x=target.x;p.z=target.z;p.life=0;return true;}
 if(p.life<=0)return false;p.x+=dx/d*step;p.z+=dz/d*step;return false;
}
