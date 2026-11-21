import{occupiedCells}from'./placement-footprint.js?v=20261121-storybook';
export const ENTRANCE={x:1,z:5}, CHECKOUT={x:6,z:3}, WAREHOUSE={x:2,z:3};
// Conservative occupied cells include the real furniture silhouette plus actor clearance.
export const FIXED_CELLS=['6,2','6,4'];
/* 收銀站：櫃台直立靠右牆，收銀員站櫃台右側、顧客在左側結帳，排隊往左延伸。0 號由主角收銀，1 號由員工收銀。 */
export const STATIONS=[];export const QUEUE_PER_STATION=3;
export function computeStations(level=1){const d=dimensions(level),W=Math.floor(d.width),H=Math.floor(d.height),cx=W-3,zA=2,zB=Math.min(H-4,zA+3);/* Lv.1、Lv.2 只有一座收銀台，Lv.3 起才有第二座 */return (level<=2?[zA]:[zA,zB]).map((z,i)=>({id:i,z,counter:{x:cx,z},cashier:{x:cx+1,z},pay:{x:cx-1,z},queue:Array.from({length:QUEUE_PER_STATION},(_,j)=>({x:cx-1-j,z}))}));}
export const queueCellKeys=()=>new Set(STATIONS.flatMap(st=>st.queue.map(p=>p.x+','+p.z)));
export const nearCashierSpot=(p,r=.2)=>STATIONS.find(st=>Math.hypot(p.x-st.cashier.x,p.z-st.cashier.z)<r)||null;
export const ACTOR_DIAMETER=.82;
export let DOOR_CLEARANCE=.975;
/* 經營等級與建築空間皆採用五階 */
export const buildingLevel=(level=1)=>Math.min(level,5);
/* 店面接近正方形放大：Lv.1 14×12 到 Lv.5 18×16，門口跟著前牆往外移 */
export const dimensions=(level=1)=>({width:(13+buildingLevel(level))*Math.SQRT1_2,height:(11+buildingLevel(level))*Math.SQRT1_2});
/* 新版店面：大門在正面牆中央（朝鏡頭），收銀台維持在後牆右側 */
export const counterPositions=level=>computeStations(level).map(st=>st.counter);
export function applyRoom(level){DOOR_CLEARANCE=(buildingLevel(level)===1?1.05:buildingLevel(level)>=4?2.1:1.8)/2+.45;const d=dimensions(level);ENTRANCE.x=Math.round((d.width-1)/2);ENTRANCE.z=Math.floor(d.height)-2;STATIONS.splice(0,STATIONS.length,...computeStations(level));CHECKOUT.x=STATIONS[0].pay.x;CHECKOUT.z=STATIONS[0].pay.z;FIXED_CELLS.splice(0,FIXED_CELLS.length,...STATIONS.map(st=>`${st.counter.x},${st.counter.z}`));}
export const shelfApproach=sh=>sh.type==='materials'&&((sh.rotation||0)%360+360)%360===270?{x:sh.x+1,z:sh.z}:{x:sh.x,z:sh.z+1};
export function blocked(shelves=[]){return new Set([...FIXED_CELLS,...shelves.flatMap(occupiedCells).map(s=>`${s.x},${s.z}`)]);}
export function walkable(p,shelves=[],level=1){const {width,height}=dimensions(level);if(!(p.x>=1&&p.z>=1&&p.x<=width-2&&p.z<=height-2))return false;for(const key of blocked(shelves)){const [x,z]=key.split(',').map(Number),dx=Math.max(Math.abs(p.x-x)-.5,0),dz=Math.max(Math.abs(p.z-z)-.5,0);if(Math.hypot(dx,dz)<ACTOR_DIAMETER/2-.00001)return false;}return true;}
export function findPath(start,end,shelves=[],level=1){
 const {width,height}=dimensions(level),walls=blocked(shelves),key=p=>`${p.x},${p.z}`,a={x:Math.round(start.x),z:Math.round(start.z)},b={x:Math.round(end.x),z:Math.round(end.z)};
 const valid=p=>p.x>0&&p.z>0&&p.x<width-1&&p.z<height-1&&!walls.has(key(p));if(!valid(a)||!valid(b))return null;
 const open=[a],cost=new Map([[key(a),0]]),prev=new Map();
 while(open.length){open.sort((p,q)=>(cost.get(key(p))+Math.abs(p.x-b.x)+Math.abs(p.z-b.z))-(cost.get(key(q))+Math.abs(q.x-b.x)+Math.abs(q.z-b.z)));const p=open.shift(),k=key(p);if(k===key(b)){const path=[];let q=p;while(key(q)!==key(a)){path.unshift(q);q=prev.get(key(q));}return path;}
 for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const q={x:p.x+dx,z:p.z+dz},qk=key(q),n=cost.get(k)+1;if(!valid(q)||n>=(cost.get(qk)??Infinity))continue;cost.set(qk,n);prev.set(qk,p);open.push(q);}}
 return null;
}
export function isLayoutValid(shelves,level=1){const sts=STATIONS.length?STATIONS:computeStations(level),seen=new Set([...FIXED_CELLS,`${ENTRANCE.x},${ENTRANCE.z}`,'2,3',...sts.flatMap(st=>[...st.queue,st.cashier].map(p=>`${p.x},${p.z}`))]);for(const s of shelves){for(const c of occupiedCells(s)){const k=`${c.x},${c.z}`;if(!Number.isInteger(c.x)||!Number.isInteger(c.z)||!walkable(c,[],level)||seen.has(k))return false;seen.add(k);}}return [...sts.flatMap(st=>[st.pay,st.cashier]),WAREHOUSE,...shelves.filter(s=>!s.decoration).map(shelfApproach)].every(p=>findPath(ENTRANCE,p,shelves,level)!==null);}

/* 宣傳員（幻靈吉祥物）站在門前台階右側，面向街道發傳單 */
export const promoterPoint=()=>({x:ENTRANCE.x+1.6,z:ENTRANCE.z+5.8});
export function customerDisplayPoint(c,progress=1,step=.25){if(c.arrivalFrom&&(c.arrivalRemaining>0||c.arrivingNow)){const lag=Math.max(0,step*(1-progress)),u=Math.max(0,Math.min(1,1-((c.arrivalRemaining||0)+lag)/(c.arrivalDuration||1.2)));return{x:c.arrivalFrom.x+(c.x-c.arrivalFrom.x)*u,z:c.arrivalFrom.z+(c.z-c.arrivalFrom.z)*u};}const lag=Math.max(0,step*(1-progress));const k=c.arrivalRemaining>0||c.arrivingNow?1-((c.arrivalRemaining||0)+lag)/5:c.exitingAtDoor?1-((c.exitTravel||0)-lag)/5:null;if(k===null)return c;const u=Math.max(0,Math.min(1,k));return {x:ENTRANCE.x,z:ENTRANCE.z+7*(1-u)};}

/* 模組載入時先以 Lv.1 建好收銀站，未呼叫 applyRoom 的地方（例如測試或舊工具）也拿到一致的座標 */
STATIONS.push(...computeStations(1));CHECKOUT.x=STATIONS[0].pay.x;CHECKOUT.z=STATIONS[0].pay.z;FIXED_CELLS.splice(0,FIXED_CELLS.length,...STATIONS.map(st=>`${st.counter.x},${st.counter.z}`));
