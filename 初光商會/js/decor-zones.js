import {wallFixtures,wallItemWidth} from './architecture-reservations.js?v=20261114-v57';
import {dimensions,buildingLevel} from './nav.js?v=20261114-v57';
/* 小件掛得比較高（眼睛高度），大幅掛畫底邊較低 */
export const wallLift=type=>({couplet:.45,clock:0,painting:.2,'painting-large':0})[type]||0;
export const WALL_TYPES=new Set(['clock','painting','painting-large','couplet']);
export const PLANT_TYPES=new Set(['plant','fern','lavender','citrus']);
const sideNames={back:'後牆',front:'門面牆',left:'左牆',right:'右牆'};
/* 與 chibi/shell.js 的窗、門及柱列同一組尺寸。裝飾外框以 .95m 寬保守保留間距。 */
export function wallSlots(level,free=false,type=''){
 const l=buildingLevel(level),{width:w,height:d}=dimensions(l),cx=(w-1)/2,cz=(d-1)/2,width=wallItemWidth(type),fixtures=wallFixtures(l),slots=[];
 for(const side of ['back','front','left','right']){const len=['front','back'].includes(side)?w:d;let index=0,last=-Infinity;for(let u=-len/2+1.15;u<=len/2-1.15;u+=free?.1:.25){
  const margin=(l===5?1.05:.5)+width/2+.1;
  if(Math.abs(u)+margin>len/2||(!free&&u-last<Math.max(1,width+.16))||fixtures.some(f=>f.side===side&&Math.abs(f.u-u)<(f.width+width)/2+.08))continue;
  last=u;const pos=side==='back'?{x:cx+u,z:-.43,rotation:0}:side==='front'?{x:cx+u,z:d-.57,rotation:180}:side==='left'?{x:-.43,z:cz+u,rotation:90}:{x:w-.57,z:cz+u,rotation:270};
  slots.push({mount:free?`${side}-free-${u.toFixed(2)}`:`${side}-${index++}`,side,label:free?sideNames[side]:`${sideNames[side]} ${index}`,y:1.45,...pos});
 }}return slots;
}
export function gardenSlots(level){const {width,height}=dimensions(level),door=Math.round((width-1)/2);return [-1,1].flatMap((sign,i)=>[0,1].map(row=>({garden:`garden-${i}-${row}`,label:`門口${sign<0?'左':'右'}側花園 ${row+1}`,x:door+sign*3,z:height-.5+2+row*1.2,y:-.07,rotation:0})));}
export const nearestSlot=(list,p)=>list.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];
export function specialDecorPose(item,level){
 if(item.mount){const slot=wallSlots(level,item.mount.includes('-free-'),item.type).find(s=>s.mount===item.mount);return slot&&{...slot,y:slot.y+wallLift(item.type)};}
 if(item.garden==='garden-free'){const {width,height}=dimensions(level),door=Math.round((width-1)/2);return item.x>=-.1&&item.x<=width-.9&&item.z>=height+1.1&&item.z<=height+4.8&&Math.abs(item.x-door)>=2?{garden:'garden-free',x:item.x,z:Math.min(item.z,Math.floor((height+2.9)*4)/4),y:-.07,rotation:item.rotation||0}:null;}
 return item.garden?gardenSlots(level).find(s=>s.garden===item.garden):null;
}
export const specialDecor=item=>!!(item.mount||item.garden);
export function resolveDecorPlacement(item,p,level){
 if(WALL_TYPES.has(item.type)){const slots=wallSlots(level,!!p.mount?.includes('-free-')||!p.mount,item.type),slot=p.mount?slots.find(x=>x.mount===p.mount):nearestSlot(slots,p);if(!slot)throw Error('沒有可用的牆面位置');return {...slot};}
 const {height}=dimensions(level);
 if(PLANT_TYPES.has(item.type)&&(p.garden||p.z>=height+.5)){
  if(p.garden&&p.garden!=='garden-free'){const slot=gardenSlots(level).find(x=>x.garden===p.garden);if(!slot)throw Error('沒有可用的花園位置');return {...slot};}
  if(p.z<height+1.1||p.z>height+2.9)throw Error('請放在門口兩側花園，保留道路通行');const pose=specialDecorPose({garden:'garden-free',x:Math.round(p.x*4)/4,z:Math.round(p.z*4)/4,rotation:p.rotation??item.rotation},level);if(!pose)throw Error('請放在門口兩側花園，門前中央與道路保留通行');return pose;
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
export function carpetEntrance(level){const {width,height}=dimensions(level);return {x:Math.round((width-1)/2),z:Math.round((Math.floor(height)-1.5)*2)/2};}
export function floorInBounds(item,level){const {width,height}=dimensions(level),{w,d}=floorFootprint(item);const entry=carpetEntrance(level);return Math.abs(item.x-entry.x)<=.5&&Math.abs(item.z-entry.z)<=.5&&Number.isInteger(item.x*2)&&Number.isInteger(item.z*2)&&(item.rotation||0)%90===0&&item.x-w/2>=-.5&&item.z-d/2>=-.5&&item.x+w/2<=width-.5&&item.z+d/2<=height-.5;}

// Reclaim only incompatible pieces when loading/upgrading; never delete purchases.
export function reconcileArchitecture(s){const kept=[];let moved=0;for(const item of [...(s.decorations||[])]){const pose=item.mount?specialDecorPose(item,s.level):null,conflict=item.mount&&(!pose||kept.some(o=>o.mount&&o.mount.split('-')[0]===item.mount.split('-')[0]&&Math.hypot(o.x-(pose?.x??item.x),o.z-(pose?.z??item.z))<(wallItemWidth(o.type)+wallItemWidth(item.type))/2+.08));if(conflict||item.type==='carpet'&&!floorInBounds(item,s.level)){s.decorations=s.decorations.filter(d=>d.id!==item.id);const saved={...item};for(const key of ['x','z','y','mount','garden'])delete saved[key];(s.decorStorage||=[]).push(saved);moved++;}else{if(pose)Object.assign(item,pose);kept.push(item);}}return moved;}

/* 舊版本的花園較深：逐件搬回道路前的可見範圍，不能因兩件壓在一起而整批收納。 */
export function rehomeGardenDecor(s){const {width,height}=dimensions(s.level),door=Math.round((width-1)/2),settled=(s.decorations||[]).filter(d=>d.garden&&d.garden!=='garden-free');for(const item of [...(s.decorations||[])]){if(item.garden!=='garden-free')continue;const pose=specialDecorPose(item,s.level),clear=p=>settled.every(other=>Math.hypot(other.x-p.x,other.z-p.z)>=1-.00001);if(pose&&clear(pose)){Object.assign(item,pose);settled.push(item);continue;}const candidates=[];for(let x=0;x<=width-.9;x+=.25)for(let z=Math.ceil((height+1.1)*4)/4;z<=height+2.9;z+=.25)if(Math.abs(x-door)>=2&&clear({x,z}))candidates.push({x,z});candidates.sort((a,b)=>Math.hypot(a.x-item.x,a.z-item.z)-Math.hypot(b.x-item.x,b.z-item.z));if(candidates.length){Object.assign(item,{...candidates[0],y:-.07});settled.push(item);}else{s.decorations=s.decorations.filter(d=>d!==item);const saved={...item};for(const key of ['x','z','garden','y'])delete saved[key];(s.decorStorage||=[]).push(saved);}}}
