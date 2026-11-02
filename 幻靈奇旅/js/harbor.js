/* 幻靈奇旅 — 初光鎮東側碼頭：沙灘、海面、木棧橋、碼頭小屋與快艇；主角坐上快艇駛往「幻靈守護戰」群島（程序化 Three.js 場景）。 */
(() => {
'use strict';
/* Town east edge is x = 36. The beach runs to SHORE_X, the sea beyond; the pier reaches PIER_END along z = PIER_Z. */
const DEFAULTS={shoreX:39.5,pierZ:4,pierHalf:1.35,pierStart:35,pierEnd:53,minZ:-40,maxZ:36};

/* warm hand-painted wood: planks with darker seams, grain streaks and knots */
function woodTexture(T,hex,{w=256,h=64,planks=1,vertical=false}={}){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d'),base=new T.Color(hex),tone=k=>'#'+base.clone().multiplyScalar(k).getHexString();
 g.fillStyle=tone(1);g.fillRect(0,0,w,h);
 const n=planks,size=(vertical?w:h)/n;
 for(let i=0;i<n;i++){g.fillStyle=tone(.9+((i*37)%5)*.04);vertical?g.fillRect(i*size,0,size,h):g.fillRect(0,i*size,w,size);g.fillStyle=tone(.55);vertical?g.fillRect(i*size,0,2,h):g.fillRect(0,i*size,w,2);}
 g.strokeStyle=tone(.78);g.lineWidth=1.2;
 for(let i=0;i<40;i++){g.beginPath();const y=Math.random()*h,x=Math.random()*w;g.moveTo(vertical?x:0,vertical?0:y);g.bezierCurveTo(vertical?x+4:w*.3,vertical?h*.3:y+3,vertical?x-4:w*.6,vertical?h*.6:y-3,vertical?x:w,vertical?h:y);g.stroke();}
 for(let i=0;i<3;i++){g.fillStyle=tone(.6);g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,5,2.5,0,0,Math.PI*2);g.fill();}
 const t=new T.CanvasTexture(c);t.encoding=T.sRGBEncoding;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;return t;
}

function build({THREE:T,group,mobile=false,config}){
 const C={...DEFAULTS,...(config||{})},root=new T.Group();root.name='East harbour · pier · speedboat';group.add(root);
 const mat=(color,o={})=>new T.MeshStandardMaterial({color,roughness:.8,...o});
 const plankTex=woodTexture(T,0xc98d52,{planks:1}),postTex=woodTexture(T,0x7a5232,{planks:3,vertical:true}),crateTex=woodTexture(T,0xd2a062,{planks:4});
 const plank=mat(0xffffff,{map:plankTex,roughness:.75}),post=mat(0xffffff,{map:postTex,roughness:.85}),crateMat=mat(0xffffff,{map:crateTex,roughness:.8});
 const rope=mat(0xd8bf86,{roughness:.95}),iron=mat(0x4d555e,{metalness:.3,roughness:.5}),sandMat=mat(0xf0d9a0,{roughness:.95}),wetSand=mat(0xd4b479,{roughness:.9});
 const box=(w,h,d,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.castShadow=!mobile;o.receiveShadow=true;return o;};
 const cyl=(rt,rb,h,m,seg=12)=>{const o=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg),m);o.castShadow=!mobile;o.receiveShadow=true;return o;};
 const ball=(r,m,seg=12)=>{const o=new T.Mesh(new T.SphereGeometry(r,seg,Math.max(6,seg-4)),m);o.castShadow=!mobile;return o;};

 /* beach strip from the town edge to the waterline, darker where the waves reach, with shells and grass tufts */
 const beachW=C.shoreX-34.5+3,beach=box(beachW,.2,C.maxZ-C.minZ+8,sandMat);beach.position.set(34.5+beachW/2,-.08,(C.minZ+C.maxZ)/2);root.add(beach);
 const wet=box(2.4,.2,C.maxZ-C.minZ+8,wetSand);wet.position.set(C.shoreX+.4,-.12,(C.minZ+C.maxZ)/2);root.add(wet);
 const shellMats=[0xfff3e0,0xffd1c4,0xf6e1a8].map(c=>mat(c));
 for(let i=0;i<30;i++){const s=new T.Mesh(new T.SphereGeometry(.09+Math.random()*.06,8,6,0,Math.PI*2,0,Math.PI/2),shellMats[i%3]);s.position.set(35.6+Math.random()*(C.shoreX-36.4),.03,C.minZ+2+Math.random()*(C.maxZ-C.minZ-4));if(Math.abs(s.position.z-C.pierZ)>2.4)root.add(s);}
 const grass=mat(0x6fbf4a,{roughness:.9});
 for(let i=0;i<40;i++){const tuft=new T.Mesh(new T.ConeGeometry(.08,.42,5),grass);tuft.position.set(35+Math.random()*1.6,.15,C.minZ+Math.random()*(C.maxZ-C.minZ));tuft.rotation.z=(Math.random()-.5)*.4;if(Math.abs(tuft.position.z-C.pierZ)>2.6)root.add(tuft);}

 /* sea: a large plane with gentle vertex waves and a foam line at the shore */
 const seaGeo=new T.PlaneGeometry(130,150,mobile?40:80,mobile?40:90);seaGeo.rotateX(-Math.PI/2);
 const sea=new T.Mesh(seaGeo,new T.MeshStandardMaterial({color:0x1784c8,roughness:.25,metalness:.05}));sea.position.set(C.shoreX+65-.6,-.32,(C.minZ+C.maxZ)/2);sea.receiveShadow=true;root.add(sea);
 const base=Float32Array.from(seaGeo.attributes.position.array);
 const foam=new T.Mesh(new T.PlaneGeometry(.5,C.maxZ-C.minZ+8),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75}));foam.rotation.x=-Math.PI/2;foam.position.set(C.shoreX,-.2,(C.minZ+C.maxZ)/2);root.add(foam);

 /* pier: textured planks on thick posts, rope rails sagging between posts, lanterns on hooks */
 const pier=new T.Group();pier.name='Pier';root.add(pier);
 for(let x=C.pierStart;x<C.pierEnd;x+=.6){const p=box(.56,.16,C.pierHalf*2,plank);p.position.set(x+.3,.12,C.pierZ);p.rotation.y=(Math.random()-.5)*.03;p.material=plank;pier.add(p);}
 const postXs=[];for(let x=C.pierStart+1.2;x<=C.pierEnd+.01;x+=2.6)postXs.push(x);
 for(const x of postXs)for(const s of[-1,1]){const z=C.pierZ+s*(C.pierHalf+.08),p=cyl(.17,.2,2.1,post);p.position.set(x,-.2,z);pier.add(p);const ringR=new T.Mesh(new T.TorusGeometry(.19,.045,6,14),rope);ringR.rotation.x=Math.PI/2;ringR.position.set(x,.55,z);pier.add(ringR);const cap=cyl(.2,.2,.08,post);cap.position.set(x,.86,z);pier.add(cap);}
 for(const s of[-1,1])for(let i=0;i<postXs.length-1;i++){const a=new T.Vector3(postXs[i],.78,C.pierZ+s*(C.pierHalf+.08)),b=new T.Vector3(postXs[i+1],.78,a.z),m=a.clone().lerp(b,.5);m.y-=.2;const tube=new T.Mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(a,m,b),12,.035,5),rope);pier.add(tube);}
 const lanterns=[],lampMat=new T.MeshStandardMaterial({color:0xffe6a0,emissive:0xffb24a,emissiveIntensity:1.1});
 for(const x of[postXs[1],postXs[postXs.length-1]])for(const s of[-1,1]){const z=C.pierZ+s*(C.pierHalf+.08),pole=cyl(.05,.05,1.3,post,6);pole.position.set(x,1.5,z);pier.add(pole);const arm=box(.5,.05,.05,post);arm.position.set(x+.22,2.12,z);pier.add(arm);const cage=box(.26,.32,.26,iron);cage.position.set(x+.42,1.86,z);pier.add(cage);const lamp=box(.2,.26,.2,lampMat);lamp.position.set(x+.42,1.86,z);pier.add(lamp);lanterns.push(lamp);}
 /* dock clutter: crates, barrels, coiled rope, a net and flower pots */
 const crate=(x,z,s=1,y=0)=>{const c=box(.7*s,.7*s,.7*s,crateMat);c.position.set(x,.2+.35*s+y,z);c.rotation.y=Math.random()*.4;pier.add(c);return c;};
 crate(C.pierStart+2.2,C.pierZ-.75);crate(C.pierStart+2.25,C.pierZ-.72,.75,.7);crate(C.pierStart+3.05,C.pierZ-.8,.85);
 const barrelMat=mat(0xffffff,{map:woodTexture(T,0xb5783e,{planks:8,vertical:true}),roughness:.8});
 for(const [x,z] of[[C.pierEnd-5.2,C.pierZ+.82],[C.pierEnd-4.5,C.pierZ+.88]]){const b=cyl(.32,.3,.78,barrelMat,14);b.position.set(x,.6,z);pier.add(b);for(const y of[.38,.82]){const h=new T.Mesh(new T.TorusGeometry(.33,.03,5,18),iron);h.rotation.x=Math.PI/2;h.position.set(x,y,z);pier.add(h);}}
 const coil=new T.Mesh(new T.TorusGeometry(.26,.07,6,18),rope);coil.rotation.x=Math.PI/2;coil.position.set(C.pierEnd-1.1,.25,C.pierZ-.85);pier.add(coil);
 const coil2=coil.clone();coil2.scale.setScalar(.7);coil2.position.y=.36;pier.add(coil2);
 const pot=(x,z,flower)=>{const p=cyl(.2,.15,.32,mat(0xc0663c),10);p.position.set(x,.36,z);pier.add(p);const bush=ball(.24,mat(0x5fae45));bush.position.set(x,.62,z);pier.add(bush);for(let i=0;i<5;i++){const f=ball(.06,mat(flower),6);const a=i/5*Math.PI*2;f.position.set(x+Math.cos(a)*.17,.72,z+Math.sin(a)*.17);pier.add(f);}};
 pot(C.pierStart+.4,C.pierZ+C.pierHalf+.55,0xff8fb3);pot(C.pierStart+.4,C.pierZ-C.pierHalf-.55,0xffd23a);
 /* ticket booth with a striped awning and a sign */
 const booth=new T.Group();booth.position.set(C.pierStart-1.6,0,C.pierZ-C.pierHalf-2.4);root.add(booth);
 const walls=box(2,1.7,1.5,mat(0xffffff,{map:woodTexture(T,0xe8c58e,{planks:5,vertical:true})}));walls.position.y=.85;booth.add(walls);
 const counter=box(2.1,.12,.5,post);counter.position.set(0,1.05,.85);booth.add(counter);
 for(let i=0;i<6;i++){const s=box(.36,.08,1.05,mat(i%2?0xffffff:0x2f7fd6));s.position.set(-.9+i*.36,1.98,.35);s.rotation.x=.42;booth.add(s);}
 const roof=box(2.3,.14,1.8,mat(0x9a5a34));roof.position.y=1.8;booth.add(roof);
 const sc=document.createElement('canvas');sc.width=512;sc.height=160;const sg=sc.getContext('2d');sg.fillStyle='#fff3d6';sg.fillRect(0,0,512,160);sg.strokeStyle='#7a4f26';sg.lineWidth=12;sg.strokeRect(6,6,500,148);sg.fillStyle='#2f5f9a';sg.textAlign='center';sg.font='bold 58px "Microsoft JhengHei",sans-serif';sg.fillText('🚤 快艇航線',256,72);sg.fillStyle='#5a3416';sg.font='bold 34px "Microsoft JhengHei",sans-serif';sg.fillText('幻靈群島 · 幻靈守護戰',256,128);
 const signTex=new T.CanvasTexture(sc);signTex.encoding=T.sRGBEncoding;
 const sign=new T.Mesh(new T.PlaneGeometry(2,.62),new T.MeshStandardMaterial({map:signTex,roughness:.8}));sign.position.set(0,2.35,.6);booth.add(sign);
 booth.rotation.y=-Math.PI/2+.25;

 /* the speedboat (after the reference): white hull with a royal-blue sheer stripe and bottom, an open cockpit with
    raised sides, a wraparound windshield, a console with a wheel, a padded seat and an outboard motor. Bow is +x.
    The hero sits on SEAT; the seat, the cockpit sides and the floor hide the legs, so nothing clips. */
 const boat=new T.Group();boat.name='Speedboat';
 const white=mat(0xfbfbf7,{roughness:.32}),blue=mat(0x0a3fc0,{roughness:.35}),deep=mat(0x0b2a78,{roughness:.4}),dark=mat(0x23262e,{roughness:.45});
 const glass=new T.MeshStandardMaterial({color:0x9fdcff,transparent:true,opacity:.42,roughness:.05,metalness:.2,side:T.DoubleSide,depthWrite:false});
 const outline=(s=1,dx=0)=>{const sh=new T.Shape();sh.moveTo(-2.4*s+dx,-1*s);sh.lineTo(1.2*s+dx,-1*s);sh.quadraticCurveTo(2.9*s+dx,-.8*s,3.4*s+dx,0);sh.quadraticCurveTo(2.9*s+dx,.8*s,1.2*s+dx,1*s);sh.lineTo(-2.4*s+dx,1*s);sh.quadraticCurveTo(-2.6*s+dx,0,-2.4*s+dx,-1*s);return sh;};
 const extrude=(shape,depth,y,m)=>{const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2,curveSegments:16});g.rotateX(-Math.PI/2);const o=new T.Mesh(g,m);o.position.y=y;o.castShadow=!mobile;o.receiveShadow=true;boat.add(o);return o;};
 extrude(outline(.97),.22,-.62,blue);/* keel band */
 extrude(outline(1),.62,-.4,white);/* hull */
 const stripe=extrude(outline(1.012),.12,.08,blue);stripe.scale.y=1;
 /* cockpit sides: the outline with the cockpit cut out, raised above the deck */
 const sideShape=outline(1),hole=new T.Path();hole.moveTo(-2.1,-.78);hole.lineTo(1.15,-.78);hole.quadraticCurveTo(1.45,0,1.15,.78);hole.lineTo(-2.1,.78);hole.lineTo(-2.1,-.78);sideShape.holes.push(hole);
 extrude(sideShape,.42,.22,white);
 const floor=box(3.2,.06,1.5,mat(0xd9dee6,{roughness:.6}));floor.position.set(-.48,.26,0);boat.add(floor);
 const ws=new T.Mesh(new T.CylinderGeometry(1,1,.55,24,1,true,Math.PI*.18,Math.PI*.64),glass);ws.rotation.z=-.35;ws.scale.set(.55,1,.92);ws.position.set(.95,.95,0);ws.rotation.y=Math.PI/2;boat.add(ws);
 const wsFrame=new T.Mesh(new T.TorusGeometry(.86,.035,6,24,Math.PI*.64),deep);wsFrame.rotation.set(Math.PI/2,0,Math.PI*.18-Math.PI/2);wsFrame.scale.set(.6,1,1);wsFrame.position.set(.98,1.2,0);boat.add(wsFrame);
 const consoleBox=box(.5,.62,.9,white);consoleBox.position.set(.72,.58,0);boat.add(consoleBox);
 const dash=box(.52,.06,.92,deep);dash.position.set(.72,.92,0);boat.add(dash);
 const wheel=new T.Mesh(new T.TorusGeometry(.2,.035,8,20),dark);wheel.position.set(.42,1.02,0);wheel.rotation.set(0,Math.PI/2,0);wheel.rotateX(-.55);boat.add(wheel);
 const hub=cyl(.05,.05,.1,dark,8);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);boat.add(hub);
 const SEAT={x:-.38,y:.62};
 const seat=box(.62,.36,.9,white);seat.position.set(SEAT.x,.44,0);boat.add(seat);
 const cushion=box(.6,.1,.86,blue);cushion.position.set(SEAT.x,.66,0);boat.add(cushion);
 const back=box(.14,.6,.86,blue);back.position.set(SEAT.x-.34,.95,0);back.rotation.z=.12;boat.add(back);
 const rearBench=box(.5,.32,1.4,white);rearBench.position.set(-1.75,.42,0);boat.add(rearBench);
 const motor=new T.Group(),cowl=box(.48,.62,.42,dark);cowl.position.y=.95;motor.add(cowl);const cowlTop=box(.5,.12,.44,white);cowlTop.position.y=1.32;motor.add(cowlTop);const shaft=box(.14,.9,.14,dark);shaft.position.y=.3;motor.add(shaft);motor.position.set(-2.72,0,0);boat.add(motor);
 const lightMat=new T.MeshStandardMaterial({color:0xfff8e0,emissive:0xffe9a0,emissiveIntensity:.8});
 for(const s of[-1,1]){const l=box(.08,.07,.22,lightMat);l.position.set(2.62,.1,s*.42);l.rotation.y=s*.5;boat.add(l);}
 for(const s of[-1,1]){const rail=cyl(.025,.025,1.5,mat(0xd5d9de,{metalness:.6,roughness:.25}),6);rail.rotation.z=Math.PI/2;rail.position.set(2.05,.75,s*.55);boat.add(rail);}
 /* spray and V-wake while running */
 const sprayMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.85,depthWrite:false}),sprayGeo=new T.SphereGeometry(.09,6,4),spray=[];
 for(let i=0;i<70;i++){const d=new T.Mesh(sprayGeo,sprayMat);d.visible=false;root.add(d);spray.push({d,life:0,v:new T.Vector3()});}
 const wakeMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
 const wakes=[-1,1].map(s=>{const w=new T.Mesh(new T.PlaneGeometry(1,.5),wakeMat);w.rotation.x=-Math.PI/2;w.position.set(-3,-.27,0);boat.add(w);return {w,s};});
 const moor=new T.Vector3(C.pierEnd-1.4,-.1,C.pierZ+C.pierHalf+1.55);boat.position.copy(moor);root.add(boat);
 const HIP=1.15;/* the town hero's hip height above its feet */

 let time=0,voyage=null,sprayNext=0;
 function emitSpray(rate,dt){
  sprayNext-=dt;while(sprayNext<0){sprayNext+=1/rate;const p=spray.find(s=>s.life<=0);if(!p)break;const side=Math.random()<.5?-1:1,bow=Math.random()<.65;
   p.d.position.set(boat.position.x+(bow?1.6:-2.6),boat.position.y+.1,boat.position.z+side*(bow?.9:.4));p.v.set(bow?-1.5:-3,2+Math.random()*2.2,side*(1.2+Math.random()*1.6));p.life=.6+Math.random()*.4;p.d.visible=true;}
 }
 function update(dt){
  time+=dt;
  const pos=seaGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=base[i*3],z=base[i*3+2];pos.array[i*3+1]=Math.sin(x*.35+time*1.3)*.07+Math.cos(z*.42+time*1.05)*.06;}
  pos.needsUpdate=true;
  foam.material.opacity=.45+Math.sin(time*1.6)*.3;foam.position.x=C.shoreX+Math.sin(time*1.6)*.25;
  for(const l of lanterns)l.material.emissiveIntensity=1+Math.sin(time*3+l.position.x)*.2;
  for(const p of spray){if(p.life<=0)continue;p.life-=dt;p.v.y-=9*dt;p.d.position.addScaledVector(p.v,dt);p.d.scale.setScalar(Math.max(.05,p.life*1.6));if(p.life<=0||p.d.position.y<-.4){p.life=0;p.d.visible=false;}}
  if(voyage){voyage.t+=dt;const v=voyage,k=Math.min(1,v.t/v.duration);
   /* 0-0.28: hop from the pier into the seat; 0.28-0.4: engine idles with a shiver; then the bow lifts and the
      speedboat runs out to sea, spraying, with the hero seated at the wheel */
   if(k<.28){const s=k/.28,e=s*s*(3-2*s),seatX=boat.position.x+SEAT.x,seatZ=boat.position.z;v.player.x=v.from.x+(seatX-v.from.x)*e;v.player.z=v.from.z+(seatZ-v.from.z)*e;const land=boat.position.y+SEAT.y-HIP;v.hero.position.set(v.player.x,(1-e)*.14+e*land+Math.sin(s*Math.PI)*.9,v.player.z);v.hero.rotation.y=Math.atan2(seatX-v.from.x,seatZ-v.from.z)*(1-e)+Math.PI/2*e;}
   else{const s=Math.max(0,(k-.4)/.6),e=s*s*s,idle=k<.4;
    boat.position.x=moor.x+e*36;boat.position.z=moor.z+e*1.5;boat.rotation.z=idle?Math.sin(time*40)*.006:Math.min(.13,s*.5)-s*s*.05;
    v.player.x=boat.position.x+SEAT.x;v.player.z=boat.position.z;v.hero.position.set(v.player.x,boat.position.y+SEAT.y-HIP+Math.sin(SEAT.x)*0+(boat.rotation.z*SEAT.x),v.player.z);v.hero.rotation.set(0,Math.PI/2,0);v.hero.rotation.z=boat.rotation.z;
    if(!idle){emitSpray(30+s*90,dt);wakeMat.opacity=Math.min(.7,s*2);for(const {w,s:side} of wakes){w.scale.set(2+s*6,1,1);w.position.set(-3.2-s*3,-.27,side*(.5+s*1.4));w.rotation.z=side*(.18+s*.12);}}}
   if(k>=1&&!v.done){v.done=true;v.onDone?.();}
  }
  boat.position.y=-.1+Math.sin(time*1.4)*.05;if(!voyage){boat.rotation.z=Math.sin(time*1.1)*.02;wakeMat.opacity=0;}
 }
 const onPier=(x,z,m=0)=>x>=C.pierStart-.5&&x<=C.pierEnd-m&&Math.abs(z-C.pierZ)<=C.pierHalf-m;
 return {
  root,boat,config:C,update,
  /* anything past the waterline is blocked unless it is on the pier */
  blocked(x,z,margin=.42){if(x>C.pierEnd-margin)return true;if(x>C.shoreX-.3&&!onPier(x,z,margin))return true;return false;},
  atDock(p){return onPier(p.x,p.z)&&p.x>C.pierEnd-3.2;},
  dockSpot(){return {x:C.pierEnd-1.6,z:C.pierZ};},
  get sailing(){return !!voyage;},
  /* the hero hops into the seat and the speedboat runs out to sea; onDone fires when it is well away */
  board({hero,player,onDone,duration=2.8}){if(voyage)return;voyage={t:0,duration,hero,player,onDone,from:{x:player.x,z:player.z}};},
  reset(){voyage=null;boat.position.copy(moor);boat.rotation.set(0,0,0);wakeMat.opacity=0;for(const p of spray){p.life=0;p.d.visible=false;}}
 };
}
window.PhantomHarbor={build,DEFAULTS};
})();
