/* 初光商會：沿用五階建築，外觀只讀取獨立商會的實際存檔等級。 */
(() => {
'use strict';
const MAX_LEVEL=5,SHOP_SAVE_KEY='firstlight_shop_v1',LEVEL_META_KEY='firstlight-commerce-level-v1';
function savedLevel(key){try{const data=JSON.parse(localStorage.getItem(key));return data&&Number.isInteger(data.level)?Math.max(1,Math.min(MAX_LEVEL,data.level)):null;}catch{return null;}}
const currentLevel=()=>savedLevel(SHOP_SAVE_KEY)??savedLevel(LEVEL_META_KEY)??1;
function shopURL(href=location.href){
 const page=new URL(href);if(/\/game(?:\/guest)?$/.test(page.pathname))page.pathname+='/';const home=new URL('./',page);
 if(!['http:','https:'].includes(home.protocol))throw Error('請透過本機伺服器或網站開啟商會');
 const guest=home.pathname.endsWith('/game/guest/');
 const shop=new URL(guest?'../../shop/':home.pathname.endsWith('/game/')?'../shop/':'../初光商會/',home);
 if(guest)shop.searchParams.set('guest','1');
 // Derive the return destination from this page, never from an inbound parameter.
 if(shop.origin!==home.origin)throw Error('商會入口必須與主遊戲同源');
 shop.searchParams.set('return',guest?home.pathname:home.href);return shop.href;
}

/* 街區：z 向南。FRONT_Z 是門面，北側只有中央道路接進來。 */
const LOT={minX:-17,maxX:17,minZ:36,maxZ:68,gate:3.6},FRONT_Z=50.5,DOOR_Z=FRONT_Z+.25;
const QUEUE=[0,2,3,5,6,8],SLOT_GAP=1.3,FIRST_SLOT=FRONT_Z+2.1;
const HALL_SCALE=1,LIT=.46;
/* the street around the hall: lawn, the central road carried on, a loop round the building and the forecourt */
function buildLot(T){
 const g=new T.Group(),tex=[],flat=(w,d,color,x,z,y)=>{const o=new T.Mesh(new T.PlaneGeometry(w,d).rotateX(-Math.PI/2),new T.MeshLambertMaterial({color}));o.material.color.multiplyScalar(.62);o.position.set(x,y,z);o.receiveShadow=true;g.add(o);return o;};
 const LAWN=0xa6cc9e,ROAD=0xd9d2c0,cx=(LOT.minX+LOT.maxX)/2,cz=(LOT.minZ+LOT.maxZ)/2,w=LOT.maxX-LOT.minX,d=LOT.maxZ-LOT.minZ;
 flat(w+3,d+3,0xd8d2c2,cx,cz+1,.004);flat(w,d,LAWN,cx,cz,.012);
 flat(LOT.gate*2,4,ROAD,0,LOT.minZ+.6,.03);flat(28,3.2,ROAD,0,39.4,.024);for(const s of[-1,1])flat(3.2,16,ROAD,s*12.4,47,.024);
 flat(28,13,ROAD,0,59,.024);flat(16,10.6,0xcfc2a4,0,58.2,.032);
 const leaf=[0x6fae96,0x9dbb76,0x7fb49e];for(const [x,z,s] of[[-15.4,44,1.15],[15.4,44,1.2],[-15.2,53,1],[15.3,54,1.05],[-14.5,66,1.2],[14.6,66,1.15],[-7,66.4,.9],[7,66.4,.95]]){const t=new T.Group(),tr=new T.Mesh(new T.CylinderGeometry(.22,.3,1.6,8),new T.MeshLambertMaterial({color:0xb98a5a}));tr.position.y=.8;t.add(tr);for(const [dx,dy,r] of[[0,2.2,1],[.55,1.8,.72],[-.5,1.9,.7]]){const b=new T.Mesh(new T.SphereGeometry(r,10,8),new T.MeshLambertMaterial({color:leaf[((x>0)+(z>50))%3]}));b.position.set(dx,dy,0);b.castShadow=true;t.add(b);}t.position.set(x,0,z);t.scale.setScalar(s);g.add(t);}
 return g;
}

/* a passer-by: a light rounded figure built from a few primitives (no skinning) */
const SKIN=[0xf6d3b3,0xeec09a,0xd9a67c,0xf9dfc6],HAIR=[0x3a2a22,0x6b4630,0xb9793f,0x2b2b35,0xcfc7bd],CLOTH=[0xe07a5f,0x6aa9cf,0x88b86a,0xe9b949,0xb38cd1,0xf0a6b4,0x5f8fa8,0xd98f5a],PANTS=[0x4a5a75,0x6b5a4a,0x3f4a4f,0x7a6a8f];
function makePerson(T,shared){
 const pick=a=>a[Math.floor(Math.random()*a.length)],mat=c=>{if(!shared.has(c)){const x=new T.MeshLambertMaterial({color:c});x.color.multiplyScalar(LIT+.1);shared.set(c,x);}return shared.get(c);},root=new T.Group(),body=new T.Group();root.add(body);
 const skin=pick(SKIN),hair=pick(HAIR),cloth=pick(CLOTH),pants=pick(PANTS),scale=.92+Math.random()*.12;
 const add=(g,c,x,y,z,p=body)=>{const o=new T.Mesh(g,mat(c));o.position.set(x,y,z);o.castShadow=true;p.add(o);return o;};
 add(shared.geo.torso,cloth,0,1.13,0);add(shared.geo.head,skin,0,1.78,0);
 const h=add(shared.geo.hair,hair,0,1.84,-.03);h.rotation.x=-.25;
 if(Math.random()<.35){add(shared.geo.brim,pick(CLOTH),0,1.98,.02);add(shared.geo.crown,pick(CLOTH),0,2.08,0);}
 if(Math.random()<.4)add(shared.geo.bag,pick([0x9a6538,0xc98a4e,0x6e7c8a]),.3,1.08,-.08);
 const legs=[-1,1].map(s=>{const p=new T.Group();p.position.set(s*.13,.74,0);body.add(p);add(shared.geo.leg,pants,0,-.33,0,p);add(shared.geo.shoe,0x5a4638,0,-.68,.05,p);return p;});
 const arms=[-1,1].map(s=>{const p=new T.Group();p.position.set(s*.31,1.4,0);body.add(p);add(shared.geo.arm,cloth,0,-.26,0,p);add(shared.geo.hand,skin,0,-.54,0,p);return p;});
 root.scale.setScalar(scale);return {root,body,legs,arms,phase:Math.random()*6,scale};
}

async function create({THREE:T,scene}){
 const {buildTownHall}=await import(new URL('js/town-hall.js?v=20261121-storybook',shopURL()).href);
 const root=new T.Group();root.name='CommerceHall';scene.add(root);root.add(buildLot(T));
 const hallRoot=new T.Group();hallRoot.position.z=0;root.add(hallRoot);
 const shared=new Map();shared.geo={torso:new T.CylinderGeometry(.24,.32,.86,10),head:new T.SphereGeometry(.27,12,10),hair:new T.SphereGeometry(.285,12,8,0,Math.PI*2,0,Math.PI*.55),brim:new T.CylinderGeometry(.4,.4,.04,14),crown:new T.CylinderGeometry(.2,.24,.2,12),bag:new T.BoxGeometry(.16,.3,.26),leg:new T.CylinderGeometry(.095,.085,.62,8),shoe:new T.BoxGeometry(.17,.1,.3),arm:new T.CylinderGeometry(.07,.065,.52,8),hand:new T.SphereGeometry(.08,8,6)};
 const gate=window.PhantomCommerceGate?.create({THREE:T,parent:root,LOT,frontZ:FRONT_Z})||null;let gateUnlocked=false;
 let hall=null,level=0,people=[],time=0,leaveAt=0,doorOpen=0;
 const slotAt=i=>({x:Math.sin(i*.7)*.28,z:FIRST_SLOT+i*SLOT_GAP});
 const spawnFor=i=>{const s=slotAt(i),side=Math.random()<.5?-1:1;return {x:side*(9+Math.random()*3),z:Math.min(LOT.maxZ-1.2,s.z+1.5)};};
 function clearPeople(){for(const p of people)root.remove(p.root);people=[];}
 function setLevel(n){
  n=Math.max(1,Math.min(MAX_LEVEL,Math.round(n)||1));if(n===level)return;level=n;
  if(hall){hallRoot.remove(hall.root);hall.dispose();}
  hall=buildTownHall(n);hallRoot.add(hall.root);hall.root.scale.setScalar(HALL_SCALE);
  hall.root.position.set(-hall.doorX*HALL_SCALE,.10,FRONT_Z-hall.front*HALL_SCALE);clearPeople();
  for(let i=0;i<QUEUE[n];i++){const p=makePerson(T,shared),s=slotAt(i);p.slot=i;p.state='wait';p.root.position.set(s.x,.03,s.z);p.root.rotation.y=Math.PI;root.add(p.root);people.push(p);}
  leaveAt=time+3+Math.random()*2;
 }
 /* one step toward a point, never closer than a body width to anyone ahead */
 function walk(p,tx,tz,dt,speed=1.9){
  const r=p.root.position,dx=tx-r.x,dz=tz-r.z,d=Math.hypot(dx,dz);if(d<.03)return true;
  const k=Math.min(d,speed*dt),nx=r.x+dx/d*k,nz=r.z+dz/d*k;
  for(const o of people){if(o===p)continue;const a=o.root.position,now=Math.hypot(a.x-r.x,a.z-r.z),next=Math.hypot(a.x-nx,a.z-nz);if(next<.95&&next<now){if(o.state==='inside')continue;return false;}}
  r.x=nx;r.z=nz;p.root.rotation.y=Math.atan2(dx,dz);p.moving=true;return false;
 }
 function update(dt,player){
  const near=!!player&&Math.hypot(player.x,player.z-52)<46;root.visible=near;if(near)gate?.update(dt,player,{unlocked:gateUnlocked});if(!near||!hall)return;
  time+=dt;
  /* the front of the line goes in now and then; everyone steps up; a newcomer joins the back */
  if(time>=leaveAt&&people.length){const f=people.find(p=>p.slot===0&&p.state==='wait'&&Math.hypot(p.root.position.x-slotAt(0).x,p.root.position.z-slotAt(0).z)<.1);if(f){f.state='inside';f.slot=-1;for(const p of people)if(p.slot>0)p.slot--;leaveAt=time+3.2+Math.random()*2.8;}}
  let wantOpen=false;
  for(const p of people){
   p.moving=false;const r=p.root.position;
   if(p.state==='inside'){wantOpen=true;if(doorOpen>.8)walk(p,0,FRONT_Z-.9,dt,1.7);const left=r.z-(FRONT_Z-.9);if(r.z<DOOR_Z+.3){const k=Math.max(.01,Math.min(1,(r.z-(FRONT_Z-.9))/1.1));p.root.scale.setScalar(p.scale*k);}
    if(left<.08){p.slot=people.filter(o=>o.slot>=0).length;p.state='arrive';const s=spawnFor(p.slot);r.set(s.x,.03,s.z);p.root.scale.setScalar(.01);p.grow=0;}}
   else{const s=slotAt(p.slot);if(p.state==='arrive'){p.grow=Math.min(1,p.grow+dt*2.2);p.root.scale.setScalar(p.scale*Math.max(.01,p.grow));}if(walk(p,s.x,s.z,dt)){p.state='wait';p.root.rotation.y=Math.PI;}}
   p.phase+=dt*(p.moving?9:1.4);const sw=p.moving?Math.sin(p.phase)*.55:0;p.legs[0].rotation.x=sw;p.legs[1].rotation.x=-sw;p.arms[0].rotation.x=-sw*.8;p.arms[1].rotation.x=sw*.8;p.body.position.y=p.moving?Math.abs(Math.sin(p.phase))*.05:Math.sin(p.phase)*.012;
  }
  doorOpen=Math.max(0,Math.min(1,doorOpen+(wantOpen?dt*2.6:-dt*1.8)));hall.setDoorOpen(doorOpen);
 }
 const inLot=(x,z)=>z>LOT.minZ-.6&&z<LOT.maxZ+1&&x>LOT.minX-1&&x<LOT.maxX+1;
 function blocked(x,z,m=.42){
  if(x<LOT.minX+m||x>LOT.maxX-m||z>LOT.maxZ-m)return true;
  if(z<LOT.minZ+1.3&&Math.abs(x)>LOT.gate-m)return true;
  if(gate?.blocked(x,z,m))return true;
  const hw=(hall?.halfW||6)*HALL_SCALE+.2;if(Math.abs(x-(hall?.root.position.x||0))<hw+m&&z>FRONT_Z-(hall?.depth||7)*HALL_SCALE-.6-m&&z<FRONT_Z+1.3+m)return true;
  for(const p of people){if(p.state==='inside')continue;const a=p.root.position;if(Math.hypot(a.x-x,a.z-z)<.5+m)return true;}
  return false;
 }
 const refresh=()=>setLevel(currentLevel());
 const onStorage=e=>{if(e.key===null||e.key===SHOP_SAVE_KEY||e.key===LEVEL_META_KEY)refresh();};
 window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',onStorage);
 refresh();
 return {root,update,setLevel,refresh,blocked,inLot,gate,unlockGate(on=true){gateUnlocked=on;},dispose(){gate?.dispose();window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',onStorage);hall?.dispose();root.traverse(o=>o.geometry?.dispose());for(const material of shared.values())material.dispose();scene.remove(root);},get level(){return level;},get people(){return people;},nearDoor(p){return Math.abs(p.x)<3.4&&p.z>FRONT_Z+1.2&&p.z<FRONT_Z+5.2;}};
}
window.PhantomCommerce={create,currentLevel,shopURL,SHOP_SAVE_KEY,LEVEL_META_KEY,QUEUE,MAX_LEVEL,LOT};
})();
