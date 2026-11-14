import {CHECKOUT,dimensions,walkable} from './nav.js?v=20261114-v57';
import {obstacles} from './decorations.js?v=20261114-v57';
import {doorwayBuffer,employeeSpot,actorPath} from './staff-routing.js?v=20261114-v57';
const near=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearestShelfRefuge(g,s,e){
 const candidates=s.shelves.flatMap(sh=>[[0,1],[-1,0],[1,0],[0,-1]].map(([dx,dz])=>({x:sh.x+dx,z:sh.z+dz,shelfId:sh.id}))),room=dimensions(s.level);
 if(!candidates.length)for(let z=2;z<room.height-2;z++)for(let x=1;x<room.width-2;x++)candidates.push({x,z});
 return candidates.filter(p=>!doorwayBuffer(p)&&!(p.x===CHECKOUT.x&&p.z>=3&&p.z<=6)&&walkable(p,obstacles(s),s.level)&&g.clearOfActors(s,p,e)).sort((a,b)=>near(a,e)-near(b,e))[0]||null;
}
export function staffTraffic(g,s,dt){
 const customers=s.customers.filter(c=>!(c.arrivalRemaining>0)&&!c.exitingAtDoor);
 for(const e of s.employees){if(e.role==='standby'||e.fatigue>=100){e.crowdingSeconds=0;continue;}
  const c=customers.slice().sort((a,b)=>near(e,a)-near(e,b))[0],crowded=c&&near(e,c)<1.05;
  e.crowdingSeconds=crowded?(e.crowdingSeconds||0)+dt:0;
  if(e.crowdingSeconds>=3){const refuge=nearestShelfRefuge(g,s,e);if(refuge){Object.assign(e,{x:refuge.x,z:refuge.z,path:[],blocked:0,crowdingSeconds:0,nextTaskAt:s.totalTime+.8});g.pendingMotion?.set(e.id,[{x:e.x,z:e.z,t:0},{x:e.x,z:e.z,t:1}]);g.notice(s,e.id,'讓路・回到貨架旁','good');}continue;}
  if(!c||near(e,c)>1.5||s.totalTime<(e.avoidCustomerAt||0))continue;
  const next=e.path?.[0],predicted=c.path?.[0]||c;
  if(!crowded&&(!next||near(next,predicted)>1.15))continue;
  e.avoidCustomerAt=s.totalTime+.5;
  const goal=e.path?.at(-1),alt=goal&&actorPath(s,e,goal,true,g.actors(s));
  if(alt?.length&&(!next||near(alt[0],c)>near(next,c)+.1)){e.path=alt;continue;}
  const side=employeeSpot(g,s,e,{x:e.x+(e.x>=c.x?2:-2),z:e.z+(e.z>=c.z?1:-1)});
  if(side){e.path=actorPath(s,e,side,true,g.actors(s))||[];e.nextTaskAt=s.totalTime+1;e.reaction='walk';}
 }
}
