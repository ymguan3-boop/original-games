/* 幻靈奇旅 — 初光鎮北側河道、橋梁、山洞與河畔釣魚（程序化 Three.js 場景）。 */
(() => {
'use strict';
const DEFAULTS={minX:-52,maxX:52,nearBankZ:-40.6,farBankZ:-51.4,cliffZ:-52.4,surfaceY:-.34,bedY:-1.35,bridgeX:0,bridgeHalfWidth:1.75,tunnelZ:-55,flowSpeed:1,pathStartZ:-31.9,waterSpiritZone:{minX:-36,maxX:36,minZ:-50.6,maxZ:-41.4},waterSpiritExclusive:false};

function build({THREE:T,group,town,config,mobile=false}){
 const C={...DEFAULTS,...(config||{})},railZ=C.nearBankZ+.2,root=new T.Group();root.name='North river · bridge · tunnel';group.add(root);
 const width=C.maxX-C.minX,midX=(C.minX+C.maxX)/2,midZ=(C.nearBankZ+C.farBankZ)/2,riverDepth=C.nearBankZ-C.farBankZ;
 // Reuse the town's own grass and path materials so the new land blends in.
 const sample=(x,z)=>{const rc=new T.Raycaster(new T.Vector3(x,20,z),new T.Vector3(0,-1,0));return rc.intersectObject(town,true).find(h=>h.object.isMesh&&h.point.y<.3)?.object.material;};
 const grassMat=sample(8,-35.5)||new T.MeshStandardMaterial({color:0x65945a,roughness:.7}),pathMat=sample(0,-31)||new T.MeshStandardMaterial({color:0xc9ad72,roughness:.7});
 const mat=(color,o={})=>new T.MeshStandardMaterial({color,roughness:.82,...o});
 const stoneMat=mat(0x7d857c),woodMat=mat(0x9a6a3c,{roughness:.7}),woodDark=mat(0x6b4a2c,{roughness:.75}),rockMat=mat(0x4a554c,{flatShading:true,roughness:.9}),rockDark=mat(0x3a4640,{flatShading:true,roughness:.9}),mossMat=mat(0x3f7d4a,{flatShading:true}),bushMat=mat(0x2f7a45,{flatShading:true}),bedMat=mat(0x163f4a,{roughness:1});
 const box=(w,h,d,m,x,y,z,shadow=false)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;root.add(o);return o;};

 // Land: south strip up to the railing, a far-bank strip at the cliff foot and the extended path.
 const townEdgeZ=-36.02,tunnelFloorZ=C.tunnelZ-3.5;
 box(width,.2,townEdgeZ-C.nearBankZ,grassMat,midX,-.12,(townEdgeZ+C.nearBankZ)/2);
 box(width,.2,C.farBankZ-C.cliffZ+6,grassMat,midX,-.12,(C.farBankZ+C.cliffZ-6)/2);
 box(C.bridgeHalfWidth*2,.06,C.pathStartZ-railZ,pathMat,C.bridgeX,0,(C.pathStartZ+railZ)/2);
 box(C.bridgeHalfWidth*2,.06,C.farBankZ-tunnelFloorZ,pathMat,C.bridgeX,0,(C.farBankZ+tunnelFloorZ)/2);
 // Channel: bed, stone banks and the flowing water layers.
 box(width,.2,riverDepth,bedMat,midX,C.bedY-.1,midZ);
 for(const z of [C.nearBankZ,C.farBankZ]){const s=z===C.nearBankZ?1:-1;box(width,-C.bedY+.12,.36,stoneMat,midX,(C.bedY+.12)/2,z-s*.18);}
 const water=new T.Mesh(new T.PlaneGeometry(width,riverDepth,1,1),new T.MeshPhongMaterial({color:0x1679a0,transparent:true,opacity:.78,shininess:90,specular:0xdff6ff}));
 water.rotation.x=-Math.PI/2;water.position.set(midX,C.surfaceY,midZ);water.renderOrder=2;root.add(water);
 const rippleTexture=seed=>{const cv=document.createElement('canvas');cv.width=256;cv.height=128;const g=cv.getContext('2d');let r=seed;const rnd=()=>(r=(r*9301+49297)%233280)/233280;g.lineCap='round';
  for(let i=0;i<34;i++){const y=rnd()*128,x=rnd()*256,len=24+rnd()*70,a=.18+rnd()*.5;g.strokeStyle=`rgba(255,255,255,${a})`;g.lineWidth=1+rnd()*2.4;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+len*.33,y-3,x+len*.66,y+3,x+len,y);g.stroke();g.beginPath();g.moveTo(x-256,y);g.bezierCurveTo(x-256+len*.33,y-3,x-256+len*.66,y+3,x-256+len,y);g.stroke();}
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;return t;};
 const ripples=[[.045,7,.06,.5],[.085,4.6,.11,.34]].map(([speed,tile,lift,opacity],i)=>{const map=rippleTexture(17+i*31);map.repeat.set(width/tile,riverDepth/(tile*.9));const m=new T.Mesh(new T.PlaneGeometry(width,riverDepth),new T.MeshBasicMaterial({map,transparent:true,opacity,depthWrite:false,fog:true}));m.rotation.x=-Math.PI/2;m.position.set(midX,C.surfaceY+lift*.1,midZ);m.renderOrder=3+i;root.add(m);return{map,speed};});
 // Lily pads near both banks.
 const padMat=mat(0x3f9a55,{side:T.DoubleSide});for(let i=0;i<(mobile?7:12);i++){const pad=new T.Mesh(new T.CircleGeometry(.32+Math.random()*.22,10,.3,Math.PI*1.8),padMat);pad.rotation.x=-Math.PI/2;pad.rotation.z=Math.random()*6;const near=i%2===0;pad.position.set(C.minX+6+Math.random()*(width-12),C.surfaceY+.02,near?C.nearBankZ-.6-Math.random()*1.2:C.farBankZ+.6+Math.random()*1.2);if(Math.abs(pad.position.x-C.bridgeX)>C.bridgeHalfWidth+1.2)root.add(pad);}

 // Railing along the town-side bank, open where the bridge starts.
 const railSpans=[[C.minX,C.bridgeX-C.bridgeHalfWidth-.05],[C.bridgeX+C.bridgeHalfWidth+.05,C.maxX]],posts=[];
 for(const [a,b] of railSpans){for(let x=a;x<=b+.01;x+=2)posts.push([x,railZ]);posts.push([b,railZ]);const len=b-a,cx=(a+b)/2;box(len,.08,.1,woodMat,cx,.52,railZ,true);box(len,.1,.16,woodDark,cx,.92,railZ,true);}
 // Bridge: plank deck, stone piers and its own railings leading to the tunnel.
 const deckStart=railZ+.25,deckEnd=C.farBankZ-.5,deckLen=deckStart-deckEnd,bx=C.bridgeX,bh=C.bridgeHalfWidth;
 box(bh*2+.3,.22,deckLen,woodDark,bx,-.09,(deckStart+deckEnd)/2,true);
 const plankGeo=new T.BoxGeometry(bh*2,.05,.36),plankCount=Math.floor(deckLen/.42),planks=new T.InstancedMesh(plankGeo,woodMat,plankCount),dummy=new T.Object3D();
 for(let i=0;i<plankCount;i++){dummy.position.set(bx,.045,deckStart-.21-i*.42);dummy.rotation.set(0,(i%3-1)*.012,0);dummy.updateMatrix();planks.setMatrixAt(i,dummy.matrix);}planks.receiveShadow=true;root.add(planks);
 for(const z of [midZ+2.4,midZ-2.4])box(bh*2+.6,-C.bedY,.9,stoneMat,bx,C.bedY/2-.1,z);
 for(const s of [-1,1]){const x=bx+s*(bh+.02);for(let z=deckStart;z>=deckEnd-.01;z-=1.5)posts.push([x,z]);posts.push([x,deckEnd]);box(.1,.08,deckLen,woodMat,x,.52,(deckStart+deckEnd)/2,true);box(.16,.1,deckLen,woodDark,x,.92,(deckStart+deckEnd)/2,true);
  const arch=new T.Mesh(new T.TorusGeometry(2.45,.12,6,22,Math.PI),woodDark);arch.rotation.y=Math.PI/2;arch.position.set(x,-2.55,midZ);root.add(arch);}
 const postMesh=new T.InstancedMesh(new T.BoxGeometry(.16,1.02,.16),woodDark,posts.length);posts.forEach(([x,z],i)=>{dummy.position.set(x,.49,z);dummy.rotation.set(0,0,0);dummy.updateMatrix();postMesh.setMatrixAt(i,dummy.matrix);});postMesh.castShadow=true;root.add(postMesh);

 // Mountain ridge with a stone-framed tunnel mouth facing the bridge.
 const wallH=5.2,gap=2.85,cliffDepth=10;
 for(const s of [-1,1]){const a=bx+s*gap,b=s<0?C.minX-6:C.maxX+6,len=Math.abs(b-a);box(len,wallH,cliffDepth,rockMat,(a+b)/2,wallH/2-.1,C.cliffZ-cliffDepth/2);}
 box(gap*2,wallH-4.6,cliffDepth,rockMat,bx,4.6+(wallH-4.6)/2-.1,C.cliffZ-cliffDepth/2);
 const frame=new T.Shape();frame.moveTo(-gap,0);frame.lineTo(-2.15,0);frame.lineTo(-2.15,1.75);frame.absarc(0,1.75,2.15,Math.PI,0,true);frame.lineTo(2.15,0);frame.lineTo(gap,0);frame.lineTo(gap,4.7);frame.lineTo(-gap,4.7);frame.closePath();
 const portal=new T.Mesh(new T.ExtrudeGeometry(frame,{depth:.7,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:1}),stoneMat);portal.position.set(bx,-.05,C.cliffZ-.35);portal.castShadow=true;root.add(portal);
 for(let i=0;i<9;i++){const t=Math.PI*(i/8),k=new T.Mesh(new T.BoxGeometry(.5,.36,.82),rockDark);k.position.set(bx+Math.cos(t)*2.42,-.05+1.75+Math.sin(t)*2.42,C.cliffZ+.02);k.rotation.z=t-Math.PI/2;root.add(k);}
 const inside=new T.Mesh(new T.BoxGeometry(4.3,4,9),new T.MeshBasicMaterial({color:0x101719,side:T.BackSide}));inside.position.set(bx,1.9,C.cliffZ-4.4);root.add(inside);
 const glow=new T.Mesh(new T.CircleGeometry(1.1,18),new T.MeshBasicMaterial({color:0x4fb2c6,transparent:true,opacity:.18,depthWrite:false}));glow.position.set(bx,1.4,C.cliffZ-8.7);root.add(glow);
 // Rocky masses and moss crowns behind the cliff, bushes along the ridge.
 const blob=(m,x,y,z,sx,sy,sz)=>{const o=new T.Mesh(new T.IcosahedronGeometry(1,1),m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.y=Math.random()*3;root.add(o);return o;};
 let r=7;const rnd=()=>(r=(r*9301+49297)%233280)/233280;
 for(let x=C.minX-4;x<=C.maxX+4;x+=7.5){const near=Math.abs(x-bx)<6,h=near?6.4+rnd()*1.5:7+rnd()*5.5;blob(rnd()>.5?rockMat:rockDark,x+rnd()*3,h*.55,C.cliffZ-7-rnd()*3,5.2+rnd()*2,h,5+rnd()*2);blob(mossMat,x+rnd()*2,h*1.32,C.cliffZ-7.5-rnd()*2,3.4+rnd()*1.4,1.7+rnd(),3.2+rnd());}
 for(let x=C.minX;x<=C.maxX;x+=mobile?3.6:2.4){if(Math.abs(x-bx)<1.2)continue;const s=.55+rnd()*.6;blob(bushMat,x+rnd(),wallH-.05+s*.4,C.cliffZ-.6-rnd()*1.2,s*1.3,s,s*1.1);}
 for(let i=0;i<10;i++){const x=C.minX+rnd()*width;if(Math.abs(x-bx)<4)continue;blob(rockDark,x,.2,C.cliffZ+.25,.6+rnd()*.5,.45+rnd()*.3,.5);}
 // Boulders embedded in the cliff face so it reads as rock rather than a flat wall.
 for(let x=C.minX;x<=C.maxX;x+=mobile?2.6:1.8){if(Math.abs(x-bx)<gap+1.2)continue;const y=.4+rnd()*4.2,s=1+rnd()*1.2;blob(rnd()>.45?rockDark:rockMat,x+rnd()*1.2,y,C.cliffZ-.1,s*1.7,s*.85,.45+rnd()*.25);}

 // Fish silhouettes swimming under the surface.
 const fishGeo=(()=>{const g=new T.SphereGeometry(.5,10,7);g.scale(1,.36,.26);return g;})(),tailGeo=new T.ConeGeometry(.2,.32,4);tailGeo.rotateZ(Math.PI/2);
 const shadowMat=new T.MeshBasicMaterial({color:0x14313a,fog:true}),fishes=[];
 const makeFish=(m,size)=>{const f=new T.Group(),body=new T.Mesh(fishGeo,m),tail=new T.Mesh(tailGeo,m);tail.position.x=-.6;f.add(body,tail);f.scale.setScalar(size);f.userData.tail=tail;return f;};
 const zone=C.waterSpiritZone;
 for(let i=0;i<(mobile?6:10);i++){const f=makeFish(shadowMat,.55+Math.random()*.6),dir=Math.random()<.65?1:-1;f.position.set(C.minX+Math.random()*width,C.surfaceY-.42-Math.random()*.3,C.nearBankZ-1.2-Math.random()*(riverDepth-2.4));root.add(f);fishes.push({f,dir,speed:(.8+Math.random()*1.1)*(dir>0?1.25:.7),lane:f.position.z,phase:Math.random()*9});}
 // Jumping fish, splashes and droplets.
 const jumpMats=[0x7fd3ea,0xffb36b,0xf7d36a,0x9ad7a4].map(c=>new T.MeshStandardMaterial({color:c,roughness:.35,metalness:.1,emissive:c,emissiveIntensity:.12}));
 const jumper=makeFish(jumpMats[0],.85);jumper.visible=false;root.add(jumper);
 const ringGeo=new T.RingGeometry(.2,.32,20),dropGeo=new T.SphereGeometry(.06,5,4),dropMat=new T.MeshBasicMaterial({color:0xe9fbff,transparent:true,opacity:.9}),splashes=[];
 const splash=(x,z,big=1)=>{const ring=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,depthWrite:false,side:T.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(x,C.surfaceY+.04,z);root.add(ring);const drops=[];for(let i=0;i<(mobile?5:8);i++){const d=new T.Mesh(dropGeo,dropMat);d.position.set(x,C.surfaceY+.05,z);const a=Math.random()*Math.PI*2,v=.9+Math.random()*1.4;d.userData.v=new T.Vector3(Math.cos(a)*v*.7,2.2+Math.random()*1.8*big,Math.sin(a)*v*.7);root.add(d);drops.push(d);}splashes.push({ring,drops,age:0,big});};
 let jump=null,nextJump=2+Math.random()*3,time=0;
 const startJump=(x,z)=>{const dir=Math.random()<.5?1:-1;x??=C.minX+8+Math.random()*(width-16);z??=C.nearBankZ-1.6-Math.random()*(riverDepth-3.2);if(Math.abs(x-bx)<bh+1)x+=dir*(bh+2.5);jumper.children.forEach(o=>o.material=jumpMats[Math.floor(Math.random()*jumpMats.length)]);jump={x,z,dir,age:0,dur:1.05+Math.random()*.3,height:1.4+Math.random()*.9,reach:1.8+Math.random()*1.2,landed:false};jumper.visible=true;splash(x,z);};

 // Fishing rod, line and bobber that the hero uses at the railing.
 const rod=new T.Mesh(new T.CylinderGeometry(.018,.035,1.9,6),woodDark);rod.visible=false;root.add(rod);
 const lineGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),line=new T.Line(lineGeo,new T.LineBasicMaterial({color:0xf5f5f0}));line.visible=false;line.frustumCulled=false;root.add(line);
 const bobber=new T.Group();{const top=new T.Mesh(new T.SphereGeometry(.09,8,6,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xe2483e})),bottom=new T.Mesh(new T.SphereGeometry(.09,8,6,0,Math.PI*2,Math.PI/2,Math.PI/2),new T.MeshBasicMaterial({color:0xffffff}));bobber.add(top,bottom);}bobber.visible=false;root.add(bobber);
 let fishing=null;

 const inBridge=(x,m)=>Math.abs(x-bx)<=bh-.18-m;
 const api={
  config:C,root,
  // Walkable: the town side up to the railing, plus the bridge deck up to the tunnel mouth.
  blocked(x,z,m=.42){return z<railZ+.35+m&&!(inBridge(x,m)&&z>=C.tunnelZ+m);},
  canFish(p){return p.z<railZ+.35+.42+.95&&p.z>railZ&&Math.abs(p.x-bx)>bh+.45&&p.x>C.minX+1&&p.x<C.maxX-1;},
  atTunnel(p){return inBridge(p.x,0)&&p.z<C.tunnelZ+1.6;},
  inWaterZone(x,z){return x>=zone.minX&&x<=zone.maxX&&z>=zone.minZ&&z<=zone.maxZ;},
  // Reserved for water-type (潮) spirits once their river-only spawning is switched on.
  randomWaterPoint(){return new T.Vector3(zone.minX+Math.random()*(zone.maxX-zone.minX),C.surfaceY,zone.minZ+Math.random()*(zone.maxZ-zone.minZ));},
  get fishing(){return!!fishing;},
  startFishing(hero,onBite){if(fishing)return false;const p=hero.root.position;hero.root.rotation.y=Math.PI;fishing={hero,onBite,age:0,biteAt:1.5+Math.random()*1.4,bit:false,target:new T.Vector3(p.x+(Math.random()-.5)*1.2,C.surfaceY+.03,railZ-2.1-Math.random()*1.4)};rod.visible=line.visible=true;return true;},
  stopFishing(){fishing=null;rod.visible=line.visible=bobber.visible=false;},
  jump(x,z){if(!jump)startJump(x,z);},
  drawRadar(c,pos){const a=pos(C.minX,C.nearBankZ),b=pos(C.maxX,C.farBankZ);c.fillStyle='#4f9fb4';c.fillRect(a[0],b[1],b[0]-a[0],a[1]-b[1]);const d=pos(bx-bh,railZ),e=pos(bx+bh,C.tunnelZ);c.fillStyle='#c9ad72';c.fillRect(d[0],e[1],e[0]-d[0],d[1]-e[1]);const m=pos(C.minX,C.cliffZ),n=pos(C.maxX,C.cliffZ-12);c.fillStyle='#5e7268';c.fillRect(m[0],n[1],n[0]-m[0],m[1]-n[1]);const t=pos(bx,C.cliffZ);c.fillStyle='#101719';c.beginPath();c.arc(t[0],t[1],5,Math.PI,0);c.fill();},
  tick(dt){
   time+=dt;
   for(const r of ripples)r.map.offset.x-=dt*r.speed*C.flowSpeed;
   for(const s of fishes){s.f.position.x+=s.dir*s.speed*dt;if(s.f.position.x>C.maxX+2)s.f.position.x=C.minX-2;if(s.f.position.x<C.minX-2)s.f.position.x=C.maxX+2;s.f.position.z=s.lane+Math.sin(time*.6+s.phase)*.45;s.f.rotation.y=(s.dir>0?0:Math.PI)+Math.sin(time*5+s.phase)*.12;s.f.userData.tail.rotation.y=Math.sin(time*11+s.phase)*.5;}
   nextJump-=dt;if(!jump&&nextJump<=0){startJump();nextJump=2.8+Math.random()*5;}
   if(jump){jump.age+=dt;const k=Math.min(1,jump.age/jump.dur),h=4*k*(1-k);jumper.position.set(jump.x+jump.dir*jump.reach*k,C.surfaceY-.1+h*jump.height,jump.z);jumper.rotation.set(0,jump.dir>0?0:Math.PI,(1-2*k)*1.05);jumper.userData.tail.rotation.y=Math.sin(time*18)*.6;if(k>=1){splash(jumper.position.x,jump.z,.8);jumper.visible=false;jump=null;}}
   for(let i=splashes.length-1;i>=0;i--){const s=splashes[i];s.age+=dt;s.ring.scale.setScalar(1+s.age*5*s.big);s.ring.material.opacity=Math.max(0,.8-s.age*1.1);for(const d of s.drops){d.userData.v.y-=9.8*dt;d.position.addScaledVector(d.userData.v,dt);d.visible=d.position.y>C.surfaceY;}if(s.age>.8){root.remove(s.ring);s.ring.material.dispose();s.drops.forEach(d=>root.remove(d));splashes.splice(i,1);}}
   if(fishing){const f=fishing,h=f.hero.root,yaw=h.rotation.y,fx=Math.sin(yaw),fz=Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw);f.age+=dt;
    const base=new T.Vector3(h.position.x+fx*.3-rx*.32,1.05,h.position.z+fz*.3-rz*.32),cast=Math.min(1,f.age/.45),tip=new T.Vector3(h.position.x+fx*(.3+1.25*cast)-rx*.32,1.05+1.45-.35*cast,h.position.z+fz*(.3+1.25*cast)-rz*.32);
    rod.position.copy(base).lerp(tip,.5);rod.lookAt(tip);rod.rotateX(Math.PI/2);
    const bob=f.target.clone();if(cast<1)bob.lerpVectors(tip,f.target,cast).y+=Math.sin(cast*Math.PI)*1.2;else if(!f.bit)bob.y+=Math.sin(f.age*4)*.03;else bob.y-=.14+Math.sin(f.age*30)*.04;
    if(cast>=1&&!bobber.visible){bobber.visible=true;splash(f.target.x,f.target.z,.35);}
    bobber.position.copy(bob);const pts=lineGeo.attributes.position;pts.setXYZ(0,tip.x,tip.y,tip.z);pts.setXYZ(1,bob.x,bob.y+.08,bob.z);pts.needsUpdate=true;
    if(!f.bit&&f.age>=f.biteAt){f.bit=true;f.biteAge=f.age;splash(f.target.x,f.target.z,.7);startJump(f.target.x-.6,f.target.z-.4);}
    if(f.bit&&f.age-f.biteAge>1.15){const cb=f.onBite;api.stopFishing();cb?.();}}
  }
 };
 return api;
}
window.PhantomRiver={build,DEFAULTS};
})();
