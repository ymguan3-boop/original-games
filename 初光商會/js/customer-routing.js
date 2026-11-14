import{occupiedCells}from'./placement-footprint.js?v=20261114-v50';
import{ENTRANCE,shelfApproach,walkable,dimensions}from'./nav.js?v=20261114-v50';
import{obstacles}from'./decorations.js?v=20261114-v50';
import{actorPath}from'./staff-routing.js?v=20261114-v50';
export function shoppingSpots(s,sh){
 const front=shelfApproach(sh),points=new Map();for(const cell of occupiedCells(sh))for(const[dx,dz]of[[0,1],[-1,0],[1,0],[0,-1]]){const p={x:cell.x+dx,z:cell.z+dz};if(walkable(p,obstacles(s),s.level))points.set(`${p.x},${p.z}`,p);}
 return [...points.values()].sort((a,b)=>Math.hypot(a.x-front.x,a.z-front.z)-Math.hypot(b.x-front.x,b.z-front.z));
}
export function atShoppingSpot(s,c,sh){return shoppingSpots(s,sh).some(p=>Math.hypot(c.x-p.x,c.z-p.z)<.25);}
export function routeToGoods(g,s,c,sh){
 const actors=g.actors(s),spots=shoppingSpots(s,sh);for(const p of spots){if(!g.clearOfActors(s,p,c)||s.customers.some(o=>o!==c&&o.state==='Evaluate'&&o.browseSpot&&Math.hypot(o.browseSpot.x-p.x,o.browseSpot.z-p.z)<.8))continue;const path=actorPath(s,c,p,false,actors);if(path!==null){c.path=path;c.browseSpot=p;c.blocked=0;c.browseRouteStall=0;return true;}}
 return false;
}
// Move an admitted shopper off the threshold if all browsing positions are busy.
// No stock reservation or purchase is made until the shopper reaches a rack.
export function waitInside(g,s,c){
 if(Math.hypot(c.x-ENTRANCE.x,c.z-ENTRANCE.z)>1.4)return false;
 const points=[];for(let z=1;z<ENTRANCE.z;z++)for(let x=1;x<dimensions(s.level).width-1;x++){const p={x,z};if(Math.hypot(p.x-ENTRANCE.x,p.z-ENTRANCE.z)>1.5&&walkable(p,obstacles(s),s.level)&&g.clearOfActors(s,p,c))points.push(p);}
 points.sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z));for(const p of points){const path=actorPath(s,c,p,false,g.actors(s));if(path?.length){c.path=path;return true;}}return false;
}
