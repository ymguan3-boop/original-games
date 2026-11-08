import {visibleStaff,chasePose} from './shop-presentation.js?v=20261108-b1';
/* 初光商會 2D 場景：對外介面與 3D 的 createScene 相同，遊戲邏輯、選單與存檔都不需要更動。
 * 視角是 2.5D 等角：地板是菱形格，後方左右兩面牆都看得到；x 往右下、z 往左下。
 * 地板、牆面與店外庭院畫進背景，貨架、家具與角色是依 x+z 排序的 DOM 圖片，GIF 才能持續播放。 */
import {decorTypes,decorDefinition} from './decorations.js?v=20261108-b1';
import {ENTRANCE,dimensions} from './nav.js?v=20261108-b1';
import {sampleTrail} from './motion.js?v=20261108-b1';
import {getCustomerComplaint} from './customer-complaints.js?v=20261108-b1';
import {eventEmployee} from './patrol-events.js?v=20261108-b1';
import {shelfTypes,shelfKind,shelfCapacity,shelfDefinition} from './furniture.js?v=20261108-b1';
import {stockCount} from './shelf-products.js?v=20261108-b1';
import {createAssets} from './asset-resolver.js?v=20261108-b1';
import {createPlacementCells} from './placement-cells.js?v=20261108-a2';
import {environment} from './environment.js?v=20261108-b4';
import {createEnvironment2D} from './environment-2d.js?v=20261108-b5';
import {spiritArtPath} from './spirit-cards.js?v=20261108-b1';

