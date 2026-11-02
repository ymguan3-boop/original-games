/* 幻靈奇旅 — 初光鎮東側碼頭：沙灘、海面、木棧橋與帆船；搭快艇前往「幻靈守護戰」群島（程序化 Three.js 場景）。 */
(() => {
'use strict';
/* Town east edge is x = 36. The beach runs to SHORE_X, the sea beyond; the pier reaches PIER_END along z = PIER_Z. */
const DEFAULTS={shoreX:39.5,pierZ:4,pierHalf:1.35,pierStart:35,pierEnd:53,minZ:-40,maxZ:36};

function build({THREE:T,group,mobile=false,config}){
 const C={...DEFAULTS,...(config||{})},root=new T.Group();root.name='East harbour · pier · boat';group.add(root);
 const mat=(color,o={})=>new T.MeshStandardMaterial({color,roughness:.8,...o});
 const wood=mat(0xa8743f,{roughness:.72}),woodDark=mat(0x6e4a2a),woodLight=mat(0xc9955a,{roughness:.7}),rope=mat(0xd9c08a),iron=mat(0x4d555e,{metalness:.3,roughness:.5});
 const sandMat=mat(0xe8d39a,{roughness:.95}),wetSand=mat(0xcdb27a,{roughness:.9});
 const box=(w,h,d,m)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.castShadow=!mobile;o.receiveShadow=true;return o;};
 const cyl=(rt,rb,h,m,seg=10)=>{const o=new T.Mesh(new T.CylinderGeometry(rt,rb,h,seg),m);o.castShadow=!mobile;o.receiveShadow=true;return o;};

 /* beach: a strip of sand from the town edge to the waterline, a little darker where the waves reach */
 const beachW=C.shoreX-34.5+3,beach=box(beachW,.2,C.maxZ-C.minZ+8,sandMat);beach.position.set(34.5+beachW/2,-.08,(C.minZ+C.maxZ)/2);root.add(beach);
 const wet=box(2.4,.2,C.maxZ-C.minZ+8,wetSand);wet.position.set(C.shoreX+.4,-.12,(C.minZ+C.maxZ)/2);root.add(wet);
 for(let i=0;i<26;i++){const r=.25+Math.random()*.35,shell=new T.Mesh(new T.SphereGeometry(r*.35,8,6,0,Math.PI*2,0,Math.PI/2),mat([0xfff3e0,0xffd1c4,0xf6e1a8][i%3]));shell.position.set(35.5+Math.random()*(C.shoreX-36),.03,C.minZ+2+Math.random()*(C.maxZ-C.minZ-4));if(Math.abs(shell.position.z-C.pierZ)>2)root.add(shell);}

 /* sea: a large plane with gentle vertex waves and a foam line at the shore */
 const seaGeo=new T.PlaneGeometry(130,150,mobile?40:80,mobile?40:90);seaGeo.rotateX(-Math.PI/2);
 const seaMat=new T.MeshStandardMaterial({color:0x1784c8,roughness:.25,metalness:.05});
 const sea=new T.Mesh(seaGeo,seaMat);sea.position.set(C.shoreX+65-.6,-.32,(C.minZ+C.maxZ)/2);sea.receiveShadow=true;root.add(sea);
 const base=Float32Array.from(seaGeo.attributes.position.array);
 const foamMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75});
 const foam=new T.Mesh(new T.PlaneGeometry(.5,C.maxZ-C.minZ+8),foamMat);foam.rotation.x=-Math.PI/2;foam.position.set(C.shoreX,-.2,(C.minZ+C.maxZ)/2);root.add(foam);

 /* pier: planks on posts, rope rails, lanterns and a signpost at the start */
 const pier=new T.Group();pier.name='Pier';root.add(pier);
 const len=C.pierEnd-C.pierStart;
 for(let x=C.pierStart;x<C.pierEnd;x+=.62){const p=box(.56,.14,C.pierHalf*2,(Math.round(x/.62)%3)?wood:woodLight);p.position.set(x+.31,.12,C.pierZ);p.rotation.z=(Math.random()-.5)*.02;pier.add(p);}
 for(let x=C.pierStart+1.5;x<=C.pierEnd;x+=3){for(const s of[-1,1]){const post=cyl(.13,.15,1.9,woodDark);post.position.set(x,-.3,C.pierZ+s*(C.pierHalf+.05));pier.add(post);const cap=cyl(.16,.16,.08,woodDark);cap.position.set(x,.64,C.pierZ+s*(C.pierHalf+.05));pier.add(cap);}}
 for(const s of[-1,1]){const railLen=len-1.5,r=cyl(.035,.035,railLen,rope,6);r.rotation.z=Math.PI/2;r.position.set(C.pierStart+1.5+railLen/2,.58,C.pierZ+s*(C.pierHalf+.05));pier.add(r);}
 const lanterns=[];
 for(const x of[C.pierStart+4.5,C.pierEnd-1]){for(const s of[-1,1]){const pole=cyl(.06,.07,1.6,iron,6);pole.position.set(x,.95,C.pierZ+s*(C.pierHalf+.05));pier.add(pole);const lamp=new T.Mesh(new T.SphereGeometry(.17,12,8),new T.MeshStandardMaterial({color:0xffe6a0,emissive:0xffc860,emissiveIntensity:1.2}));lamp.position.set(x,1.82,C.pierZ+s*(C.pierHalf+.05));pier.add(lamp);lanterns.push(lamp);}}
 /* signpost */
 const sign=new T.Group(),c=document.createElement('canvas');c.width=512;c.height=200;const g=c.getContext('2d');
 g.fillStyle='#f6e7c4';g.fillRect(0,0,512,200);g.strokeStyle='#7a4f26';g.lineWidth=14;g.strokeRect(7,7,498,186);g.fillStyle='#5a3416';g.textAlign='center';g.font='bold 62px "Microsoft JhengHei",sans-serif';g.fillText('⛵ 幻靈群島',256,92);g.font='bold 38px "Microsoft JhengHei",sans-serif';g.fillText('幻靈守護戰 · 航線',256,156);
 const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;
 const board=new T.Mesh(new T.BoxGeometry(2.4,.94,.08),[woodDark,woodDark,woodDark,woodDark,new T.MeshStandardMaterial({map:tex,roughness:.8}),new T.MeshStandardMaterial({map:tex,roughness:.8})]);board.position.y=1.9;sign.add(board);
 const signPost=cyl(.08,.1,2.1,woodDark,8);signPost.position.y=1.05;sign.add(signPost);
 sign.position.set(C.pierStart-1.2,0,C.pierZ+C.pierHalf+1.4);sign.rotation.y=-Math.PI/2+.35;root.add(sign);
 /* a few bollards with rope */
 for(const x of[C.pierEnd-.5,C.pierEnd-4]){const b=cyl(.16,.2,.42,iron,10);b.position.set(x,.38,C.pierZ-C.pierHalf+.25);pier.add(b);}

 /* the speedboat: a pointed fibreglass hull (bow toward +x, out to sea), red stripe, open cockpit with a tinted
    windshield, a console with a steering wheel and a twin-seat bench at the back. The helm spot (HELM, boat-local)
    is kept clear of every part so the hero standing there never clips into the boat. */
 const boat=new T.Group();boat.name='Speedboat';
 const hullShape=new T.Shape();hullShape.moveTo(-2.6,-.95);hullShape.lineTo(1.4,-.95);hullShape.quadraticCurveTo(2.9,-.7,3.3,0);hullShape.quadraticCurveTo(2.9,.7,1.4,.95);hullShape.lineTo(-2.6,.95);hullShape.quadraticCurveTo(-2.8,0,-2.6,-.95);
 const white=mat(0xf7f7f2,{roughness:.35}),red=mat(0xe23c34,{roughness:.4}),navy=mat(0x23324a,{roughness:.5}),glass=new T.MeshStandardMaterial({color:0x8fd3ff,transparent:true,opacity:.45,roughness:.1,metalness:.2,side:T.DoubleSide});
 const hullGeo=new T.ExtrudeGeometry(hullShape,{depth:.62,bevelEnabled:true,bevelSize:.1,bevelThickness:.1,bevelSegments:3});hullGeo.rotateX(-Math.PI/2);
 const hull=new T.Mesh(hullGeo,white);hull.position.y=-.32;hull.castShadow=!mobile;boat.add(hull);
 const keelGeo=new T.ExtrudeGeometry(hullShape,{depth:.22,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2});keelGeo.rotateX(-Math.PI/2);
 const keel=new T.Mesh(keelGeo,red);keel.scale.set(.98,1,.96);keel.position.y=-.46;boat.add(keel);
 const deck=new T.Mesh(new T.ShapeGeometry(hullShape),mat(0xd9c3a0,{roughness:.8}));deck.rotation.x=-Math.PI/2;deck.scale.set(.9,.86,1);deck.position.set(-.1,.42,0);boat.add(deck);
 const bowDeck=box(1.4,.08,1.4,white);bowDeck.position.set(2.15,.44,0);boat.add(bowDeck);
 const windshield=new T.Mesh(new T.PlaneGeometry(1.5,.55),glass);windshield.position.set(.95,.78,0);windshield.rotation.set(0,Math.PI/2,0);windshield.rotation.z=0;windshield.rotateX(-.45);boat.add(windshield);
 const frame=box(.06,.06,1.5,navy);frame.position.set(1.05,1.02,0);boat.add(frame);
 const console_=box(.45,.6,.62,navy);console_.position.set(.55,.72,.28);boat.add(console_);
 const wheel=new T.Mesh(new T.TorusGeometry(.17,.035,6,18),mat(0x1c1c22));wheel.position.set(.3,1.08,.28);wheel.rotation.y=Math.PI/2;wheel.rotation.x=-.5;boat.add(wheel);
 const bench=box(.55,.32,1.5,red);bench.position.set(-1.85,.6,0);boat.add(bench);
 const backrest=box(.12,.42,1.5,red);backrest.position.set(-2.12,.9,0);boat.add(backrest);
 const motor=box(.42,.7,.5,mat(0x2b2b33));motor.position.set(-2.82,.35,0);boat.add(motor);
 const motorCap=box(.5,.18,.56,red);motorCap.position.set(-2.82,.76,0);boat.add(motorCap);
 const flag=new T.Mesh(new T.PlaneGeometry(.5,.3),new T.MeshStandardMaterial({color:0xffcf3f,side:T.DoubleSide}));const flagPole=cyl(.02,.02,.9,navy,6);flagPole.position.set(-2.55,1.15,.6);boat.add(flagPole);flag.position.set(-2.32,1.48,.6);boat.add(flag);
 for(const s of[-1,1]){const rail=cyl(.03,.03,2.2,mat(0xc8ccd2,{metalness:.5,roughness:.3}),6);rail.rotation.z=Math.PI/2;rail.position.set(2.1,.62,s*.62);boat.add(rail);}
 /* wake: two foam fans behind the motor that grow with speed */
 const wakeMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false});
 const wake=new T.Mesh(new T.CircleGeometry(1,24,Math.PI*.82,Math.PI*.36),wakeMat);wake.rotation.x=-Math.PI/2;wake.position.set(-2.9,.02-.1,0);wake.scale.set(4,1,2);boat.add(wake);
 const HELM={x:-.15,z:.28};
 const moor=new T.Vector3(C.pierEnd-1.2,-.1,C.pierZ+C.pierHalf+1.5);boat.position.copy(moor);root.add(boat);

 let time=0,voyage=null;
 function update(dt){
  time+=dt;
  const pos=seaGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const x=base[i*3],z=base[i*3+2];pos.array[i*3+1]=Math.sin(x*.35+time*1.3)*.07+Math.cos(z*.42+time*1.05)*.06;}
  pos.needsUpdate=true;
  foam.material.opacity=.45+Math.sin(time*1.6)*.3;foam.position.x=C.shoreX+Math.sin(time*1.6)*.25;
  for(const l of lanterns)l.material.emissiveIntensity=1+Math.sin(time*3+l.position.x)*.25;
  flag.rotation.y=Math.sin(time*5)*.3;
  if(voyage){voyage.t+=dt;const v=voyage,k=Math.min(1,v.t/v.duration);
   /* phase 1 (0-0.3): the hero steps from the pier onto the deck; phase 2: the boat pushes off and sails east, turning slightly */
   if(k<.3){const s=k/.3,e=s*s*(3-2*s);v.player.x=v.from.x+(v.deck.x-v.from.x)*e;v.player.z=v.from.z+(v.deck.z-v.from.z)*e;v.hero.position.set(v.player.x,Math.sin(s*Math.PI)*.7+e*(boat.position.y+.46),v.player.z);v.hero.rotation.y=Math.atan2(v.deck.x-v.from.x,v.deck.z-v.from.z)*(1-e)+Math.PI/2*e;}
   else{const s=(k-.3)/.7,e=s*s*s;boat.position.x=moor.x+e*34;boat.position.z=moor.z+e*2;boat.rotation.z=-Math.min(.12,s*.3);v.player.x=boat.position.x+HELM.x;v.player.z=boat.position.z+HELM.z;v.hero.position.set(v.player.x,boat.position.y+.46,v.player.z);v.hero.rotation.y=Math.PI/2;wakeMat.opacity=Math.min(.55,s*1.6);wake.scale.set(2.2+s*2.4,1,1.4+s*1.2);}
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
  /* hero steps aboard, the boat sails off; onDone fires when it is out at sea */
  board({hero,player,onDone,duration=2.4}){if(voyage)return;const deck={x:moor.x+HELM.x,z:moor.z+HELM.z};voyage={t:0,duration,hero,player,onDone,from:{x:player.x,z:player.z},deck};},
  reset(){voyage=null;boat.position.copy(moor);boat.rotation.set(0,0,0);wakeMat.opacity=0;}
 };
}
window.PhantomHarbor={build,DEFAULTS};
})();
