/* 初光商會外圍：藤蔓木圍籬、自動大門與看門狗「招財」。全部程序建模，零件合併成單一網格再上輪廓，手機也只多幾個 draw call。 */
(() => {
'use strict';
const WOOD=0xb8682a,WOOD_D=0x8a4a1c,STONE=0xe6d6bb,STONE_D=0xc8b596,VINE=0x5f9c2c,LEAF=0x86c43a,PETAL=0xfff6e2,YOLK=0xf4c42a,RED=0xd8301f,RED_D=0xa81f14,GOLD=0xf2b81e,COAT=0xf6c63d,CREAM=0xfdeccb,INK=0x2a1a12,BROWN=0x8a4f22,PINK=0xf0707a,WHITE=0xffffff;
const PANEL=2.9,HEIGHT=1.5,LIT=.62,GATE_DEPTH=.9,FACE_DOOR=Math.atan2(2.6,-3.4),DOG_Y=.1;
/* 依顏色寫入頂點色，所有零件併成一個 BufferGeometry。 */
function builder(T){
 const pos=[],nor=[],col=[],m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),c=new T.Color(),n3=new T.Matrix3();
 function put(geo,color,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));n3.getNormalMatrix(m);c.setHex(color);const v=new T.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(n3).normalize();nor.push(v.x,v.y,v.z);col.push(c.r*LIT,c.g*LIT,c.b*LIT);}}
 function mesh(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));const o=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true}));o.castShadow=true;return o;}
 return{put,mesh};
}
function shapes(T){return{box:new T.BoxGeometry(1,1,1),ball:new T.SphereGeometry(1,10,7),low:new T.SphereGeometry(1,6,4),cyl:new T.CylinderGeometry(1,1,1,10),disc:new T.CylinderGeometry(1,1,1,16),dome:new T.SphereGeometry(1,14,8,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.09,6,16)};}
/* 一段圍籬：木柱、上下橫木、交叉格柵，加上藤蔓與葉片 */
function panel(b,S,x,z,alongX,seed){
 const at=(u,v=0)=>alongX?[x+u,z+v]:[x+v,z+u],ry=alongX?0:Math.PI/2,[px,pz]=at(0);
 b.put(S.box,STONE,px,.16,pz,.56,.32,.56);b.put(S.box,WOOD,px,.82,pz,.28,HEIGHT-.1,.28);b.put(S.box,WOOD_D,px,HEIGHT+.02,pz,.4,.14,.4);b.put(S.low,LEAF,px,HEIGHT+.22,pz,.17,.22,.17);
 for(const y of [.46,1.16]){const [rx,rz]=at(PANEL/2);b.put(S.box,WOOD,rx,y,rz,alongX?PANEL:.14,.17,alongX?.14:PANEL);}
 const [mx,mz]=at(PANEL/2),len=Math.hypot(PANEL-.3,.72)*.98,tilt=Math.atan2(.72,PANEL-.3);
 for(const s of [-1,1])b.put(S.box,WOOD_D,mx,.81,mz,len,.11,.08,0,ry,s*tilt);
 for(let i=0;i<4;i++){const u=.35+i*.72,[vx,vz]=at(u,.11),y=1.16+Math.sin(i*1.9+seed)*.1;b.put(S.low,VINE,vx,y,vz,.11,.09,.11);if((i+seed)%2===0){const[lx,lz]=at(u+.12,.17);b.put(S.low,LEAF,lx,y+.12,lz,.17,.07,.12,.5,seed,.4);}}
 if(seed%3===0){const[fx,fz]=at(PANEL*.62,.2);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;b.put(S.low,PETAL,fx+(alongX?Math.cos(a)*.1:0),.84+Math.sin(a)*.1,fz+(alongX?0:Math.cos(a)*.1),.09,.09,.05);}b.put(S.low,YOLK,fx,.84,fz,.06,.06,.07);}
}
function buildFence(T,LOT,S){
 const b=builder(T),north=LOT.minZ+GATE_DEPTH,south=LOT.maxZ-.25,east=LOT.maxX-.25,west=LOT.minX+.25;let seed=0;
 const run=(from,to,fixed,alongX)=>{const n=Math.max(1,Math.round(Math.abs(to-from)/PANEL)),step=(to-from)/n;for(let i=0;i<n;i++){const u=from+i*step;if(alongX){panelAt(u,fixed,true,step);}else panelAt(fixed,u,false,step);}};
 const panelAt=(x,z,alongX,step)=>{const flip=step<0;panel(b,S,alongX?(flip?x+step:x):x,alongX?z:(flip?z+step:z),alongX,seed++);};
 run(-LOT.gate-1,west,north,true);run(LOT.gate+1,east,north,true);run(north,south,west,false);run(north,south,east,false);run(west,east,south,true);
 return b.mesh();
}
function buildGate(T,LOT,S,root){
 const b=builder(T),z=LOT.minZ+GATE_DEPTH,g=LOT.gate,px=g+.42;
 for(const s of [-1,1]){const x=s*px;b.put(S.box,STONE_D,x,.2,z,1.14,.4,1.14);b.put(S.box,STONE,x,1.26,z,.9,1.8,.9);for(const y of [.72,1.26,1.8])b.put(S.box,STONE_D,x,y,z,.93,.04,.93);b.put(S.box,WOOD,x,2.28,z,1.12,.22,1.12);b.put(S.box,WOOD_D,x,2.52,z,.46,.26,.46);b.put(S.box,WOOD,x,3,z,.62,.12,.62);b.put(S.dome,WOOD,x,3.05,z,.4,.28,.4);for(const [dx,dz] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]])b.put(S.box,WOOD_D,x+dx,2.78,z+dz,.05,.44,.05);}
 for(let i=0;i<=20;i++){const a=i/20*Math.PI,x=Math.cos(a)*px,y=2.3+Math.sin(a)*1.75,t=Math.atan2(Math.sin(a)*1.75,Math.cos(a)*px);b.put(S.box,WOOD,x,y,z,.72,.3,.32,0,0,a+Math.PI/2);if(i%2===0)b.put(S.low,VINE,x+.08,y+.16,z+.14,.15,.13,.15);if(i%3===0)b.put(S.low,LEAF,x-.06,y+.26,z+.18,.27,.09,.17,.4,i,.5);if(i===6||i===14){for(let k=0;k<5;k++){const q=k/5*Math.PI*2;b.put(S.low,PETAL,x+Math.cos(q)*.17,y+.2+Math.sin(q)*.17,z+.26,.14,.14,.06);}b.put(S.low,YOLK,x,y+.2,z+.3,.09,.09,.07);}}
 /* 郵筒掛在右柱 */
 b.put(S.box,RED,px,1.46,z+.56,.62,.5,.26);b.put(S.cyl,RED_D,px,1.71,z+.56,.31,.26,.31,0,0,Math.PI/2);b.put(S.box,CREAM,px,1.44,z+.7,.34,.2,.03);
 const fixed=b.mesh();root.add(fixed);
 const glass=new T.MeshBasicMaterial({color:0xffd66b,toneMapped:false}),lamps=[];for(const s of [-1,1]){const l=new T.Mesh(new T.BoxGeometry(.3,.36,.3),glass);l.position.set(s*px,2.78,z);root.add(l);lamps.push(l);}
 const leaves=[-1,1].map(s=>{const h=new T.Group();h.position.set(s*(g+.02),0,z);const w=builder(T),d=-s,W=g-.04;for(const y of [.34,2.02])w.put(S.box,WOOD,d*W/2,y,0,W,.22,.16);w.put(S.box,WOOD,d*.1,1.2,0,.22,1.9,.16);w.put(S.box,WOOD,d*(W-.1),1.15,0,.22,1.8,.16);for(let i=0;i<3;i++){const u=.8+i*.85;w.put(S.ring,VINE,d*u,.86+i%2*.42,0,.38,.38,.5);w.put(S.low,LEAF,d*u,1.26-i%2*.32,.06,.2,.09,.12,.4,i,.3);}w.put(S.box,GOLD,d*(W-.5),1.15,.08,.26,.26,.06,0,0,Math.PI/4);const o=w.mesh();h.add(o);root.add(h);return{h,s};});
 return{leaves,glass,lamps};
}
/* 招財：比照設定圖的金毛柴犬＋紅帽紅袍，頭身分開才能點頭、搖尾巴 */
/* 金幣圓面 */
function coinTexture(T){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),d=g.createRadialGradient(100,90,20,128,128,130);d.addColorStop(0,'#fff0a0');d.addColorStop(.55,'#ffc61e');d.addColorStop(1,'#d98a0a');g.fillStyle=d;g.fillRect(0,0,256,256);g.lineWidth=14;g.strokeStyle='#a9680c';g.beginPath();g.arc(128,128,106,0,7);g.stroke();g.lineWidth=4;g.strokeStyle='#ffe58a';g.beginPath();g.arc(128,128,92,0,7);g.stroke();g.fillStyle='#8a4f10';g.font='900 74px "Microsoft JhengHei",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('招',128,88);g.fillText('財',128,168);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;return t;}
/* 表情圖集：五官全畫在貼著頭部的曲面上，不再凸出臉部。4 欄 2 列，用貼圖位移切換 */
const FACES=['idle','blink','happy','talk','shout','star','sad','wow'];
function faceTexture(T){
 const C=512,c=document.createElement('canvas');c.width=C*4;c.height=C*2;const g=c.getContext('2d'),INK='#1c0f08';g.lineCap=g.lineJoin='round';
 const eye=(x,y)=>{g.fillStyle=INK;g.beginPath();g.ellipse(x,y,31,38,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-9,y-14,11,0,7);g.fill();g.beginPath();g.arc(x+9,y+12,5,0,7);g.fill();};
 const line=(pts,w=10,col=INK)=>{g.strokeStyle=col;g.lineWidth=w;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
 const arc=(x,y,r,a,b,w=10)=>{g.strokeStyle=INK;g.lineWidth=w;g.beginPath();g.arc(x,y,r,a,b);g.stroke();};
 const mouth=(y,w,h)=>{g.fillStyle='#7a1410';g.beginPath();g.ellipse(256,y,w,h,0,0,7);g.fill();g.fillStyle='#f0707a';g.beginPath();g.ellipse(256,y+h*.42,w*.66,h*.5,0,0,7);g.fill();};
 const star=(x,y,r)=>{g.fillStyle='#ffc21a';g.strokeStyle=INK;g.lineWidth=6;g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.45:r;g[i?'lineTo':'moveTo'](x+Math.cos(a)*q,y+Math.sin(a)*q);}g.closePath();g.fill();g.stroke();};
 const draw={
  idle(){eye(150,210);eye(362,210);arc(256,330,44,.25,Math.PI-.25);line([[256,314],[256,330]],8);},
  blink(){arc(150,226,36,Math.PI+.35,-.35);arc(362,226,36,Math.PI+.35,-.35);arc(256,330,44,.25,Math.PI-.25);line([[256,314],[256,330]],8);},
  happy(){arc(150,226,36,Math.PI+.2,-.2,12);arc(362,226,36,Math.PI+.2,-.2,12);mouth(350,50,36);},
  talk(){eye(150,210);eye(362,210);mouth(346,34,28);},
  shout(){line([[108,160],[188,196]],14);line([[404,160],[324,196]],14);eye(150,226);eye(362,226);mouth(356,62,48);},
  star(){star(150,214,52);star(362,214,52);mouth(354,66,52);},
  sad(){line([[112,196],[180,168]],10);line([[400,196],[332,168]],10);eye(150,230);eye(362,230);arc(256,372,36,Math.PI+.4,-.4);},
  wow(){eye(150,204);eye(362,204);g.fillStyle='#7a1410';g.beginPath();g.ellipse(256,352,26,34,0,0,7);g.fill();}
 };
 FACES.forEach((name,i)=>{g.save();g.translate((i%4)*C,Math.floor(i/4)*C);g.fillStyle='#fffaf0';g.beginPath();g.ellipse(256,348,150,112,0,0,7);g.fill();g.fillStyle='rgba(255,140,120,.55)';for(const x of[74,438]){g.beginPath();g.ellipse(x,300,40,24,0,0,7);g.fill();}g.fillStyle=INK;g.beginPath();g.ellipse(256,288,36,25,0,0,7);g.fill();g.fillStyle='rgba(255,255,255,.75)';g.beginPath();g.ellipse(244,279,10,6,0,0,7);g.fill();draw[name]();g.restore();});
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;t.repeat.set(.25,.5);return t;
}
/* 招財：關節比照主角（hips、chest、head、upperArm、forearm、hand、thigh、shin、foot），再加耳朵與三節尾巴。
   每段各自合併成一個網格，全部用平滑曲面，沒有方塊零件。 */
