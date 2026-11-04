// Render only the collision-approved substeps; never blend across a corner.
export function sampleTrail(points,alpha){
 if(!points?.length)return null;
 const t=Math.max(0,Math.min(1,alpha));
 for(let i=1;i<points.length;i++)if(t<=points[i].t){const a=points[i-1],b=points[i],f=(t-a.t)/Math.max(.000001,b.t-a.t);return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f};}
 return points.at(-1);
}
export function turnToward(current,target,dt){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+delta*(1-Math.exp(-14*dt));}
export function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz,t=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/len)):0;return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
export function segmentDistance(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
 if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return 0;
 return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b));
}
