/* 招財的金幣招式：單發投擲、大範圍撒幣，加上訓練木頭人。金幣與火花都用 InstancedMesh，整場只多幾個 draw call。 */
(() => {
'use strict';
const COINS=520,SPARKS=240,GRAVITY=15,zero=1e-4;
function create({THREE:T,parent}){
 const dummy=new T.Object3D(),root=new T.Group();parent.add(root);
 const coinMat=new T.MeshPhongMaterial({color:0xffc21a,specular:0xfff2b0,shininess:70,emissive:0x5a3a00});
 const coinMesh=new T.InstancedMesh(new T.CylinderGeometry(.1,.1,.024,16),coinMat,COINS);coinMesh.frustumCulled=false;coinMesh.castShadow=true;root.add(coinMesh);
 const sparkMat=new T.MeshBasicMaterial({color:0xffe27a,blending:T.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false});
 const sparkMesh=new T.InstancedMesh(new T.OctahedronGeometry(.05,0),sparkMat,SPARKS);sparkMesh.frustumCulled=false;root.add(sparkMesh);
 const glowMat=()=>new T.MeshBasicMaterial({color:0xffd24a,blending:T.AdditiveBlending,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,toneMapped:false});
 const ring=new T.Mesh(new T.RingGeometry(.86,1,64),glowMat());ring.rotation.x=-Math.PI/2;ring.position.y=.04;ring.visible=false;root.add(ring);
 const pillar=new T.Mesh(new T.CylinderGeometry(.9,1.25,6,28,1,true),glowMat());pillar.position.y=3;pillar.visible=false;root.add(pillar);
 const coins=Array.from({length:COINS},()=>({life:0,age:0,p:new T.Vector3(),v:new T.Vector3(),a:new T.Vector3(),spin:new T.Vector3(),toss:null,bounces:0,rest:0}));
 const sparks=Array.from({length:SPARKS},()=>({life:0,age:0,p:new T.Vector3(),v:new T.Vector3()}));
 let coinHead=0,sparkHead=0,queue=null,ringT=-1,pillarT=-1,targets=[],onTargetHit=null;
 const next=()=>{const c=coins[coinHead];coinHead=(coinHead+1)%COINS;return c;};
 function burst(pos,n=24,speed=4.5){for(let i=0;i<n;i++){const s=sparks[sparkHead];sparkHead=(sparkHead+1)%SPARKS;s.age=0;s.life=.3+Math.random()*.35;s.p.copy(pos);s.v.set(Math.random()-.5,Math.random()*.9,Math.random()-.5).normalize().multiplyScalar(speed*(.4+Math.random()*.8));}}
 function launch(c,from,v){c.age=0;c.life=2.6;c.toss=null;c.bounces=0;c.rest=0;c.p.copy(from);c.v.copy(v);c.a.set(Math.random()*6,Math.random()*6,Math.random()*6);c.spin.set(6+Math.random()*10,Math.random()*5,6+Math.random()*10);}
 /* 單發：拋物線飛到目標，抵達時才算命中 */
 function toss(from,to,onHit,flight=.42){const c=next(),v=to.clone().sub(from).divideScalar(flight);v.y+=GRAVITY*flight/2;launch(c,from,v);c.spin.set(24,0,4);c.life=flight;c.toss={to:to.clone(),onHit};}
 /* 大絕：逐批從身上噴出，落地彈跳後留一下才消失 */
 function spray(origin,{count=460,radius=6.5,duration=1.7,hit=[],onHit=null}={}){queue={origin:origin.clone(),left:count,rate:count/duration,carry:0,radius};targets=hit;onTargetHit=onHit;ringT=0;pillarT=0;ring.visible=pillar.visible=true;}
 function emit(q,dt){q.carry+=q.rate*dt;while(q.carry>=1&&q.left>0){q.carry--;q.left--;const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*q.radius,up=6.5+Math.random()*3.5,air=2*up/GRAVITY;launch(next(),q.origin,new T.Vector3(Math.cos(a)*r/air,up,Math.sin(a)*r/air));}if(q.left<=0)queue=null;}
 const hide=(mesh,i)=>{dummy.position.set(0,-50,0);dummy.scale.setScalar(zero);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);};
 function update(dt){if(queue)emit(queue,dt);
  for(let i=0;i<COINS;i++){const c=coins[i];if(c.age>=c.life||!c.life){hide(coinMesh,i);continue;}c.age+=dt;
   if(c.toss&&c.age>=c.life){c.toss.onHit?.(c.toss.to);burst(c.toss.to,28,5);c.life=0;hide(coinMesh,i);continue;}
   c.v.y-=GRAVITY*dt;c.p.addScaledVector(c.v,dt);c.a.addScaledVector(c.spin,dt);
   if(!c.toss&&c.bounces<3){for(const t of targets){if(t.cooldown>0)continue;const dx=c.p.x-t.root.position.x,dz=c.p.z-t.root.position.z;if(dx*dx+dz*dz<.3&&c.p.y<1.9){t.cooldown=.14;onTargetHit?.(t,c.p);burst(c.p,8,3);break;}}}
   if(c.p.y<.03&&c.v.y<0){c.p.y=.03;if(c.bounces++<2){c.v.y*=-.36;c.v.x*=.5;c.v.z*=.5;c.spin.multiplyScalar(.6);}else{c.v.set(0,0,0);c.spin.set(0,0,0);c.a.set(0,c.a.y,0);c.life=Math.min(c.life,c.age+.7);}}
   const fade=Math.min(1,(c.life-c.age)/.18);dummy.position.copy(c.p);dummy.rotation.set(c.a.x,c.a.y,c.a.z);dummy.scale.setScalar(Math.max(zero,fade));dummy.updateMatrix();coinMesh.setMatrixAt(i,dummy.matrix);}
  coinMesh.instanceMatrix.needsUpdate=true;
  for(let i=0;i<SPARKS;i++){const s=sparks[i];if(s.age>=s.life||!s.life){hide(sparkMesh,i);continue;}s.age+=dt;s.v.y-=7*dt;s.p.addScaledVector(s.v,dt);dummy.position.copy(s.p);dummy.rotation.set(s.age*9,s.age*7,0);dummy.scale.setScalar(Math.max(zero,1-s.age/s.life));dummy.updateMatrix();sparkMesh.setMatrixAt(i,dummy.matrix);}
  sparkMesh.instanceMatrix.needsUpdate=true;
  for(const t of targets)t.cooldown=Math.max(0,(t.cooldown||0)-dt);
  if(ringT>=0){ringT+=dt;const k=ringT/1.1;ring.scale.setScalar(.5+k*(queue?queue.radius:6.5));ring.material.opacity=Math.max(0,.85*(1-k));if(k>=1){ringT=-1;ring.visible=false;}}
  if(pillarT>=0){pillarT+=dt;const k=pillarT/1.8;pillar.material.opacity=Math.max(0,Math.sin(Math.min(1,k)*Math.PI)*.14);pillar.rotation.y+=dt*2;if(k>=1){pillarT=-1;pillar.visible=false;}}
 }
 function clear(){queue=null;for(const c of coins)c.life=0;for(const s of sparks)s.life=0;ringT=pillarT=-1;ring.visible=pillar.visible=false;}
 return{toss,spray,burst,update,clear,root,dispose(){root.removeFromParent();for(const m of[coinMesh,sparkMesh,ring,pillar]){m.geometry.dispose();m.material.dispose();}}};
}
/* 訓練木頭人：立柱、橫臂、草繩綁身與靶心，被打到會彈性搖晃 */
function dummyTarget(T){
 const root=new T.Group(),pivot=new T.Group();root.add(pivot);
 const wood=new T.MeshLambertMaterial({color:0x9c6a35}),dark=new T.MeshLambertMaterial({color:0x6a4522}),straw=new T.MeshLambertMaterial({color:0xd9b56a}),red=new T.MeshLambertMaterial({color:0xc8291e}),cream=new T.MeshLambertMaterial({color:0xf6ecd2});
 const add=(g,m,x,y,z,rx=0,rz=0,par=pivot)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,0,rz);o.castShadow=true;par.add(o);return o;};
 add(new T.CylinderGeometry(.46,.56,.14,20),dark,0,.07,0,0,0,root);for(let i=0;i<3;i++){const a=i/3*Math.PI*2;const leg=add(new T.CylinderGeometry(.05,.07,.74,10),wood,Math.cos(a)*.34,.1,Math.sin(a)*.34,0,0,root);leg.rotation.set(Math.sin(a)*1.25,0,-Math.cos(a)*1.25);}
 add(new T.CylinderGeometry(.075,.09,1.62,14),wood,0,.84,0);add(new T.CylinderGeometry(.055,.055,1.2,12),wood,0,1.2,0,0,Math.PI/2);
 add(new T.SphereGeometry(.32,20,14),straw,0,.98,0).scale.set(1,1.25,.86);for(const y of[.72,.98,1.24])add(new T.TorusGeometry(y===.98?.325:.26,.022,8,26),dark,0,y,0,Math.PI/2);
 add(new T.CircleGeometry(.2,28),cream,0,1,.285);add(new T.RingGeometry(.09,.145,28),red,0,1,.29);add(new T.CircleGeometry(.05,18),red,0,1,.295);
 add(new T.SphereGeometry(.2,20,14),straw,0,1.66,0);for(const x of[-.07,.07]){const e=add(new T.BoxGeometry(.05,.012,.01),dark,x,1.7,.195,0,x>0?.8:-.8);e.scale.set(1,1,1);add(new T.BoxGeometry(.05,.012,.01),dark,x,1.7,.195,0,x>0?-.8:.8);}add(new T.BoxGeometry(.1,.012,.01),dark,0,1.6,.195);
 let wobble=0,vel=0,dir=0,flash=0;const mats=[wood,straw];
 return{root,cooldown:0,hit(force=1,from=null){if(from)dir=Math.atan2(from.x-root.position.x,from.z-root.position.z);vel+=force*5.5;flash=.14;},update(dt){vel+=(-34*wobble-5.2*vel)*dt;wobble+=vel*dt;wobble=Math.max(-.62,Math.min(.62,wobble));pivot.rotation.set(-Math.cos(dir)*wobble,0,Math.sin(dir)*wobble);flash=Math.max(0,flash-dt);for(const m of mats)m.emissive.setHex(flash>0?0x8a5a10:0);}};
}
window.ZhaocaiCoins={create,dummyTarget};
})();