function dogShapes(T){const lathe=(pts,seg=26)=>{const g=new T.LatheGeometry(pts.slice().reverse().map(([r,y])=>new T.Vector2(r,y)),seg);g.computeVertexNormals();return g;};
 return{ball:new T.SphereGeometry(1,18,14),dome:new T.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.1,10,30),rod:new T.CylinderGeometry(1,1,1,12),
  robe:lathe([[.001,.5],[.2,.5],[.27,.46],[.32,.36],[.37,.22],[.42,.08],[.47,-.04],[.49,-.09],[.46,-.12],[.001,-.12]]),
  cap:lathe([[.001,.34],[.3,.33],[.46,.27],[.53,.19],[.54,.11],[.5,.05],[.47,0],[.001,0]])};}
/* 三階造型：第一階紅袍看門狗、第二階魔法師型、第三階守護者型 */
const OUTFIT={
 1:{robe:0xc4140c,robeD:0x6a0806,trim:0xffd21f,hand:0xfffaf0,foot:0xfffaf0,hat:0xc4140c,satchel:true},
 2:{robe:0x1f2f6e,robeD:0x121b45,trim:0xffd21f,hand:0xfffaf0,foot:0x54290c,hat:0xc4140c,cape:0xb8160e,belt:true},
 3:{robe:0x1f4fc0,robeD:0x12307a,trim:0xffd21f,hand:0xc4140c,foot:0x6a3a14,hat:0x1f3f9c,cape:0xc4140c,belt:true,helmet:true,shield:true}
};
function shieldTexture(T){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');g.fillStyle='#d4201a';g.fillRect(0,0,256,256);g.fillStyle='#fff6e2';g.beginPath();g.arc(128,128,104,0,7);g.fill();g.fillStyle='#d4201a';g.beginPath();g.arc(128,128,86,0,7);g.fill();const r=g.createRadialGradient(100,100,10,128,128,70);r.addColorStop(0,'#fff0a0');r.addColorStop(1,'#e8a010');g.fillStyle=r;g.beginPath();g.arc(128,128,68,0,7);g.fill();g.fillStyle='#a2540c';g.font='900 46px "Microsoft JhengHei",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('招',128,102);g.fillText('財',128,152);const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;return t;}
function buildDog(T,stage=1){const P=OUTFIT[stage]||OUTFIT[1];
 /* 招財沒有輪廓線，靠深紅、橘毛、奶白的明暗差把部位分開 */
 const RED=P.robe,RED_D=P.robeD,GOLD=P.trim,COAT=0xe8820e,COAT_D=0xbf6408,CREAM=0xfffaf0,BROWN=0x54290c,S=dogShapes(T);
 const root=new T.Group();root.name='招財';
 const joint=(name,parent,x,y,z,paint)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);if(paint){const b=builder(T),put=b.put;b.put=(geo,color,px,py,pz,sx,sy=sx,sz=sx,...r)=>put(geo,color,px,py,pz,sx,sy,sz,...r);paint(b);g.add(b.mesh());}return g;};
 const hips=joint('hips',root,0,.5,0,b=>{b.put(S.ball,RED,0,.02,0,.34,.24,.3);});
 const chest=joint('chest',hips,0,.08,0,b=>{
  b.put(S.robe,RED,0,.04,0,.95,.98,.82);b.put(S.ring,GOLD,0,-.07,0,.46,.37,.5,Math.PI/2);b.put(S.ring,RED_D,0,.17,0,.385,.32,.34,Math.PI/2);
  b.put(S.ball,CREAM,0,.34,.2,.17,.2,.1);b.put(S.ball,GOLD,0,.03,.335,.035,.2,.02);
  b.put(S.ring,GOLD,0,.56,.01,.25,.22,.5,Math.PI/2);
  if(P.satchel){b.put(S.rod,BROWN,.03,.27,.285,.022,.82,.02,0,0,-.72);b.put(S.ball,BROWN,.39,.02,.2,.15,.13,.08);b.put(S.ball,COAT_D,.39,.1,.26,.14,.05,.035);b.put(S.ball,GOLD,.39,.07,.285,.032,.032,.018);}
  if(P.belt){b.put(S.ring,BROWN,0,.06,0,.43,.36,.55,Math.PI/2);b.put(S.ball,BROWN,.3,.01,.24,.09,.08,.05);b.put(S.ball,BROWN,-.3,.01,.24,.09,.08,.05);b.put(S.ball,GOLD,0,.06,.36,.05,.05,.02);}});
 /* 徽章是真的金幣：有厚度、外緣與高光 */
 const coinFace=coinTexture(T),gold=new T.MeshPhongMaterial({color:0xffc21a,specular:0xfff4c0,shininess:80,emissive:0x4a2f00}),face=new T.MeshPhongMaterial({map:coinFace,specular:0xffffff,shininess:90,emissive:0x2a1a00,emissiveMap:coinFace});
 const coin=new T.Group();coin.name='招財金幣';coin.position.set(0,.3,.345);/* 第三階胸口改成星徽 */if(P.shield)coin.scale.setScalar(.72);coin.rotation.x=-.08;chest.add(coin);
 const disc=new T.Mesh(new T.CylinderGeometry(.19,.19,.05,40),[gold,face,gold]);disc.rotation.x=Math.PI/2;disc.rotation.y=Math.PI/2;coin.add(disc);
 const rim=new T.Mesh(new T.TorusGeometry(.19,.018,10,40),gold);rim.position.z=.024;coin.add(rim);const rimBack=rim.clone();rimBack.position.z=-.024;coin.add(rimBack);
 const glint=new T.Mesh(new T.PlaneGeometry(.2,.2),new T.MeshBasicMaterial({map:(()=>{const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'#fff');r.addColorStop(.25,'rgba(255,240,170,.7)');r.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=r;g.fillRect(0,0,64,64);g.fillStyle='#fff';g.fillRect(31,0,2,64);g.fillRect(0,31,64,2);return new T.CanvasTexture(c);})(),transparent:true,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));glint.position.set(.08,.08,.04);coin.add(glint);
 const head=joint('head',chest,0,.62,.02,b=>{
  b.put(S.ball,COAT,0,.36,0,.5,.45,.45);
  b.put(S.cap,P.hat,0,.56,-.02,1,.92,.98);b.put(S.ring,GOLD,0,.57,-.02,.5,.47,.55,Math.PI/2);b.put(S.ball,P.helmet?0x12307a:P.robeD===0x121b45?0x6a0806:RED_D,0,.58,.42,.33,.04,.17,.16);b.put(S.ball,GOLD,0,P.helmet?.86:.92,-.02,P.helmet?.07:.1);b.put(S.ball,GOLD,0,.74,.44,.075,.075,.035);if(P.helmet)for(const s of [-1,1]){b.put(S.ball,GOLD,s*.5,.72,.02,.08,.2,.04,0,0,-s*.5);b.put(S.ball,GOLD,s*.58,.8,.02,.06,.15,.035,0,0,-s*.75);b.put(S.ball,GOLD,s*.65,.87,.02,.045,.11,.03,0,0,-s*.95);}});
 /* 表情曲面貼著頭部，比頭只大一點點 */
 const faceTex=faceTexture(T),faceMesh=new T.Mesh(new T.SphereGeometry(1,36,24,Math.PI/2-1.1,2.2,.72,1.56),new T.MeshLambertMaterial({map:faceTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));faceMesh.material.color.setRGB(LIT,LIT,LIT);faceMesh.position.set(0,.36,0);faceMesh.scale.set(.505,.455,.455);faceMesh.renderOrder=1;head.add(faceMesh);
 const setFace=name=>{const i=Math.max(0,FACES.indexOf(name));faceTex.offset.set((i%4)*.25,.5-Math.floor(i/4)*.5);};setFace('idle');
 const ears=[-1,1].map(s=>({s,g:joint('ear'+(s<0?'L':'R'),head,s*.44,.52,.02,b=>{b.put(S.ball,COAT_D,s*.08,-.2,0,.15,.3,.19,0,0,s*.22);})}));
 const arms=[-1,1].map(s=>{const upper=joint('upperArm'+(s<0?'L':'R'),chest,s*.31,.44,.02,b=>{b.put(S.ball,RED,s*.03,-.13,0,.115,.18,.115);b.put(S.ball,RED_D,s*.01,.02,0,.1);});
  const fore=joint('forearm'+(s<0?'L':'R'),upper,s*.05,-.28,0,b=>{b.put(S.ball,RED,0,-.08,0,.1,.15,.1);b.put(S.ring,GOLD,0,-.2,0,.1,.1,.2,Math.PI/2);});
  const hand=joint('hand'+(s<0?'L':'R'),fore,0,-.22,.01,b=>{b.put(S.ball,P.hand,0,-.07,.01,.1,.095,.1);for(const k of[-1,0,1])b.put(S.ball,P.hand,k*.05,-.13,.06,.032);});
  return{upper,fore,hand,s};});
 const legs=[-1,1].map(s=>{const thigh=joint('thigh'+(s<0?'L':'R'),hips,s*.17,-.02,0,b=>{b.put(S.ball,COAT,0,-.11,0,.12,.16,.13);});
  const shin=joint('shin'+(s<0?'L':'R'),thigh,0,-.21,0,b=>{b.put(S.ball,COAT,0,-.08,0,.1,.13,.11);});
  const foot=joint('foot'+(s<0?'L':'R'),shin,0,-.19,.01,b=>{b.put(S.ball,P.foot,0,-.02,.07,.11,.08,.16);for(const k of[-1,0,1])b.put(S.ball,P.foot,k*.055,-.03,.2,.035,.03,.04);if(P.shield)b.put(S.ball,P.foot,0,.1,0,.12,.14,.12);});
  return{thigh,shin,foot,s};});
 /* 尾巴從下襬後方伸出去再往上翹，離開衣服 */
 const t1=joint('tail1',hips,0,-.14,-.24,b=>{b.put(S.ball,COAT,0,.1,0,.08,.15,.08);});
 const t2=joint('tail2',t1,0,.2,0,b=>{b.put(S.ball,COAT,0,.1,0,.085,.15,.085);});
 const t3=joint('tail3',t2,0,.19,0,b=>{b.put(S.ball,COAT,0,.07,0,.085,.12,.085);b.put(S.ball,CREAM,0,.17,0,.065,.08,.065);});
 /* 披風：胸口後方的關節，走路和出招時會飄 */
 const cape=P.cape?joint('cape',chest,0,.54,-.2,b=>{b.put(S.ball,P.cape,0,-.36,-.1,.42,.46,.12);b.put(S.ring,GOLD,0,-.74,-.1,.32,.1,.3,Math.PI/2);b.put(S.ball,GOLD,0,-.36,-.235,.1,.1,.02);b.put(S.ball,GOLD,0,-.36,-.235,.03,.17,.02);b.put(S.ball,GOLD,0,-.36,-.235,.17,.03,.02);}):null;
 let shield=null;if(P.shield){shield=new T.Group();shield.name='招財盾牌';const tex=shieldTexture(T),face=new T.MeshLambertMaterial({map:tex,color:0x9a9a9a}),rim=new T.MeshPhongMaterial({color:0xc4140c,shininess:70});const disc=new T.Mesh(new T.CylinderGeometry(.34,.34,.06,40),[rim,face,face]);disc.rotation.x=Math.PI/2;shield.add(disc);shield.position.set(0,-.12,.14);arms[1].hand.add(shield);}
 Object.values(S).forEach(g=>g.dispose());
 return{root,hips,chest,head,ears,arms,legs,tail:[t1,t2,t3],coin,glint,setFace,cape,shield,stage};
}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
/* 每個招式的長度與出手時間 */
const MOVES={attack:{length:1.15,release:.36},ultimate:{length:3.3,release:.72}};
/* 招式名稱與戰鬥定位，三階共用同一組動作骨架 */
const SKILLS={1:{attack:'金幣連擲',ultimate:'金幣雨'},2:{attack:'招財魔法彈',ultimate:'招財領域'},3:{attack:'連鎖招財盾',ultimate:'榮耀守護'}};
/* w 是 0 到 1 的走路比例：站立和走路之間平滑過渡，手腳成對擺動。act 是正在播放的招式 */
function poseDog(d,t,w,act){
 const c=t*10.5,sw=Math.sin(c),br=Math.sin(t*2.1);
 d.hips.position.y=.5+br*.008*(1-w)+Math.abs(Math.sin(c))*.03*w;d.hips.rotation.set(0,0,sw*.05*w);
 d.chest.rotation.set(.06*w+br*.012,-sw*.14*w,-sw*.03*w);
 d.head.rotation.set(-.05*w+Math.sin(t*1.6)*.05*(1-w),sw*.08*w+Math.sin(t*.8)*.14*(1-w),Math.sin(t*.9)*.05);
 for(const a of d.arms){const side=a.s*sw;a.upper.rotation.set(-side*.75*w+br*.03,0,a.s*(.16+.05*w));a.fore.rotation.x=-.3-(.5+side*.4)*w;a.hand.rotation.x=-.12-.15*w;}
 for(const l of d.legs){const side=l.s*sw;l.thigh.rotation.x=side*.72*w;l.shin.rotation.x=Math.max(0,side)*1.05*w;l.foot.rotation.x=-side*.4*w;}
 const speed=7+6*w,wagBase=act?1.2:.34;d.tail[0].rotation.set(-1.42,0,Math.sin(t*speed)*wagBase);d.tail[1].rotation.set(.62,0,Math.sin(t*speed-.7)*.34);d.tail[2].rotation.set(.7,0,Math.sin(t*speed-1.4)*.38);
 let flop=(Math.sin(t*2.4)*.5+.5)*.16+Math.abs(sw)*.62*w,lift=0;
 if(act){const k=act.t;
  if(act.name==='attack'){const up=ease(k/.34),swing=ease((k-.34)/.14),back=ease((k-.62)/.42),arm=d.arms[1];
   arm.upper.rotation.x=-2.5*up*(1-swing)+.95*swing*(1-back);arm.upper.rotation.z=.16+.25*up*(1-swing);arm.fore.rotation.x=-.3-1.15*up*(1-swing);
   d.chest.rotation.y=-.5*up*(1-swing)+.5*swing*(1-back);d.chest.rotation.x=-.12*up*(1-swing)+.2*swing*(1-back);d.hips.position.y-=.05*up*(1-back);
   d.arms[0].upper.rotation.x=.5*up*(1-back);d.head.rotation.x=.1*swing*(1-back);lift=.5*swing*(1-back);
   d.legs[1].thigh.rotation.x=.42*up*(1-swing);d.legs[0].thigh.rotation.x=-.3*swing*(1-back);}
  else{const crouch=ease(k/.32)*(1-ease((k-.5)/.2)),rise=ease((k-.5)/.25)*(1-ease((k-2.75)/.4)),spin=Math.max(0,k-.6)*7.2*(1-ease((k-2.55)/.3)),air=Math.abs(Math.sin(Math.max(0,k-.6)*4.2))*.2*rise;
   d.hips.position.y+=-.17*crouch+.1*rise+air;d.hips.rotation.y=spin;d.chest.rotation.x+=.34*crouch-.16*rise;d.head.rotation.x+=.22*crouch-.2*rise;
   for(const a of d.arms){const toss=Math.sin(Math.max(0,k-.6)*16+a.s)*.5;a.upper.rotation.x=(-2.5+toss)*rise+.5*crouch;a.upper.rotation.z=a.s*(.16+.55*rise);a.fore.rotation.x=-.3-.8*crouch+.2*rise;}
   for(const l of d.legs){l.thigh.rotation.x=-.8*crouch+.18*rise;l.shin.rotation.x=1.25*crouch;l.foot.rotation.x=-.45*crouch;}lift=rise;}}
 if(d.cape)d.cape.rotation.x=.14+Math.abs(sw)*.28*w+(act?.5*Math.sin(Math.min(1,act.t)*3.14):0)+Math.sin(t*2)*.03;
 /* 第三階大絕：右手高舉盾牌 */
 if(act?.name==='ultimate'&&d.shield){const up=ease(act.t/.5)*(1-ease((act.t-2.9)/.3)),a=d.arms[1];d.hips.rotation.y=0;a.upper.rotation.set(-3*up,0,.1);a.fore.rotation.x=-.1;d.shield.rotation.set(-1.4*up,0,0);d.hips.position.y=.5;for(const l of d.legs){l.thigh.rotation.x=0;l.shin.rotation.x=0;l.foot.rotation.x=0;}d.arms[0].upper.rotation.set(-.3*up,0,-.5*up);}
 for(const e of d.ears)e.g.rotation.set(sw*.2*w,0,e.s*(.06+flop+lift*1.05));
 d.coin.rotation.y=Math.sin(t*1.3)*.1;const shine=Math.max(0,Math.sin(t*1.7));d.glint.material.opacity=Math.pow(shine,16);d.glint.rotation.z=t;d.glint.scale.setScalar(.7+Math.pow(shine,16)*.7);
}
/* 招財的動作與表情狀態機：商會門口和模型室共用 */
function dogDriver(dog){
 let time=0,stride=0,act=null,talking=false,mood='',blinkAt=2;
 return{
  tick(dt,moving){time+=dt;stride+=((moving?1:0)-stride)*Math.min(1,dt*9);
   if(act){act.t+=dt;const m=MOVES[act.name];if(!act.fired&&act.t>=m.release){act.fired=true;act.onRelease?.();}if(act.t>=m.length){const done=act.onEnd;act=null;done?.();}}
   stride=act?0:stride;poseDog(dog,time,stride,act);blinkAt-=dt;if(blinkAt<-.13)blinkAt=2.2+Math.random()*3;
   dog.setFace(act?(act.name==='attack'?(act.t<.34?'shout':act.t<.62?'wow':'happy'):(act.t<.7?'shout':act.t<2.9?'star':'happy')):talking?(Math.sin(time*13)>0?'talk':'happy'):stride>.3?(Math.sin(time*7)>0?'happy':'talk'):mood||(blinkAt<0?'blink':'idle'));},
  play(name,{onRelease,onEnd}={}){if(MOVES[name])act={name,t:0,fired:false,onRelease,onEnd};},
  setTalking(v){talking=!!v;},setMood(v){mood=v||'';},get acting(){return !!act;}};
}
/* 模型室用的控制器，介面與其他原生幻靈相同 */
function mascot(T,stage=1){
 const dog=buildDog(T,stage),drive=dogDriver(dog);let mode='Idle',own=null;
 /* 模型室以外沒有外部目標時，招式特效放在角色前方，洞穴和守護戰都看得到 */
 const selfCast=m=>{if(!window.ZhaocaiCoins)return;own??=window.ZhaocaiCoins.create({THREE:T,parent:dog.root});const at=new T.Vector3(0,.8,0),to=new T.Vector3(0,.8,4);if(stage===2){if(m==='Attack')own.bolt(at,to);else own.domain(new T.Vector3(),5,2.6);}else if(stage===3){if(m==='Attack')own.shieldChain(at,[to,new T.Vector3(1.6,.8,3)],null,null);else own.glory(new T.Vector3(),[new T.Vector3()]);}else if(m==='Attack')own.toss(at,to);else own.spray(new T.Vector3(0,1.4,0),{count:160,radius:4.5});};
 const c={root:dog.root,stage,skills:SKILLS[stage],onRelease:null,shield:dog.shield,getState:()=>({modes:['Idle','Walk','Run','Attack','Ultimate'],durations:{Attack:MOVES.attack.length,Ultimate:MOVES.ultimate.length}}),
  setMode(m){mode=m;if(m==='Attack'||m==='Ultimate')drive.play(m.toLowerCase(),{onRelease:()=>{if(c.onRelease)return c.onRelease(m);selfCast(m);}});},
  update(dt){drive.tick(dt,mode==='Walk'||mode==='Run');own?.update(dt);},setMotionSpeed(){},seek(){},setFlightHeight(){},setTargetDistance(){},getMotionState:()=>({}),hand:v=>dog.arms[1].hand.getWorldPosition(v),dispose(){own?.dispose();own=null;c.onRelease=null;}};
 return c;
}
function create({THREE:T,parent,LOT,frontZ}){
 const S=shapes(T),fence=buildFence(T,LOT,S);parent.add(fence);
 const gateRoot=new T.Group();parent.add(gateRoot);const gate=buildGate(T,LOT,S,gateRoot);
 const dog=buildDog(T),drive=dogDriver(dog),post={x:0,z:LOT.minZ-.3};dog.root.position.set(post.x,DOG_Y,post.z);dog.root.rotation.y=Math.PI;dog.root.scale.setScalar(.92);parent.add(dog.root);
 const thin={width:(window.ToonOutline?.WIDTH||0)/2};window.ToonOutline?.add(T,fence,thin);window.ToonOutline?.add(T,gateRoot,thin);
 Object.values(S).forEach(g=>g.dispose());
 /* 帶路：從大門沿西側步道繞到店門口旁等玩家 */
 const route=[[0,LOT.minZ+2.6],[-12.4,LOT.minZ+3.2],[-12.4,frontZ+3.4],[-2.6,frontZ+3.4]],door={x:0,z:frontZ+2.6},trail=[];
 let phase='guard',open=0,time=0,leg=0,leash=15,moving=false;
 function setPhase(next){phase=next;leg=0;trail.length=0;dog.root.visible=next!=='gone';if(next==='lead')trail.push({x:dog.root.position.x,z:dog.root.position.z});if(next==='wait'){const[x,z]=route[route.length-1];dog.root.position.set(x,DOG_Y,z);dog.root.rotation.y=FACE_DOOR;}}
 function step(dt,player){moving=false;
  if(phase==='lead'){const [x,z]=route[leg],p=dog.root.position,dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz),waiting=player&&Math.hypot(player.x-p.x,player.z-p.z)>leash;if(d<.2){trail.push({x:p.x,z:p.z});if(++leg>=route.length){phase='wait';dog.root.rotation.y=FACE_DOOR;}}else if(!waiting){const k=Math.min(d,5.6*dt),last=trail[trail.length-1];p.x+=dx/d*k;p.z+=dz/d*k;if(!last||Math.hypot(last.x-p.x,last.z-p.z)>.6)trail.push({x:p.x,z:p.z});dog.root.rotation.y=Math.atan2(dx,dz);moving=true;}}
 }
 function update(dt,player,{unlocked}){time+=dt;
  const near=!!player&&Math.hypot(player.x,player.z-(LOT.minZ+GATE_DEPTH))<6.5,want=near&&unlocked;open=Math.max(0,Math.min(1,open+(want?dt*2.4:-dt*1.8)));for(const l of gate.leaves)l.h.rotation.y=l.s*open*1.5;
  if(phase==='gone')return;step(dt,player);drive.tick(dt,moving);dog.root.position.y=DOG_Y;
 }
 const gateZ=LOT.minZ+GATE_DEPTH;
 function blocked(x,z,m=.42){if(Math.abs(x)<LOT.gate&&Math.abs(z-gateZ)<.5+m&&open<.7)return true;if(phase==='guard'&&Math.hypot(x-post.x,z-post.z)<.85+m)return true;if(Math.abs(Math.abs(x)-(LOT.gate+.42))<.55+m&&Math.abs(z-gateZ)<.55+m)return true;return false;}
 return{update,blocked,setPhase,setLeash(v){leash=v;},setTalking:drive.setTalking,setMood:drive.setMood,play:drive.play,handPoint(v){return dog.arms[1].hand.getWorldPosition(v);},get acting(){return drive.acting;},post,door,trail,get phase(){return phase;},get open(){return open;},dog:dog.root,dispose(){gate.glass.dispose();}};
}
window.PhantomCommerceGate={create,mascot};
})();
