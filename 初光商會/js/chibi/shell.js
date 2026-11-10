/* 初光商會 Lv.1–Lv.5 剖面建築：無屋頂、室內淨空、室外只留草地與步道。
   風格：Q 版手繪感、深咖啡外框、三階卡通明暗。
   座標：室內地板頂面 y=0，室內範圍 x∈[-w/2,w/2]、z∈[-d/2,d/2]，門面朝 +z。 */
import {addIllustratedOutline} from '../illustrated-outline.js?v=20261110-shop-r2';
const THREE=globalThis.THREE;
/* 商會畫面是 sRGB 輸出：顏色與貼圖要轉成線性空間，否則會偏白 */
export const CFG={linear:true,outline:.009,gain:.62};

export const LEVELS=[null,
 {name:'破舊木屋',w:7,d:5.4,H:2.45,t:.26},
 {name:'整修小店',w:9,d:6.4,H:2.7,t:.28},
 {name:'石砌商會',w:11,d:7.4,H:2.95,t:.32},
 {name:'白石大館',w:13,d:8,H:3.15,t:.34},
 {name:'金頂宮殿',w:15.5,d:9,H:3.35,t:.36}];
export let GROUND=-.42;export const INK=0x4a2e1c;

/* ---------- 小工具 ---------- */
export const rng=seed=>(seed=Math.abs(Math.round(seed))%2147483646+1,()=>((seed=seed*16807%2147483647)/2147483647));
export const hex=c=>'#'+c.toString(16).padStart(6,'0');
export function shade(c,k){const r=(c>>16)&255,g=(c>>8)&255,b=c&255,f=v=>Math.max(0,Math.min(255,Math.round(k>0?v+(255-v)*k:v*(1+k))));return (f(r)<<16)|(f(g)<<8)|f(b);}
export function canvasTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;if(CFG.linear)t.encoding=THREE.sRGBEncoding;return t;}
let toonRamp=null;
export function ramp(){if(!toonRamp){toonRamp=new THREE.DataTexture(new Uint8Array([120,200,255]),3,1,THREE.LuminanceFormat);toonRamp.minFilter=toonRamp.magFilter=THREE.NearestFilter;toonRamp.needsUpdate=true;}return toonRamp;}

/* ---------- 貼圖 ---------- */
export function plankTex({base,dark,n=6,vertical=true,worn=0,seed=1,nails=false}){
 const R=rng(seed);return canvasTex(256,256,(g,W,H)=>{
  g.fillStyle=hex(base);g.fillRect(0,0,W,H);const step=(vertical?W:H)/n;
  for(let i=0;i<n;i++){
   const c=shade(base,(R()-.5)*.22-(worn&&R()<.3?.12:0));g.fillStyle=hex(c);
   vertical?g.fillRect(i*step,0,step,H):g.fillRect(0,i*step,W,step);
   g.strokeStyle=hex(dark);g.globalAlpha=.28;g.lineWidth=1.4;
   for(let k=0;k<3;k++){const o=i*step+step*(.2+k*.3);g.beginPath();for(let s=0;s<=16;s++){const a=s/16*(vertical?H:W),b=o+Math.sin(s*.9+R()*2)*1.6;vertical?g.lineTo(b,a):g.lineTo(a,b);}g.stroke();}
   g.globalAlpha=1;g.fillStyle=hex(dark);vertical?g.fillRect(i*step,0,3,H):g.fillRect(0,i*step,W,3);
   if(!vertical){const j=R()*W;g.fillRect(j,i*step,3,step);}
   if(nails){g.fillStyle=hex(shade(dark,-.3));for(const y of vertical?[12,H-14]:[step*.5]){const x=vertical?i*step+step/2:12;vertical?g.fillRect(x-2,y-2,4,4):g.fillRect(x,i*step+y-2,4,4);}}
   if(worn){g.fillStyle=hex(shade(dark,-.35));for(let k=0;k<worn;k++){if(R()<.55)continue;const x=vertical?i*step+R()*step:R()*W,y=vertical?R()*H:i*step+R()*step;g.beginPath();g.ellipse(x,y,3+R()*9,2+R()*4,R()*3,0,7);g.fill();}}
  }});
}
export function plasterTex(base,seed=2){const R=rng(seed);return canvasTex(256,256,(g,W,H)=>{g.fillStyle=hex(base);g.fillRect(0,0,W,H);for(let i=0;i<700;i++){g.fillStyle=hex(shade(base,(R()-.5)*.12));g.globalAlpha=.55;g.fillRect(R()*W,R()*H,2+R()*4,2+R()*3);}g.globalAlpha=1;});}
export function stoneTex({base,mortar,rows=4,cols=3,seed=3,rough=.14}){const R=rng(seed);return canvasTex(256,256,(g,W,H)=>{g.fillStyle=hex(mortar);g.fillRect(0,0,W,H);const rh=H/rows;
 for(let r=0;r<rows;r++){const cw=W/cols,off=r%2?cw/2:0;for(let c=-1;c<=cols;c++){const x=c*cw+off+3,y=r*rh+3,w=cw-6,h=rh-6;g.fillStyle=hex(shade(base,(R()-.5)*rough));g.beginPath();g.roundRect?g.roundRect(x,y,w,h,6):g.rect(x,y,w,h);g.fill();g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+4,y+3,w-8,3);}}});}
