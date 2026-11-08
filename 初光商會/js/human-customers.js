/* 四類人形顧客（平民、富豪、冒險者、魔法師，各分男女）的程序建模。
 * 依 3d-builder 程序建模標準：關節比照主角（hips > chest > head、upperArm > forearm > hand、thigh > shin > foot），
 * 全部曲面、五官畫在貼合頭部的表情圖集上，走路手腳交錯，待機會呼吸、轉頭。外觀參考 GPT 生成的 2D 三視圖。 */
const LIT=.66;
function builder(T){
 const pos=[],nor=[],col=[],m=new T.Matrix4(),q=new T.Quaternion(),e=new T.Euler(),c=new T.Color(),n3=new T.Matrix3(),v=new T.Vector3();
 function put(geo,color,x,y,z,sx=1,sy=sx,sz=sx,rx=0,ry=0,rz=0){const g=geo.index?geo.toNonIndexed():geo,p=g.attributes.position,n=g.attributes.normal;e.set(rx,ry,rz);q.setFromEuler(e);m.compose(new T.Vector3(x,y,z),q,new T.Vector3(sx,sy,sz));n3.getNormalMatrix(m);c.setHex(color);for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(m);pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,i).applyMatrix3(n3).normalize();nor.push(v.x,v.y,v.z);col.push(c.r*LIT,c.g*LIT,c.b*LIT);}}
 function mesh(){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));const o=new T.Mesh(g,new T.MeshLambertMaterial({vertexColors:true}));o.castShadow=true;return o;}
 return {put,mesh};
}
const lathe=(T,pts,seg=28)=>{const g=new T.LatheGeometry(pts.slice().reverse().map(([r,y])=>new T.Vector2(r,y)),seg);g.computeVertexNormals();return g;};
/* 表情圖集：4 欄 2 列，用貼圖位移切換 */
const FACES=['idle','blink','happy','talk','wow','sad','angry','think'];
function faceTexture(T,skin,eyeColor){
 const C=256,c=document.createElement('canvas');c.width=C*4;c.height=C*2;const g=c.getContext('2d'),INK='#2a170c';g.lineCap=g.lineJoin='round';
 const eye=(x,y)=>{g.fillStyle=INK;g.beginPath();g.ellipse(x,y,15,19,0,0,7);g.fill();g.fillStyle=eyeColor;g.beginPath();g.ellipse(x,y+4,10,11,0,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x-5,y-7,5,0,7);g.fill();};
 const arc=(x,y,r,a,b,w=5)=>{g.strokeStyle=INK;g.lineWidth=w;g.beginPath();g.arc(x,y,r,a,b);g.stroke();};
 const line=(pts,w=5)=>{g.strokeStyle=INK;g.lineWidth=w;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();};
 const mouth=(y,w,h)=>{g.fillStyle='#8a2a1c';g.beginPath();g.ellipse(128,y,w,h,0,0,7);g.fill();g.fillStyle='#f08a8a';g.beginPath();g.ellipse(128,y+h*.4,w*.6,h*.45,0,0,7);g.fill();};
 const draw={idle(){eye(84,120);eye(172,120);arc(128,160,16,.3,Math.PI-.3);},blink(){arc(84,128,15,Math.PI+.3,-.3);arc(172,128,15,Math.PI+.3,-.3);arc(128,160,16,.3,Math.PI-.3);},happy(){arc(84,128,15,Math.PI+.2,-.2,6);arc(172,128,15,Math.PI+.2,-.2,6);mouth(164,20,15);},talk(){eye(84,120);eye(172,120);mouth(166,13,11);},wow(){eye(84,116);eye(172,116);mouth(168,10,14);},sad(){line([[66,100],[96,92]]);line([[190,100],[160,92]]);eye(84,124);eye(172,124);arc(128,182,14,Math.PI+.4,-.4);},angry(){line([[66,96],[100,108]],6);line([[190,96],[156,108]],6);eye(84,124);eye(172,124);line([[110,172],[146,172]],6);},think(){eye(84,120);eye(172,120);line([[112,168],[146,162]],5);}};
 FACES.forEach((n,i)=>{g.save();g.translate((i%4)*C,Math.floor(i/4)*C);g.fillStyle='rgba(255,130,120,.45)';for(const x of [56,200]){g.beginPath();g.ellipse(x,150,20,11,0,0,7);g.fill();}draw[n]();g.restore();});
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.anisotropy=4;t.repeat.set(.25,.5);return t;
}
/* 外觀設定：衣服顏色、配件與髮色；男女在髮型、下身與配色上不同 */
export const LOOKS={
 commoner:{m:{skin:0xf2c39a,hair:0x4a2a14,top:0xf0dcb4,topD:0xb89a6a,bottom:0xb89462,shoe:0x6a3a1c,vest:0x6f7f2a,bag:true,eye:'#3a2010'},f:{skin:0xf4c8a2,hair:0x5a3218,top:0xf2dcb4,topD:0xbfa070,bottom:0x7a4a26,shoe:0x6a3a1c,apron:0x7caa3a,scarf:0xe8cf96,basket:true,skirt:true,longHair:true,eye:'#3a2010'}},
 rich:{m:{skin:0xf2c39a,hair:0x3a1e10,top:0x7a1424,topD:0x4a0a14,bottom:0x1e1a22,shoe:0x1a1210,gold:true,coat:true,cravat:true,pouch:true,earring:true,eye:'#3a2010'},f:{skin:0xf6cca8,hair:0x6a3a1c,top:0x8a1a34,topD:0x560c20,bottom:0x8a1a34,shoe:0x4a0a14,gold:true,coat:true,cravat:true,pouch:true,skirt:true,longHair:true,tiara:true,earring:true,eye:'#3a2010'}},
 adventurer:{m:{skin:0xeab88e,hair:0x2a1a10,top:0x1f3a6e,topD:0x14264a,bottom:0x5a3a20,shoe:0x4a2a14,armor:0x8a5a2e,hood:0x1f3a6e,backpack:true,sword:true,knee:true,gloves:true,eye:'#2a1a10'},f:{skin:0xf0c098,hair:0x5a2a12,top:0x24447a,topD:0x162c54,bottom:0x6a4424,shoe:0x4a2a14,armor:0x9a6634,hood:0x24447a,backpack:true,sword:true,knee:true,gloves:true,ponytail:true,eye:'#2a1a10'}},
 mage:{m:{skin:0xf2c39a,hair:0x2a1a10,top:0x5a2a9a,topD:0x3a1868,bottom:0x5a2a9a,shoe:0x4a2a14,robe:true,witchHat:true,staff:true,stars:true,eye:'#2a1a10'},f:{skin:0xf6cca8,hair:0x3a2018,top:0x6a32a8,topD:0x421c74,bottom:0x6a32a8,shoe:0x4a2a14,robe:true,witchHat:true,staff:true,stars:true,longHair:true,eye:'#2a1a10'}}
};
export function buildHuman(T,type='commoner',variant='m'){
 const L=(LOOKS[type]||LOOKS.commoner)[variant]||LOOKS.commoner.m,GOLD=0xf2c032,S={ball:new T.SphereGeometry(1,20,14),dome:new T.SphereGeometry(1,22,12,0,Math.PI*2,0,Math.PI/2),ring:new T.TorusGeometry(1,.12,10,30),rod:new T.CylinderGeometry(1,1,1,12),cone:lathe(T,[[.001,1],[.25,.6],[.5,.18],[.62,0],[.001,0]]),
  shirt:lathe(T,[[.001,.42],[.17,.42],[.23,.38],[.26,.26],[.27,.12],[.29,.02],[.3,-.02],[.001,-.02]]),
  skirt:lathe(T,[[.001,.12],[.24,.12],[.3,0],[.37,-.16],[.4,-.22],[.001,-.22]]),
  robe:lathe(T,[[.001,.42],[.18,.42],[.25,.36],[.29,.2],[.33,0],[.39,-.22],[.43,-.36],[.001,-.36]]),
  coat:lathe(T,[[.001,.42],[.19,.42],[.26,.37],[.29,.24],[.31,.08],[.36,-.08],[.38,-.14],[.001,-.14]])};
 const root=new T.Group();root.name='人形顧客-'+type+'-'+variant;
 const joint=(name,parent,x,y,z,paint)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);if(paint){const b=builder(T);paint(b.put);g.add(b.mesh());}return g;};
 const long=L.robe||L.skirt;
 const hips=joint('hips',root,0,.52,0,put=>{put(S.ball,long?L.bottom:L.bottom,0,0,0,.25,.16,.2);});
 const chest=joint('chest',hips,0,.06,0,put=>{
  put(L.robe?S.robe:L.coat?S.coat:S.shirt,L.top,0,0,0,1);put(S.ring,L.topD,0,.42,0,.18,.18,.3,Math.PI/2);
  if(L.skirt&&!L.robe)put(S.skirt,L.bottom,0,-.02,0,1);
  if(L.apron){put(S.ball,L.apron,0,.06,.24,.21,.28,.05);put(S.ring,L.apron,0,.18,0,.275,.275,.2,Math.PI/2);put(S.ball,L.apron,0,.24,.25,.16,.07,.04);}
  if(L.vest){for(const k of [-1,1])put(S.ball,L.vest,k*.12,.2,.2,.13,.24,.09);put(S.ball,L.vest,0,.2,-.18,.24,.24,.1);for(const y of [.26,.16])put(S.ball,0x3a2a12,.07,y,.29,.02);}
  if(L.cravat){put(S.ball,0xfff8ee,0,.36,.2,.09,.07,.06);put(S.ball,0xfff8ee,0,.29,.23,.07,.06,.05);put(S.ball,0xd02a3a,0,.32,.27,.03);}
  if(L.hood){put(S.ring,L.hood,0,.42,-.02,.24,.22,.6,Math.PI/2);put(S.ball,L.hood,0,.45,-.18,.2,.13,.12);}
  if(L.stars)for(const[x,y,z]of[[.15,.15,.27],[-.18,-.05,.3],[.08,-.22,.35],[-.1,.28,.22],[.24,-.15,.28]])put(S.ball,0xffd24a,x,y,z,.03);
  if(L.coat){put(S.ball,L.topD,-.09,.2,.25,.06,.2,.03);put(S.ball,L.topD,.09,.2,.25,.06,.2,.03);for(const y of [.28,.16,.04])put(S.ball,GOLD,0,y,.29,.025);}
  if(L.gold){put(S.ring,GOLD,0,.36,.03,.17,.15,.5,Math.PI/2.4);put(S.ball,0xd02a5a,0,.27,.2,.04);}
  if(L.armor){put(S.ball,L.armor,0,.22,.17,.24,.2,.1);put(S.ring,L.armor,0,.02,0,.29,.29,.4,Math.PI/2);put(S.ball,GOLD,0,.02,.29,.04,.035,.02);}
  if(L.robe){put(S.ring,GOLD,0,-.35,0,.43,.43,.25,Math.PI/2);put(S.ball,GOLD,0,.3,.22,.05);put(S.ball,0x8ae0ff,0,.3,.25,.03);}
  if(L.backpack){put(S.ball,0x8a5a2e,0,.2,-.27,.21,.24,.13);put(S.ball,0x6a4222,0,.33,-.27,.19,.06,.12);put(S.ball,GOLD,0,.22,-.4,.03);}
  if(L.bag){put(S.rod,0x8a5a2e,.18,.26,.0,.012,.5,.012,0,0,.6);}
  if(L.pouch){put(S.ball,0xa8742e,-.27,-.02,.12,.08,.09,.07);put(S.ball,GOLD,-.27,.06,.12,.04,.02,.04);}});
 /* 臉：皮膚球＋貼合的表情曲面 */
 const head=joint('head',chest,0,.5,0,put=>{
  put(S.ball,L.skin,0,.3,0,.36,.34,.34);for(const s of [-1,1])put(S.ball,L.skin,s*.35,.3,0,.06,.08,.05);
  /* 頭髮：頭頂半球、瀏海、側髮；女性加長髮或馬尾 */
  put(S.dome,L.hair,0,.33,-.02,.38,.36,.37);for(const k of [-2,-1,0,1,2])put(S.ball,L.hair,k*.11,.5,.25,.1,.08,.07);for(const s of [-1,1])put(S.ball,L.hair,s*.33,.27,-.03,.08,.16,.12);
  if(L.longHair)put(S.ball,L.hair,0,.1,-.2,.33,.36,.18);if(L.ponytail){put(S.ball,L.hair,0,.42,-.36,.09);put(S.ball,L.hair,0,.2,-.42,.08,.18,.08);}
  if(L.tiara){put(S.ring,GOLD,0,.62,0,.22,.22,.4,Math.PI/2);put(S.ball,0x8ae0ff,0,.68,.18,.04);}
  if(L.witchHat){put(S.rod,L.top,0,.58,0,.6,.03,.6);put(S.cone,L.top,0,.6,0,.5,.62,.5,-.25);put(S.ring,GOLD,0,.62,0,.38,.38,.35,Math.PI/2);put(S.ball,0xffd24a,0,.67,.36,.07,.07,.03);for(const[x,y]of[[-.22,.72],[.2,.8],[-.05,.95]])put(S.ball,0xffd24a,x,y,.18,.03);}
  if(L.scarf){put(S.dome,L.scarf,0,.36,-.02,.4,.36,.39);put(S.ball,L.scarf,0,.3,-.38,.09,.07,.06);put(S.ball,L.scarf,.06,.22,-.4,.05,.1,.03,0,0,.4);}
  if(L.earring)for(const s of [-1,1])put(S.ball,0xd02a3a,s*.37,.18,0,.025);});
 const faceTex=faceTexture(T,L.skin,L.eye),face=new T.Mesh(new T.SphereGeometry(1,32,20,Math.PI/2-1,2,.95,1.25),new T.MeshLambertMaterial({map:faceTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));face.material.color.setRGB(LIT+.2,LIT+.2,LIT+.2);face.position.set(0,.3,0);face.scale.set(.364,.344,.344);face.renderOrder=1;head.add(face);
 const setFace=n=>{const i=Math.max(0,FACES.indexOf(n));faceTex.offset.set((i%4)*.25,.5-Math.floor(i/4)*.5);};setFace('idle');
 const sleeve=L.robe||L.coat?L.top:L.top;
 const arms=[-1,1].map(s=>{const upper=joint('upperArm'+(s<0?'L':'R'),chest,s*.27,.36,0,put=>{put(S.ball,sleeve,s*.02,-.1,0,.085,.14,.085);put(S.ball,L.topD,0,0,0,.08);});
  const fore=joint('forearm'+(s<0?'L':'R'),upper,s*.02,-.22,0,put=>{put(S.ball,L.robe?L.top:L.skin,0,-.08,0,.07,.12,.07);put(S.ball,sleeve,0,0,0,.075);});
  const hand=joint('hand'+(s<0?'L':'R'),fore,0,-.18,0,put=>{put(S.ball,L.skin,0,-.05,0,.075,.07,.07);
   if(s>0&&L.staff){put(S.rod,0x7a4a24,0,-.05,.04,.022,1.15,.022);put(S.ball,0x8ae0ff,0,.55,.04,.08);put(S.ring,GOLD,0,.47,.04,.07,.07,.3,Math.PI/2);}
   if(s>0&&L.bag&&!L.staff){put(S.ball,0xe6cfa0,0,-.22,.05,.13,.14,.08);put(S.ring,0xc8a870,0,-.08,.05,.07,.07,.3);put(S.ball,0xd88a2a,.04,-.1,.05,.04,.08,.04,0,0,.4);put(S.ball,0xc42a1a,-.05,-.1,.07,.035);}
   if(s>0&&L.basket){put(S.ball,0xb07a3a,0,-.24,.06,.15,.1,.1);put(S.ring,0x8a5a2a,0,-.12,.06,.1,.12,.3);put(S.ball,0xc42a1a,.05,-.17,.07,.04);put(S.ball,0x6aaa2a,-.05,-.16,.06,.04);}
   if(L.gloves)put(S.ball,0x6a3a1a,0,-.04,0,.08,.075,.075);});
  return {upper,fore,hand,s};});
 const legs=[-1,1].map(s=>{const thigh=joint('thigh'+(s<0?'L':'R'),hips,s*.12,-.04,0,put=>{put(S.ball,L.bottom,0,-.1,0,.09,.14,.095);});
  const shin=joint('shin'+(s<0?'L':'R'),thigh,0,-.2,0,put=>{put(S.ball,long?L.skin:L.bottom,0,-.08,0,.075,.12,.08);});
  const foot=joint('foot'+(s<0?'L':'R'),shin,0,-.17,0,put=>{put(S.ball,L.shoe,0,-.02,.05,.09,.07,.13);if(L.knee)put(S.ball,L.shoe,0,.07,0,.085,.08,.085);});
  if(L.knee)joint('knee'+(s<0?'L':'R'),shin,0,.02,.04,put=>{put(S.ball,0x9a8a7a,0,0,.03,.06,.055,.04);});
  return {thigh,shin,foot,s};});
 if(L.sword){joint('sword',hips,-.27,0,.04,put=>{put(S.rod,0x6a4222,0,-.05,0,.02,.16,.02,.3);put(S.rod,0xd8dde6,0,-.3,.05,.025,.38,.012,.3);put(S.ring,GOLD,0,.04,-.02,.05,.05,.2,0,0,Math.PI/2);});}
 Object.values(S).forEach(g=>g.dispose());
 return {root,hips,chest,head,arms,legs,setFace,type,variant};
}
const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
/* 姿勢：w 是走路比例 0~1，站立與走路平滑過渡；手腳成對擺動，胸口反向扭轉 */
function pose(h,t,w,mood){
 const c=t*9,sw=Math.sin(c),br=Math.sin(t*2);
 h.hips.position.y=.52+br*.006*(1-w)+Math.abs(Math.sin(c))*.022*w;h.hips.rotation.set(0,sw*.08*w,0);
 h.chest.rotation.set(.04*w+br*.015,-sw*.16*w,0);
 h.head.rotation.set(Math.sin(t*1.3)*.04*(1-w)-.03*w,Math.sin(t*.7)*.25*(1-w)+sw*.06*w,mood==='think'?.18:0);
 for(const a of h.arms){const side=a.s*sw;a.upper.rotation.set(-side*.7*w+br*.02,0,a.s*(.12+.04*(1-w)));a.fore.rotation.x=-.2-(.35+side*.25)*w;}
 for(const l of h.legs){const side=l.s*sw;l.thigh.rotation.x=side*.6*w;l.shin.rotation.x=Math.max(0,side)*.9*w;l.foot.rotation.x=-side*.3*w;}
 if(mood==='happy'){h.arms.forEach(a=>{a.upper.rotation.z=a.s*(.5+Math.abs(Math.sin(t*8))*.4);});}
 if(mood==='angry'){h.arms.forEach(a=>{a.upper.rotation.set(-.2,0,a.s*.5);a.fore.rotation.x=-1.6;});}
}
/* 控制器：介面與其他原生角色相同（root、setMode、update、dispose），另可 setMood 換表情 */
export function createHuman(T,type,variant){
 const h=buildHuman(T,type,variant);let mode='Idle',time=Math.random()*10,stride=0,mood='',blinkAt=2;
 return {root:h.root,human:h,setMode(m){mode=m;},setMood(m){mood=m||'';},
  update(dt){time+=dt;stride+=((mode==='Walk'||mode==='Run'?1:0)-stride)*Math.min(1,dt*9);pose(h,time,stride,mood);blinkAt-=dt;if(blinkAt<-.12)blinkAt=2+Math.random()*3;
   h.setFace(mood==='happy'?'happy':mood==='angry'?'angry':mood==='sad'||mood==='confused'?'sad':mood==='question'?'think':mood==='impatient'?'think':stride>.3?(Math.sin(time*6)>0?'happy':'talk'):blinkAt<0?'blink':'idle');},
  getState:()=>({modes:['Idle','Walk']}),setMotionSpeed(){},seek(){},getMotionState:()=>({}),dispose(){}};
}