const U=64,HW=U*.5,HH=U*.25,WALL=2.6*U,MARGIN=U*1.1,SPRITES='./assets/sprites-v1/',ISO='./assets/iso-v1/',COUNTER_FLIP=true,SLANT=Math.hypot(HW,HH);
/* 各等級的牆面飾條與柱子配色，參考使用者提供的五階店面 */
const TRIM=[null,{base:'#7a5634',top:'#8a6a4a',pillar:'#9a8f86',cap:'#b7aca2'},{base:'#a2663b',top:'#c58a3c',pillar:'#d79a3a',cap:'#f2c35a'},{base:'#a2663b',top:'#d6a03c',pillar:'#e0a53a',cap:'#fbd46a'},{base:'#8d5a2e',top:'#e3b34a',pillar:'#e8b23e',cap:'#ffe08a'},{base:'#a3322c',top:'#f0c24c',pillar:'#c8302a',cap:'#ffd75a'}];
const RACK_WIDTH=2.3,ACTOR_SIZE=1.45,DECOR_WIDTH={sofa:2.2,plant:1.5,'lucky-cat':1.5,fountain:2.3,artwork:1.8,phoenix:1.7};
const loadImage=src=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>ok(null);i.src=src;});
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
 let bgGrass='#8fc56b',windowSpots=[];const envLayer=createEnvironment2D({world:canvas,getView:()=>{const x0=X0(),y0=Y0(),c=(x,z)=>({X:x0+(x-z)*HW,Y:y0+(x+z)*HH}),a=c(0,0),r=c(dim.width,0),b=c(dim.width,dim.height),l=c(0,dim.height);return {panX,panY,scale,poly:[{X:a.X,Y:a.Y-WALL},{X:r.X,Y:r.Y-WALL},r,b,l,{X:l.X,Y:l.Y-WALL}],windows:windowSpots};}});
 const roomCanvas=document.createElement('canvas'),cellCanvas=document.createElement('canvas');cellCanvas.className='world2d-cells';layer.prepend(cellCanvas);const cellsFor=createPlacementCells(game);let cellKey='';
 /* 布置模式：擺放時綠格可放、紅格不可放；只選取物件時顯示淡格線 */
 function drawCells(){const want=mode==='decorate'?(placement?'p':'g'):'';const list=placement?cellsFor(placement):[],k=want+(placement?list.length+':'+list.filter(c=>c.ok).length+':'+placement.type+placement.rotation:'')+dim.width+'x'+dim.height;if(k===cellKey)return;cellKey=k;cellCanvas.width=roomW();cellCanvas.height=roomH();const g=cellCanvas.getContext('2d');g.clearRect(0,0,cellCanvas.width,cellCanvas.height);if(!want)return;for(let z=0;z<dim.height;z++)for(let x=0;x<dim.width;x++){const c=placement?list.find(v=>v.x===x&&v.z===z):null,p=P(x,z);g.beginPath();g.moveTo(p.X,p.Y-HH+1);g.lineTo(p.X+HW-2,p.Y);g.lineTo(p.X,p.Y+HH-1);g.lineTo(p.X-HW+2,p.Y);g.closePath();if(c){g.fillStyle=c.ok?'#4fc38a66':'#f05e5340';g.fill();}g.strokeStyle=c?.ok?'#2f9a63aa':'#7eaa5588';g.lineWidth=1.2;g.stroke();}}const items=new Map(),actors=new Map(),keys=new Set(),touches=new Map();
 let level=0,dim={width:14,height:12},mode='play',alive=true,time=0,scale=1,panX=0,panY=0,userZoom=typeof innerHeight==='number'&&innerHeight>innerWidth?1.45:1.1,cw=1,ch=1,selected=null,unlocked=false,placement=null,ghost=null,snapshot=null,down=null,drag=null,gesture=null,joystick={x:0,y:0},motionStamp=-1,motionProgress=1,frame=0,dirty=true,assets3d=null;
 let chaseStarted=-100;
 function playChaseSuccess(){chaseStarted=time;metrics.chaseCelebrations=(metrics.chaseCelebrations||0)+1;}
 const furniture=(s=state())=>[...s.shelves,...(s.decorations||[])];
 const roomW=()=>(dim.width+dim.height)*HW+MARGIN*2,roomH=()=>(dim.width+dim.height)*HH+WALL+MARGIN*2.4;
 const X0=()=>MARGIN+dim.height*HW,Y0=()=>MARGIN+WALL;
 /* 格子座標（格子中心為整數）→ 背景畫布座標 */
 const P=(x,z)=>({X:X0()+(x-z)*HW,Y:Y0()+(x+z+1)*HH});
 const toScreen=(x,z,h=0)=>{const p=P(x,z);return {x:panX+p.X*scale,y:panY+(p.Y-h*U)*scale};};
 const toRoom=(cx,cy)=>{const r=canvas.getBoundingClientRect();return {X:(cx-r.left-panX)/scale,Y:(cy-r.top-panY)/scale};};
 function fromScreen(cx,cy){const q=toRoom(cx,cy),a=(q.X-X0())/HW,b=(q.Y-Y0())/HH;return {x:(a+b-1)/2,z:(b-a-1)/2};}
 async function buildRoom(l){
  const tag=++metrics.roomBuild||(metrics.roomBuild=1);dim=dimensions(l);roomCanvas.width=roomW();roomCanvas.height=roomH();
  const [floor,wall,win,banner,counter,door,plant]=await Promise.all([loadImage(`./assets/art-v11/floor-lv${l}.webp`),loadImage(`./assets/art-v11/wall-lv${l}.webp`),loadImage(SPRITES+'window.webp'),loadImage(SPRITES+'banner.webp'),loadImage(SPRITES+'counter.webp'),loadImage(SPRITES+'door.webp'),loadImage(SPRITES+'decor-plant.webp')]);
  if(tag!==metrics.roomBuild||!alive)return;
  const g=roomCanvas.getContext('2d'),Wd=dim.width,Hd=dim.height,x0=X0(),y0=Y0(),t=TRIM[Math.min(l,5)];g.clearRect(0,0,roomCanvas.width,roomCanvas.height);
  const corner=(x,z)=>({X:x0+(x-z)*HW,Y:y0+(x+z)*HH});const cR=corner(Wd,0),cL=corner(0,Hd),cB=corner(Wd,Hd);
  /* 店外石板路：從入口一路鋪到畫面下方 */
  const door0=corner(ENTRANCE.x+.5,Hd);g.fillStyle='#cbbca6';for(let i=0;i<7;i++){const yy=door0.Y+18+i*26,xx=door0.X-i*10+(i%2?8:-8);g.beginPath();g.ellipse(xx,yy,26,11,0,0,7);g.fill();g.strokeStyle='#9e8f7a';g.lineWidth=2;g.stroke();}
  /* 地板（菱形）與前緣木板邊 */
  g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);g.beginPath();g.rect(0,0,Wd,Hd);g.clip();if(floor){const pat=g.createPattern(floor,'repeat');pat.setTransform(new DOMMatrix().scale(4/floor.width));g.fillStyle=pat;}else g.fillStyle='#e8d6b2';g.fillRect(0,0,Wd,Hd);g.restore();
  g.fillStyle=t.base;g.beginPath();g.moveTo(cR.X,cR.Y);g.lineTo(cB.X,cB.Y);g.lineTo(cL.X,cL.Y);g.lineTo(cL.X,cL.Y+12);g.lineTo(cB.X,cB.Y+12);g.lineTo(cR.X,cR.Y+12);g.closePath();g.fill();
  /* 兩面牆：右牆沿 z=0、左牆沿 x=0；左牆略暗，看起來有立體感 */
  const wallFace=(sx,len,shade)=>{g.save();g.setTransform(sx*HW,HH,0,1,x0,y0);g.beginPath();g.rect(0,-WALL,len,WALL);g.clip();if(wall){const pat=g.createPattern(wall,'repeat');pat.setTransform(new DOMMatrix().scale(3.2/wall.width,3.2*SLANT/wall.height));g.fillStyle=pat;}else g.fillStyle='#f6ead2';g.fillRect(0,-WALL,len,WALL);if(shade){g.fillStyle=`rgba(60,36,20,${shade})`;g.fillRect(0,-WALL,len,WALL);}
   g.fillStyle=t.base;g.fillRect(0,-16,len,16);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,-4,len,4);g.fillStyle=t.top;g.fillRect(0,-WALL,len,10);g.restore();};
  wallFace(1,Wd,0);wallFace(-1,Hd,.1);
  /* 牆上的窗與旗：sx=1 右牆、-1 左牆 */
  windowSpots=[];const onWall=(img,sx,u,w,hFrac,isWin)=>{if(!img)return;const hpx=w*SLANT*img.height/img.width;g.save();g.setTransform(sx*HW,HH,0,1,x0,y0);g.drawImage(img,u-w/2,-WALL*hFrac-hpx/2,w,hpx);g.restore();if(isWin){const b=corner(sx>0?u:0,sx>0?0:u);windowSpots.push({X:b.X,Y:b.Y,ax:sx*HW*w*.4,ay:HH*w*.4,ix:sx>0?-HW:HW,iy:HH});}};
  for(let u=2.5;u<Wd-1;u+=4)onWall(win,1,u,2.6,.55,true);for(let u=4.5;u<Wd-1;u+=4)onWall(banner,1,u,1,.6,false);
  for(let u=3;u<Hd-1;u+=4.5)onWall(win,-1,u,2.6,.55,true);if(l>=2)for(let u=5.2;u<Hd-1;u+=4.5)onWall(banner,-1,u,1,.6,false);
  /* 三根柱子：轉角與兩端 */
  const pillar=(p,h=WALL+14)=>{g.fillStyle=t.pillar;g.fillRect(p.X-9,p.Y-h,18,h);g.fillStyle='rgba(0,0,0,.15)';g.fillRect(p.X+2,p.Y-h,7,h);g.fillStyle=t.cap;g.fillRect(p.X-12,p.Y-h-10,24,12);if(l>=5){g.fillStyle='#6fd3ff';g.beginPath();g.moveTo(p.X,p.Y-h-34);g.lineTo(p.X+9,p.Y-h-18);g.lineTo(p.X,p.Y-h-8);g.lineTo(p.X-9,p.Y-h-18);g.closePath();g.fill();}};
  pillar(corner(0,0));pillar(cR);pillar(cL);
  /* 入口迎賓墊與店外盆栽 */
  g.save();g.setTransform(HW,HH,-HW,HH,x0,y0);g.fillStyle='#fff3cf';g.fillRect(ENTRANCE.x-.6,Hd-1.05,2.2,1);g.fillStyle='#c35a3a';g.fillRect(ENTRANCE.x-.45,Hd-.95,1.9,.8);g.restore();
  if(plant){for(const[px,pz]of[[ENTRANCE.x-1.6,Hd+.8],[ENTRANCE.x+3.4,Hd+.8],[Wd+.8,Hd-2],[-1,Hd-3]]){const p=P(px,pz),w=U*1.1,h=w*plant.height/plant.width;g.drawImage(plant,p.X-w/2,p.Y-h+HH,w,h);}}
  layer.querySelector('.world2d-counter')?.remove();if(counter){const el=new Image();el.src=ISO+'counter.webp';el.alt='';el.className='world2d-item world2d-counter';layer.append(el);placeItem(el,{rotation:COUNTER_FLIP?180:0},10,2,3.6);metrics.counter=true;}
  metrics.projection='isometric';dirty=true;fit();
 }
 function fit(){
  const r=canvas.getBoundingClientRect();cw=Math.max(1,r.width);ch=Math.max(1,r.height);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  const full=r.height>innerHeight*.9,top=50,bottom=full?64:6,base=Math.min(cw/roomW(),(ch-top-bottom)/roomH());scale=base*userZoom;
  if(mode==='follow'&&state().manager){scale=Math.max(base,.9)*userZoom;const m=actors.get('manager')?.pos||state().manager,q=P(m.x,m.z);panX=cw/2-q.X*scale;panY=ch/2-q.Y*scale;}
  else{const free=roomW()*scale,used=roomH()*scale;panX=Math.max(Math.min(0,cw-free),Math.min(free<cw?(cw-free)/2:0,panX||(cw-free)/2));panY=used<ch-top-bottom?top+(ch-top-bottom-used)/2:Math.max(ch-bottom-used,Math.min(top,panY||top));}
  layer.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;layer.style.width=roomW()+'px';layer.style.height=roomH()+'px';dirty=true;
 }
 function drawRoom(){const grass=environment(state(),game.data.config).season.grass;if(grass!==bgGrass){bgGrass=grass;dirty=true;}if(!dirty)return;dirty=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=bgGrass;ctx.fillRect(0,0,cw,ch);ctx.setTransform(scale,0,0,scale,panX,panY);ctx.imageSmoothingQuality='high';ctx.drawImage(roomCanvas,0,0);}
 function spriteFor(item){
  if(item.decoration){const t=item.type;if(t==='carpet')return {src:`./assets/art-v11/carpet-lv${Math.min(level,5)}.webp`,width:3.8,ground:true};return {src:`${ISO}decor-${t}.webp`,width:DECOR_WIDTH[t]||1.3};}
  return {src:`${ISO}rack-${shelfKind(item)}.webp`,width:RACK_WIDTH};
 }
 function placeItem(el,item,x,z,w,ground){const p=P(x,z),flip=(item.rotation||0)%180?-1:1;if(ground){const side=w*U/1.414;el.style.width=side+'px';el.style.height=side*.7+'px';el.style.left=p.X+'px';el.style.top=p.Y+'px';el.style.zIndex=1;el.style.transform=`translate(-50%,-50%) scaleY(.5) rotate(45deg) rotate(${item.rotation||0}deg)`;}else{const px=w*U;el.style.width=px+'px';el.style.height='';el.style.left=p.X-px/2+'px';el.style.top=p.Y+HH*.9+'px';el.style.zIndex=Math.round(100+(x+z)*60);el.style.transform=`translateY(-100%) scaleX(${flip})`;}}
 function syncItems(){
  const s=state(),ids=new Set(furniture(s).map(i=>i.id));
  for(const[id,v]of items)if(!ids.has(id)){v.el.remove();items.delete(id);}
  if(selected&&!ids.has(selected)){selectShelf(null);mode='play';metrics.mode=mode;onModeChange(mode);}
  for(const item of furniture(s)){const sp=spriteFor(item);let v=items.get(item.id);if(!v||v.src!==sp.src){v?.el.remove();const el=new Image();el.src=sp.src;el.alt='';el.className='world2d-item'+(sp.ground?' ground':'');el.draggable=false;layer.append(el);v={el,src:sp.src,sp};items.set(item.id,v);}
   const moving=drag?.id===item.id&&drag.moved;placeItem(v.el,item,moving?drag.x:item.x,moving?drag.z:item.z,sp.width,sp.ground);v.el.classList.toggle('selected',selected===item.id);
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
  const s=state(),all=[...visibleStaff(s.staff||s.employees||[]).map(d=>[d.id,d,'staff']),...(s.customers||[]).map(d=>[d.id,d,'customer'])];if(s.manager)all.push(['manager',mode==='follow'?s.manager:{id:'manager',x:10,z:1},'manager']);if(s.promoter)all.push(['promoter',{id:'promoter',spiritId:s.promoter.id,x:ENTRANCE.x+2.6,z:dim.height+.7},'promoter']);
  if(game.motionFrame?.time!==motionStamp){motionStamp=game.motionFrame?.time;motionProgress=0;}motionProgress=Math.min(1,motionProgress+dt*(s.speed||1)/(game.motionFrame?.duration||.25));
  const moods=[],staffRows=[],active=new Set();
  for(const[key,d,type]of all){active.add(key);const a=ensureActor(key,d,type),trail=type==='manager'&&mode!=='follow'||type==='promoter'?null:game.motionFrame?.trails.get(key),p=trail?sampleTrail(trail,motionProgress):d,dx=p.x-a.pos.x,dz=p.z-a.pos.z,moved=dx*dx+dz*dz>.000001;a.pos={x:p.x,z:p.z};if(moved){a.moveUntil=time+.14;if(Math.abs(dx)>.002)a.flip=dx<0?-1:1;if(type==='manager')a.facing=Math.abs(dx)>Math.abs(dz)?'side':dz<0?'back':'front';}if(type==='manager')setManagerImage(a,time<a.moveUntil);
   const px=(type==='promoter'?2.4:ACTOR_SIZE)*U,leaving=type==='customer'&&d.state==='Leave'?Math.min(1,Math.max(.05,Math.hypot(d.x-ENTRANCE.x,d.z-ENTRANCE.z)/1.7)):1;a.el.style.width=px+'px';const q=P(p.x,p.z);a.el.style.left=q.X-px/2+'px';a.el.style.top=q.Y+HH*.6-px+'px';a.el.style.zIndex=Math.round(100+(p.x+p.z)*60+30);a.screen={X:q.X,Y:q.Y+HH*.6,w:px};a.img.style.transform=`scaleX(${a.flip}) scale(${leaving})`;const victory=chasePose(time-chaseStarted),celebrating=type==='manager'&&victory.active;a.el.classList.toggle('chase-celebrating',celebrating);if(celebrating)a.img.style.transform+=` translateY(${-victory.hop*U}px) rotate(${victory.lean}rad)`;a.el.classList.toggle('walking',time<a.moveUntil);a.el.classList.toggle('carrying',type==='staff'&&d.workTask?.phase==='carry');
   const emotion=stateEmotion(type,d,s),issue=type==='customer'?getCustomerComplaint(s,d,game):null,chase=type==='customer'&&s.customerChase?.customerId===d.id;
   if(emotion||issue||chase){const ev=s.event,related=!!ev&&(type==='staff'&&eventEmployee(s,ev)?.id===d.id||type==='customer'&&ev.description?.includes(d.name)&&['Angry','OutOfStock','Queue','UnhappyExit'].includes(d.state)),head=toScreen(p.x,p.z,ACTOR_SIZE*.95);moods.push({id:key,kind:chase?'impatient':emotion||'impatient',...(chase?{complaintId:d.id,complaintTitle:'🏃 追上我',chaseTarget:true}:issue?{complaintId:d.id,complaintTitle:issue.title}:related?{eventId:ev.instanceId||ev.id,eventTitle:ev.title}:{}),x:head.x,y:head.y,inFront:true});}
   if(type==='staff'){const head=toScreen(p.x,p.z,ACTOR_SIZE*.9);staffRows.push({id:key,x:head.x,y:head.y});}}
  for(const[key,a]of actors)if(!active.has(key)){a.el.remove();actors.delete(key);}metrics.actors=actors.size;metrics.staffPositions=staffRows;
  if(frame++%2===0){onActorVisuals({actors:moods,notices:(s.visualEvents||[]).map(n=>({id:n.id,targetId:n.targetId,text:n.text,tone:n.tone}))});onStaffPositions(staffRows);}
  if(s.manager&&mode==='follow'){const open=document.querySelector('dialog[open]'),ix=open?0:joystick.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),iy=open?0:joystick.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);game.setManagerInput(ix,iy);fit();}
 }
 function headOf(item){if(!item)return null;const sp=spriteFor(item);return toScreen(item.x,item.z,sp.ground?.3:sp.width*1.1);}
 function update(dt){if(!alive)return;dt=Math.min(dt,.1);time+=dt;const l=Math.min(state().level||1,5);if(l!==level){level=l;buildRoom(l);}syncItems();syncActors(dt);drawCells();if(placement)refreshPlacement();else if(selected)onFurniturePosition(headOf(furniture().find(i=>i.id===selected)));drawRoom();const env=environment(state(),game.data.config);envLayer.draw(env,dt);metrics.environment={slot:env.slot,weather:env.weather,season:env.season.id};metrics.frames++;}
 /* 擺放 */
 const clearGhost=()=>{ghost?.remove();ghost=null;};
 function cancelPlacement(){clearGhost();placement=null;metrics.placement=null;onPlacementChange(null);onFurnitureSelect(null);}
 function refreshPlacement(){if(!placement)return;const r=game.placementStatus(placement),item={...placement,decoration:placement.decoration},sp=spriteFor(placement.decoration?{...item}:{...item,type:placement.type});if(ghost){placeItem(ghost,item,placement.x,placement.z,sp.width,sp.ground);ghost.classList.toggle('bad',!r.ok);}metrics.placement={...placement,...r};onPlacementChange(metrics.placement);onFurniturePosition(headOf(placement));}
 function beginShelfPlacement(type,shelfId){const decoration=decorTypes.some(t=>t.id===type),kind=(decoration?decorTypes:shelfTypes).find(t=>t.id===type);if(!kind)return {ok:false,message:'貨架類型無效'};if((state().phase==='open'&&!state().layoutPause))return {ok:false,message:'請先打烊再放置貨架'};cancelPlacement();api.setMode('decorate');selectShelf(null);placement={type,shelfId,decoration,x:6,z:6,rotation:0};const sp=spriteFor(decoration?{type,decoration:true}:{type});clearGhost();ghost=new Image();ghost.src=sp.src;ghost.className='world2d-item ghost'+(sp.ground?' ground':'');layer.append(ghost);onFurnitureSelect({...placement,id:'__new__',isPlacement:true});refreshPlacement();return {ok:true,message:'點地板選位置，再按 ✓ 放置'};}
 function confirmPlacement(){if(!placement)return {ok:false,message:'沒有待放置貨架'};const p={...placement},result=game.act(p.decoration?'placeDecor':p.shelfId?'placeShelf':'addShelf',p.decoration?{...p,decorId:p.shelfId}:p);if(result.ok){cancelPlacement();selectShelf(null);mode='play';metrics.mode=mode;showGrid();onModeChange(mode);}onActionResult(result);return result;}
 function selectShelf(id,unlock=false){if(id!==selected)unlocked=false;if(unlock)unlocked=true;metrics.selectionLocked=!!id&&!unlocked;if(id!==selected){const o=furniture().find(i=>i.id===id);snapshot=o?{id:o.id,x:o.x,z:o.z,rotation:o.rotation||0}:null;}selected=id;metrics.selection=id;onFurnitureSelect(id?{...furniture().find(i=>i.id===id),lockedOnly:!unlocked}:null);if(id)onFurniturePosition(headOf(furniture().find(i=>i.id===id)));}
 function cancelEdit(){if(placement){cancelPlacement();return {ok:true,message:'已取消放置，貨架保留於收納'};}if(!selected)return {ok:true,message:'沒有選取貨架'};const result=game.act(furniture().find(d=>d.id===selected)?.decoration?'storeDecor':'storeShelf',{shelfId:selected,decorId:selected});if(result.ok){selectShelf(null);snapshot=null;}onActionResult(result);return result;}
 function editShelf(dx=0,dz=0,rotation=0){if(!placement&&!unlocked)return {ok:false,message:'請再點一次已鎖定物件，才能編輯'};if(placement){placement.rotation=(placement.rotation+rotation+360)%360;refreshPlacement();return {ok:true};}const sh=furniture().find(i=>i.id===selected);if(!sh)return {ok:false,message:'請先點選貨架'};const result=game.act(sh.decoration?'moveDecor':'moveShelf',{shelfId:sh.id,decorId:sh.id,x:sh.x+dx,z:sh.z+dz,rotation:((sh.rotation||0)+rotation+360)%360});selectShelf(sh.id);return result;}
 const showGrid=()=>layer.classList.toggle('show-grid',mode==='decorate');
 /* 點選與手勢 */
 function pick(e){const q=toRoom(e.clientX,e.clientY);for(const[key,a]of [...actors].sort((m,n)=>(n[1].pos.x+n[1].pos.z)-(m[1].pos.x+m[1].pos.z))){const b=a.screen;if(b&&Math.abs(q.X-b.X)<b.w*.35&&q.Y<b.Y&&q.Y>b.Y-b.w*.9)return {type:a.type,id:key};}
  let best=null,bestDepth=-1;for(const item of furniture()){const sp=spriteFor(item),p=P(item.x,item.z),w=sp.width*U*.45,h=sp.ground?HH*2:sp.width*U*1.1;if(Math.abs(q.X-p.X)<w&&q.Y<p.Y+HH&&q.Y>p.Y-h){const depth=sp.ground?-1:item.x+item.z;if(depth>bestDepth){best={type:'shelf',id:item.id};bestDepth=depth;}}}return best;}
 const pinch=()=>{const p=[...touches.values()].slice(0,2);if(p.length<2)return null;return {distance:Math.max(8,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y))};};
 const lockedView=()=>!!selected||!!placement;
 function pointerDown(e){canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){gesture=lockedView()?null:pinch();down=null;drag=null;return;}}if(placement){down={placing:true,pointerType:e.pointerType};const p=fromScreen(e.clientX,e.clientY);placement.x=Math.round(p.x);placement.z=Math.round(p.z);refreshPlacement();return;}down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,button:e.button};const found=pick(e);if(found?.type==='shelf'){if(selected!==found.id){down.candidate=found.id;return;}if((state().phase==='open'&&!state().layoutPause)){selectShelf(found.id,true);down.lockOnly=true;return;}mode='decorate';game.setManagerActive(false);metrics.mode=mode;showGrid();onModeChange(mode);selectShelf(found.id,true);const sh=furniture().find(i=>i.id===found.id),p=fromScreen(e.clientX,e.clientY);drag={...sh,moved:false,offsetX:sh.x-p.x,offsetZ:sh.z-p.z};}}
 function pointerMove(e){if(e.pointerType==='touch'&&touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){if(lockedView()){gesture=null;return;}const next=pinch();if(gesture&&next){userZoom=Math.max(.8,Math.min(3,userZoom*next.distance/gesture.distance));fit();}gesture=next;return;}}if(placement){const p=fromScreen(e.clientX,e.clientY);placement.x=Math.round(p.x);placement.z=Math.round(p.z);refreshPlacement();return;}if(!down||down.lockOnly)return;if(drag){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)drag.moved=true;const p=fromScreen(e.clientX,e.clientY);if(drag.moved){drag.x=Math.round(p.x+drag.offsetX);drag.z=Math.round(p.z+drag.offsetZ);}}else if(!lockedView()&&mode!=='follow'){panX+=e.clientX-down.lx;panY+=e.clientY-down.ly;fit();}down.lx=e.clientX;down.ly=e.clientY;}
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
  playChaseSuccess,update,resize,ready:Promise.resolve(),metrics,setQuality(q){metrics.quality=q;},selectShelf,editShelf,beginShelfPlacement,confirmPlacement,cancelPlacement,cancelEdit,
  projectShelf(id){const i=furniture().find(x=>x.id===id);return i?toScreen(i.x,i.z):null;},projectShelfHead(id){return headOf(furniture().find(x=>x.id===id));},projectCell(x,z,y=0){return toScreen(x,z,y);},
  setMode(m){if(m==='follow'&&lockedView())return {ok:false,message:'請先完成貨架調整或點空白處取消選取，再切換主管巡店'};if(m!=='decorate')cancelPlacement();const result=game.setManagerActive(m==='follow');if(!result.ok){onActionResult(result);return result;}mode=m;keys.clear();joystick={x:0,y:0};game.setManagerInput(0,0);metrics.mode=m;metrics.managerVisible=m==='follow';showGrid();if(m!=='decorate')selectShelf(null);panX=0;panY=0;fit();onModeChange(m);return result;},
  setJoystick(x,y){joystick={x,y};},rotate(){return false;},zoom(delta=1){if(lockedView())return false;userZoom=Math.max(1,Math.min(2.6,userZoom-delta*.1));fit();return true;},setGestureMode(){return 'pan';},get gestureMode(){return 'pan';},get cameraLocked(){return lockedView();},get cameraPose(){return {scale,panX,panY};},
  dispose(){alive=false;envLayer.dispose();cancelPlacement();observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);for(const[n,f]of listeners)canvas.removeEventListener(n,f);canvas.removeEventListener('wheel',wheel);layer.remove();}
 };
 return api;
}
