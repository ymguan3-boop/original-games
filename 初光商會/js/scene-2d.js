import {specialDecorPose,resolveDecorPlacement,wallSlots,WALL_TYPES,wallWindowCenters} from './decor-zones.js?v=20261111-portrait-v45';
import {hasDecorModel} from './decor-models-v22.js?v=20261111-portrait-v45';
import {CHECKOUT,dimensions,promoterPoint,customerDisplayPoint} from './nav.js?v=20261111-portrait-v45';
import {visibleStaff,chasePose} from './shop-presentation.js?v=20261111-portrait-v45';
/* 初光商會 2D 場景：對外介面與 3D 的 createScene 相同，遊戲邏輯、選單與存檔都不需要更動。
 * 視角是 2.5D 等角：地板是菱形格，後方左右兩面牆都看得到；x 往右下、z 往左下。
 * 地板、牆面與店外庭院畫進背景，貨架、家具與角色是依 x+z 排序的 DOM 圖片，GIF 才能持續播放。 */
import {decorTypes,decorDefinition} from './decorations.js?v=20261111-portrait-v45';
import {ENTRANCE} from './nav.js?v=20261111-portrait-v45';
import {sampleTrail} from './motion.js?v=20261111-portrait-v45';
import {getCustomerComplaint} from './customer-complaints.js?v=20261111-portrait-v45';
import {eventEmployee} from './patrol-events.js?v=20261111-portrait-v45';
import {shelfTypes,shelfKind,shelfCapacity,shelfDefinition} from './furniture.js?v=20261111-portrait-v45';
import {stockCount} from './shelf-products.js?v=20261111-portrait-v45';
import {createAssets} from './asset-resolver.js?v=20261111-portrait-v45';
import {createPlacementCells} from './placement-cells.js?v=20261111-portrait-v45';
import {environment} from './environment.js?v=20261111-portrait-v45';
import {createEnvironment2D} from './environment-2d.js?v=20261111-portrait-v45';
import {spiritArtPath} from './spirit-cards.js?v=20261111-portrait-v45';

const U=64,HW=U*.5,HH=U*.25,WALL=2.6*U,MARGIN=U*2.2,SPRITES='./assets/sprites-v1/',ISO='./assets/iso-v1/',OUT='./assets/outdoor-v1/',TOPM=U*1.6,COUNTER_FLIP=true,SLANT=Math.hypot(HW,HH);
/* 各等級的牆面飾條與柱子配色，參考使用者提供的五階店面 */
const TRIM=[null,{base:'#b08b61',top:'#c5a37a',pillar:'#d9c5a5',cap:'#e5d3b4'},{base:'#a2663b',top:'#c58a3c',pillar:'#d79a3a',cap:'#f2c35a'},{base:'#a2663b',top:'#d6a03c',pillar:'#e0a53a',cap:'#fbd46a'},{base:'#8d5a2e',top:'#e3b34a',pillar:'#e8b23e',cap:'#ffe08a'},{base:'#a3322c',top:'#f0c24c',pillar:'#c8302a',cap:'#ffd75a'}];
const RACK_WIDTH=1.75,ACTOR_SIZE=1.5,MANAGER_SIZE=1.55,COUNTER_WIDTH=2.5,DECOR_WIDTH={sofa:1.8,plant:1.2,'lucky-cat':1.2,fountain:1.9,artwork:1.5,phoenix:1.4};
const loadImage=src=>new Promise((ok,reject)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>reject(Error('圖片讀取失敗：'+src));i.src=src;});
const stateEmotion=(type,d,s)=>{
 if(type==='staff')return eventEmployee(s,s.event)?.id===d.id?'event-'+d.role:d.reactionUntil>s.totalTime?(d.feedbackKind||d.reaction):d.role==='standby'?null:d.fatigue>=80?'tired':d.workTask?'restock':null;
 if(type!=='customer')return null;
 if(d.state==='OutOfStock')return 'question';if(['UnhappyExit','AbandonCart'].includes(d.state))return 'confused';if(d.state==='Paid')return 'happy';if(d.state==='Angry')return 'angry';if(d.state==='Leave')return d.emotion;
 if(['Queue','Checkout','Cart'].includes(d.state)){const r=(d.wait||0)/Math.max(1,d.patience||35);return r>.9?'angry':r>.5?'impatient':null;}
 return null;
};

