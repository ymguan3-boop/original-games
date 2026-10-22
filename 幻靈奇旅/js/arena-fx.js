/* 擂台專用招式特效：剝皮辣椒雞（丟辣椒）、汪汪犬（咬擊／水彈／激流／海嘯）、水仙子（水泡／水花）。
   各動作的出手時間點與 authoring/procedural-spirits、authoring/beasts 的動作定義一致（秒）。
   模型本身的動作由 GLB 播放；這裡只負責飛行物、光束、水波等場景特效，以及近戰的衝刺距離。
   使用：SpiritVfx.script({path,strong,attacker,defender,group,add,now,sound,T}) → {approach(sec),update(sec),total} */
(()=>{'use strict';
const KEY=/(pepper-chick-[123]|water-dog-[123]|water-fairy|fire-bear-[123]|cat-girl-[123])\.glb$/;
const keyOf=p=>(KEY.exec(p||'')||[])[1]||null;
const has=p=>!!keyOf(p);
const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const rand=(a,b)=>a+Math.random()*(b-a);
let glowTex=null;
function glow(T){if(glowTex)return glowTex;const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.4,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return glowTex=new T.CanvasTexture(c);}

/* ---------- 每個模型的出手時間表（秒） ---------- */
const BITES={'water-dog-1':[[.36,0]],'water-dog-2':[[.36,1],[.5,0]],'water-dog-3':[[.36,1],[.5,0],[.64,2]]};   // [時間, 頭編號]
const CHICK_THROWS={
 'pepper-chick-1':[.62,1.17,1.72].map(at=>({at,side:'R'})),
 'pepper-chick-2':Array.from({length:6},(_,k)=>({at:.5+k*.3,side:k%2?'R':'L'})),
 'pepper-chick-3':[...Array.from({length:12},(_,k)=>({at:.75+k*.13,side:k%2?'R':'L',fan:true})),{at:3.06,side:'G',big:true}],
};
const TOTAL={'pepper-chick-1':2.3,'pepper-chick-2':2.5,'pepper-chick-3':4,'water-dog-1':2.1,'water-dog-2':3.27,'water-dog-3':5.07,'water-fairy':3.42,'fire-bear-1':[1.3,2.6],'fire-bear-2':[1.5,3],'fire-bear-3':[2.21,3.21],'cat-girl-1':[1.08,2.58],'cat-girl-2':[1.21,1.67],'cat-girl-3':[1.29,1.67]};

function script(o){
 const T=o.T,key=keyOf(o.path),strong=!!o.strong,att=o.attacker,def=o.defender,group=o.group;
 if(!key)return null;
 att.object.updateMatrixWorld(true);
 const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const S=att.object.getWorldScale(V()).x||1;          // 世界單位 / 模型單位
 const owned=[],parts=[],events=[];let lastT=null,fired=0;
 const wp=name=>{const n=att.object.getObjectByName(name);return n?n.getWorldPosition(V()):att.root.position.clone().add(V(0,att.worldSize.y*.6,0));};
 const wdir=name=>{const n=att.object.getObjectByName(name);return n?n.getWorldDirection(V()):V(0,0,1);};
 const target=()=>def.root.position.clone().add(V(0,def.worldSize.y*.5,0));
 const faceDir=()=>{const d=def.root.position.clone().sub(att.root.position);d.y=0;return d.lengthSq()>1e-6?d.normalize():V(0,0,1);};
 const track=(obj,disp)=>{group.add(obj);owned.push(()=>{group.remove(obj);disp?.();});return obj;};
 const basic=(color,opacity=.9,add=true,side)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.NormalBlending,side:side||T.FrontSide});

 /* ----- 粒子（Sprite） ----- */
 function spawn(p){const m=new T.SpriteMaterial({map:glow(T),color:p.color,transparent:true,depthWrite:false,opacity:p.op??1,blending:T.NormalBlending});const s=new T.Sprite(m);s.position.copy(p.pos);const K=p.abs?1:S;s.scale.setScalar(p.size*K);group.add(s);parts.push({s,m,v:p.vel.clone().multiplyScalar(K),life:p.life,age:0,size:p.size*K,grow:p.grow||0,g:(p.g||0)*K,drag:p.drag??1,op:p.op??1});}
 function stepParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;const u=p.age/p.life;if(u>=1){group.remove(p.s);p.m.dispose();parts.splice(i,1);continue;}p.v.y-=p.g*dt;p.v.multiplyScalar(Math.pow(p.drag,dt));p.s.position.addScaledVector(p.v,dt);if(p.s.position.y<.03){p.s.position.y=.03;p.v.y*=-.25;}p.s.scale.setScalar(p.size*(1+p.grow*u));p.m.opacity=p.op*Math.pow(1-u,1.2);}}
 const C={fire:[0xffd23f,0xff7a1a,0xff3b1f],water:[0x8fd3ff,0x5ab4ff,0x3a8ee8],leaf:[0xb8e26a,0xfff1c2,0x4e8c24]};
 function burst(pos,power,kind){
  spawn({pos,vel:V(),color:kind==='fire'?0xffd070:0xbfe6ff,size:1.1*power,life:.22,grow:1.2,op:.7});
  const n=Math.round(14*power);for(let i=0;i<n;i++){const d=V(rand(-1,1),rand(.3,1.4),rand(-1,1)).normalize().multiplyScalar(rand(1.6,3.8)*Math.sqrt(power));spawn({pos,vel:d,color:C[kind][i%3],size:rand(.2,.45)*Math.sqrt(power),life:rand(.4,.8),grow:.7,g:kind==='fire'?2.5:9,drag:.2});}
  for(let i=0;i<Math.round(4*power);i++)spawn({pos,vel:V(rand(-.6,.6),rand(.5,1.2),rand(-.6,.6)),color:kind==='fire'?0x9c8a74:0xcfe9ff,size:.5*Math.sqrt(power),life:rand(.8,1.3),grow:2,drag:.35,op:.45,add:false});
  ring(pos,.2,(1.0*power+.4),.45+.1*power,kind==='fire'?0xff9a40:0x8fd3ff);
 }
 function ring(pos,r0,r1,life,color,vertical){const mat=basic(color,.85,true,T.DoubleSide),m=new T.Mesh(new T.RingGeometry(.82,1,48),mat);m.position.copy(pos);if(vertical)m.lookAt(m.position.clone().add(faceDir()));else{m.rotation.x=-Math.PI/2;m.position.y=Math.max(pos.y,.06);}track(m,()=>{m.geometry.dispose();mat.dispose();});
  o.add(life,t=>{const u=1-Math.pow(1-t,2.5);m.scale.setScalar((r0+(r1-r0)*u)*S);mat.opacity=.85*(1-t);},()=>group.remove(m));}
 function hitSpark(pos,power=1){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,sp=rand(2,5);spawn({pos,vel:V(Math.cos(a)*sp,Math.sin(a)*sp,rand(-1,1)),color:i%2?0xffd23f:0xff9a40,size:rand(.12,.24),life:rand(.2,.35),drag:.02});}spawn({pos,vel:V(),color:0xffe27a,size:.6*power,life:.12});ring(pos,.1,.55*power,.25,0xffc23a,true);}

 /* ----- 飛行物：拋物線 ----- */
 function fly(mesh,from,to,Tm,height,spin,onTick,onLand,disp){
  track(mesh,disp);mesh.position.copy(from);
  o.add(Tm+.05,(t,age)=>{const u=Math.min(1,age/Tm);mesh.position.lerpVectors(from,to,u);mesh.position.y+=4*height*u*(1-u);mesh.rotation.x+=spin.x*.016;mesh.rotation.y+=spin.y*.016;mesh.rotation.z+=spin.z*.016;onTick?.(mesh.position,u);if(u>=1&&!mesh.userData.landed){mesh.userData.landed=true;group.remove(mesh);onLand?.(to);}},()=>group.remove(mesh));
 }

 /* ----- 辣椒 ----- */
 function pepperMesh(red){
  const L=1.1,R=.25,bend=.1,N=24,pts=[new T.Vector2(1e-4,0)],sh=.08;
  for(let i=0;i<=N;i++){const t=i/N;let r;if(t<sh)r=R*(.62+.38*Math.sin(t/sh*Math.PI/2));else{const s=(t-sh)/(1-sh);r=R*(1-.38*s)*Math.pow(Math.max(0,1-Math.pow(s,2.6)),.5);}pts.push(new T.Vector2(Math.max(r,1e-4),-t*L));}
  const g=new T.LatheGeometry(pts.reverse(),20),pos=g.attributes.position,cols=new Float32Array(pos.count*3),c=new T.Color();
  const cTop=new T.Color(0x3a6c1c),cMid=new T.Color(0x5f9c2c),cLow=new T.Color(0x4a8222),cY=new T.Color(0xc29a28),cR=new T.Color(0xd8261a);
  for(let i=0;i<pos.count;i++){const s=Math.min(1,Math.max(0,-pos.getY(i)/L));pos.setX(i,pos.getX(i)+bend*L*s*s);c.copy(cTop).lerp(cMid,Math.min(1,s*2.5)).lerp(cLow,Math.min(1,Math.max(0,(s-.5)*2)));if(red){c.lerp(cY,Math.min(1,Math.max(0,(s-.45)/.15))*.55);c.lerp(cR,Math.min(1,Math.max(0,(s-.58)/.2)));}cols.set([c.r,c.g,c.b],i*3);}
  g.setAttribute('color',new T.BufferAttribute(cols,3));g.computeVertexNormals();
  const mat=new T.MeshPhongMaterial({vertexColors:true,shininess:70,emissive:red?0x401000:0x0a1a04}),m=new T.Mesh(g,mat);
  const cap=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshPhongMaterial({color:0x4c6e1e}));cap.scale.set(R*.82,R*.3,R*.82);m.add(cap);
  const grp=new T.Group();grp.add(m);grp.userData.dispose=()=>{g.dispose();mat.dispose();cap.geometry.dispose();cap.material.dispose();};return grp;
 }
 function throwPepper(ev){
  const fire=key==='pepper-chick-3',big=!!ev.big,from=big?wp('giantPepper'):wp(ev.side==='R'?'heldPepperR':'heldPepperL');
  let to=target();
  if(ev.fan){to=to.clone();to.x+=rand(-1,1)*def.worldSize.x*.6;to.y=def.root.position.y+def.worldSize.y*rand(.2,.7);}
  const d=from.distanceTo(to),m=pepperMesh(fire),sc=(big?1.35:.62)*S;m.scale.setScalar(sc);
  const Tm=big?.75:.4+d*.05,h=big?1.2*S+d*.1:.3+d*.12;
  fly(m,from,to,Tm,h,{x:big?.35*7:11,y:rand(-3,3),z:rand(2,5)},p=>{
   if(fire)spawn({pos:p.clone(),vel:V(rand(-.3,.3),rand(.2,.8),rand(-.3,.3)),color:Math.random()<.5?0xff6a1a:0xffc23a,size:big?.9:.32,life:big?.5:.3,grow:.6});
   else if(key==='pepper-chick-2')spawn({pos:p.clone(),vel:V(rand(-.3,.3),rand(-.2,.3),rand(-.3,.3)),color:0xb8e26a,size:.16,life:.35});
   else if(Math.random()<.3)spawn({pos:p.clone(),vel:V(0,.2,0),color:0xffe9c0,size:.14,life:.25,op:.6});
  },p=>{burst(p,big?3:key==='pepper-chick-3'?1.5:key==='pepper-chick-2'?1.25:1,fire?'fire':key==='pepper-chick-2'?'leaf':'fire');},m.userData.dispose);
  o.sound?.('fire',big);
 }

 /* ----- 水 ----- */
 function waterBall(from,to,r,Tm,h){
  const mat=new T.MeshPhongMaterial({color:0x5ab4ff,transparent:true,opacity:.82,shininess:90,emissive:0x1a6fd0,emissiveIntensity:.4}),m=new T.Mesh(new T.SphereGeometry(1,16,12),mat);m.scale.setScalar(r*S);
  fly(m,from,to,Tm,h,{x:0,y:0,z:0},p=>{if(Math.random()<.5)spawn({pos:p.clone(),vel:V(rand(-.4,.4),rand(-.2,.4),rand(-.4,.4)),color:0x9fd8ff,size:r*.8,life:.35,g:4});},p=>burst(p,1,'water'),()=>{m.geometry.dispose();mat.dispose();});
  o.sound?.('water',false);
 }
 function beam(startFn,endFn,life,rad){
  const geo=new T.CylinderGeometry(1,1,1,16,1,true);geo.translate(0,.5,0);
  const mats=[basic(0x4aa6ff,.5,true,T.DoubleSide),basic(0x9fd8ff,.9,true,T.DoubleSide),basic(0xd8f1ff,.85,true)],ms=mats.map(mt=>track(new T.Mesh(geo,mt)));const api={end:V()};
  o.add(life,(t,age)=>{const s=startFn(),e=endFn();api.end.copy(e);const dv=e.clone().sub(s),len=dv.length();dv.normalize();const fade=Math.min(1,age/.1,(life-age)/.15),wob=1+Math.sin(age*40)*.1;
   [1,.7,.3].forEach((k,i)=>{const m=ms[i];m.position.copy(s);m.quaternion.setFromUnitVectors(V(0,1,0),dv);m.scale.set(rad*k*wob*S,len,rad*k*wob*S);mats[i].opacity=[.5,.9,.85][i]*fade;});
   if(Math.random()<.8)spawn({pos:e.clone(),vel:V(rand(-2,2),rand(1,3.5),rand(-2,2)),color:Math.random()<.5?0xcfeaff:0x5ab4ff,size:rand(.12,.25),life:rand(.4,.7),g:9,drag:.6});},()=>{geo.dispose();mats.forEach(x=>x.dispose());ms.forEach(m=>group.remove(m));});
  return api;
 }
 function crescent(from,to,onHit){
  const mat=basic(0x8fd6ff,.95,true,T.DoubleSide),core=basic(0xd8f1ff,.9,true,T.DoubleSide),g=new T.Group(),geo1=new T.TorusGeometry(1,.09,8,40,Math.PI),geo2=new T.TorusGeometry(1,.035,6,40,Math.PI),a=new T.Mesh(geo1,mat),b=new T.Mesh(geo2,core);
  g.add(a,b);a.rotation.x=b.rotation.x=Math.PI/2;g.quaternion.setFromUnitVectors(V(0,0,1),to.clone().sub(from).setY(0).normalize());g.position.copy(from);track(g,()=>{geo1.dispose();geo2.dispose();mat.dispose();core.dispose();});
  const Tm=.45;let hit=false;o.add(Tm+.25,(t,age)=>{const u=Math.min(1,age/Tm);g.position.lerpVectors(from,to,u);g.scale.setScalar((.6+u*.9)*1.4*S);if(Math.random()<.7)spawn({pos:g.position.clone().add(V(rand(-1,1)*S,0,0)),vel:V(0,rand(0,1),0),color:0xbfe6ff,size:.2,life:.35});
   if(u>=1&&!hit){hit=true;onHit(g.position.clone());}if(u>=1){mat.opacity=Math.max(0,mat.opacity-.1);core.opacity=Math.max(0,core.opacity-.1);}},()=>group.remove(g));
  o.sound?.('water',true);
 }
 let waveGeo=null;
 function tidalWave(from,to,onHit){
  if(!waveGeo){waveGeo=new T.PlaneGeometry(1,1,36,22);const p=waveGeo.attributes.position,cols=new Float32Array(p.count*3),deep=new T.Color(0x1d5fc0),light=new T.Color(0x6cc4ff),foam=new T.Color(0xf2fbff),c=new T.Color();
   for(let i=0;i<p.count;i++){const u=p.getX(i)+.5,w=p.getY(i)+.5,k=Math.pow(Math.sin(Math.PI*u),.6),th=w*1.25*Math.PI;p.setXYZ(i,u-.5,k*(1-Math.cos(th)),-k*Math.sin(th));c.copy(deep).lerp(light,w).lerp(foam,Math.min(1,Math.max(0,(w-.78)/.2)));cols.set([c.r,c.g,c.b],i*3);}
   waveGeo.setAttribute('color',new T.BufferAttribute(cols,3));waveGeo.computeVertexNormals();}
  const mat=new T.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.88,shininess:90,side:T.DoubleSide,emissive:0x0d4fae,emissiveIntensity:.3}),m=new T.Mesh(waveGeo,mat);
  m.quaternion.setFromAxisAngle(V(0,1,0),Math.atan2(faceDir().x,faceDir().z)+Math.PI);track(m,()=>mat.dispose());
  const Tm=.95,End=.45,wB=def.worldSize.x+att.worldSize.x*.6;let hit=false;o.add(Tm+End,(t,age)=>{const u=Math.min(1,age/Tm);m.position.lerpVectors(from,to,u);const w=(wB*.9+u*wB*.6),R=(.35+.65*Math.min(1,u*1.6))*att.worldSize.y*.55;
   if(age<Tm){m.scale.set(w,R,R);for(let i=0;i<4;i++)spawn({pos:m.position.clone().add(V(rand(-.45,.45)*w,R*rand(1.5,1.9),0)),vel:V(rand(-.5,.5),rand(.5,2),rand(1,3)),color:0xe3f4ff,size:rand(.15,.3),life:.5,g:6,drag:.6});}
   else{if(!hit){hit=true;onHit(m.position.clone());}const k=(age-Tm)/End;m.scale.set(w,R*(1-k),R*(1+k*.6));mat.opacity=.88*(1-k);}},()=>group.remove(m));
  o.sound?.('water',true);
 }
 function geyser(pos,big){
  const geo=new T.CylinderGeometry(.7,1,1,20,1,true);geo.translate(0,.5,0);const mat=basic(0x5ab4ff,.7,true,T.DoubleSide),core=basic(0xcfeaff,.7,true),a=new T.Mesh(geo,mat),b=new T.Mesh(geo,core);
  a.position.set(pos.x,.02,pos.z);b.position.copy(a.position);track(a);track(b,()=>{geo.dispose();mat.dispose();core.dispose();});
  const H=(big?4.4:3.3)*S*1.1,Rr=(big?.7:.5)*S;ring(V(pos.x,.05,pos.z),.3,2.2,.5,0x8fd3ff);
  o.add(1.15,(t,age)=>{const h=H*(age<.18?age/.18:age<.75?1+.05*(age-.18):1.03*Math.max(0,(1.15-age)/.4)),r=Rr*(1+Math.sin(age*30)*.06)*(age<.18?.5+.5*age/.18:1-.4*Math.min(1,(age-.18)/.97));
   a.scale.set(r,Math.max(h,.01),r);b.scale.set(r*.45,Math.max(h,.01)*1.02,r*.45);if(h>.5)for(let i=0;i<3;i++)spawn({pos:V(pos.x,h,pos.z),vel:V(rand(-2.5,2.5),rand(1,4),rand(-2.5,2.5)),color:i?0xcfeaff:0x5ab4ff,size:rand(.15,.32),life:.7,g:9,drag:.7});},()=>{group.remove(a);group.remove(b);});
  o.sound?.('water',big);
 }
 function bubble(getPos,r0,r1,life){   // 水泡（捧在手上長大）
  const mk=(c,op,sd)=>new T.MeshBasicMaterial({color:c,transparent:true,opacity:op,depthWrite:false,side:sd||T.FrontSide}),g=new T.Group(),geo=new T.SphereGeometry(1,16,12),m1=mk(0xbfe9ff,.4),m2=mk(0x6fc3f0,.35,T.BackSide),m3=mk(0xffffff,.9),
   a=new T.Mesh(geo,m1),b=new T.Mesh(geo,m2),h=new T.Mesh(geo,m3);b.scale.setScalar(1.06);h.scale.set(.2,.12,.08);h.position.set(-.4,.45,.62);g.add(a,b,h);track(g,()=>{geo.dispose();m1.dispose();m2.dispose();m3.dispose();});
  const api={group:g,done:false};o.add(life,(t,age)=>{if(api.done){g.visible=false;return;}const r=(r0+(r1-r0)*Math.min(1,age/(life-.05)))*S*(1+.04*Math.sin(age*18));g.scale.setScalar(r);g.position.copy(getPos());},()=>group.remove(g));return api;
 }
 function bubbleShot(from,onLand){
  const to=target(),mat=new T.MeshBasicMaterial({color:0xbfe9ff,transparent:true,opacity:.55,depthWrite:false}),m=new T.Mesh(new T.SphereGeometry(1,14,10),mat);m.scale.setScalar(.3*S);
  fly(m,from,to,.5,.1,{x:0,y:0,z:0},p=>{if(Math.random()<.6)spawn({pos:p.clone(),vel:V(rand(-.3,.3),.2,rand(-.3,.3)),color:0x9fd8ff,size:.12,life:.45});},p=>{burst(p,1.1,'water');onLand?.(p);},()=>{m.geometry.dispose();mat.dispose();});
  o.sound?.('water',false);
 }


 /* ----- 火熊／貓娘共用：火焰、火柱、弧光、肉球印 ----- */
 const FIRE=[0xffd35a,0xff9a2a,0xf2541e,0xe5341c];
 const firePuff=(p,v,s0,s1,life,abs)=>spawn({pos:p,vel:v,color:FIRE[(Math.random()*4)|0],size:s0,grow:s1/s0-1,life,op:.85,abs});
 function pillar(pos,h){const hh=h*S;ring(V(pos.x,.05,pos.z),.2,1.4,.5,0xff8a2a);o.add(.9,()=>{for(let i=0;i<3;i++)firePuff(V(pos.x+rand(-.25,.25)*S,.1,pos.z+rand(-.25,.25)*S),V(rand(-.4,.4),(3+Math.random()*1.6)*hh/S*.8,rand(-.4,.4)),.14*S,.45*S,.6,true);});}
 function arcFx(p,dir,radius,width,color,tilt,life,start=-.9,len=1.8){const mat=basic(color,.95,false,T.DoubleSide),m=new T.Mesh(new T.RingGeometry(radius-width,radius,36,1,start,len),mat);m.position.copy(p);m.lookAt(p.clone().add(dir));m.rotateZ(tilt);m.scale.setScalar(S);track(m,()=>{m.geometry.dispose();mat.dispose();});o.add(life,t=>{m.scale.setScalar(S*(1+.35*t));mat.opacity=.95*(1-t);},()=>group.remove(m));}
 function flatArc(center,yaw,R,width,color,life,len=2.6){const g=new T.Group(),mat=basic(color,.95,false,T.DoubleSide),m=new T.Mesh(new T.RingGeometry(R-width,R,40,1,-Math.PI/2-len/2,len),mat);m.rotation.x=-Math.PI/2;g.add(m);g.position.copy(center);g.rotation.y=yaw;g.scale.setScalar(S);track(g,()=>{m.geometry.dispose();mat.dispose();});o.add(life,t=>{g.scale.setScalar(S*(1+.25*t));mat.opacity=.95*(1-t);},()=>group.remove(g));}
 function pawPrint(p,dir,size,color,life,flat){const g=new T.Group(),mat=basic(color,.95,false,T.DoubleSide),geos=[];const add=(r,x,y,sx=1,sy=1)=>{const gm=new T.CircleGeometry(r,20);geos.push(gm);const mm=new T.Mesh(gm,mat);mm.position.set(x,y,0);mm.scale.set(sx,sy,1);g.add(mm);};add(.42,0,-.18,1.2,.95);[[-.5,.28],[-.18,.5],[.18,.5],[.5,.28]].forEach(([x,y])=>add(.17,x,y));g.position.copy(p);if(flat)g.rotation.x=-Math.PI/2;else g.lookAt(p.clone().add(dir));track(g,()=>{geos.forEach(x=>x.dispose());mat.dispose();});o.add(life,t=>{g.scale.setScalar(size*S*(.3+.7*Math.min(1,t*4)));mat.opacity=.95*(1-t*t);},()=>group.remove(g));}
 const quake=pos=>{ring(V(pos.x,.05,pos.z),.3,1.6,.7,0x8c7a66);for(let i=0;i<16;i++)spawn({pos:V(pos.x+rand(-.8,.8)*S,.1,pos.z+rand(-.8,.8)*S),vel:V(rand(-1.5,1.5),1+Math.random()*2,rand(-1.5,1.5)),color:i%2?0xff9a2a:0xa89580,size:rand(.15,.5),life:.7,grow:2,g:3});};
 /* ----- 腳本 ----- */
 const at=(sec,fn)=>events.push({at:sec,fn});
 const tot=TOTAL[key],total=Array.isArray(tot)?tot[strong?1:0]:tot;let approach=()=>0;
 if(key.startsWith('pepper-chick')){
  if(!strong){
   approach=s=>Math.min(ease(s/.28),1-ease((s-.55)/.3));
   at(.3,()=>{hitSpark(wp('beak').add(faceDir().multiplyScalar(.15*S)),1+.4*(+key.slice(-1)));o.sound?.('fire',false);});
  }else for(const ev of CHICK_THROWS[key])at(ev.at,()=>throwPepper(ev));
  if(strong&&key==='pepper-chick-3')for(let t=.6;t<2.9;t+=.12)at(t,()=>{spawn({pos:wp('crest').add(V(rand(-.3,.3)*S,rand(0,.5)*S,rand(-.2,.2)*S)),vel:V(rand(-.2,.2),rand(1,2),rand(-.2,.2)),color:Math.random()<.5?0xff7a1a:0xffc23a,size:rand(.25,.45),life:.45,grow:.5});spawn({pos:wp('footL').add(V(rand(-.4,.4)*S,0,rand(-.3,.3)*S)),vel:V(rand(-.3,.3),-rand(2,4),rand(-.3,.3)),color:0xff8a2a,size:.45,life:.35,grow:1});});
 }else if(key.startsWith('water-dog')){
  if(!strong){
   {const last=BITES[key].slice(-1)[0][0]+.25;approach=s=>Math.min(ease(s/.3),1-ease((s-last)/.3));}
   for(const [t,hi] of BITES[key])at(t,()=>{const p=wp('mouth'+hi);hitSpark(p,1.2);spawn({pos:target(),vel:V(),color:0xbfe6ff,size:1.2,life:.2,grow:1});o.sound?.('water',false);});
  }else if(key==='water-dog-1')for(const t of [.5,.92,1.34])at(t,()=>{const p=wp('mouth0');ring(p,.1,.7,.25,0xcfeaff,true);waterBall(p,target().add(V(rand(-.2,.2)*S,rand(-.15,.15)*S,0)),.26,.35+p.distanceTo(target())*.05,.3);});
  else if(key==='water-dog-2'){
   at(.55,()=>{const D=faceDir();
    [0,1].forEach(hi=>{const sName='mouth'+hi;beam(()=>wp(sName),()=>{const s=wp(sName),f=wdir(sName),fd=f.dot(D),k=fd>.05?def.root.position.clone().sub(s).dot(D)/fd:6*S,e=s.clone().addScaledVector(f,Math.max(1,Math.min(k,12*S))).lerp(target(),.55);e.y=Math.max(e.y,.05);return e;},1.5,.14);});o.sound?.('water',true);});
   at(2.55,()=>{const from=att.root.position.clone().add(faceDir().multiplyScalar(1.2*S)).add(V(0,att.worldSize.y*.4,0)),to=target();crescent(from,to,p=>{burst(p,1.8,'water');});});
  }else{   // 三瀾犬：蹲低(0.55) → 人立長嚎，水渦 → 浪 → 三道水柱
   for(let t=.9;t<1.8;t+=.05)at(t,()=>{for(let i=0;i<4;i++){const an=Math.random()*Math.PI*2,r=rand(1.2,1.8)*S,c=att.root.position;spawn({pos:V(c.x+Math.cos(an)*r,rand(0,.4),c.z+Math.sin(an)*r),vel:V(-Math.sin(an)*4-Math.cos(an)*.6,rand(2.5,4.5),Math.cos(an)*4-Math.sin(an)*.6),color:Math.random()<.5?0x8fd3ff:0x5ab4ff,size:rand(.15,.3),life:.9,drag:.6});}});
   at(1.83,()=>{const from=att.root.position.clone().add(faceDir().multiplyScalar(1.6*S)),to=def.root.position.clone();ring(from,.3,3,.6,0x8fd3ff);tidalWave(from,to,p=>burst(p.clone().add(V(0,def.worldSize.y*.4,0)),3,'water'));});
   const side=def.worldSize.x*.55+.3,perp=(()=>{const f=faceDir();return V(-f.z,0,f.x);})();
   [[2.9,-1],[3.22,1],[3.54,0]].forEach(([t,k])=>at(t,()=>{const c=def.root.position.clone().addScaledVector(perp,k*side);geyser(c,k===0);}));
  }
 }else if(key==='water-fairy'){
  if(!strong){
   const b=bubble(()=>{const p=wp('handR').add(wp('handL')).multiplyScalar(.5);p.y+=.12*S;p.addScaledVector(faceDir(),.12*S);return p;},.04,.3,.58);
   at(.72,()=>{const p=wp('handR').add(wp('handL')).multiplyScalar(.5);p.addScaledVector(faceDir(),.3*S);p.y+=.15*S;b.done=true;bubbleShot(p);});
  }else{
   at(1.5,()=>{const c=att.root.position.clone();c.y=.05;for(let i=0;i<4;i++)ring(c,2.2+i*.5,(2.2+i*.5)*3,.9,0x8cd3f7);
    const rg=wp('chest');const ringM=new T.Mesh(new T.TorusGeometry(1,.04,8,48),basic(0x8cd3f7,.7,false));ringM.rotation.x=Math.PI/2;ringM.position.copy(rg);track(ringM,()=>{ringM.geometry.dispose();ringM.material.dispose();});o.add(.8,t=>{ringM.scale.setScalar((.5+2.4*t)*S);ringM.material.opacity=.7*(1-t);},()=>group.remove(ringM));
    for(let i=0;i<40;i++){const a=i/40*Math.PI*6,h=i/40*2.4;spawn({pos:V(c.x+Math.sin(a)*.9*S,.1+h*.5*S,c.z+Math.cos(a)*.9*S),vel:V(Math.cos(a)*1.2,1.4,-Math.sin(a)*1.2),color:[0xf2fbff,0xb6e6fa,0x7ccbf3,0x52aeea][i%4],size:.1+rand(0,.2),life:.8+h*.2,grow:1});}o.sound?.('water',true);});
   at(1.91,()=>{const c=att.root.position.clone();for(let i=0;i<8;i++){const a=i/8*Math.PI*2;setTimeout(()=>geyser(V(c.x+Math.sin(a)*2*S,0,c.z+Math.cos(a)*2*S),false),i*40);}geyser(def.root.position.clone(),true);});
   for(let t=1.78;t<3.08;t+=.06)at(t,()=>{for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*2.6*S,c=att.root.position;spawn({pos:V(c.x+Math.sin(a)*d,att.worldSize.y*1.6+Math.random()*.8*S,c.z+Math.cos(a)*d),vel:V(0,-3.5-Math.random()*1.5,0),color:[0xf2fbff,0xb6e6fa,0x7ccbf3][i%3],size:.08,life:.9});}});
  }
 }
 else{   // 火熊／貓娘
  const D=()=>faceDir(),chest=()=>wp('chest'),dist=()=>def.root.position.clone().sub(att.root.position).setY(0).length();
  const dash=(a,b,c)=>s=>Math.min(ease((s-a)/(b-a)),1-ease((s-c)/.3));   // a→b 衝到對手面前，到 c 後退回
  if(key==='fire-bear-1'){
   if(!strong){approach=dash(.15,.5,.9);at(.546,()=>{const p=wp('pawFR').add(D().multiplyScalar(.35*S)).add(V(0,.25*S,0));[-.12,0,.12].forEach((q,i)=>arcFx(p.clone().add(V(0,q*S,0)),D(),.45,.05,i===1?0xffc24a:0xff6a1e,-.6,.4));for(let i=0;i<14;i++)firePuff(p.clone().add(V(rand(-.25,.25),rand(-.2,.2),rand(-.15,.15)).multiplyScalar(S)),V(rand(-1,1),.6,rand(-1,1)).add(D().multiplyScalar(1.2)).multiplyScalar(S),.08*S,.35*S,.5,true);hitSpark(target(),1.2);o.sound?.('fire',false);});}
   else at(1.04,()=>{o.add(1.09,()=>{const p=wp('jaw').add(D().multiplyScalar(.3*S)),d=wdir('head'),L=Math.max(3,dist()),sp=L/.5;d.y-=.12;d.normalize();for(let i=0;i<4;i++)firePuff(p.clone(),d.clone().multiplyScalar(sp*(.8+Math.random()*.3)).add(V(rand(-.8,.8),rand(-.5,.5),rand(-.8,.8))),.08*S,.75*S,.55,true);});o.sound?.('fire',true);});
  }else if(key==='fire-bear-2'){
   const aura=(t0,len)=>at(t0,()=>o.add(len,()=>{const b=wp('body');for(let i=0;i<3;i++)firePuff(b.clone().add(V(rand(-1.2,1.2),rand(0,.6)+.2,rand(-1.4,1.4)).multiplyScalar(.5*S)),V(rand(-.3,.3),1+Math.random(),rand(-.3,.3)),.1*S,.4*S,.5,true);}));
   if(!strong){approach=dash(.2,.6,1.0);aura(.225,.65);at(.675,()=>{const p=wp('head').add(D().multiplyScalar(.5*S));for(let i=0;i<24;i++)firePuff(p.clone(),V(rand(-1.5,1.5),Math.random()*1.5,rand(-1.5,1.5)).add(D().multiplyScalar(1.5)).multiplyScalar(S),.15*S,.7*S,.55,true);ring(V(p.x,0,p.z),.2,1.6,.6,0xff9a2a);hitSpark(target(),1.4);o.sound?.('fire',false);});}
   else{aura(.45,1.05);at(1.5,()=>quake(att.root.position.clone().add(D().multiplyScalar(1.1*S))));
    at(1.59,()=>{const c=def.root.position.clone(),pr=Math.max(1.2,def.worldSize.x*.7);for(let i=0;i<7;i++){const a=i/7*Math.PI*2;setTimeout(()=>pillar(V(c.x+Math.sin(a)*pr,0,c.z+Math.cos(a)*pr),1.6),i*50);}pillar(c,2);o.sound?.('fire',true);});}
  }else if(key==='fire-bear-3'){
   if(!strong)at(.93,()=>{const p=wp('chest');for(let i=0;i<22;i++)spawn({pos:p.clone().add(V(rand(-.5,.5),rand(0,.7),rand(-.3,.3)).multiplyScalar(S)),vel:V(rand(-1,1),.6+Math.random(),rand(-1,1)),color:i%2?0xffd45a:0xffb347,size:rand(.1,.25),life:.7,grow:.6});ring(att.root.position.clone(),.3,1.8,.7,0xffd45a);o.sound?.('fire',false);});
   else{approach=dash(1.2,1.8,2.4);at(1.86,()=>{quake(att.root.position.clone().add(D().multiplyScalar(1.2*S)));hitSpark(target(),1.6);});at(1.93,()=>{const a=att.root.position,d=D(),L=dist();for(let i=0;i<6;i++){const p=a.clone().addScaledVector(d,L*(i+1)/6);setTimeout(()=>pillar(p,1.3+i*.1),i*90);}o.sound?.('fire',true);});}
  }else if(key==='cat-girl-1'){
   if(!strong){approach=dash(.12,.4,.8);at(.45,()=>{const p=wp('propR').add(D().multiplyScalar(.25*S));pawPrint(p,D(),1.1,0xff8fa6,.55,false);for(let i=0;i<8;i++)spawn({pos:p.clone(),vel:V(rand(-1.6,1.6),rand(-1.6,1.6),rand(-1.6,1.6)),color:0xffc4d2,size:.15,life:.45});hitSpark(target(),1);});}
   else{approach=s=>Math.min(ease((s-1.6)/.5),1-ease((s-2.5)/.3));let k=0;for(const t of [.41,.83,1.24,1.65])at(t,()=>{const p=chest().add(D().multiplyScalar(.45*S)),sg=(k++%2)?1:-1;[-.08,0,.08].forEach(q=>{arcFx(p.clone().add(V(q*S,q*.4*S,0)),D(),.32,.034,0xff6f92,sg*.9,.32);arcFx(p.clone().add(V(q*S,q*.4*S,0)),D(),.31,.012,0xffd0dc,sg*.9,.26);});hitSpark(target(),.9);});
    at(2.32,()=>{const p=att.root.position.clone().add(D().multiplyScalar(.9*S));p.y=.02;pawPrint(p,V(0,1,0),2.6,0xff8fa6,.9,true);ring(V(p.x,0,p.z),.2,1.5,.6,0xe8a8b8);hitSpark(target(),1.6);});}
  }else{   // cat-girl-2／3：紅色刀光
   const big=key==='cat-girl-3';approach=strong?dash(.1,.45,1.3):dash(.1,.4,.85);
   const slash=(p,R,w,life,len)=>{const yaw=Math.atan2(D().x,D().z);flatArc(p,yaw,R,w,0xff3b4a,life,len);flatArc(p.clone().add(V(0,.01,0)),yaw,R-.07,w*.3,0xffc0c8,life*.8,len-.2);};
   if(!strong)at(big?.54:.46,()=>{slash(chest(),big?1.45:.95,big?.18:.12,big?.45:.4,big?2.9:2.6);hitSpark(target(),big?1.6:1.2);});
   else for(const [t,k] of [[.35,0],[.8,1],[1.25,2]])at(t,()=>{const c=chest();if(k<2)slash(c,big?1.4:.95,big?.18:.12,.4,big?2.9:2.6);else{const p=c.add(D().multiplyScalar(.6*S));[Math.PI/4,-Math.PI/4].forEach(a=>arcFx(p.clone(),D(),1.6,.11,0xff3b4a,a,.45,-.25,.5));}hitSpark(target(),1.3);});
  }
 }
 events.sort((a,b)=>a.at-b.at);
 const runtime={
  total,approach,
  update(sec){while(fired<events.length&&events[fired].at<=sec)events[fired++].fn();},
 };
 // 粒子與光束統一更新，結束後釋放
 o.add(total+3,()=>{const n=o.now();const dt=lastT==null?0:Math.min(.1,n-lastT);lastT=n;stepParts(dt);},()=>{for(const p of parts.splice(0)){group.remove(p.s);p.m.dispose();}owned.forEach(f=>f());});
 return runtime;
}
window.SpiritVfx={has,keyOf,script};
})();