function floorTex(level){
 if(level===1)return plankTex({base:0x8a6646,dark:0x4a3020,n:6,vertical:false,worn:10,seed:11,nails:true});
 if(level===2)return plankTex({base:0xd9a566,dark:0x8a5a30,n:6,vertical:false,seed:12});
 const R=rng(20+level);
 if(level===3)return canvasTex(256,256,(g,W,H)=>{const a=0xf1e6cc,b=0xd9c7a2;for(let y=0;y<4;y++)for(let x=0;x<4;x++){g.fillStyle=hex(shade((x+y)%2?a:b,(R()-.5)*.06));g.fillRect(x*64,y*64,64,64);}g.strokeStyle=hex(0xb59a72);g.lineWidth=2;for(let i=0;i<=4;i++){g.beginPath();g.moveTo(i*64,0);g.lineTo(i*64,H);g.moveTo(0,i*64);g.lineTo(W,i*64);g.stroke();}});
 if(level===4)return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#ebe6dc';g.fillRect(0,0,W,H);g.strokeStyle='rgba(140,150,170,.45)';g.lineWidth=1.5;for(let i=0;i<9;i++){g.beginPath();let x=R()*W,y=R()*H;g.moveTo(x,y);for(let k=0;k<6;k++){x+=(R()-.3)*50;y+=(R()-.5)*40;g.lineTo(x,y);}g.stroke();}g.strokeStyle='#c3b8a2';g.lineWidth=3;g.strokeRect(1,1,W-2,H-2);g.strokeRect(1,1,W/2-2,H/2-2);g.strokeRect(W/2+1,H/2+1,W/2-2,H/2-2);});
 return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#f4ead2';g.fillRect(0,0,W,H);g.fillStyle='#e7d6b0';g.beginPath();g.moveTo(W/2,20);g.lineTo(W-20,H/2);g.lineTo(W/2,H-20);g.lineTo(20,H/2);g.closePath();g.fill();g.strokeStyle='#d9a521';g.lineWidth=4;g.stroke();g.strokeRect(2,2,W-4,H-4);g.fillStyle='#d9a521';g.beginPath();g.arc(W/2,H/2,10,0,7);g.fill();for(const [x,y] of [[0,0],[W,0],[0,H],[W,H]]){g.beginPath();g.arc(x,y,14,0,7);g.fill();}});
}
export function stripeTex(a,b,n=8,gold=false){return canvasTex(256,64,(g,W,H)=>{for(let i=0;i<n;i++){g.fillStyle=hex(i%2?b:a);g.fillRect(i*W/n,0,W/n,H);}if(gold){g.fillStyle='#e8b52c';for(let i=1;i<n;i++)g.fillRect(i*W/n-2,0,4,H);}g.fillStyle='rgba(0,0,0,.08)';g.fillRect(0,H-10,W,10);});}
export function glassTex(tint){return canvasTex(128,128,(g,W,H)=>{const gr=g.createLinearGradient(0,0,W,H);gr.addColorStop(0,hex(shade(tint,.35)));gr.addColorStop(1,hex(tint));g.fillStyle=gr;g.fillRect(0,0,W,H);g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=9;g.beginPath();g.moveTo(18,62);g.lineTo(62,18);g.stroke();g.lineWidth=5;g.beginPath();g.moveTo(34,78);g.lineTo(78,34);g.stroke();});}
export function grassTex(){const R=rng(77);return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#78c24a';g.fillRect(0,0,W,H);for(let i=0;i<260;i++){const x=R()*W,y=R()*H;g.strokeStyle=R()<.5?'#5ea83a':'#93d25e';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x+(R()-.5)*5,y-6-R()*5);g.stroke();}for(let i=0;i<30;i++){g.fillStyle='rgba(255,255,255,.1)';g.beginPath();g.ellipse(R()*W,R()*H,10+R()*16,6+R()*8,0,0,7);g.fill();}});}
export function cobbleTex(){const R=rng(55);return canvasTex(256,256,(g,W,H)=>{g.fillStyle='#8f8a80';g.fillRect(0,0,W,H);for(let y=0;y<8;y++)for(let x=-1;x<8;x++){const cx=x*34+(y%2)*17+17,cy=y*32+16;g.fillStyle=hex(shade(0xcfc6b4,(R()-.5)*.18));g.beginPath();g.ellipse(cx,cy,14+R()*2,12+R()*2,R(),0,7);g.fill();g.fillStyle='rgba(255,255,255,.25)';g.beginPath();g.ellipse(cx-3,cy-4,7,4,0,0,7);g.fill();}});}
function signTex(level){
 const T={1:{bg:'#a2835c',fg:'#3a2817',edge:'#6e5232'},2:{bg:'#fff3d8',fg:'#3d6e2a',edge:'#7a5230'},3:{bg:'#fff4df',fg:'#7a2416',edge:'#c98a1e'},4:{bg:'#fffaf0',fg:'#8a1f12',edge:'#d9a521'},5:{bg:'#7c1a14',fg:'#ffd75a',edge:'#ffd75a'}}[level];
 return canvasTex(512,180,(g,W,H)=>{g.fillStyle=T.bg;g.fillRect(0,0,W,H);
  if(level===1){g.strokeStyle='#7a5d3c';g.lineWidth=4;for(const y of [45,95,140]){g.beginPath();g.moveTo(0,y);g.lineTo(W,y+4);g.stroke();}g.fillStyle='rgba(60,40,20,.25)';g.fillRect(380,20,70,30);}
  else{g.strokeStyle=T.edge;g.lineWidth=8;g.strokeRect(14,14,W-28,H-28);}
  const cx=W/2;g.textAlign='center';g.textBaseline='middle';g.font='900 92px "Microsoft JhengHei","Noto Sans TC","PingFang TC",sans-serif';
  if(level>=2){g.fillStyle=level===2?'#5f9a3c':T.edge;const icon=(x)=>{g.save();g.translate(x,H/2);if(level===2){g.beginPath();g.ellipse(-8,0,12,22,-.6,0,7);g.ellipse(10,-2,12,22,.6,0,7);g.fill();}else{g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?11:26;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.fill();}g.restore();};icon(62);icon(W-62);}
  g.lineJoin='round';if(level>=3){g.strokeStyle=level===5?'#3a0c08':'#fff';g.lineWidth=10;g.strokeText('初光商會',cx,H/2+6);}g.fillStyle=T.fg;g.fillText('初光商會',cx,H/2+6);
 });
}

/* ---------- 每階配色 ---------- */
const STYLE={
 1:{wallOut:()=>plankTex({base:0x8c6a48,dark:0x4a3020,n:5,worn:6,seed:31,nails:true}),wallIn:()=>plankTex({base:0x9c7a55,dark:0x5a3c26,n:5,worn:4,seed:32}),cap:0x6e4c30,plinth:0x7c7064,trim:0x5c3e26,frame:0x5c3e26,glass:0x5b6e78,awning:[0xb39a78,0xe2d3b4],door:0x6e4c30,lamp:null,curtain:null},
 2:{wallOut:()=>plasterTex(0xf3e2bf,41),wallIn:()=>plasterTex(0xf6e8c8,42),cap:0x9a6438,plinth:0xb9ad98,trim:0x8a5a32,frame:0x4e8a3a,glass:0xa8dcef,awning:[0x5ea63f,0xfdf7e6],door:0x4e8a3a,lamp:0x9a6438,curtain:0x7fb84e},
 3:{wallOut:()=>plasterTex(0xf6ead0,51),wallIn:()=>plasterTex(0xf3e6c8,52),cap:0xcf9b3a,plinth:0xcfc2a6,trim:0xd9a521,frame:0xfaf3e4,glass:0xa8dcef,awning:[0xc8382a,0xfff4df],door:0x8a5a32,lamp:0xd9a521,curtain:0xc8553f},
 4:{wallOut:()=>stoneTex({base:0xfbf8f0,mortar:0xe2dccd,rows:5,cols:3,seed:61,rough:.05}),wallIn:()=>plasterTex(0xf7f3e8,62),cap:0xe3b232,plinth:0xe8e2d4,trim:0xe3b232,frame:0xffffff,glass:0x9fd4f0,awning:[0xc22d1c,0xfffaf0],door:0xffffff,lamp:0xe3b232,curtain:0x3f6f8c},
 5:{wallOut:()=>stoneTex({base:0xfffcf4,mortar:0xeedfb8,rows:5,cols:2,seed:71,rough:.04}),wallIn:()=>plasterTex(0xfbf3df,72),cap:0xf2c12e,plinth:0xf3ead6,trim:0xf2c12e,frame:0xf2c12e,glass:0x9fd4f0,awning:[0xa8171a,0xf2c12e],door:0xf2c12e,lamp:0xf2c12e,curtain:0x8a1f2a}};

/* ---------- 主程式 ---------- */
export const LINE_WIDTH=1.15;
/* 靜態物件：把所有網格的硬邊合併成一條粗細固定的外框線 */
export function addOutline(root,width){const meshes=[];root.traverse(o=>{if(o.isMesh&&o.userData.noLine)o.userData.noOutline=true;});const c=addIllustratedOutline(THREE,root,{color:INK,thickness:CFG.outline});root.traverse(o=>{if(o.isMesh)o.userData.noOutline=true;});(root.userData.contours||=[]).push(c);return {resolution:{set(){}}};}
/* 圓形物件與角色：背面外擴的外框殼 */
const hullMats=new Map();
export function hull(mesh,th=.014){let mat=hullMats.get(th);if(!mat){mat=new THREE.MeshBasicMaterial({color:INK,side:THREE.BackSide});mat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <begin_vertex>','vec3 transformed = position + normal * '+th.toFixed(4)+';');};hullMats.set(th,mat);}
 const h=new THREE.Mesh(mesh.geometry,mat);h.userData.noLine=true;h.userData.isHull=true;mesh.add(h);mesh.userData.noLine=true;return h;}
export function buildShell(level,opts={}){
 GROUND=opts.ground??-.42;const L={...LEVELS[level],...(opts.w?{w:opts.w}:{}),...(opts.d?{d:opts.d}:{})},S=STYLE[level],{w,d,H,t}=L,root=new THREE.Group();root.name='shop-lv'+level;
 const doorX=opts.doorX||0,low=!!opts.lowWalls,LOWH=.55;let P=root;
 const mats=new Map(),R=rng(level*97+5);
 const toon=(color,o={})=>{const k=color+JSON.stringify(o);if(!mats.has(k)){const m=new THREE.MeshToonMaterial({color,gradientMap:ramp(),...o});if(CFG.linear){m.color.convertSRGBToLinear();m.emissive?.convertSRGBToLinear();}mats.set(k,m);}return mats.get(k);};
 const texMat=(tex,rx,ry,o={})=>{const m=tex.clone();m.needsUpdate=true;m.repeat.set(rx,ry);return new THREE.MeshToonMaterial({map:m,gradientMap:ramp(),...o});};
 const add=(geo,mat,x=0,y=0,z=0,parent=P,noLine=false)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;if(noLine)o.userData.noLine=true;parent.add(o);return o;};
 const box=(bw,bh,bd,mat,x,y,z,parent=P,noLine)=>add(new THREE.BoxGeometry(bw,bh,bd),mat,x,y,z,parent,noLine);
 const cyl=(r1,r2,h,mat,x,y,z,parent=P,seg=16)=>add(new THREE.CylinderGeometry(r1,r2,h,seg),mat,x,y,z,parent);
 const worn=level===1;

 /* 地基與地板 */
 const plinthMat=texMat(stoneTex({base:S.plinth,mortar:shade(S.plinth,-.25),rows:2,cols:4,seed:level*13,rough:worn?.3:.12}),(w+2*t)/2,1);
 box(w+2*t+.36,-GROUND,d+2*t+.36,plinthMat,0,GROUND/2,0);
 const floor=box(w,.06,d,texMat(floorTex(level),w/(level<=2?2.4:2),d/(level<=2?2.4:2)),0,-.03,0);floor.castShadow=false;

 /* 牆：面順序 +x,-x,+y,-y,+z,-z */
 const wallOutTex=S.wallOut(),wallInTex=S.wallIn(),capM=toon(S.cap);
 const wallMats=(len,h,innerFace,outerFace)=>{const a=Array(6).fill(capM);const u=level===1?len/2.2:len/2.6,v=h/(level===1?2.2:2.6);for(let i=0;i<6;i++){if(i===innerFace)a[i]=texMat(wallInTex,u,v);if(i===outerFace)a[i]=texMat(wallOutTex,u,v);}return a;};
 const wallX=(len,h,x,y,z,inner,outer)=>add(new THREE.BoxGeometry(len,h,t),wallMats(len,h,inner,outer),x,y,z);
 const wallZ=(len,h,x,y,z,inner,outer)=>add(new THREE.BoxGeometry(t,h,len),wallMats(len,h,inner,outer),x,y,z);
 const zb=-d/2-t/2,zf=d/2+t/2,full=d+2*t;
 const HB=low?LOWH:H;wallX(w,HB,0,HB/2,zb,4,5);
 wallZ(full,H,-w/2-t/2,H/2,0,0,1);wallZ(full,HB,w/2+t/2,HB/2,0,1,0);
 const DW=worn?1.05:level>=4?2.1:1.8,DH=worn?1.85:2.05;
 const segL=[-w/2,doorX-DW/2],segR=[doorX+DW/2,w/2];for(const [a,b] of [segL,segR])wallX(b-a,H,(a+b)/2,H/2,zf,5,4);
 wallX(DW,H-DH,doorX,DH+(H-DH)/2,zf,5,4);
 const mid=s=>s<0?(segL[0]+segL[1])/2:(segR[0]+segR[1])/2,spots=s=>{const [a,b]=s<0?segL:segR,len=b-a-1.1,n=Math.max(1,Math.floor(len/2.3));return Array.from({length:n},(_,i)=>a+.55+len*(i+.5)/n);};
 /* 牆頂收邊（剖面上緣） */
 const capH=worn?.1:.13,capW=t+.1;
 const capMat=toon(level>=4?S.cap:S.cap);
 box(w+2*t+.1,capH,capW,capMat,0,HB+capH/2,zb);box(w+2*t+.1,capH,capW,capMat,0,H+capH/2,zf);
 for(const s of[-1,1]){const hh=s>0?HB:H;box(capW,capH,full,capMat,s*(w/2+t/2),hh+capH/2,0);}
 if(worn&&!low){/* 第一階：牆頂斷裂、缺口 */for(const [x,z,l] of [[-1.6,zb,.9],[w/2+t/2,-.9,.7]]){const g=box(z===zb?l:capW+.02,capH+.02,z===zb?capW+.02:l,toon(0x3e2a1a),x,H+capH/2+.005,z);g.userData.noLine=true;}}
 /* 室內踢腳板 */
 if(!worn){const bb=toon(shade(S.cap,-.1));box(w,.14,.04,bb,0,.07,-d/2+.02);box(w,.14,.04,bb,0,.07,d/2-.02);for(const s of[-1,1])box(.04,.14,d,bb,s*(w/2-.02),.07,0);}

 /* 牆面掛件：組件本地朝 +z，放到指定面上 */
 const face=(where,u,y,node)=>{const p={backIn:[u,y,-d/2,0],frontOut:[u,y,d/2+t,0],frontIn:[u,y,d/2,Math.PI],leftIn:[-w/2,y,u,Math.PI/2],rightIn:[w/2,y,u,-Math.PI/2],leftOut:[-w/2-t,y,u,-Math.PI/2],rightOut:[w/2+t,y,u,Math.PI/2],backOut:[u,y,-d/2-t,Math.PI]}[where];node.position.set(p[0],p[1],p[2]);node.rotation.y=p[3];root.add(node);return node;};
 const glassMat=new THREE.MeshToonMaterial({map:glassTex(S.glass),gradientMap:ramp()});
 const windowNode=(ww,wh,{arched=level>=3,boarded=false,curtain=null,flowers=false,shutters=false}={})=>{
  const g=new THREE.Group(),fm=toon(S.frame),fw=.09;
  box(ww,wh,.03,glassMat,0,0,.015,g,true);
  if(arched){const sh=new THREE.Shape();sh.absarc(0,0,ww/2,0,Math.PI,false);sh.lineTo(ww/2,0);const ag=add(new THREE.ShapeGeometry(sh,24),glassMat,0,wh/2,.031,g,true);
   const ring=new THREE.Shape();ring.absarc(0,0,ww/2+fw,0,Math.PI,false);ring.lineTo(-ww/2,0);const hole=new THREE.Path();hole.absarc(0,0,ww/2,Math.PI,0,true);hole.lineTo(-ww/2,0);ring.holes.push(hole);
   add(new THREE.ExtrudeGeometry(ring,{depth:.1,bevelEnabled:false,curveSegments:24}),fm,0,wh/2,0,g);if(level>=4){const k=box(.16,.22,.12,toon(S.trim),0,wh/2+ww/2+.08,.03,g);}}
  else box(ww+2*fw,fw,.1,fm,0,wh/2+fw/2,.05,g);
  for(const s of[-1,1])box(fw,wh+(arched?0:fw),.1,fm,s*(ww/2+fw/2),0,.05,g);
  box(ww+2*fw,fw,.1,fm,0,-wh/2-fw/2,.05,g);
  box(.05,wh,.06,fm,0,0,.05,g);box(ww,.05,.06,fm,0,arched?wh*.1:0,.05,g);
  box(ww+.36,.08,.2,toon(shade(S.cap,.05)),0,-wh/2-fw-.04,.1,g);
  if(boarded){const pm=toon(0xa58660);for(const [r,y] of [[.42,.1],[-.38,-.12]]){const p=box(ww+.4,.16,.05,pm,0,y,.14,g);p.rotation.z=r;}}
  if(shutters){const sm=toon(shade(S.frame,-.08));for(const s of[-1,1]){const sp=box(ww/2,wh+.1,.05,sm,s*(ww*.75+fw+.04),0,.04,g);for(let y=-wh/2+.12;y<wh/2;y+=.16)box(ww/2-.08,.03,.03,toon(shade(S.frame,.18)),s*(ww*.75+fw+.04),y,.075,g,true);}}
  if(curtain!==null){const cm=toon(curtain);for(const s of[-1,1]){const c=box(ww*.28,wh+.25,.06,cm,s*(ww/2-ww*.1),.05,.13,g);c.scale.x=1;const tie=box(ww*.3,.06,.08,toon(shade(curtain,.4)),s*(ww/2-ww*.1),-.15,.16,g,true);}cyl(.025,.025,ww+.5,toon(S.trim),0,wh/2+(arched?ww/2*.3:0)+.18,.13,g,8).rotation.z=Math.PI/2;
   const val=box(ww+.3,.2,.06,cm,0,wh/2+(arched?ww/2*.3:0)+.08,.15,g);}
  if(flowers){const fb=toon(level===2?0x9a6438:shade(S.plinth,-.05));box(ww+.3,.26,.3,fb,0,-wh/2-fw-.25,.2,g);for(let i=0;i<6;i++){const x=-ww/2+(i+.5)*ww/6;const leaf=add(new THREE.SphereGeometry(.15,10,8),toon(i%2?0x5f9a3c:0x74b04a),x,-wh/2-fw-.06,.22,g);leaf.scale.set(1.1,.8,1);const f=add(new THREE.SphereGeometry(.075,8,6),toon([0xf27a8a,0xffffff,0xf7c840][i%3]),x+.04,-wh/2-fw+.06,.3,g,true);}}
  return g;};
 const sconce=()=>{const g=new THREE.Group(),m=toon(S.lamp);box(.08,.3,.06,m,0,0,.03,g);box(.06,.06,.22,m,0,.08,.13,g);const glow=box(.18,.24,.18,toon(0xffe08a,{emissive:0xffb648,emissiveIntensity:.6}),0,.0,.25,g);const cap=add(new THREE.ConeGeometry(.17,.14,4),m,0,.19,.25,g);cap.rotation.y=Math.PI/4;box(.14,.04,.14,m,0,-.14,.25,g);return g;};
 const banner=(len=1.2)=>{const g=new THREE.Group(),sh=new THREE.Shape(),bw=.32;sh.moveTo(-bw,0);sh.lineTo(bw,0);sh.lineTo(bw,-len);sh.lineTo(0,-len-.26);sh.lineTo(-bw,-len);sh.closePath();add(new THREE.ExtrudeGeometry(sh,{depth:.04,bevelEnabled:false}),toon(S.awning[0]),0,0,.02,g);cyl(.03,.03,bw*2+.24,toon(S.trim),0,.02,.06,g,8).rotation.z=Math.PI/2;const st=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.07:.16;st.lineTo(Math.cos(a)*r,Math.sin(a)*r);}add(new THREE.ExtrudeGeometry(st,{depth:.03,bevelEnabled:false}),toon(S.trim),0,-len*.5,.06,g);return g;};

 /* 門 */
 const doorG=new THREE.Group();doorG.position.x=doorX;root.add(doorG);P=doorG;
 const door=new THREE.Group();
 if(worn){const dm=texMat(plankTex({base:0x7a5838,dark:0x3e2a1a,n:4,worn:5,seed:91,nails:true}),1,1);box(DW-.06,DH-.04,.08,dm,0,DH/2,0,door);box(DW-.1,.12,.1,toon(0x5c3e26),0,DH*.72,.05,door);box(DW-.1,.12,.1,toon(0x5c3e26),0,DH*.25,.05,door);const brace=box(.1,DH*.6,.08,toon(0x5c3e26),0,DH*.49,.06,door);brace.rotation.z=.48;cyl(.04,.04,.06,toon(0x2e2a26),DW/2-.18,DH*.5,.11,door,8).rotation.x=Math.PI/2;door.rotation.z=.012;}
 else{const fm=toon(S.door);for(const s of[-1,1]){const leaf=new THREE.Group();leaf.position.x=s*DW/4;door.add(leaf);const lw=DW/2-.03;box(lw-.14,DH-.42,.03,glassMat,0,DH/2+.1,0,leaf,true);for(const ss of[-1,1])box(.08,DH,.08,fm,ss*(lw/2-.04),DH/2,0,leaf);box(lw,.08,.08,fm,0,DH-.04,0,leaf);box(lw,.32,.08,fm,0,.16,0,leaf);box(lw,.06,.08,fm,0,DH*.58,0,leaf);cyl(.025,.025,.42,toon(level>=3?S.trim:0xd9a521),-s*(lw/2-.18),DH*.52,.07,leaf,8);}}
 door.position.set(0,0,d/2+t/2);P.add(door);
 /* 門框 */
 {const fm=toon(worn?0x5c3e26:level>=4?S.trim:S.cap),fz=d/2+t+.04;for(const s of[-1,1])box(.14,DH+.1,.1,fm,s*(DW/2+.07),(DH+.1)/2,fz);box(DW+.28,.16,.12,fm,0,DH+.08,fz);
  if(!worn){/* 室內門框 */for(const s of[-1,1])box(.1,DH+.05,.06,fm,s*(DW/2+.05),(DH+.05)/2,d/2-.03);box(DW+.2,.1,.06,fm,0,DH+.05,d/2-.03);}}

 /* 台階 */
 const nSteps=Math.max(2,Math.ceil(-GROUND/.16)),stepM=texMat(stoneTex({base:shade(S.plinth,.05),mortar:shade(S.plinth,-.2),rows:1,cols:3,seed:5}),1.5,.4);
 for(let i=0;i<nSteps;i++){const sw=DW+.9+(nSteps-i)*.25+(level>=4?.6:0),hgt=-GROUND*(i+1)/nSteps;box(sw,hgt,.36,stepM,0,GROUND+hgt/2,d/2+t+.18+.18+(nSteps-1-i)*.36);}
 if(level>=4){/* 紅毯沿台階 */const cm=toon(0xb5201a);for(let i=0;i<nSteps;i++){const hgt=-GROUND*(i+1)/nSteps;box(DW-.4,.02,.36,cm,0,GROUND+hgt+.01,d/2+t+.36+(nSteps-1-i)*.36,P,true);}box(DW-.4,.02,.18,cm,0,.012,d/2+t+.09,P,true);}

 /* 雨篷 */
 if(true){
  const aw=worn?DW+1.1:DW+(level>=4?2.2:1.6),ad=worn?.75:level>=4?1.05:.95,drop=.42,ay=DH+.42,z0=d/2+t;
  const stripes=Math.round(aw/.36)|1,stex=stripeTex(S.awning[0],S.awning[1],stripes,level===5);stex.repeat.set(1,1);
  const top=new THREE.Mesh(new THREE.BoxGeometry(aw,.05,Math.hypot(ad,drop)),new THREE.MeshToonMaterial({map:stex,gradientMap:ramp()}));
  top.position.set(0,ay-drop/2,z0+ad/2);top.rotation.x=Math.atan2(drop,ad);top.castShadow=top.receiveShadow=true;P.add(top);
  if(worn){/* 第一階：破洞、垂下的布 */const hole=box(.35,.06,.28,toon(0x3e2a1a),aw*.22,ay-drop*.55,z0+ad*.55,P,true);hole.rotation.x=top.rotation.x;}
  const sw=aw/stripes;for(let i=0;i<stripes;i++){if(worn&&(i===1||i===stripes-2))continue;const sh=new THREE.Shape();sh.moveTo(-sw/2,0);sh.absarc(0,0,sw/2,Math.PI,2*Math.PI,false);sh.lineTo(-sw/2,0);const sc=add(new THREE.ExtrudeGeometry(sh,{depth:.035,bevelEnabled:false,curveSegments:10}),toon(i%2?S.awning[1]:S.awning[0]),-aw/2+sw*(i+.5),ay-drop-.02,z0+ad-.02);if(worn&&i===3)sc.rotation.z=.4;}
  if(level>=4)box(aw+.06,.06,.06,toon(S.trim),0,ay-drop+.02,z0+ad,P);
  for(const s of[-1,1]){const arm=cyl(.025,.025,Math.hypot(ad,drop),toon(worn?0x4a3020:S.trim),s*(aw/2-.06),ay-drop/2-.08,z0+ad/2,P,6);arm.rotation.x=Math.PI/2-Math.atan2(drop,ad);}
 }

 /* 招牌：立在門面牆頂 */
 {const sw=[0,1.9,2.6,3.2,3.7,4.3][level],sh=sw*.35,sy=H+capH+sh/2+(worn?.02:.08),sz=d/2+t/2;
  const frame=box(sw+.22,sh+.22,.16,toon(worn?0x5c3e26:level===2?0x8a5a32:S.trim),0,sy,sz);const sign=add(new THREE.PlaneGeometry(sw,sh),new THREE.MeshBasicMaterial({map:signTex(level)}),0,sy,sz+.085,P,true);
  if(worn){frame.rotation.z=sign.rotation.z=-.06;}
  for(const s of[-1,1])box(.1,.2,.1,toon(worn?0x5c3e26:S.cap),s*sw*.32,H+capH+.1,sz);
  if(level===2){/* 葉片徽章 */const lf=add(new THREE.SphereGeometry(.2,12,8),toon(0x6aac46),0,sy+sh/2+.22,sz);lf.scale.set(1.4,.9,.35);}
  if(level>=3){const crest=new THREE.Shape(),cr=sw*.5+.25;crest.moveTo(-cr,0);crest.absarc(0,0,cr,Math.PI,0,true);crest.lineTo(-cr,0);const cm=add(new THREE.ExtrudeGeometry(crest,{depth:.1,bevelEnabled:false,curveSegments:28}),toon(level===5?0xfff4dc:shade(S.plinth,.06)),0,sy-.02,sz-.14);cm.scale.y=level===3?.62:.72;
   const rim=add(new THREE.TorusGeometry(cr,.06,8,32,Math.PI),toon(S.trim),0,sy-.02,sz-.06);rim.scale.y=cm.scale.y;}
  if(level>=4){/* 水晶 */const top=sy+(sw*.5+.25)*(level===3?.62:.72);const cry=add(new THREE.OctahedronGeometry(.32),new THREE.MeshToonMaterial({color:0x9fdcff,emissive:0x4aa8ff,emissiveIntensity:.35,gradientMap:ramp()}),0,top+.42,sz-.08);cry.scale.y=1.4;
   for(const s of[-1,1]){const wing=add(new THREE.SphereGeometry(.22,12,8),toon(S.trim),s*.36,top+.12,sz-.08);wing.scale.set(1.3,.5,.35);}box(.3,.16,.16,toon(S.trim),0,top+.05,sz-.08);}
 }

 P=root;
 /* 立面窗、壁燈、花台 */
 if(level<=3){
  const ww=worn?.9:level===2?1.05:1.2,wh=worn?.8:level===2?.95:1.05,wy=worn?1.15:1.35;
  for(const s of[-1,1]){face('frontOut',mid(s),wy,windowNode(ww,wh,{boarded:worn&&s<0,flowers:level>=2,shutters:level===2}));face('frontIn',mid(s),wy,windowNode(ww,wh,{curtain:S.curtain}));
   if(level>=2)face('frontOut',doorX+s*(DW/2+.38),DH*.78,sconce());}
  if(level===3)for(const s of[-1,1])face('frontOut',s*(w/2-.55),H-.05,banner(1.15));
 }else{
  const ww=level===4?1.15:1.1,wh=1.25,wy=1.3;
  for(const s of[-1,1])for(const x of spots(s)){face('frontOut',x,wy,windowNode(ww,wh,{flowers:true}));face('frontIn',x,wy,windowNode(ww,wh,{curtain:S.curtain}));}
  for(const s of[-1,1])face('frontOut',doorX+s*(DW/2+.42),DH*.8,sconce());
  for(const s of[-1,1]){const sp=spots(s);face('frontOut',sp.length>1?(sp[0]+sp[1])/2:s*(w/2-.4),H-.05,banner(level===5?1.4:1.25));}
 }
 /* 後牆與側牆內側的窗 */
 {const nb=[0,1,2,3,3,4][level],span=w-1.6,ww=worn?.85:level>=4?1.1:1,wh=worn?.75:level>=4?1.3:1.05,wy=worn?1.3:level>=4?1.55:1.45;
  if(!low)for(let i=0;i<nb;i++){const x=nb===1?.6:-span/2+span*(i+.5)/nb;face('backIn',x,wy,windowNode(ww,wh,{boarded:worn,curtain:worn?null:S.curtain}));face('backOut',x,wy,windowNode(ww,wh,{arched:level>=3}));
   if(!worn&&i<nb-1)face('backIn',x+span/nb/2,wy+.55,sconce());}
  const ns=level>=4?2:1;for(let i=0;i<ns;i++){const z=ns===1?-.4:(i?d*.2:-d*.22);for(const side of low?['leftIn']:['leftIn','rightIn'])face(side,z,wy,windowNode(ww,wh,{boarded:worn&&side==='rightIn',curtain:worn?null:S.curtain}));for(const side of low?['leftOut']:['leftOut','rightOut'])face(side,z,wy,windowNode(ww,wh,{}));}
 }

 /* 第一階的破損：補丁、裂縫、蜘蛛網 */
 if(worn){const pm=toon(0xa58660);for(const [where,u,y,wd,ht,r] of [['frontOut',-w/2+.55,.55,.5,.38,.1],['frontOut',w/2-.6,1.9,.42,.3,-.15],['leftOut',1.2,.7,.5,.35,.08]]){const g=new THREE.Group();const p=box(wd,ht,.04,pm,0,0,.02,g);p.rotation.z=r;for(const s of[-1,1])cyl(.025,.025,.03,toon(0x2e2a26),s*(wd/2-.06),0,.05,g,6).rotation.x=Math.PI/2;face(where,u,y,g);}
  for(const [x,z] of low?[]:[[-w/2+.02,-d/2+.02]]){const web=new THREE.Group();for(let i=0;i<5;i++){const a=i/4*Math.PI/2;const l=box(.6,.012,.012,toon(0xe8e4dc),Math.cos(a)*.3,-Math.sin(a)*.3,0,web,true);l.rotation.z=-a;}web.position.set(x+.02,H-.03,z+.02);web.rotation.y=-Math.PI/4;root.add(web);}
  /* 室內地板破洞 */for(const [x,z,r] of [[1.6,-1.2,.38],[-2.1,1.1,.28]]){const h=add(new THREE.CircleGeometry(r,10),toon(0x2a1c12),x,.002,z,root,true);h.rotation.x=-Math.PI/2;h.scale.y=.7;h.receiveShadow=false;h.castShadow=false;}
 }
 /* 第三階：石砌轉角 */
 if(level===3){const qm=texMat(stoneTex({base:0xe4d6b6,mortar:0xb8a682,rows:1,cols:1,seed:8}),1,1);for(const sx of[-1,1])for(const sz of[-1,1])for(let y=.18,i=0;y<((low&&(sx>0||sz<0))?HB:H);y+=.36,i++){const long=i%2?.55:.36;box(sx*sz>0?.42:.42,.32,long,qm,sx*(w/2+t+.02-.21+.02),y,sz*(d/2+t-long/2+.03));box(long,.32,.42,qm,sx*(w/2+t-long/2+.03),y,sz*(d/2+t+.02-.21+.02));}}
 /* 第四、五階：柱列 */
 if(level>=4){const pm=toon(level===5?0xfffaf0:0xffffff),gm=toon(S.trim),pz=d/2+t+.26,r=.21;
  const xs=[doorX-DW/2-.3,doorX+DW/2+.3,...(level===4?[-(w/2+t-.05),w/2+t-.05]:[])];
  for(const x of xs){cyl(r,r*1.05,H-.3,pm,x,(H-.3)/2+.12,pz,root,16);box(r*2.6,.14,r*2.6,toon(S.plinth),x,.07,pz);box(r*2.7,.16,r*2.7,gm,x,H-.1,pz);add(new THREE.TorusGeometry(r*1.02,.035,6,16),gm,x,H*.45,pz).rotation.x=Math.PI/2;}
  box(w+2*t+.3,.18,.62,gm,0,H+.09,pz-.12);}
 /* 第五階：四角塔樓與金色雉堞 */
 if(level===5){const tm=texMat(stoneTex({base:0xfffcf4,mortar:0xeedfb8,rows:5,cols:3,seed:74,rough:.04}),3,2),gm=toon(S.trim),rm=toon(0xb8241c),TR=1.0,TH=H+1.15;
  for(const sx of[-1,1])for(const sz of low?[1]:[-1,1]){const x=sx*(w/2+t*.5),z=sz*(d/2+t*.5);cyl(TR,TR*1.06,TH-GROUND,tm,x,(TH+GROUND)/2,z,root,24);cyl(TR+.12,TR+.12,.18,gm,x,TH+.09,z,root,24);
   for(let i=0;i<10;i++){const a=i/10*Math.PI*2;box(.24,.26,.2,gm,x+Math.cos(a)*(TR+.02),TH+.3,z+Math.sin(a)*(TR+.02)).rotation.y=-a;}
   const cone=add(new THREE.ConeGeometry(TR*.86,1.3,20),rm,x,TH+.86,z);add(new THREE.SphereGeometry(.1,10,8),gm,x,TH+1.58,z);
   const win=windowNode(.42,.62,{arched:true});const ang=Math.atan2(sx,sz);win.position.set(x+Math.sin(ang)*TR*1.02,1.5,z+Math.cos(ang)*TR*1.02);win.rotation.y=ang;root.add(win);}
  for(const [len,along,x,z] of low?[[w,'x',0,zf],[d,'z',-w/2-t/2,0]]:[[w,'x',0,zb],[w,'x',0,zf],[d,'z',-w/2-t/2,0],[d,'z',w/2+t/2,0]]){const n=Math.floor(len/.7);for(let i=0;i<n;i++){const p=-len/2+(i+.5)*len/n;if(along==='x'&&z===zf&&Math.abs(p-doorX)<2.6)continue;box(along==='x'?.3:capW+.02,.2,along==='x'?capW+.02:.3,gm,along==='x'?p:x,H+capH+.1,along==='x'?z:p);}}}

 const lineMat=addOutline(root);
 /* 正面牆一整片（牆、招牌、雨篷、窗、前方塔樓）：進店內視角時淡出，看得到門口一帶 */
 {root.updateMatrixWorld(true);const v=new THREE.Vector3(),cloned=new Map(),fadeMats=[],hulls=[];
  root.traverse(o=>{if(!o.isMesh||o.userData.illustratedOutline)return;if(!o.geometry.boundingSphere)o.geometry.computeBoundingSphere();v.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);if(v.z<=d/2-.12||v.y<=.12)return;
   const list=Array.isArray(o.material)?o.material:[o.material],next=list.map(m=>{if(!cloned.has(m)){const c=m.clone();c.transparent=true;fadeMats.push(c);cloned.set(m,c);}return cloned.get(m);});o.material=Array.isArray(o.material)?next:next[0];
   for(const s of o.parent.children)if(s.userData.illustratedOutline&&s.geometry===o.geometry)hulls.push(s);});
  root.userData.setFrontFade=a=>{for(const m of fadeMats){m.opacity=a;m.depthWrite=a>.95;}for(const h of hulls)h.visible=a>.6;};}
 root.userData={...root.userData,level,name:L.name,lineMat,size:{w:w+2*t,d:d+2*t+1.6}};
 return root;
}

