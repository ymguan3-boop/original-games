export const ENTRANCE={x:1,z:5}, CHECKOUT={x:6,z:3}, WAREHOUSE={x:2,z:3};
// Conservative occupied cells include the real furniture silhouette plus actor clearance.
export const FIXED_CELLS=['5,2','6,2','7,2'];
export const ACTOR_DIAMETER=.82;
export let DOOR_CLEARANCE=.975;
/* Lv.6–10 是經營等級，建築外觀與空間維持五階 */
export const buildingLevel=(level=1)=>Math.min(level,5);
/* 店面接近正方形放大：Lv.1 14×12 到 Lv.5 18×16，門口跟著前牆往外移 */
export const dimensions=(level=1)=>({width:(13+buildingLevel(level))*Math.SQRT1_2,height:(11+buildingLevel(level))*Math.SQRT1_2});
/* 新版店面：大門在正面牆中央（朝鏡頭），收銀台維持在後牆右側 */
export function applyRoom(level){DOOR_CLEARANCE=(buildingLevel(level)===1?1.05:buildingLevel(level)>=4?2.1:1.8)/2+.45;const d=dimensions(level);ENTRANCE.x=Math.round((d.width-1)/2);ENTRANCE.z=Math.floor(d.height)-2;CHECKOUT.x=Math.floor(d.width)-3;FIXED_CELLS.splice(0,FIXED_CELLS.length,...[-1,0,1].map(dx=>`${CHECKOUT.x+dx},2`));}
export function blocked(shelves=[]){return new Set([...FIXED_CELLS,...shelves.map(s=>`${s.x},${s.z}`)]);}
export function walkable(p,shelves=[],level=1){const {width,height}=dimensions(level);if(!(p.x>=1&&p.z>=1&&p.x<=width-2&&p.z<=height-2))return false;for(const key of blocked(shelves)){const [x,z]=key.split(',').map(Number),dx=Math.max(Math.abs(p.x-x)-.5,0),dz=Math.max(Math.abs(p.z-z)-.5,0);if(Math.hypot(dx,dz)<ACTOR_DIAMETER/2-.00001)return false;}return true;}
export function findPath(start,end,shelves=[],level=1){
 const {width,height}=dimensions(level),walls=blocked(shelves),key=p=>`${p.x},${p.z}`,a={x:Math.round(start.x),z:Math.round(start.z)},b={x:Math.round(end.x),z:Math.round(end.z)};
 const valid=p=>p.x>0&&p.z>0&&p.x<width-1&&p.z<height-1&&!walls.has(key(p));if(!valid(a)||!valid(b))return null;
 const open=[a],cost=new Map([[key(a),0]]),prev=new Map();
 while(open.length){open.sort((p,q)=>(cost.get(key(p))+Math.abs(p.x-b.x)+Math.abs(p.z-b.z))-(cost.get(key(q))+Math.abs(q.x-b.x)+Math.abs(q.z-b.z)));const p=open.shift(),k=key(p);if(k===key(b)){const path=[];let q=p;while(key(q)!==key(a)){path.unshift(q);q=prev.get(key(q));}return path;}
 for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const q={x:p.x+dx,z:p.z+dz},qk=key(q),n=cost.get(k)+1;if(!valid(q)||n>=(cost.get(qk)??Infinity))continue;cost.set(qk,n);prev.set(qk,p);open.push(q);}}
 return null;
}
export function isLayoutValid(shelves,level=1){const seen=new Set([...FIXED_CELLS,`${ENTRANCE.x},${ENTRANCE.z}`,'2,3',...Array.from({length:Math.min(4,Math.floor(dimensions(level).height)-4)},(_,i)=>`${CHECKOUT.x},${3+i}`)]);for(const s of shelves){const k=`${s.x},${s.z}`;if(!Number.isInteger(s.x)||!Number.isInteger(s.z)||!walkable(s,[],level)||seen.has(k))return false;seen.add(k);}return [CHECKOUT,WAREHOUSE,...shelves.filter(s=>!s.decoration).map(s=>({x:s.x,z:s.z+1}))].every(p=>findPath(ENTRANCE,p,shelves,level)!==null);}

/* 宣傳員（幻靈吉祥物）站在門前台階右側，面向街道發傳單 */
export const promoterPoint=()=>({x:ENTRANCE.x+1.6,z:ENTRANCE.z+5.8});
export function customerDisplayPoint(c,progress=1,step=.25){const lag=Math.max(0,step*(1-progress));const k=c.arrivalRemaining>0||c.arrivingNow?1-((c.arrivalRemaining||0)+lag)/5:c.exitingAtDoor?1-((c.exitTravel||0)-lag)/5:null;if(k===null)return c;const u=Math.max(0,Math.min(1,k));return {x:ENTRANCE.x,z:ENTRANCE.z+7*(1-u)};}
