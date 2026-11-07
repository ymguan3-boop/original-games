/* 初光商會 2D 場景：對外介面與 3D 的 createScene 相同，遊戲邏輯、選單與存檔都不需要更動。
 * 視角是正面斜俯視：x 往右、z 往畫面下方，後牆朝向玩家；地板與牆面用材質貼圖畫進背景，
 * 貨架、家具與角色是依 z 排序的 DOM 圖片，GIF 才能在畫面上持續播放。 */
import {decorTypes,decorDefinition} from './decorations.js';
import {ENTRANCE,dimensions} from './nav.js';
import {sampleTrail} from './motion.js';
import {getCustomerComplaint} from './customer-complaints.js';
import {eventEmployee} from './patrol-events.js';
import {shelfTypes,shelfKind,shelfCapacity,shelfDefinition} from './furniture.js?v=20261107-a5';
import {stockCount} from './shelf-products.js?v=20261107-a5';
import {createAssets} from './asset-resolver.js?v=20261107-a5';
import {spiritArtPath} from './spirit-cards.js?v=20261107-a6';

const U=64,TILT=typeof innerHeight==='number'&&innerHeight>innerWidth?1.05:.72,V=U*TILT,WALL=2.5*U,MARGIN=U*.9,SPRITES='./assets/sprites-v1/';
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
 const roomCanvas=document.createElement('canvas');const items=new Map(),actors=new Map(),keys=new Set(),touches=new Map();
 let level=0,dim={width:14,height:12},mode='play',alive=true,time=0,scale=1,panX=0,panY=0,userZoom=1,cw=1,ch=1,selected=null,unlocked=false,placement=null,ghost=null,snapshot=null,down=null,drag=null,gesture=null,joystick={x:0,y:0},motionStamp=-1,motionProgress=1,frame=0,dirty=true,assets3d=null;
 const furniture=(s=state())=>[...s.shelves,...(s.decorations||[])];
 const roomW=()=>dim.width*U+MARGIN*2,roomH=()=>dim.height*V+WALL+MARGIN*2;
 const wx=x=>(x+.5)*U+MARGIN,wy=z=>(z+.5)*V+WALL+MARGIN;
 const toScreen=(x,z,h=0)=>({x:panX+wx(x)*scale,y:panY+(wy(z)-h*U)*scale});
 function fromScreen(cx,cy){const r=canvas.getBoundingClientRect();return {x:((cx-r.left-panX)/scale-MARGIN)/U-.5,z:((cy-r.top-panY)/scale-WALL-MARGIN)/V-.5};}
 async function buildRoom(l){
  const tag=++metrics.roomBuild||(metrics.roomBuild=1);dim=dimensions(l);roomCanvas.width=roomW();roomCanvas.height=roomH();
  const [floor,wall,win,banner,counter]=await Promise.all([loadImage(`./assets/art-v11/floor-lv${l}.webp`),loadImage(`./assets/art-v11/wall-lv${l}.webp`),loadImage(SPRITES+'window.webp'),loadImage(SPRITES+'banner.webp'),loadImage(SPRITES+'counter.webp')]);
  if(tag!==metrics.roomBuild||!alive)return;
  const g=roomCanvas.getContext('2d'),W=roomCanvas.width,H=roomCanvas.height,left=MARGIN,top=MARGIN,fw=dim.width*U,fh=dim.height*V;
  g.fillStyle='#8fc56b';g.fillRect(0,0,W,H);
  /* 地板：材質照傾斜比例壓扁，看起來才是往畫面裡鋪 */
  g.save();g.beginPath();g.rect(left,top+WALL,fw,fh);g.clip();g.translate(left,top+WALL);g.scale(1,Math.min(1,TILT));if(floor){g.fillStyle=g.createPattern(floor,'repeat');const k=U*5/floor.width;g.scale(k,k);g.fillRect(0,0,fw/k,fh/Math.min(1,TILT)/k);}g.restore();
  /* 後牆 */
  g.save();g.beginPath();g.rect(left,top,fw,WALL);g.clip();g.translate(left,top);if(wall){const k=U*4/wall.width;g.scale(k,k);g.fillStyle=g.createPattern(wall,'repeat');g.fillRect(0,0,fw/k,WALL/k);}g.restore();
  g.fillStyle='#a2663b';g.fillRect(left,top+WALL-14,fw,14);g.fillStyle='#6a3f22';g.fillRect(left,top+WALL-3,fw,8);g.fillRect(left,top,fw,6);
  const wallArt=(img,x,w)=>{if(!img)return;const h=w*img.height/img.width;g.drawImage(img,left+x-w/2,top+WALL*.46-h/2,w,h);};
  for(let x=2.5;x<dim.width;x+=4)wallArt(win,x*U,U*1.9);for(let x=4.5;x<dim.width-1;x+=4)wallArt(banner,x*U,U*.85);
  /* 地板陰影與側邊矮牆 */
  const shade=g.createLinearGradient(0,top+WALL,0,top+WALL+V);shade.addColorStop(0,'#3c241433');shade.addColorStop(1,'#3c241400');g.fillStyle=shade;g.fillRect(left,top+WALL,fw,V);
  g.fillStyle='#b77a45';g.fillRect(left-12,top,12,WALL+fh+12);g.fillRect(left+fw,top,12,WALL+fh+12);g.fillRect(left-12,top+WALL+fh,fw+24,14);g.fillStyle='#6a3f22';g.fillRect(left-12,top+WALL+fh+14,fw+24,5);
  /* 入口地墊 */
  const ex=wx(ENTRANCE.x),ey=wy(dim.height-1);g.fillStyle='#fff3cf';g.fillRect(ex-U,ey+V*.3,U*2,V*.72);g.fillStyle='#c35a3a';g.fillRect(ex-U+6,ey+V*.3+6,U*2-12,V*.72-12);
  layer.querySelector('.world2d-counter')?.remove();if(counter){const el=new Image();el.src=SPRITES+'counter.webp';el.alt='';el.className='world2d-item world2d-counter';layer.append(el);placeItem(el,{},10,2,4.4);metrics.counter=true;}
  dirty=true;fit();
 }
 function fit(){
  const r=canvas.getBoundingClientRect();cw=Math.max(1,r.width);ch=Math.max(1,r.height);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  const full=r.height>innerHeight*.9,top=50,bottom=full?64:6,base=Math.min(cw/roomW(),(ch-top-bottom)/roomH());scale=base*userZoom;
  if(mode==='follow'&&state().manager){scale=Math.max(base,.9)*userZoom;const m=actors.get('manager')?.pos||state().manager;panX=cw/2-wx(m.x)*scale;panY=ch/2-wy(m.z)*scale;}
  else{const free=roomW()*scale,used=roomH()*scale;panX=Math.max(Math.min(0,cw-free),Math.min(free<cw?(cw-free)/2:0,panX||(cw-free)/2));panY=used<ch-top-bottom?top+(ch-top-bottom-used)/2:Math.max(ch-bottom-used,Math.min(top,panY||top));}
  layer.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;layer.style.width=roomW()+'px';layer.style.height=roomH()+'px';dirty=true;
 }
 function drawRoom(){if(!dirty)return;dirty=false;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#8fc56b';ctx.fillRect(0,0,cw,ch);ctx.setTransform(scale,0,0,scale,panX,panY);ctx.imageSmoothingQuality='high';ctx.drawImage(roomCanvas,0,0);}
 function spriteFor(item){
  if(item.decoration){const t=item.type;if(t==='carpet')return {src:`./assets/art-v11/carpet-lv${Math.min(level,5)}.webp`,width:3.8,ground:true};return {src:`${SPRITES}decor-${t}.webp`,width:DECOR_WIDTH[t]||1.3};}
  return {src:`${SPRITES}rack-${shelfKind(item)}.webp`,width:RACK_WIDTH};
 }
 function placeItem(el,item,x,z,w,ground){const px=w*U,flip=(item.rotation||0)%180?-1:1;el.style.width=px+'px';if(ground){const h=px*.72;el.style.height=h+'px';el.style.left=wx(x)-px/2+'px';el.style.top=wy(z)-h/2+'px';el.style.zIndex=1;el.style.transform=`rotate(${item.rotation||0}deg)`;}else{el.style.left=wx(x)-px/2+'px';el.style.top=wy(z)+V*.45+'px';el.style.zIndex=Math.round(100+z*100);el.style.transform=`translateY(-100%) scaleX(${flip})`;}}
 function syncItems(){
  const s=state(),ids=new Set(furniture(s).map(i=>i.id));
  for(const[id,v]of items)if(!ids.has(id)){v.el.remove();items.delete(id);}
  if(selected&&!ids.has(selected)){selectShelf(null);mode='play';metrics.mode=mode;onModeChange(mode);}
  for(const item of furniture(s)){const sp=spriteFor(item);let v=items.get(item.id);if(!v||v.src!==sp.src){v?.el.remove();const el=new Image();el.src=sp.src;el.alt='';el.className='world2d-item'+(sp.ground?' ground':'');el.draggable=false;layer.append(el);v={el,src:sp.src,sp};items.set(item.id,v);}
   const moving=drag?.id===item.id&&drag.moved;placeItem(v.el,item,moving?drag.x:item.x,moving?drag.z:item.z,sp.width,sp.ground);v.el.classList.toggle('selected',selected===item.id);
   if(!item.decoration){const cap=shelfCapacity(item),avail=stockCount(game.available(s,item),cap);v.el.classList.toggle('empty',avail<=0);metrics.shelves||={};metrics.shelves[item.id]={stock:item.stock,available:avail,capacity:cap};}}
 }
 function ensureActor(key,d,type){
  const id=type==='manager'?'manager':d.spiritId;let a=actors.get(key);if(a&&a.id===id)return a;if(a){a.el.remove();actors.delete(key);}
  const box=document.createElement('div');box.className='world2d-actor';const img=new Image();img.alt='';img.draggable=false;
  const card=type==='manager'?'':spiritArtPath(id);img.src=type==='manager'?SPRITES+'manager-front.webp':`./assets/staff-gifs/${id}.gif`;img.onerror=()=>{if(card&&!img.src.includes(card.split('/').pop())){box.classList.add('use-card');img.src=card;}};
  const shadow=document.createElement('i');box.append(shadow,img);layer.append(box);a={id,el:box,img,type,pos:{x:d.x||0,z:d.z||0},flip:1,moveUntil:0,height:ACTOR_SIZE};actors.set(key,a);metrics.actors=actors.size;return a;
 }
 /* 主管依行走方向換圖；側面圖面向右，往左時由 flip 翻轉。GIF 還沒到位時用靜態圖 */
 function setManagerImage(a,walking){const name=walking?'manager-'+(a.facing||'front'):'manager-idle';if(a.imageName===name)return;a.imageName=name;a.img.onerror=()=>{a.img.onerror=null;a.img.src=SPRITES+(walking?name:'manager-front')+'.webp';};a.img.src=SPRITES+name+'.gif';}
 function syncActors(dt){
  const s=state(),all=[...(s.staff||s.employees||[]).map(d=>[d.id,d,'staff']),...(s.customers||[]).map(d=>[d.id,d,'customer'])];if(s.manager&&mode==='follow')all.push(['manager',s.manager,'manager']);
  if(game.motionFrame?.time!==motionStamp){motionStamp=game.motionFrame?.time;motionProgress=0;}motionProgress=Math.min(1,motionProgress+dt*(s.speed||1)/(game.motionFrame?.duration||.25));
  const moods=[],staffRows=[],active=new Set();
  for(const[key,d,type]of all){active.add(key);const a=ensureActor(key,d,type),trail=game.motionFrame?.trails.get(key),p=trail?sampleTrail(trail,motionProgress):d,dx=p.x-a.pos.x,dz=p.z-a.pos.z,moved=dx*dx+dz*dz>.000001;a.pos={x:p.x,z:p.z};if(moved){a.moveUntil=time+.14;if(Math.abs(dx)>.002)a.flip=dx<0?-1:1;if(type==='manager')a.facing=Math.abs(dx)>Math.abs(dz)?'side':dz<0?'back':'front';}if(type==='manager')setManagerImage(a,time<a.moveUntil);
   const px=ACTOR_SIZE*U,leaving=type==='customer'&&d.state==='Leave'?Math.min(1,Math.max(.05,Math.hypot(d.x-ENTRANCE.x,d.z-ENTRANCE.z)/1.7)):1;a.el.style.width=px+'px';a.el.style.left=wx(p.x)-px/2+'px';const deskPull=type==='staff'&&d.role==='cashier'?Math.max(0,1-Math.hypot(p.x-10,p.z-1)/1.5):0,deskFeet=wy(2)+V*.45-U*1.02,feet=wy(p.z)+V*.25;a.el.style.top=feet+(deskFeet-feet)*deskPull-px+'px';a.el.style.zIndex=Math.round(100+p.z*100);a.img.style.transform=`scaleX(${a.flip}) scale(${leaving})`;a.el.classList.toggle('walking',time<a.moveUntil);a.el.classList.toggle('carrying',type==='staff'&&d.workTask?.phase==='carry');
   const emotion=stateEmotion(type,d,s),issue=type==='customer'?getCustomerComplaint(s,d,game):null,chase=type==='customer'&&s.customerChase?.customerId===d.id;
   if(emotion||issue||chase){const ev=s.event,related=!!ev&&(type==='staff'&&eventEmployee(s,ev)?.id===d.id||type==='customer'&&ev.description?.includes(d.name)&&['Angry','OutOfStock','Queue','UnhappyExit'].includes(d.state)),head=toScreen(p.x,p.z,ACTOR_SIZE*.95);moods.push({id:key,kind:chase?'impatient':emotion||'impatient',...(chase?{complaintId:d.id,complaintTitle:'🏃 追上我',chaseTarget:true}:issue?{complaintId:d.id,complaintTitle:issue.title}:related?{eventId:ev.instanceId||ev.id,eventTitle:ev.title}:{}),x:head.x,y:head.y,inFront:true});}
   if(type==='staff'){const head=toScreen(p.x,p.z,ACTOR_SIZE*.9);staffRows.push({id:key,x:head.x,y:head.y});}}
  for(const[key,a]of actors)if(!active.has(key)){a.el.remove();actors.delete(key);}metrics.actors=actors.size;metrics.staffPositions=staffRows;
  if(frame++%2===0){onActorVisuals({actors:moods,notices:(s.visualEvents||[]).map(n=>({id:n.id,targetId:n.targetId,text:n.text,tone:n.tone}))});onStaffPositions(staffRows);}
  if(s.manager&&mode==='follow'){const open=document.querySelector('dialog[open]'),ix=open?0:joystick.x+(keys.has('d')||keys.has('ArrowRight')?1:0)-(keys.has('a')||keys.has('ArrowLeft')?1:0),iy=open?0:joystick.y+(keys.has('s')||keys.has('ArrowDown')?1:0)-(keys.has('w')||keys.has('ArrowUp')?1:0);game.setManagerInput(ix,iy);fit();}
 }
 function headOf(item){if(!item)return null;const sp=spriteFor(item);return toScreen(item.x,item.z,sp.ground?.3:sp.width*1.1);}
 function update(dt){if(!alive)return;dt=Math.min(dt,.1);time+=dt;const l=Math.min(state().level||1,5);if(l!==level){level=l;buildRoom(l);}syncItems();syncActors(dt);if(placement)refreshPlacement();else if(selected)onFurniturePosition(headOf(furniture().find(i=>i.id===selected)));drawRoom();metrics.frames++;}
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
 function pick(e){const p=fromScreen(e.clientX,e.clientY);for(const[key,a]of [...actors].reverse())if(Math.abs(a.pos.x-p.x)<.6&&p.z<a.pos.z+.5&&p.z>a.pos.z-1.5)return {type:a.type,id:key};let best=null;for(const item of furniture()){const sp=spriteFor(item),w=sp.width/2;if(Math.abs(item.x-p.x)<w&&p.z<item.z+.7&&p.z>item.z-(sp.ground?.7:1.7)&&(!best||!sp.ground))best={type:'shelf',id:item.id};}return best;}
 const pinch=()=>{const p=[...touches.values()].slice(0,2);if(p.length<2)return null;return {distance:Math.max(8,Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y))};};
 const lockedView=()=>!!selected||!!placement;
 function pointerDown(e){canvas.setPointerCapture(e.pointerId);if(e.pointerType==='touch'){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){gesture=lockedView()?null:pinch();down=null;drag=null;return;}}if(placement){down={placing:true,pointerType:e.pointerType};const p=fromScreen(e.clientX,e.clientY);placement.x=Math.round(p.x);placement.z=Math.round(p.z);refreshPlacement();return;}down={x:e.clientX,y:e.clientY,lx:e.clientX,ly:e.clientY,button:e.button};const found=pick(e);if(found?.type==='shelf'){if(selected!==found.id){down.candidate=found.id;return;}if((state().phase==='open'&&!state().layoutPause)){selectShelf(found.id,true);down.lockOnly=true;return;}mode='decorate';game.setManagerActive(false);metrics.mode=mode;showGrid();onModeChange(mode);selectShelf(found.id,true);const sh=furniture().find(i=>i.id===found.id),p=fromScreen(e.clientX,e.clientY);drag={...sh,moved:false,offsetX:sh.x-p.x,offsetZ:sh.z-p.z};}}
 function pointerMove(e){if(e.pointerType==='touch'&&touches.has(e.pointerId)){touches.set(e.pointerId,{x:e.clientX,y:e.clientY});if(touches.size>=2){if(lockedView()){gesture=null;return;}const next=pinch();if(gesture&&next){userZoom=Math.max(1,Math.min(2.6,userZoom*next.distance/gesture.distance));fit();}gesture=next;return;}}if(placement){const p=fromScreen(e.clientX,e.clientY);placement.x=Math.round(p.x);placement.z=Math.round(p.z);refreshPlacement();return;}if(!down||down.lockOnly)return;if(drag){if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)drag.moved=true;const p=fromScreen(e.clientX,e.clientY);if(drag.moved){drag.x=Math.round(p.x+drag.offsetX);drag.z=Math.round(p.z+drag.offsetZ);}}else if(!lockedView()&&mode!=='follow'){panX+=e.clientX-down.lx;panY+=e.clientY-down.ly;fit();}down.lx=e.clientX;down.ly=e.clientY;}
 function pointerUp(e){if(e.pointerType==='touch'){touches.delete(e.pointerId);if(gesture){gesture=null;down=null;drag=null;return;}}if(!down)return;if(down.lockOnly){down=null;return;}const near=Math.hypot(e.clientX-down.x,e.clientY-down.y);if(down.candidate&&near<7){selectShelf(down.candidate);onActionResult({ok:true,message:'貨架已選取；點空白處解除，或再點一次開始移動'});down=null;return;}if(down.placing){if(down.pointerType!=='touch')confirmPlacement();down=null;return;}if(drag){const id=drag.id;if(drag.moved){const r=game.act(drag.decoration?'moveDecor':'moveShelf',{shelfId:id,decorId:id,x:drag.x,z:drag.z,rotation:drag.rotation});if(!r.ok)onActionResult(r);}drag=null;selectShelf(id);}else if(near<5&&down.button===0){const hit=pick(e);if(hit){if(mode==='decorate'&&hit.type==='shelf')selectShelf(hit.id);else onSelect(hit);}else if(selected||mode==='decorate')selectShelf(null);else if(mode==='follow'){const p=fromScreen(e.clientX,e.clientY);game.act('moveManager',{x:Math.round(p.x),z:Math.round(p.z)});}}down=null;}
 const wheel=e=>{e.preventDefault();if(lockedView())return;userZoom=Math.max(1,Math.min(2.6,userZoom-e.deltaY*.001));fit();};
 const keyDown=e=>{if(e.key==='Escape'&&placement){cancelPlacement();return;}if(e.key.toLowerCase()==='r'&&placement){placement.rotation=(placement.rotation+90)%360;refreshPlacement();return;}if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;if(mode==='follow'&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){keys.add(e.key);e.preventDefault();}};
 const keyUp=e=>keys.delete(e.key),context=e=>e.preventDefault(),blur=()=>{keys.clear();joystick={x:0,y:0};game.setManagerInput(0,0);down=null;drag=null;gesture=null;touches.clear();};
 const listeners=[['pointerdown',pointerDown],['pointermove',pointerMove],['pointerup',pointerUp],['pointercancel',blur],['contextmenu',context]];
 for(const[n,f]of listeners)canvas.addEventListener(n,f);canvas.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
 const resize=()=>fit(),observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(canvas);window.addEventListener('resize',resize);
 const api={
  /* 進化仍是 3D 演出，要用時才載入模型 */
  evolutionActor(path){assets3d||=createAssets(globalThis.THREE,metrics);return assets3d.actor(path,3,{footprint:99,diameter:99});},
  update,resize,ready:Promise.resolve(),metrics,setQuality(q){metrics.quality=q;},selectShelf,editShelf,beginShelfPlacement,confirmPlacement,cancelPlacement,cancelEdit,
  projectShelf(id){const i=furniture().find(x=>x.id===id);return i?toScreen(i.x,i.z):null;},projectShelfHead(id){return headOf(furniture().find(x=>x.id===id));},projectCell(x,z,y=0){return toScreen(x,z,y);},
  setMode(m){if(m==='follow'&&lockedView())return {ok:false,message:'請先完成貨架調整或點空白處取消選取，再切換主管巡店'};if(m!=='decorate')cancelPlacement();const result=game.setManagerActive(m==='follow');if(!result.ok){onActionResult(result);return result;}mode=m;keys.clear();joystick={x:0,y:0};game.setManagerInput(0,0);metrics.mode=m;metrics.managerVisible=m==='follow';showGrid();if(m!=='decorate')selectShelf(null);panX=0;panY=0;fit();onModeChange(m);return result;},
  setJoystick(x,y){joystick={x,y};},rotate(){return false;},zoom(delta=1){if(lockedView())return false;userZoom=Math.max(1,Math.min(2.6,userZoom-delta*.1));fit();return true;},setGestureMode(){return 'pan';},get gestureMode(){return 'pan';},get cameraLocked(){return lockedView();},get cameraPose(){return {scale,panX,panY};},
  dispose(){alive=false;cancelPlacement();observer?.disconnect();window.removeEventListener('resize',resize);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);for(const[n,f]of listeners)canvas.removeEventListener(n,f);canvas.removeEventListener('wheel',wheel);layer.remove();}
 };
 return api;
}