export function createScene2D({canvas,game,onSelect=()=>{},onFurnitureSelect=()=>{},onFurniturePosition=()=>{},onModeChange=()=>{},onStaffPositions=()=>{},onActorVisuals=()=>{},onPlacementChange=()=>{},onActionResult=()=>{},onError=console.error}){
 const metrics={assets:[],errors:[],actors:0,frames:0,renderer:'2d'},ctx=canvas.getContext('2d'),state=()=>game.state;
 const layer=document.createElement('div');layer.className='world2d';canvas.after(layer);
 let grassImg=null;const grassReady=loadImage(OUT+'grass.webp').then(i=>{grassImg=i;dirty=true;});let bgGrass='#8fc56b',windowSpots=[];const envLayer=createEnvironment2D({world:canvas,getView:()=>{const x0=X0(),y0=Y0(),c=(x,z)=>({X:x0+(x-z)*HW,Y:y0+(x+z)*HH}),a=c(0,0),r=c(dim.width,0),b=c(dim.width,dim.height),l=c(0,dim.height);return {panX,panY,scale,poly:[{X:a.X,Y:a.Y-WALL},{X:r.X,Y:r.Y-WALL},r,b,l,{X:l.X,Y:l.Y-WALL}],windows:windowSpots};}});
 const roomCanvas=document.createElement('canvas'),cellCanvas=document.createElement('canvas');cellCanvas.className='world2d-cells';layer.prepend(cellCanvas);const cellsFor=createPlacementCells(game);let cellKey='';
 /* 布置模式：擺放時綠格可放、紅格不可放；只選取物件時顯示淡格線 */
 function drawCells(){const want=mode==='decorate'&&!WALL_TYPES.has(placement?.type)?(placement?'p':'g'):'';const list=placement?cellsFor(placement):[],k=want+(placement?list.length+':'+list.filter(c=>c.ok).length+':'+placement.type+placement.rotation:'')+dim.width+'x'+dim.height;if(k===cellKey)return;cellKey=k;cellCanvas.width=roomW();cellCanvas.height=roomH();const g=cellCanvas.getContext('2d');g.clearRect(0,0,cellCanvas.width,cellCanvas.height);if(!want)return;for(let z=0;z<dim.height;z++)for(let x=0;x<dim.width;x++){const c=placement?list.find(v=>v.x===x&&v.z===z):null,p=P(x,z);g.beginPath();g.moveTo(p.X,p.Y-HH+1);g.lineTo(p.X+HW-2,p.Y);g.lineTo(p.X,p.Y+HH-1);g.lineTo(p.X-HW+2,p.Y);g.closePath();if(c){g.fillStyle=c.ok?'#4fc38a66':'#f05e5340';g.fill();}g.strokeStyle=c?.ok?'#2f9a63aa':'#7eaa5588';g.lineWidth=1.2;g.stroke();}}const items=new Map(),actors=new Map(),keys=new Set(),touches=new Map();
 let level=0,dim={width:14,height:12},mode='play',alive=true,time=0,scale=1,panX=0,panY=0,userZoom=typeof innerHeight==='number'&&innerHeight>innerWidth?1.45:1.1,cw=1,ch=1,selected=null,unlocked=false,placement=null,ghost=null,snapshot=null,down=null,drag=null,gesture=null,joystick={x:0,y:0},motionStamp=-1,motionProgress=1,frame=0,dirty=true,assets3d=null;
 let chaseStarted=-100,lastGardenCount=-1;
 function playChaseSuccess(){chaseStarted=time;metrics.chaseCelebrations=(metrics.chaseCelebrations||0)+1;}
 const furniture=(s=state())=>[...s.shelves,...(s.decorations||[])];
 const roomW=()=>(dim.width+dim.height)*HW+MARGIN*2,roomH=()=>(dim.width+dim.height)*HH+WALL+MARGIN*2.4+TOPM;
 const X0=()=>MARGIN+dim.height*HW,Y0=()=>MARGIN+WALL+TOPM;
 /* 格子座標（格子中心為整數）→ 背景畫布座標 */
 const P=(x,z)=>({X:X0()+(x-z)*HW,Y:Y0()+(x+z+1)*HH});
 const toScreen=(x,z,h=0)=>{const p=P(x,z);return {x:panX+p.X*scale,y:panY+(p.Y-h*U)*scale};};
 const toRoom=(cx,cy)=>{const r=canvas.getBoundingClientRect();return {X:(cx-r.left-panX)/scale,Y:(cy-r.top-panY)/scale};};
 function fromScreen(cx,cy,item=placement||drag){const q=toRoom(cx,cy);if(WALL_TYPES.has(item?.type))q.Y+=.88*U;const a=(q.X-X0())/HW,b=(q.Y-Y0())/HH;return {x:(a+b-1)/2,z:(b-a-1)/2};}
 function creamImage(img){const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.filter='brightness(1.45) saturate(.55) sepia(.25)';g.drawImage(img,0,0);g.filter='none';g.fillStyle='#f5e8ce55';g.fillRect(0,0,c.width,c.height);return c;}
 async function buildRoom(l){
  const tag=++metrics.roomBuild||(metrics.roomBuild=1);dim=dimensions(l);roomCanvas.width=roomW();roomCanvas.height=roomH();
  const [floor,wall,win,banner,counter,door,plant,oTree,oBush,oBed,oFence,oLamp,oBanner]=await Promise.all([loadImage(`./assets/art-v11/floor-lv${l}.webp`),loadImage(`./assets/art-v11/wall-lv${l}.webp`),loadImage(SPRITES+'window.webp'),loadImage(SPRITES+'banner.webp'),loadImage(SPRITES+'counter.webp'),loadImage(SPRITES+'door.webp'),loadImage(SPRITES+'decor-plant.webp'),...['tree','bush','flowerbed','fence','lamp','banner'].map(n=>loadImage(OUT+n+'.webp'))]);
  if(tag!==metrics.roomBuild||!alive)return;
  const g=roomCanvas.getContext('2d'),Wd=dim.width,Hd=dim.height,x0=X0(),y0=Y0(),t=TRIM[Math.min(l,5)];g.clearRect(0,0,roomCanvas.width,roomCanvas.height);
  const corner=(x,z)=>({X:x0+(x-z)*HW,Y:y0+(x+z)*HH});const cR=corner(Wd,0),cL=corner(0,Hd),cB=corner(Wd,Hd);
  const prop=(img,x,z,w)=>{if(!img)return;const p=P(x,z),pw=w*U,ph=pw*img.height/img.width;g.drawImage(img,p.X-pw/2,p.Y+HH*.6-ph,pw,ph);};
  const back=[];for(let x=.5;x<Wd;x+=3.1)back.push([oTree,x,-1.7,2.6]);for(let z=1.2;z<Hd-1;z+=3.3)Math.abs(z-ENTRANCE.z)>2.5&&back.push([oTree,-1.7,z,2.6]);back.push([oBanner,Wd+.6,-1.2,1.3],[oTree,-2,-2,2.8]);back.sort((a,b)=>(a[1]+a[2])-(b[1]+b[2])).forEach(a=>prop(...a));
  /* 道路為連續鋪面，沿店面正門接上街道；不依靠可能被裁切的小石頭貼圖。 */
  g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);const doorX=Math.round((Wd-1)/2),roadZ=Hd+5;
  g.fillStyle=l===1?'#bb9160':l>=4?'#d8c7a5':'#b6aaa0';g.strokeStyle=l>=4?'#a18b57':'#847669';g.lineWidth=.035;
  const paving=(x,z,w,d)=>{g.fillRect(x,z,w,d);g.strokeRect(x,z,w,d);for(let zz=z;zz<z+d;zz+=.55){g.beginPath();g.moveTo(x,zz);g.lineTo(x+w,zz);g.stroke();}for(let xx=x;xx<x+w;xx+=.8){g.beginPath();g.moveTo(xx,z);g.lineTo(xx,z+d);g.stroke();}};
  paving(doorX-1,Hd-.1,2,5.2);paving(-5,roadZ,Wd+10,2.2);
  /* 2D 的左側門框亦保留接道，避免原版存檔入口視覺中斷。 */
  paving(-4,ENTRANCE.z-.65,4,1.8);g.restore();metrics.exteriorRoad=true;
  /* 地板（菱形）與前緣木板邊 */
  g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);g.beginPath();g.rect(0,0,Wd,Hd);g.clip();if(floor){const pat=g.createPattern(l===1?creamImage(floor):floor,'repeat');pat.setTransform(new DOMMatrix().scale(4/floor.width));g.fillStyle=pat;}else g.fillStyle='#e8d6b2';g.fillRect(0,0,Wd,Hd);g.restore();
  g.fillStyle=t.base;g.beginPath();g.moveTo(cR.X,cR.Y);g.lineTo(cB.X,cB.Y);g.lineTo(cL.X,cL.Y);g.lineTo(cL.X,cL.Y+12);g.lineTo(cB.X,cB.Y+12);g.lineTo(cR.X,cR.Y+12);g.closePath();g.fill();
  /* 兩面牆：右牆沿 z=0、左牆沿 x=0；左牆略暗，看起來有立體感 */
  const wallFace=(sx,len,shade)=>{g.save();g.setTransform(sx*HW,HH,0,1,x0,y0);g.beginPath();g.rect(0,-WALL,len,WALL);if(sx===-1)g.rect(ENTRANCE.z-.9,-2.25*U,1.8,2.25*U);g.clip("evenodd");if(wall){const pat=g.createPattern(l===1?creamImage(wall):wall,'repeat');pat.setTransform(new DOMMatrix().scale(3.2/wall.width,3.2*SLANT/wall.height));g.fillStyle=pat;}else g.fillStyle='#f6ead2';g.fillRect(0,-WALL,len,WALL);if(shade){g.fillStyle=`rgba(60,36,20,${shade})`;g.fillRect(0,-WALL,len,WALL);}
   g.fillStyle=t.base;g.fillRect(0,-16,len,16);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,-4,len,4);g.fillStyle=t.top;g.fillRect(0,-WALL,len,10);g.restore();};
  wallFace(1,Wd,0);wallFace(-1,Hd,.1);
  /* 牆上的窗與旗：sx=1 右牆、-1 左牆 */
  windowSpots=[];const onWall=(img,sx,u,w,hFrac,isWin)=>{if(!img)return;const hpx=w*SLANT*img.height/img.width;g.save();g.setTransform(sx*HW,HH,0,1,x0,y0);g.drawImage(img,u-w/2,-WALL*hFrac-hpx/2,w,hpx);g.restore();if(isWin){const b=corner(sx>0?u:0,sx>0?0:u);windowSpots.push({X:b.X,Y:b.Y,ax:sx*HW*w*.4,ay:HH*w*.4,ix:sx>0?-HW:HW,iy:HH});}};
  for(const opening of wallWindowCenters(l))onWall(win,opening.side==='back'?1:-1,opening.u,opening.width,opening.wy/2.6,true);
  onWall(door,-1,ENTRANCE.z,2.1,.41,false);
  g.save();g.setTransform(-HW,HH,0,1,x0,y0);g.strokeStyle=t.top;g.lineWidth=.12;g.strokeRect(ENTRANCE.z-1,-2.3*U,2,2.3*U);
  if(l>=3){g.fillStyle='#65d9ff';g.beginPath();g.moveTo(ENTRANCE.z,-2.65*U);g.lineTo(ENTRANCE.z+.25,-2.45*U);g.lineTo(ENTRANCE.z,-2.3*U);g.lineTo(ENTRANCE.z-.25,-2.45*U);g.closePath();g.fill();}g.restore();
  if(l>=4){g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);g.strokeStyle=t.top;g.lineWidth=.035;for(let x=1;x<Wd-1;x+=3){g.beginPath();g.moveTo(x,1);g.lineTo(x,Hd-1);g.stroke();}g.restore();}
  metrics.entrance={...ENTRANCE};metrics.exteriorTier=l;
  /* 三根柱子：轉角與兩端 */
  const pillar=(p,h=WALL+14)=>{g.fillStyle=t.pillar;g.fillRect(p.X-9,p.Y-h,18,h);g.fillStyle='rgba(0,0,0,.15)';g.fillRect(p.X+2,p.Y-h,7,h);g.fillStyle=t.cap;g.fillRect(p.X-12,p.Y-h-10,24,12);if(l>=5){g.fillStyle='#6fd3ff';g.beginPath();g.moveTo(p.X,p.Y-h-34);g.lineTo(p.X+9,p.Y-h-18);g.lineTo(p.X,p.Y-h-8);g.lineTo(p.X-9,p.Y-h-18);g.closePath();g.fill();}};
  pillar(corner(0,0));pillar(cR);pillar(cL);
  /* 入口迎賓墊與店外盆栽 */
  g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);g.fillStyle='#fff3cf';g.fillRect(-.7,ENTRANCE.z-.9,1.7,1.8);g.fillStyle='#c35a3a';g.fillRect(-.6,ENTRANCE.z-.8,1.5,1.6);g.restore();
  const front=[[oBush,-1.3,Hd-1.5,1.5],[oBush,Wd+.9,2,1.4],[oBush,Wd+.9,Hd-3,1.5],[oLamp,-1.5,ENTRANCE.z-1.7,.75],[oLamp,-1.5,ENTRANCE.z+1.7,.75],[oBed,-2.4,ENTRANCE.z-3.5,1.9],[oBed,-2.4,ENTRANCE.z+3.5,1.9],[oFence,Wd+1.2,Hd+.4,1.4],[oFence,Wd+1.2,Hd+1.6,1.4],[oTree,-2.2,Hd+1.5,2.4],[oBush,ENTRANCE.x-5.2,Hd+2.6,1.4]];front.sort((a,b)=>(a[1]+a[2])-(b[1]+b[2])).forEach(a=>prop(...a));
  layer.querySelector('.world2d-counter')?.remove();if(counter){const el=new Image();el.src=ISO+'counter.webp';el.alt='';el.className='world2d-item world2d-counter';if(l===1)el.style.filter='brightness(1.45) saturate(.55) sepia(.25) drop-shadow(1px 0 #6b4b30) drop-shadow(-1px 0 #6b4b30) drop-shadow(0 1px #6b4b30)';layer.append(el);placeItem(el,{rotation:COUNTER_FLIP?180:0},CHECKOUT.x,2,COUNTER_WIDTH);metrics.counter=true;}
  metrics.projection='isometric';dirty=true;fit();
 }
 function fit(){
  const r=canvas.getBoundingClientRect();cw=Math.max(1,r.width);ch=Math.max(1,r.height);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  const full=r.height>innerHeight*.9,top=Math.ceil(document.querySelector('.topbar')?.getBoundingClientRect().bottom||50)+8,bottom=full?64:6,base=Math.min(cw/roomW(),(ch-top-bottom)/roomH());scale=base*userZoom;
  if(mode==='follow'&&state().manager){scale=Math.max(base,.9)*userZoom;const m=actors.get('manager')?.pos||state().manager,q=P(m.x,m.z);panX=cw/2-q.X*scale;panY=ch/2-q.Y*scale;}
  else{const free=roomW()*scale,used=roomH()*scale;panX=Math.max(Math.min(0,cw-free),Math.min(free<cw?(cw-free)/2:0,panX||(cw-free)/2));panY=used<ch-top-bottom?top+(ch-top-bottom-used)/2:Math.max(ch-bottom-used,Math.min(top,panY||top));}
  layer.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;layer.style.width=roomW()+'px';layer.style.height=roomH()+'px';dirty=true;
 }
 function drawRoom(){const grass=environment(state(),game.data.config).season.grass;if(grass!==bgGrass){bgGrass=grass;dirty=true;}if(!dirty)return;dirty=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bgGrass;ctx.fillRect(0,0,cw,ch);if(grassImg){const pat=ctx.createPattern(grassImg,'repeat');pat.setTransform(new DOMMatrix().translate(panX,panY).scale(scale*.5));ctx.fillStyle=pat;ctx.globalAlpha=bgGrass==='#8fd06a'||bgGrass==='#5fae3a'?1:.45;ctx.fillRect(0,0,cw,ch);ctx.globalAlpha=1;}ctx.setTransform(scale,0,0,scale,panX,panY);ctx.imageSmoothingQuality='high';ctx.drawImage(roomCanvas,0,0);}
 function spriteFor(item){
  if(item.decoration){const t=item.type;if(hasDecorModel(t))return {src:`./assets/decor-v22/${t}.svg`,width:decorDefinition(item)?.wall?.9:1.2};if(t==='carpet')return {src:`./assets/art-v11/carpet-lv${Math.min(level,5)}.webp`,width:3.8,ground:true};return {src:`${ISO}decor-${t}.webp`,width:DECOR_WIDTH[t]||1.3};}
  return {src:shelfKind(item)==='limited-armory'?'./assets/icons-v12/rack-limited-armory.webp':`${ISO}rack-${shelfKind(item)}.webp`,width:RACK_WIDTH};
 }
 function placeItem(el,item,x,z,w,ground){const special=specialDecorPose(item,level);if(special){x=special.x;z=special.z;}const p=P(x,z);if(special)p.Y-=special.y*U;const flip=(item.rotation||0)%180?-1:1;if(ground){const side=w*U/1.414;el.style.width=side+'px';el.style.height=side*.7+'px';el.style.left=p.X+'px';el.style.top=p.Y+'px';el.style.zIndex=1;el.style.transform=`translate(-50%,-50%) scaleY(.5) rotate(45deg) rotate(${item.rotation||0}deg)`;}else{const px=w*U;el.style.width=px+'px';el.style.height='';el.style.left=p.X-px/2+'px';el.style.top=p.Y+HH*.9+'px';el.style.zIndex=Math.round(100+(x+z)*60);el.style.transform=`translateY(-100%) scaleX(${flip})`;if(item.mount){el.style.transform=`translateY(-100%) skewY(${['left','right'].includes(item.mount.split('-')[0])?-26.565:26.565}deg)`;el.style.filter='drop-shadow(1px 2px 1px #4a2e1c66)';}}}
 function syncItems(){
  const s=state(),ids=new Set(furniture(s).map(i=>i.id)),gardenCount=(s.decorations||[]).filter(d=>d.garden).length;if(gardenCount!==lastGardenCount){lastGardenCount=gardenCount;if(gardenCount)userZoom=Math.min(userZoom,1);fit();}
  for(const[id,v]of items)if(!ids.has(id)){v.el.remove();items.delete(id);}
  if(selected&&!ids.has(selected)){selectShelf(null);mode='play';metrics.mode=mode;onModeChange(mode);}
  for(const item of furniture(s)){const sp=spriteFor(item);let v=items.get(item.id);if(!v||v.src!==sp.src){v?.el.remove();const el=new Image();el.src=sp.src;el.alt='';el.className='world2d-item'+(sp.ground?' ground':'');el.draggable=false;layer.append(el);v={el,src:sp.src,sp};items.set(item.id,v);}
   const moving=drag?.id===item.id&&drag.moved,shown=moving&&(item.mount||item.garden)?previewPose(item,drag):item;placeItem(v.el,shown,moving?drag.x:item.x,moving?drag.z:item.z,sp.width,sp.ground);v.el.classList.toggle('selected',selected===item.id);
   if(!item.decoration){const cap=shelfCapacity(item),avail=stockCount(game.available(s,item),cap);v.el.classList.toggle('empty',avail<=0);metrics.shelves||={};metrics.shelves[item.id]={stock:item.stock,available:avail,capacity:cap};}}
 }
 function ensureActor(key,d,type){
  const id=type==='manager'?'manager':type==='customer'&&d.customerType?`customer-${d.customerType}-${d.variant||'m'}`:d.spiritId;let a=actors.get(key);if(a&&a.id===id)return a;if(a){a.el.remove();actors.delete(key);}
  const box=document.createElement('div');box.className='world2d-actor';const img=new Image();img.alt='';img.draggable=false;
  const card=type==='manager'?'':spiritArtPath(id);img.src=type==='manager'?SPRITES+'manager-front.webp':id.startsWith('customer-')?`./assets/customers/${id.slice(9)}.gif`:`./assets/staff-gifs/${id}.gif`;img.onerror=()=>{if(card&&!img.src.includes(card.split('/').pop())){box.classList.add('use-card');img.src=card;}};
  const shadow=document.createElement('i');box.append(shadow,img);layer.append(box);a={id,el:box,img,type,pos:{x:d.x||0,z:d.z||0},flip:1,moveUntil:0,height:ACTOR_SIZE};actors.set(key,a);metrics.actors=actors.size;return a;
 }
 /* 主管依行走方向換圖；側面圖面向右，往左時由 flip 翻轉。GIF 還沒到位時用靜態圖 */
 function setManagerImage(a,walking){const face=a.facing||'front',name=walking?'manager-'+face:face==='front'?'manager-idle':'manager-'+face+'-still';if(a.imageName===name)return;a.imageName=name;const still=name.endsWith('-still');a.img.onerror=()=>{a.img.onerror=null;a.img.src=SPRITES+(walking?name:'manager-'+face)+'.webp';};a.img.src=SPRITES+(still?'manager-'+face+'.webp':name+'.gif');a.img.onerror=still?null:a.img.onerror;}
 function syncActors(dt){
  const s=state(),all=[...visibleStaff(s.staff||s.employees||[]).map(d=>[d.id,d,'staff']),...(s.customers||[]).map(d=>[d.id,d,'customer'])];if(s.manager)all.push(['manager',mode==='follow'?s.manager:{id:'manager',x:CHECKOUT.x,z:1},'manager']);if(s.promoter)all.push(['promoter',{id:'promoter',spiritId:s.promoter.id,...promoterPoint()},'promoter']);
  if(game.motionFrame?.time!==motionStamp){motionStamp=game.motionFrame?.time;motionProgress=0;}motionProgress=Math.min(1,motionProgress+dt*(s.speed||1)/(game.motionFrame?.duration||.25));
  const moods=[],staffRows=[],active=new Set();
  for(const[key,d,type]of all){active.add(key);const a=ensureActor(key,d,type),trail=type==='manager'&&mode!=='follow'||type==='promoter'?null:game.motionFrame?.trails.get(key),p=type==='customer'&&(d.arrivalRemaining>0||d.arrivingNow||d.exitingAtDoor)?customerDisplayPoint(d,motionProgress,game.motionFrame?.duration||.25):trail?sampleTrail(trail,motionProgress):d,dx=p.x-a.pos.x,dz=p.z-a.pos.z,moved=dx*dx+dz*dz>.000001;a.pos={x:p.x,z:p.z};if(moved){a.moveUntil=time+.14;if(Math.abs(dx)>.002)a.flip=dx<0?-1:1;if(type==='manager')a.facing=Math.abs(dx)>Math.abs(dz)?'side':dz<0?'back':'front';}if(type==='manager')setManagerImage(a,time<a.moveUntil);
   const px=(type==='promoter'?2.4:type==='manager'?MANAGER_SIZE:ACTOR_SIZE)*U,leaving=1;a.el.style.width=px+'px';const q=P(p.x,p.z);a.el.style.left=q.X-px/2+'px';/* 主角在櫃台：腳踩在檯面後緣的高度，櫃台擋住下半身、露出上半身；巡店走近時平順移過去 */const deskPull=type==='manager'?(mode!=='follow'?1:Math.max(0,1-Math.hypot(p.x-CHECKOUT.x,p.z-1)/1.2)):0,deskFeet=P(CHECKOUT.x,2).Y+HH*.9-COUNTER_WIDTH*U*.4,feet=q.Y+HH*.6;a.el.style.top=feet+(deskFeet-feet)*deskPull-px+'px';if(deskPull>0)a.el.style.left=q.X-px/2-HW*1.3*deskPull+'px';a.el.style.zIndex=Math.max(2,Math.round(100+(p.x+p.z)*60+30));a.screen={X:q.X,Y:q.Y+HH*.6,w:px};a.img.style.transform=`scaleX(${a.flip}) scale(${leaving})`;const victory=chasePose(time-chaseStarted),celebrating=type==='manager'&&victory.active;a.el.classList.toggle('chase-celebrating',celebrating);if(celebrating)a.img.style.transform+=` translateY(${-victory.hop*U}px) rotate(${victory.lean}rad)`;if(type==='promoter'&&!a.flyer){a.flyer=document.createElement('span');a.flyer.className='promoter-flyer';a.flyer.textContent='初光商會';a.el.append(a.flyer);}a.el.classList.toggle('walking',time<a.moveUntil);a.el.classList.toggle('carrying',type==='staff'&&d.workTask?.phase==='carry');
   const emotion=stateEmotion(type,d,s),issue=type==='customer'?getCustomerComplaint(s,d,game):null,chase=type==='customer'&&s.customerChase?.customerId===d.id;
   if(emotion||issue||chase){const ev=s.event,related=!!ev&&(type==='staff'&&eventEmployee(s,ev)?.id===d.id||type==='customer'&&ev.description?.includes(d.name)&&['Angry','OutOfStock','Queue','UnhappyExit'].includes(d.state)),head=toScreen(p.x,p.z,ACTOR_SIZE*.95);moods.push({id:key,kind:chase?'impatient':emotion||'impatient',...(chase?{complaintId:d.id,complaintTitle:'🏃 追上我',chaseTarget:true}:issue?{complaintId:d.id,complaintTitle:issue.title}:related?{eventId:ev.instanceId||ev.id,eventTitle:ev.title}:{}),x:head.x,y:head.y,inFront:true});}
   if(type==='staff'){const head=toScreen(p.x,p.z,ACTOR_SIZE*.9);staffRows.push({id:key,x:head.x,y:head.y});}}
  for(const[key,a]of actors)if(!active.has(key)){a.el.remove();actors.delete(key);}metrics.actors=actors.size;metrics.staffPositions=staffRows;
  if(frame++%2===0){onActorVisuals({actors:moods,notices:(s.visualEvents||[]).map(n=>({id:n.id,targetId:n.targetId,text:n.text,tone:n.tone}))});onStaffPositions(staffRows);}
  if(s.manager&&mode==='follow'){const open=document.querySelector('dialog[open]'),ix=open?0:joystick.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),iy=open?0:joystick.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);game.setManagerInput(ix,iy);fit();}
 }
 function headOf(item){if(!item)return null;const sp=spriteFor(item);return toScreen(item.x,item.z,(sp.ground?.3:sp.width*1.1)+(specialDecorPose(item,level)?.y||0));}
 function update(dt){if(!alive)return;dt=Math.min(dt,.1);time+=dt;const l=Math.min(state().level||1,5);if(l!==level){level=l;buildRoom(l);}syncItems();syncActors(dt);drawCells();if(placement)refreshPlacement();else if(selected)onFurniturePosition(headOf(furniture().find(i=>i.id===selected)));drawRoom();const env=environment(state(),game.data.config);envLayer.draw(env,dt);metrics.environment={slot:env.slot,weather:env.weather,season:env.season.id};metrics.frames++;}
 /* 擺放 */
 const clearGhost=()=>{ghost?.remove();ghost=null;};
 function cancelPlacement(){clearGhost();placement=null;metrics.placement=null;onPlacementChange(null);onFurnitureSelect(null);}
 function refreshPlacement(){if(!placement)return;const r=game.placementStatus(placement),item={...placement,decoration:placement.decoration},sp=spriteFor(placement.decoration?{...item}:{...item,type:placement.type});if(ghost){placeItem(ghost,item,placement.x,placement.z,sp.width,sp.ground);ghost.classList.toggle('bad',!r.ok);}metrics.placement={...placement,...r};onPlacementChange(metrics.placement);onFurniturePosition(headOf(placement));}
 function placementPoint(item,p){const snap=item.decoration&&decorDefinition(item)?.ground?2:item.decoration&&decorDefinition(item)?.outdoor&&p.z>=dimensions(state().level).height+.5?4:1;const raw={x:Math.round(p.x*snap)/snap,z:Math.round(p.z*snap)/snap,rotation:item.rotation};if(WALL_TYPES.has(item.type)){return resolveDecorPlacement(item,raw,state().level);}return raw;}
 function previewPose(item,p){try{return {...item,...resolveDecorPlacement(item,{x:p.x,z:p.z,rotation:p.rotation},state().level)};}catch{return {...item,x:p.x,z:p.z};}}
 function beginShelfPlacement(type,shelfId){const decoration=decorTypes.some(t=>t.id===type),kind=(decoration?decorTypes:shelfTypes).find(t=>t.id===type);if(!kind)return {ok:false,message:'貨架類型無效'};if((state().phase==='open'&&!state().layoutPause))return {ok:false,message:'請先打烊再放置貨架'};cancelPlacement();api.setMode('decorate');selectShelf(null);placement={type,shelfId,decoration,x:3,z:4,rotation:0};if(kind.wall)Object.assign(placement,wallSlots(state().level,true)[0]);const sp=spriteFor(decoration?{type,decoration:true}:{type});clearGhost();ghost=new Image();ghost.src=sp.src;ghost.className='world2d-item ghost'+(sp.ground?' ground':'');layer.append(ghost);onFurnitureSelect({...placement,id:'__new__',isPlacement:true});refreshPlacement();if(kind.outdoor){userZoom=Math.min(userZoom,.9);fit();}return {ok:true,message:kind.wall?'直接點牆面空白處，再按 ✓ 掛放':'點室內地板或門外兩側花園，再按 ✓ 放置'};}
 function confirmPlacement(){if(!placement)return {ok:false,message:'沒有待放置貨架'};const p={...placement},result=game.act(p.decoration?'placeDecor':p.shelfId?'placeShelf':'addShelf',p.decoration?{...p,decorId:p.shelfId}:p);if(result.ok){cancelPlacement();selectShelf(null);mode='play';metrics.mode=mode;showGrid();onModeChange(mode);}onActionResult(result);return result;}
 function selectShelf(id,unlock=false){if(id!==selected)unlocked=false;if(unlock)unlocked=true;metrics.selectionLocked=!!id&&!unlocked;if(id!==selected){const o=furniture().find(i=>i.id===id);snapshot=o?{id:o.id,x:o.x,z:o.z,rotation:o.rotation||0}:null;}selected=id;metrics.selection=id;onFurnitureSelect(id?{...furniture().find(i=>i.id===id),lockedOnly:!unlocked}:null);if(id)onFurniturePosition(headOf(furniture().find(i=>i.id===id)));}
 function cancelEdit(){if(placement){cancelPlacement();return {ok:true,message:'已取消放置，貨架保留於收納'};}if(!selected)return {ok:true,message:'沒有選取貨架'};const result=game.act(furniture().find(d=>d.id===selected)?.decoration?'storeDecor':'storeShelf',{shelfId:selected,decorId:selected});if(result.ok){selectShelf(null);snapshot=null;}onActionResult(result);return result;}
 function editShelf(dx=0,dz=0,rotation=0){if(!placement&&!unlocked)return {ok:false,message:'請再點一次已鎖定物件，才能編輯'};if(placement){placement.rotation=(placement.rotation+rotation+360)%360;refreshPlacement();return {ok:true};}const sh=furniture().find(i=>i.id===selected);if(!sh)return {ok:false,message:'請先點選貨架'};const result=game.act(sh.decoration?'moveDecor':'moveShelf',{shelfId:sh.id,decorId:sh.id,x:sh.x+dx,z:sh.z+dz,rotation:((sh.rotation||0)+rotation+360)%360});selectShelf(sh.id);return result;}
 const showGrid=()=>layer.classList.toggle('show-grid',mode==='decorate');
 /* 點選與手勢 */
 function pick(e){const q=toRoom(e.clientX,e.clientY);for(const[key,a]of [...actors].sort((m,n)=>(n[1].pos.x+n[1].pos.z)-(m[1].pos.x+m[1].pos.z))){const b=a.screen;if(b&&Math.abs(q.X-b.X)<b.w*.35&&q.Y<b.Y&&q.Y>b.Y-b.w*.9)return {type:a.type,id:key};}
  let best=null,bestDepth=-1;for(const item of furniture()){const sp=spriteFor(item),p=P(item.x,item.z);p.Y-=(specialDecorPose(item,level)?.y||0)*U;const w=sp.width*U*.45,h=sp.ground?HH*2:sp.width*U*1.1;if(Math.abs(q.X-p.X)<w&&q.Y<p.Y+HH&&q.Y>p.Y-h){const depth=sp.ground?-1:item.x+item.z;if(depth>bestDepth){best={type:'shelf',id:item.id};bestDepth=depth;}}}return best;}
 const pinch=()=>{const p=[...touches.values()].slice(0,2);if(p.length<2)return null;return {distance:Math.max(8,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y))};};
 const lockedView=()=>!!selected||!!placement;
 function pointerDown(e){canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){gesture=lockedView()?null:pinch();down=null;drag=null;return;}}if(placement){down={placing:true,pointerType:e.pointerType};const p=fromScreen(e.clientX,e.clientY);Object.assign(placement,placementPoint(placement,p));refreshPlacement();return;}down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,button:e.button};const found=pick(e);if(found?.type==='shelf'){if(selected!==found.id){down.candidate=found.id;return;}if((state().phase==='open'&&!state().layoutPause)){selectShelf(found.id,true);down.lockOnly=true;return;}mode='decorate';game.setManagerActive(false);metrics.mode=mode;showGrid();onModeChange(mode);selectShelf(found.id,true);const sh=furniture().find(i=>i.id===found.id),p=fromScreen(e.clientX,e.clientY,sh);drag={...sh,moved:false,offsetX:sh.x-p.x,offsetZ:sh.z-p.z};}}
 function pointerMove(e){if(e.pointerType==='touch'&&touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){if(lockedView()){gesture=null;return;}const next=pinch();if(gesture&&next){userZoom=Math.max(.8,Math.min(3,userZoom*next.distance/gesture.distance));fit();}gesture=next;return;}}if(placement){const p=fromScreen(e.clientX,e.clientY);Object.assign(placement,placementPoint(placement,p));refreshPlacement();return;}if(!down||down.lockOnly)return;if(drag){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)drag.moved=true;const p=fromScreen(e.clientX,e.clientY);if(drag.moved){Object.assign(drag,placementPoint(drag,{x:p.x+drag.offsetX,z:p.z+drag.offsetZ}));}}else if(!lockedView()&&mode!=='follow'){panX+=e.clientX-down.lx;panY+=e.clientY-down.ly;fit();}down.lx=e.clientX;down.ly=e.clientY;}
 function pointerUp(e){if(e.pointerType==='touch'){touches.delete(e.pointerId);if(gesture){gesture=null;down=null;drag=null;return;}}if(!down)return;if(down.lockOnly){down=null;return;}const near=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(down.candidate&&near<7){selectShelf(down.candidate);onActionResult({ok:true,message:'貨架已選取；點空白處解除，或再點一次開始移動'});down=null;return;}if(down.placing){if(down.pointerType!=='touch')confirmPlacement();down=null;return;}if(drag){const id=drag.id;if(drag.moved){const r=game.act(drag.decoration?'moveDecor':'moveShelf',{shelfId:id,decorId:id,x:drag.x,z:drag.z,rotation:drag.rotation});if(!r.ok)onActionResult(r);}drag=null;selectShelf(id);}else if(near<5&&down.button===0){const hit=pick(e);if(hit){if(mode==='decorate'&&hit.type==='shelf')selectShelf(hit.id);else onSelect(hit);}else if(selected||mode==='decorate')selectShelf(null);else if(mode==='follow'){const p=fromScreen(e.clientX,e.clientY);game.act('moveManager',{x:Math.round(p.x),z:Math.round(p.z)});}}down=null;}
 const wheel=e=>{e.preventDefault();if(lockedView())return;userZoom=Math.max(.8,Math.min(3,userZoom-e.deltaY*.001));fit();};
 const keyDown=e=>{if(e.key==='Escape'&&placement){cancelPlacement();return;}if(e.key.toLowerCase()==='r'&&placement){placement.rotation=(placement.rotation+90)%360;refreshPlacement();return;}if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;if(mode==='follow'&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys.add(e.key);e.preventDefault();}};
 const keyUp=e=>keys.delete(e.key),context=e=>e.preventDefault(),blur=()=>{keys.clear();joystick={x:0,y:0};game.setManagerInput(0,0);down=null;drag=null;gesture=null;touches.clear();};
 const listeners=[['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',blur],['contextmenu',context]];
 for(const[n,f]of listeners)canvas.addEventListener(n,f);canvas.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
 const resize=()=>fit(),observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);window.addEventListener('resize',resize);
 const api={
  /* 進化仍是 3D 演出，要用時才載入模型 */
  evolutionActor(path){assets3d||=createAssets(globalThis.THREE,metrics);return assets3d.actor(path,3,{footprint:99,diameter:99});},
  playChaseSuccess,update,resize,ready:Promise.all([grassReady,buildRoom(level=Math.min(state().level||1,5))]),metrics,setQuality(q){metrics.quality=q;},selectShelf,editShelf,beginShelfPlacement,confirmPlacement,cancelPlacement,cancelEdit,
  projectShelf(id){const i=furniture().find(x=>x.id===id);return i?toScreen(i.x,i.z):null;},projectShelfHead(id){return headOf(furniture().find(x=>x.id===id));},projectCell(x,z,y=0){return toScreen(x,z,y);},
  setMode(m){if(m==='follow'&&lockedView())return {ok:false,message:'請先完成貨架調整或點空白處取消選取，再切換主管巡店'};if(m!=='decorate')cancelPlacement();const result=game.setManagerActive(m==='follow');if(!result.ok){onActionResult(result);return result;}mode=m;keys.clear();joystick={x:0,y:0};game.setManagerInput(0,0);metrics.mode=m;metrics.managerVisible=m==='follow';showGrid();if(m!=='decorate')selectShelf(null);panX=0;panY=0;fit();onModeChange(m);return result;},
  setJoystick(x,y){joystick={x,y};},rotate(){return false;},zoom(delta=1){if(lockedView())return false;userZoom=Math.max(1,Math.min(2.6,userZoom-delta*.1));fit();return true;},setGestureMode(){return 'pan';},get gestureMode(){return 'pan';},get cameraLocked(){return lockedView();},get cameraPose(){return {scale,panX,panY};},
  dispose(){alive=false;envLayer.dispose();cancelPlacement();observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);for(const[n,f]of listeners)canvas.removeEventListener(n,f);canvas.removeEventListener('wheel',wheel);layer.remove();}
 };
 return api;
}
