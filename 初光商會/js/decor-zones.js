import {dimensions,buildingLevel} from './nav.js?v=20261112-v31f';
/* 小件掛得比較高（眼睛高度），大幅掛畫底邊較低 */
export const wallLift=type=>({couplet:.45,clock:.4,painting:.2,'painting-large':0})[type]||0;
export const WALL_TYPES=new Set(['clock','painting','painting-large','couplet']);
export const PLANT_TYPES=new Set(['plant','fern','lavender','citrus']);
const sideNames={back:'後牆',front:'門面牆',left:'左牆',right:'右牆'};
/* 與 chibi/shell.js 的窗、門及柱列同一組尺寸。裝飾外框以 .95m 寬保守保留間距。 */
export function wallSlots(level,free=false){
 const l=buildingLevel(level),{width:w,height:d}=dimensions(l),cx=(w-1)/2,cz=(d-1)/2,doorX=Math.round(cx)-cx,DW=l===1?1.05:l>=4?2.1:1.8;
 const cuts={back:[],front:[],left:[],right:[]},add=(side,u,r)=>cuts[side].push([u-r,u+r]);
 const nb=[0,1,2,3,3,4][l],span=w-1.6,ww=l===1?.85:l>=4?1.1:1;
 for(let i=0;i<nb;i++)add('back',nb===1?.6:-span/2+span*(i+.5)/nb,ww/2+.26);
 for(const side of ['left','right'])for(const u of l>=4?[-d*.22,d*.2]:[-.4])add(side,u,ww/2+.26);
 const segs=[[-w/2,doorX-DW/2],[doorX+DW/2,w/2]],frontW=l===1?.9:l===2?1.05:l===3?1.2:l===4?1.15:1.1;
 for(const [a,b]of segs){const len=b-a-1.1,n=Math.max(1,Math.floor(len/2.3)),us=l<=3?[(a+b)/2]:Array.from({length:n},(_,i)=>a+.55+len*(i+.5)/n);for(const u of us)add('front',u,frontW/2+.18);}
 add('front',doorX,DW/2+.3); // door and both jamb columns
 const slots=[];
 for(const side of Object.keys(cuts)){const len=['front','back'].includes(side)?w:d;let index=0,last=-Infinity;for(let u=-len/2+1.15;u<=len/2-1.15;u+=free?.1:.25){if((!free&&u-last<1)||cuts[side].some(([a,b])=>u+.4>a&&u-.4<b))continue;last=u;const pos=side==='back'?{x:cx+u,z:-.43,rotation:0}:side==='front'?{x:cx+u,z:d-.57,rotation:180}:side==='left'?{x:-.43,z:cz+u,rotation:90}:{x:w-.57,z:cz+u,rotation:270};slots.push({mount:free?`${side}-free-${u.toFixed(2)}`:`${side}-${index++}`,side,label:free?sideNames[side]:`${sideNames[side]} ${index}`,y:1.45,...pos});}}
 return slots;
}
export function gardenSlots(level){const {width,height}=dimensions(level),door=Math.round((width-1)/2);return [-1,1].flatMap((sign,i)=>[0,1].map(row=>({garden:`garden-${i}-${row}`,label:`門口${sign<0?'左':'右'}側花園 ${row+1}`,x:door+sign*3,z:height-.5+2+row*1.2,y:-.07,rotation:0})));}
export const nearestSlot=(list,p)=>list.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
export function specialDecorPose(item,level){
 if(item.mount){const slot=wallSlots(level,item.mount.includes('-free-')).find(s=>s.mount===item.mount);return slot&&{...slot,y:slot.y+wallLift(item.type)};}
 if(item.garden==='garden-free'){const {width,height}=dimensions(level),door=Math.round((width-1)/2);return item.x>=-.1&&item.x<=width-.9&&item.z>=height+1.1&&item.z<=height+2.9&&Math.abs(item.x-door)>=2?{garden:'garden-free',x:item.x,z:item.z,y:-.07,rotation:item.rotation||0}:null;}
 return item.garden?gardenSlots(level).find(s=>s.garden===item.garden):null;
}
export const specialDecor=item=>!!(item.mount||item.garden);
export function resolveDecorPlacement(item,p,level){
 if(WALL_TYPES.has(item.type)){const slots=wallSlots(level,!!p.mount?.includes('-free-')||!p.mount),slot=p.mount?slots.find(x=>x.mount===p.mount):nearestSlot(slots,p);if(!slot)throw Error('沒有可用的牆面位置');return {...slot};}
 const {height}=dimensions(level);
 if(PLANT_TYPES.has(item.type)&&(p.garden||p.z>=height+.5)){
  if(p.garden&&p.garden!=='garden-free'){const slot=gardenSlots(level).find(x=>x.garden===p.garden);if(!slot)throw Error('沒有可用的花園位置');return {...slot};}
  const pose=specialDecorPose({garden:'garden-free',x:Math.round(p.x*4)/4,z:Math.round(p.z*4)/4,rotation:p.rotation??item.rotation},level);if(!pose)throw Error('請放在門口兩側花園，門前中央與道路保留通行');return pose;
 }
 return {x:p.x,z:p.z,rotation:p.rotation??item.rotation??0};
}

export function wallWindowCenters(level){
 const l=buildingLevel(level),{width:w,height:d}=dimensions(l),cx=(w-1)/2,cz=(d-1)/2,nb=[0,1,2,3,3,4][l],span=w-1.6,ww=l===1?.85:l>=4?1.1:1,wy=l===1?1.3:l>=4?1.55:1.45,out=[];
 for(let i=0;i<nb;i++)out.push({side:'back',u:cx+(nb===1?.6:-span/2+span*(i+.5)/nb)+.5,width:ww+.25,wy});
 for(const u of l>=4?[-d*.22,d*.2]:[-.4])out.push({side:'left',u:cz+u+.5,width:ww+.25,wy});
 return out;
}

export function floorFootprint(item){const turn=Math.abs(item.rotation||0)%180;return turn===90?{w:1.9,d:2.7}:{w:2.7,d:1.9};}
export function floorInBounds(item,level){const {width,height}=dimensions(level),{w,d}=floorFootprint(item);return Number.isInteger(item.x*2)&&Number.isInteger(item.z*2)&&(item.rotation||0)%90===0&&item.x-w/2>=-.5&&item.z-d/2>=-.5&&item.x+w/2<=width-.5&&item.z+d/2<=height-.5;}
