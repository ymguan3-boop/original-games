import {dimensions,buildingLevel} from './nav.js?v=20261111-ui-v23';
export const WALL_TYPES=new Set(['clock','painting','couplet']);
export const PLANT_TYPES=new Set(['plant','fern','lavender','citrus']);
const sideNames={back:'後牆',front:'門面牆',left:'左牆',right:'右牆'};
/* 與 chibi/shell.js 的窗、門及柱列同一組尺寸。裝飾外框以 .95m 寬保守保留間距。 */
export function wallSlots(level){
 const l=buildingLevel(level),{width:w,height:d}=dimensions(l),cx=(w-1)/2,cz=(d-1)/2,doorX=Math.round(cx)-cx,DW=l===1?1.05:l>=4?2.1:1.8;
 const cuts={back:[],front:[],left:[],right:[]},add=(side,u,r)=>cuts[side].push([u-r,u+r]);
 const nb=[0,1,2,3,3,4][l],span=w-1.6,ww=l===1?.85:l>=4?1.1:1;
 for(let i=0;i<nb;i++)add('back',nb===1?.6:-span/2+span*(i+.5)/nb,ww/2+.26);
 for(const side of ['left','right'])for(const u of l>=4?[-d*.22,d*.2]:[-.4])add(side,u,ww/2+.26);
 const segs=[[-w/2,doorX-DW/2],[doorX+DW/2,w/2]],frontW=l===1?.9:l===2?1.05:l===3?1.2:l===4?1.15:1.1;
 for(const [a,b]of segs){const len=b-a-1.1,n=Math.max(1,Math.floor(len/2.3)),us=l<=3?[(a+b)/2]:Array.from({length:n},(_,i)=>a+.55+len*(i+.5)/n);for(const u of us)add('front',u,frontW/2+.18);}
 add('front',doorX,DW/2+.3); // door and both jamb columns
 const slots=[];
 for(const side of Object.keys(cuts)){const len=['front','back'].includes(side)?w:d;let index=0,last=-Infinity;for(let u=-len/2+1.15;u<=len/2-1.15;u+=.25){if(u-last<1||cuts[side].some(([a,b])=>u+.4>a&&u-.4<b))continue;last=u;const pos=side==='back'?{x:cx+u,z:-.43,rotation:0}:side==='front'?{x:cx+u,z:d-.57,rotation:180}:side==='left'?{x:-.43,z:cz+u,rotation:90}:{x:w-.57,z:cz+u,rotation:270};slots.push({mount:`${side}-${index++}`,side,label:`${sideNames[side]} ${index}`,y:.88,...pos});}}
 return slots;
}
export function gardenSlots(level){const {width,height}=dimensions(level),door=Math.round((width-1)/2);return [-1,1].flatMap((sign,i)=>[0,1].map(row=>({garden:`garden-${i}-${row}`,label:`門口${sign<0?'左':'右'}側花園 ${row+1}`,x:door+sign*3,z:height-.5+2+row*1.2,y:-.07,rotation:0})));}
export const nearestSlot=(list,p)=>list.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
export function specialDecorPose(item,level){return item.mount?wallSlots(level).find(s=>s.mount===item.mount):item.garden?gardenSlots(level).find(s=>s.garden===item.garden):null;}
export const specialDecor=item=>!!(item.mount||item.garden);
export function resolveDecorPlacement(item,p,level){
 if(WALL_TYPES.has(item.type)){const slots=wallSlots(level),slot=p.mount?slots.find(x=>x.mount===p.mount):nearestSlot(slots,p);if(!slot)throw Error('沒有可用的牆面位置');return {...slot};}
 if(p.garden||(item.garden&&p.garden!==null)){if(!PLANT_TYPES.has(item.type))throw Error('只有植栽可放門外花園');const slots=gardenSlots(level),slot=p.garden?slots.find(x=>x.garden===p.garden):nearestSlot(slots,p);if(!slot)throw Error('請選門口兩側花園，保留顧客通道');return {...slot};}
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
