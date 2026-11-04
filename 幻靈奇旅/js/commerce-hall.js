/* 幻靈奇旅 — 初光商會：中央道路南端的新街區。五個等級的外觀（Three.js 程序建模，比照參考圖），門口有路人排隊進店。
   商會目前不開放入內；等級會隨 DUNGEONS 增加而自動提升，也可輸入管理碼預覽各等級外觀。 */
(() => {
'use strict';
/* 新增副本時在這裡加一筆，商會就會自動升一級（最高 5 級）。目前三個副本對應最小的 1 級。 */
const DUNGEONS=['tower','cave','defense'],BASE_DUNGEONS=3,MAX_LEVEL=5;
const autoLevel=()=>Math.max(1,Math.min(MAX_LEVEL,1+DUNGEONS.length-BASE_DUNGEONS));
const PREVIEW_KEY='phantom-commerce-preview',PREVIEW_CODE='741216';
const readPreview=()=>{try{const v=Number(localStorage.getItem(PREVIEW_KEY));return v>=1&&v<=MAX_LEVEL?v:0;}catch{return 0;}};
const savePreview=v=>{try{if(v)localStorage.setItem(PREVIEW_KEY,String(v));else localStorage.removeItem(PREVIEW_KEY);}catch{}};
const currentLevel=()=>readPreview()||autoLevel();

/* 街區：z 向南。ROOT_Z 是建築中心，FRONT_Z 是門面，北側只有中央道路接進來。 */
const LOT={minX:-17,maxX:17,minZ:36,maxZ:68,gate:3.6},ROOT_Z=46,FRONT_Z=50.5,DOOR_Z=FRONT_Z+.25;
const QUEUE=[0,2,3,5,6,8],SLOT_GAP=1.3,FIRST_SLOT=FRONT_Z+2.1;
const SIZE=[null,{w:9,d:7,h:3.6},{w:10.5,d:7.5,h:3.8},{w:14,d:8,h:3.8},{w:16,d:8.5,h:4},{w:20,d:9,h:4.2}];
const HALL_SCALE=.82,LIT=.46,RED=0xc22d1c,RED_DARK=0xa02416,CREAM=0xf7ead0,STONE=0xefe2c6,STONE_D=0xdcc9a2,GOLD=0xeaa820,GREEN=0x7fb84e,GREEN_D=0x5f9a3c,WOOD=0x9a6538;

function tileTexture(T){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#d9553f';g.fillRect(0,0,128,128);
 for(let r=0;r<4;r++)for(let i=-1;i<5;i++){const x=i*32+(r%2)*16,y=r*32;g.fillStyle=(i+r)%3?'#cf4b37':'#e0614a';g.beginPath();g.moveTo(x,y);g.lineTo(x+32,y);g.lineTo(x+32,y+18);g.quadraticCurveTo(x+16,y+36,x,y+18);g.closePath();g.fill();g.strokeStyle='#a83b2b';g.lineWidth=2;g.stroke();}
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;return t;
}
function signTexture(T,star){
 const c=document.createElement('canvas');c.width=1024;c.height=340;const g=c.getContext('2d');
 g.fillStyle='#fff6e2';g.fillRect(0,0,1024,340);
 const cx=512,cy=86;
 if(star){g.fillStyle='#f2bd3f';g.strokeStyle='#c98a1e';g.lineWidth=5;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?26:62;g[i?'lineTo':'moveTo'](cx+Math.cos(a)*r,cy+10+Math.sin(a)*r);}g.closePath();g.fill();g.stroke();}
 else{g.fillStyle='#f2a93b';g.beginPath();g.arc(cx,cy+26,44,Math.PI,0);g.closePath();g.fill();g.strokeStyle='#f2a93b';g.lineWidth=11;g.lineCap='round';for(let i=0;i<7;i++){const a=Math.PI+(i+.5)*Math.PI/7;g.beginPath();g.moveTo(cx+Math.cos(a)*60,cy+26+Math.sin(a)*60);g.lineTo(cx+Math.cos(a)*88,cy+26+Math.sin(a)*88);g.stroke();}}
 g.fillStyle='#2c2622';g.font='900 150px "Noto Sans TC","Microsoft JhengHei","PingFang TC",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('初光商會',cx,238);
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;
}
function boardTexture(T){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#37342f';g.fillRect(0,0,128,128);g.strokeStyle='#f4efe4';g.lineWidth=7;g.lineCap='round';g.lineJoin='round';
 g.beginPath();g.moveTo(26,36);g.lineTo(42,36);g.lineTo(54,80);g.lineTo(98,80);g.lineTo(106,48);g.lineTo(46,48);g.stroke();g.beginPath();g.arc(60,98,6,0,7);g.arc(94,98,6,0,7);g.stroke();
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;
}

/* a roof with a ridge along z (or a pyramid when ridge is 0): four sloped faces with UVs that repeat the tiles */
function hipRoof(T,w,d,h,ridge){
 const hw=w/2,hd=d/2,r=ridge/2,p=[[-hw,0,hd],[hw,0,hd],[hw,0,-hd],[-hw,0,-hd],[-r,h,0],[r,h,0]],f=[[0,1,5,4],[1,2,5],[2,3,4,5],[3,0,4]],pos=[],uv=[];
 const tri=(a,b,c)=>{for(const i of [a,b,c]){pos.push(...p[i]);uv.push((p[i][0]+p[i][2]*.4)*.5,p[i][1]*1.4+Math.abs(p[i][2])*.2);}};
 for(const q of f){tri(q[0],q[1],q[2]);if(q[3]!==undefined)tri(q[0],q[2],q[3]);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}

function buildHall(T,level){
 const S=SIZE[level],root=new T.Group(),mats=new Map(),textures=[],anim=[];
 const m=(color,o={})=>{const k=color+JSON.stringify(o);if(!mats.has(k))mats.set(k,new T.MeshStandardMaterial({color,roughness:.85,...o}));return mats.get(k);};
 const add=(geo,mat,x=0,y=0,z=0,parent=root)=>{const o=new T.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;};
 const box=(w,h,d,mat,x,y,z,parent)=>add(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
 const front=S.d/2,tile=tileTexture(T),roofMat=new T.MeshStandardMaterial({color:0xffffff,map:tile,roughness:.8,side:T.DoubleSide});textures.push(tile);
 const glowMat=m(0xffd98a,{emissive:0xffb648,emissiveIntensity:.75}),gold=m(GOLD,{metalness:.2}),cream=m(CREAM),stone=m(STONE),stoneD=m(STONE_D),red=m(RED),redD=m(RED_DARK);
 const glass=new T.MeshStandardMaterial({color:0xa9dcf2,transparent:true,opacity:.55,roughness:.15,metalness:.1});

 /* base and walls */
 const baseW=S.w+(level>=3?3:1.6);
 box(baseW,.28,S.d+1.8,stone,0,.14,.3);box(baseW-.5,.12,S.d+1.3,m(0xf7efdc),0,.34,.3);
 box(S.w,S.h,S.d,cream,0,.4+S.h/2,0);box(S.w+.14,.4,S.d+.14,stoneD,0,.58,0);
 /* door: two glass leaves that slide apart */
 const doorW=2.9,doorH=2.75,y0=.4,doors=[];
 box(doorW+.34,doorH+.3,.16,m(0x7f7a78,{metalness:.4}),0,y0+doorH/2+.15,front+.04);
 const darkIn=box(doorW,doorH,.08,m(0x4f4238),0,y0+doorH/2,front+.1);darkIn.userData.soft=true;
 for(const s of[-1,1]){const leaf=new T.Group();leaf.position.set(s*doorW/4,y0+doorH/2,front+.17);root.add(leaf);const g=box(doorW/2-.08,doorH-.1,.05,glass,0,0,0,leaf);g.userData.soft=true;g.castShadow=false;box(.07,.8,.07,gold,-s*(doorW/4-.2),0,.06,leaf);doors.push({leaf,s});}
 /* shop windows either side of the door, warm with shelves */
 const shopWin=(x,w,h=2.3)=>{box(w+.24,h+.24,.12,m(0x8c5a34),x,y0+.34+h/2,front+.04);const g=box(w,h,.06,glowMat,x,y0+.34+h/2,front+.09);g.userData.soft=true;g.castShadow=false;for(let i=1;i<3;i++)box(w,.05,.08,m(0xb07a44),x,y0+.34+h*i/3,front+.13);box(.05,h,.08,m(0xb07a44),x,y0+.34+h/2,front+.13);};
 const winX=doorW/2+.95;shopWin(-winX,1.2);shopWin(winX,1.2);
 /* striped awning with a scalloped hem */
 const awnW=doorW+(level>=3?3.4:3),n=Math.round(awnW/.62),sw=awnW/n,awnY=y0+doorH+.62;
 for(let i=0;i<n;i++){const x=-awnW/2+sw*(i+.5),c=i%2?m(0xfff4df):m(RED),slat=box(sw,.1,1.25,c,x,awnY,front+.62);slat.rotation.x=.42;const sc=add(new T.CylinderGeometry(sw/2,sw/2,.1,14,1,false,0,Math.PI),c,x,awnY-.32,front+1.2);sc.rotation.set(Math.PI/2,0,Math.PI/2);}
 /* sign board */
 const signW=level>=3?6:4.8,signH=signW*.34,signY=y0+doorH+(level===1?1.75:2.05);
 box(signW+.36,signH+.36,.22,gold,0,signY,front+.56);const st=signTexture(T,level>=4);textures.push(st);
 const sign=add(new T.PlaneGeometry(signW,signH),new T.MeshBasicMaterial({map:st}),0,signY,front+.69);sign.userData.soft=true;sign.castShadow=false;
 /* crest: gold wings and the crystal */
 const crystalAt=(x,y,z)=>{const cr=add(new T.OctahedronGeometry(.62),new T.MeshStandardMaterial({color:0x9fdcff,emissive:0x5fb8ff,emissiveIntensity:.35,roughness:.2,metalness:.1,flatShading:true}),x,y+.8,z);cr.scale.y=1.35;cr.userData.soft=true;anim.push(t=>{cr.rotation.y=t*.5;cr.position.y=y+.8+Math.sin(t*1.5)*.06;});
  const d=add(new T.OctahedronGeometry(.4),gold,x,y+.02,z);d.scale.set(.8,1.3,.4);for(const s of[-1,1]){const w=add(new T.SphereGeometry(.34,10,8),gold,x+s*.45,y-.08,z);w.scale.set(1.2,.55,.5);}};
 const banner=(x,y,z=front+.24,h=1.5)=>{const sh=new T.Shape();sh.moveTo(-.34,0);sh.lineTo(.34,0);sh.lineTo(.34,-h);sh.lineTo(0,-h-.3);sh.lineTo(-.34,-h);sh.closePath();const b=add(new T.ExtrudeGeometry(sh,{depth:.05,bevelEnabled:false}),red,x,y,z);box(.84,.09,.09,gold,x,y+.02,z+.03);const star=add(new T.OctahedronGeometry(.2),gold,x,y-h*.52,z+.08);star.scale.set(.7,1.2,.15);return b;};
 const lantern=(x,y,z=front+.5)=>{box(.08,.34,.08,gold,x,y+.42,z);box(.34,.08,.34,gold,x,y+.22,z);const l=box(.34,.46,.34,glowMat,x,y-.04,z);l.userData.soft=true;l.castShadow=false;const cap=add(new T.ConeGeometry(.3,.2,4),m(0x8c5a34),x,y+.34,z);cap.rotation.y=Math.PI/4;box(.3,.06,.3,gold,x,y-.3,z);};
 const pillar=(x,h,z=front+.34,r=.27)=>{add(new T.CylinderGeometry(r,r*1.08,h,14),cream,x,y0+h/2,z);box(r*2.6,.28,r*2.6,stone,x,y0+.14,z);box(r*2.5,.16,r*2.5,gold,x,y0+h,z);};
 const archWin=(x,w,h,z=front+.04)=>{const sh=new T.Shape();sh.moveTo(-w/2,0);sh.lineTo(-w/2,h-w/2);sh.absarc(0,h-w/2,w/2,Math.PI,0,true);sh.lineTo(w/2,0);sh.closePath();const ext=(s,mat,d,zz)=>{const g=new T.ShapeGeometry(s);const o=add(g,mat,x,y0+.5,zz);o.castShadow=false;o.userData.soft=true;return o;};
  const fr=new T.Shape();const W=w+.3,H=h+.15;fr.moveTo(-W/2,-.15);fr.lineTo(-W/2,H-W/2);fr.absarc(0,H-W/2,W/2,Math.PI,0,true);fr.lineTo(W/2,-.15);fr.closePath();ext(fr,m(0xf4dfb8),0,z+.02);ext(sh,glowMat,0,z+.05);
  for(const dx of[-w/4,w/4])box(.05,h-.1,.04,m(0xffffff),x+dx,y0+.5+(h-.1)/2,z+.08);box(w,.05,.04,m(0xffffff),x,y0+.5+h-w/2,z+.08);box(w,.05,.04,m(0xffffff),x,y0+.5+(h-w/2)/2,z+.08);};
 const planter=(x,w,z=front+.9,tall=false)=>{box(w,.72,1.05,stone,x,.28+.36,z);box(w+.14,.1,1.18,m(0xfff4df),x,1.03,z);const n=Math.max(1,Math.round(w/.9));for(let i=0;i<n;i++){const b=add(new T.SphereGeometry(.58,12,9),m(i%2?GREEN:GREEN_D),x+(i-(n-1)/2)*(w/n),1.32,z);b.scale.y=.85;for(const a of[.6,2.3,4.2]){const f=add(new T.SphereGeometry(.09,6,5),m(i%2?0xffffff:0xf0704a),x+(i-(n-1)/2)*(w/n)+Math.cos(a)*.34,1.62,z+Math.sin(a)*.3+.2);f.castShadow=false;}}if(tall){const c=add(new T.ConeGeometry(.42,1.2,10),m(GREEN_D),x+(x<0?-1:1)*(w/2-.4),2.05,z-.2);c.castShadow=true;}};
 const dormer=(x,y,z)=>{box(1.5,1.2,1,cream,x,y,z);const g=add(new T.ConeGeometry(1.15,.8,4),redD,x,y+.96,z);g.rotation.y=Math.PI/4;g.scale.z=.8;const win=add(new T.PlaneGeometry(.8,.8),glowMat,x,y,z+.52);win.castShadow=false;win.userData.soft=true;box(.05,.8,.04,m(0xffffff),x,y,z+.55);box(.8,.05,.04,m(0xffffff),x,y,z+.55);};
 const arch=(x,y,r,z,band=.5)=>{/* the red arched gable over the sign */const sh=new T.Shape();sh.absarc(0,0,r,0,Math.PI,false);sh.lineTo(-r,0);sh.closePath();const fill=add(new T.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false,curveSegments:24}),cream,x,y,z-.3);fill.scale.y=.78;const ring=add(new T.TorusGeometry(r,band/2,10,32,Math.PI),red,x,y,z+.02);ring.scale.y=.78;const inner=add(new T.TorusGeometry(r-band*.75,.08,8,32,Math.PI),gold,x,y,z+.06);inner.scale.y=.78;};
 const roofY=y0+S.h;
 /* per-level silhouette, following the reference images */
 if(level===1){
  const sh=new T.Shape();sh.moveTo(-S.w/2-.75,0);sh.lineTo(0,2.75);sh.lineTo(S.w/2+.75,0);sh.closePath();
  const r=add(new T.ExtrudeGeometry(sh,{depth:S.d+.7,bevelEnabled:false}),roofMat,0,roofY-.05,-(S.d+.7)/2);
  const gableIn=new T.Shape();gableIn.moveTo(-S.w/2+.05,0);gableIn.lineTo(0,2.45);gableIn.lineTo(S.w/2-.05,0);gableIn.closePath();const gf=add(new T.ShapeGeometry(gableIn),cream,0,roofY-.05,front+.36);gf.castShadow=false;gf.userData.soft=true;
  for(const s of[-1,1]){const eave=box(Math.hypot(S.w/2+.75,2.75)+.2,.22,.4,m(RED_DARK),s*(S.w/4+.38),roofY+1.33,front+.42);eave.rotation.z=-s*Math.atan2(2.75,S.w/2+.75);}
  crystalAt(0,roofY+2.75,front+.2);banner(-S.w/2+.75,y0+3.35);banner(S.w/2-.75,y0+3.35);box(S.w-.1,.12,.12,gold,0,y0+3.42,front+.2);
 }else if(level===2){
  const r=add(hipRoof(T,S.w+1.5,S.d+1.2,1.4,S.d*.15),roofMat,0,roofY,0);
  arch(0,roofY-.05,3.7,front+.42);box(S.w+.6,.3,.5,stone,0,roofY-.02,front+.3);
  for(const s of[-1,1]){box(2.2,.5,1.2,stone,s*(S.w/2-1.1),roofY+1.1,-.3);const b=add(new T.SphereGeometry(.85,12,8),m(GREEN),s*(S.w/2-1.1),roofY+1.5,-.3);b.scale.set(1.15,.55,.7);for(const a of[0,1.2,2.5,3.8,5])add(new T.SphereGeometry(.1,6,5),m(a>2?0xf0704a:0xffffff),s*(S.w/2-1.1)+Math.cos(a)*.6,roofY+1.82,-.3+Math.sin(a)*.34);}
  crystalAt(0,roofY+2.95,front+.24);banner(-S.w/2+.72,y0+3.4);banner(S.w/2-.72,y0+3.4);lantern(-doorW/2-1.72,y0+2.5);lantern(doorW/2+1.72,y0+2.5);
 }else{
  add(hipRoof(T,S.w+1.5,S.d+1.4,level>=4?2.3:1.9,S.w*.42),roofMat,0,roofY,0);
  arch(0,roofY-.05,level>=4?4.4:3.9,front+.42);box(S.w+.7,.34,.6,stone,0,roofY-.02,front+.3);box(S.w+.7,.1,.66,gold,0,roofY-.24,front+.3);
  const span=S.w/2-1.3;
  if(level===3){for(const s of[-1,1]){archWin(s*span,1.5,2.3);banner(s*(span-1.45),y0+3.45);box(.8,.45,.9,gold,s*(S.w/2-.35),roofY+.12,front+.15);}const fb=box(2.1,.5,1,stone,3.8,roofY+1.2,1);add(new T.SphereGeometry(.8,12,8),m(GREEN),3.8,roofY+1.6,1).scale.set(1.2,.55,.7);crystalAt(0,roofY+3.35,front+.2);}
  if(level>=4){for(const s of[-1,1]){archWin(s*span,1.6,2.45);banner(s*(span-1.5),y0+3.5);banner(s*(span-2.25),y0+3.5);dormer(s*(S.w/2-2.2),roofY+1.32,1.05);box(.7,.3,.6,gold,s*(S.w/2-.3),roofY+.14,front+.2);}}
  if(level===4){crystalAt(0,roofY+3.75,front+.2);}
  for(const s of[-1,1]){pillar(s*(doorW/2+1.5),2.9);lantern(s*(doorW/2+1.5),y0+2.4,front+.82);}
 }
 if(level>=4){
  /* steps and the red carpet */
  for(let i=0;i<3;i++){box(doorW+2.2-i*.3,.14,.5,stone,0,.34+.14*(2-i)-.08,front+1.5-i*.46);}
  box(doorW-.2,.03,1.5,red,0,.5,front+.98);box(.08,.04,1.5,gold,-(doorW/2-.28),.52,front+.98);box(.08,.04,1.5,gold,doorW/2-.28,.52,front+.98);
 }
 if(level===5){
  /* the wings carry little towers with flags; the centre rises into a glazed dome */
  const baseY=roofY+1.15,drum=add(new T.CylinderGeometry(3.7,3.9,1.1,28),cream,0,baseY+.2,-.3);drum.castShadow=true;box(.1,.1,.1,gold,0,baseY,-.3);add(new T.TorusGeometry(3.85,.12,8,30),gold,0,baseY+.72,-.3).rotation.x=Math.PI/2;
  const dome=add(new T.SphereGeometry(3.45,24,14,0,Math.PI*2,0,Math.PI/2),m(0xd8644a,{metalness:.1,roughness:.4}),0,baseY+.72,-.3);dome.scale.y=.86;
  for(let i=0;i<8;i++){const rib=add(new T.TorusGeometry(3.47,.055,6,24,Math.PI/2),gold,0,baseY+.72,-.3);rib.rotation.y=i*Math.PI/4;rib.scale.y=.86;}
  add(new T.TorusGeometry(2.45,.05,6,28),gold,0,baseY+.72+3.45*.86*.7,-.3).rotation.x=Math.PI/2;
  const top=baseY+.72+3.45*.86;crystalAt(0,top-.1,-.3);
  for(const [rx,tilt] of[[1.7,.28],[1.5,-.3]]){const o=add(new T.TorusGeometry(rx,.035,6,40),gold,0,top+.95,-.3);o.rotation.set(Math.PI/2+tilt,0,0);anim.push(t=>{o.rotation.z=t*.4*Math.sign(tilt);});}
  for(const s of[-1,1]){const x=s*(S.w/2-1.9);box(1.5,1.2,1.5,cream,x,roofY+1.5,-1.4);box(1.7,.16,1.7,stone,x,roofY+2.15,-1.4);add(new T.CylinderGeometry(.05,.05,2.1,8),gold,x,roofY+3.25,-1.4);add(new T.SphereGeometry(.13,10,8),gold,x,roofY+4.32,-1.4);
   const fl=new T.Shape();fl.moveTo(0,0);fl.quadraticCurveTo(.7,.16,1.45,-.26);fl.quadraticCurveTo(.8,-.3,1.3,-.74);fl.quadraticCurveTo(.6,-.5,0,-.62);fl.closePath();const f=add(new T.ShapeGeometry(fl),m(RED,{side:T.DoubleSide}),x+.05,roofY+4.2,-1.4);f.userData.soft=true;anim.push(t=>{f.rotation.y=Math.sin(t*2.4+s)*.28;f.scale.x=1+Math.sin(t*3.2+s)*.05;});
   /* the outer arched windows and lamps of the wings */
   pillar(s*(S.w/2-.1),3.1,front+.34,.3);lantern(s*(S.w/2+.05),y0+2.5,front+.85);}
  planter(-S.w/2-.1,2.4,front+1.05,true);planter(-S.w/2+2.6,1.9,front+1.05);planter(S.w/2+.1,2.4,front+1.05,true);planter(S.w/2-2.6,1.9,front+1.05);
 }else if(level===4){planter(-S.w/2+1,3.7,front+.98);planter(S.w/2-1,3.7,front+.98);for(const s of[-1,1]){const x=s*(S.w/2+.65);add(new T.CylinderGeometry(.08,.11,2.3,8),m(0x8c5a34),x,.34+1.15,front+.8);lantern(x,1.95,front+.8);}}
 else if(level===3){planter(-S.w/2+.55,3,front+.98,true);planter(S.w/2-.55,3,front+.98,true);}
 else{const w=level===2?2.2:2;planter(-S.w/2+.45,w,front+.92,level===2);planter(S.w/2-.45,w,front+.92,level===2);}
 /* chalkboard with the cart */
 const bt=boardTexture(T);textures.push(bt);const bx=doorW/2+1.1,bz=front+(level>=4?1.55:1.15);box(1,1.34,.1,m(WOOD),bx,.34+.72,bz);const board=add(new T.PlaneGeometry(.8,.96),new T.MeshBasicMaterial({map:bt}),bx,.34+.82,bz+.06);board.userData.soft=true;board.castShadow=false;box(.08,.3,.08,m(WOOD),bx-.4,.46,bz);box(.08,.3,.08,m(WOOD),bx+.4,.46,bz);
 window.PhantomHarbor?.toonOutline?.(T,root,{thickness:.075});
 /* the town's lights run hot (authored for its pale models): take the lit colours down so reds stay red */
 const seen=new Set();root.traverse(o=>{const x=o.material;if(!x||seen.has(x)||o.userData.isOutline||x.isMeshBasicMaterial)return;seen.add(x);x.color.multiplyScalar(LIT);});
 return {root,doors,doorW,anim,halfW:baseW/2,dispose(){root.traverse(o=>{o.geometry?.dispose?.();});mats.forEach(x=>x.dispose());roofMat.dispose();glass.dispose();textures.forEach(t=>t.dispose());}};
}

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

function create({THREE:T,scene}){
 const root=new T.Group();root.name='CommerceHall';scene.add(root);root.add(buildLot(T));
 const hallRoot=new T.Group();hallRoot.position.z=0;root.add(hallRoot);
 const shared=new Map();shared.geo={torso:new T.CylinderGeometry(.24,.32,.86,10),head:new T.SphereGeometry(.27,12,10),hair:new T.SphereGeometry(.285,12,8,0,Math.PI*2,0,Math.PI*.55),brim:new T.CylinderGeometry(.4,.4,.04,14),crown:new T.CylinderGeometry(.2,.24,.2,12),bag:new T.BoxGeometry(.16,.3,.26),leg:new T.CylinderGeometry(.095,.085,.62,8),shoe:new T.BoxGeometry(.17,.1,.3),arm:new T.CylinderGeometry(.07,.065,.52,8),hand:new T.SphereGeometry(.08,8,6)};
 let hall=null,level=0,people=[],time=0,leaveAt=0,doorOpen=0;
 const slotAt=i=>({x:Math.sin(i*.7)*.28,z:FIRST_SLOT+i*SLOT_GAP});
 const spawnFor=i=>{const s=slotAt(i),side=Math.random()<.5?-1:1;return {x:side*(9+Math.random()*3),z:Math.min(LOT.maxZ-1.2,s.z+1.5)};};
 function clearPeople(){for(const p of people)root.remove(p.root);people=[];}
 function setLevel(n){
  n=Math.max(1,Math.min(MAX_LEVEL,Math.round(n)||1));if(n===level)return;level=n;
  if(hall){hallRoot.remove(hall.root);hall.dispose();}
  hall=buildHall(T,n);hallRoot.add(hall.root);hall.root.scale.setScalar(HALL_SCALE);hall.root.position.z=FRONT_Z-SIZE[n].d/2*HALL_SCALE;clearPeople();
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
  const near=!!player&&Math.hypot(player.x,player.z-52)<46;root.visible=near;if(!near||!hall)return;
  time+=dt;for(const f of hall.anim)f(time);
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
  doorOpen=Math.max(0,Math.min(1,doorOpen+(wantOpen?dt*2.6:-dt*1.8)));for(const d of hall.doors)d.leaf.position.x=d.s*(hall.doorW/4+doorOpen*hall.doorW*.42);
 }
 const inLot=(x,z)=>z>LOT.minZ-.6&&z<LOT.maxZ+1&&x>LOT.minX-1&&x<LOT.maxX+1;
 function blocked(x,z,m=.42){
  if(x<LOT.minX+m||x>LOT.maxX-m||z>LOT.maxZ-m)return true;
  if(z<LOT.minZ+1.3&&Math.abs(x)>LOT.gate-m)return true;
  const hw=(hall?.halfW||6)*HALL_SCALE+.2;if(Math.abs(x)<hw+m&&z>FRONT_Z-(SIZE[level]?.d||7)*HALL_SCALE-.6-m&&z<FRONT_Z+1.3+m)return true;
  for(const p of people){if(p.state==='inside')continue;const a=p.root.position;if(Math.hypot(a.x-x,a.z-z)<.5+m)return true;}
  return false;
 }
 setLevel(currentLevel());
 return {root,update,setLevel,blocked,inLot,get level(){return level;},get people(){return people;},nearDoor(p){return Math.abs(p.x)<3.4&&p.z>FRONT_Z+1.2&&p.z<FRONT_Z+5.2;}};
}
window.PhantomCommerce={create,currentLevel,autoLevel,readPreview,savePreview,PREVIEW_CODE,QUEUE,MAX_LEVEL,LOT,DUNGEONS};
})();