/* 草地與門前步道（不含人物與擺設） */
export function buildGround(){const g=new THREE.Group(),gt=grassTex();gt.repeat.set(30,30);
 const lawn=new THREE.Mesh(new THREE.PlaneGeometry(120,120),new THREE.MeshToonMaterial({map:gt,gradientMap:ramp()}));lawn.rotation.x=-Math.PI/2;lawn.position.y=GROUND;lawn.receiveShadow=true;g.add(lawn);return g;}
export function buildPath(level){const L=LEVELS[level],{d,t}=L,ct=cobbleTex(),g=new THREE.Group();
 const steps=Math.max(2,Math.ceil(-GROUND/.16)),start=d/2+t+.36+steps*.36,len=4.2,pw=(level===1?1.8:level>=4?3.4:2.6);
 const m=(rx,ry)=>{const x=ct.clone();x.needsUpdate=true;x.repeat.set(rx,ry);return new THREE.MeshToonMaterial({map:x,gradientMap:ramp()});};
 const p=new THREE.Mesh(new THREE.BoxGeometry(pw,.04,len),m(pw/1.2,len/1.2));p.position.set(0,GROUND+.02,start+len/2);p.receiveShadow=true;g.add(p);
 const road=new THREE.Mesh(new THREE.BoxGeometry(60,.04,2.6),m(60/1.2,2.6/1.2));road.position.set(0,GROUND+.021,start+len+1.3);road.receiveShadow=true;g.add(road);
 if(level>=2)for(const s of[-1,1]){const e=new THREE.Mesh(new THREE.BoxGeometry(.12,.08,len),new THREE.MeshToonMaterial({color:0xb8ad9a,gradientMap:ramp()}));e.position.set(s*(pw/2+.06),GROUND+.04,start+len/2);g.add(e);}
 return g;}

/* 商會的燈光比檢視頁亮、還有 ACES 色調：Q 版材質不吃色調映射，顏色再壓暗一點，才會跟原圖一樣飽和 */
export function tune(root,gain=CFG.gain??.62){const seen=new Set();root.traverse(o=>{if(!o.material)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(seen.has(m)||m.userData.tuned)continue;seen.add(m);m.userData.tuned=true;if(m.isMeshToonMaterial){m.color.multiplyScalar(gain);m.toneMapped=false;}else if(m.isMeshBasicMaterial&&!o.userData.isHull&&!o.userData.illustratedOutline){m.toneMapped=false;}}});return root;}
