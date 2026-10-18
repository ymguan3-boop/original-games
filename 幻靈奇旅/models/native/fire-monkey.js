/* C囝仔 / C老猴. Native connected Three.js character rigs. +Z front, ground Y=0. */
(()=>{'use strict';
function create(options={}){
 const T=THREE,stage=Number(options.stage)===2?2:1,king=stage===2,root=new T.Group(),rig=new T.Group(),geometries=new Set(),materials=new Set();
 root.name=king?'C老猴':'C囝仔';root.add(rig);rig.name='ConnectedFireMonkeyRig';
 const geo=g=>(geometries.add(g),g),mat=(hex,metalness=0,roughness=.67)=>{const m=new T.MeshStandardMaterial({color:new T.Color(hex).convertSRGBToLinear(),metalness,roughness});materials.add(m);return m;};
 const fur=mat(king?'#9f4a21':'#b96b36'),cream=mat('#ffe0a1'),innerEar=mat('#e98b78'),red=mat('#c92d20'),darkRed=mat('#8a251b'),gold=mat('#e9ac36',.52,.33),yellow=mat('#ffcf4e'),flameRed=mat('#eb4224'),orange=mat('#ff8426'),brown=mat('#422b22'),black=mat('#211310'),white=mat('#fff9e8'),iris=mat('#aa581c'),pupil=mat('#28180e'),pink=mat('#ef706c');
 for(const m of [yellow,flameRed,orange]){m.emissive.copy(m.color);m.emissiveIntensity=.23;}
 const unit=geo(new T.SphereGeometry(1,16,10)),detail=geo(new T.SphereGeometry(1,28,18)),cylinder=geo(new T.CylinderGeometry(1,1,1,16)),torus=geo(new T.TorusGeometry(1,.13,7,28));
 function mesh(parent,g,m){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function ell(parent,m,x,y,z,sx,sy,sz,hi=false){const o=mesh(parent,hi?detail:unit,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function cyl(parent,m,r,h,x=0,y=0,z=0){const o=mesh(parent,cylinder,m);o.scale.set(r,h,r);o.position.set(x,y,z);return o;}
 function tube(parent,m,pts,r=.025,segments=24){return mesh(parent,geo(new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),segments,r,7,false)),m);}
 function group(parent,x=0,y=0,z=0,name=''){const o=new T.Group();o.position.set(x,y,z);o.name=name;parent.add(o);return o;}
 function flat(parent,m,points,depth=.035){const s=new T.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();return mesh(parent,geo(new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.015,bevelThickness:.012,curveSegments:12})),m);}
 // A curved mask is projected onto the head ellipsoid, avoiding disconnected facial plates.
 function patch(parent,m,shape,rx,ry,rz,offset=.015){
  const contour=shape.getPoints(24),tris=T.ShapeUtils.triangulateShape(contour,[]),positions=[],N=5;
  const put=(a,b,c,u,v)=>{const x=a.x+(b.x-a.x)*u+(c.x-a.x)*v,y=a.y+(b.y-a.y)*u+(c.y-a.y)*v;positions.push(x,y,rz*Math.sqrt(Math.max(.025,1-x*x/(rx*rx)-y*y/(ry*ry)))+offset);};
  for(const ids of tris){const [a,b,c]=ids.map(i=>contour[i]);for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){put(a,b,c,i/N,j/N);put(a,b,c,(i+1)/N,j/N);put(a,b,c,i/N,(j+1)/N);if(i+j<N-1){put(a,b,c,(i+1)/N,j/N);put(a,b,c,(i+1)/N,(j+1)/N);put(a,b,c,i/N,(j+1)/N);}}}
  const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();return mesh(parent,g,m);
 }
 const torsoY=king?1.71:1.02,headY=king?2.95:1.94,headRX=king?.73:.78,headRY=king?.72:.76,headRZ=king?.57:.60;
 const body=group(rig,0,torsoY,0,'Torso');ell(body,king?cream:fur,0,0,0,king?.46:.47,king?.71:.61,king?.32:.36,true);
 if(!king)ell(body,cream,0,-.015,.292,.32,.45,.105);
 else {for(const s of [-1,1]){ell(body,fur,s*.39,.20,-.05,.13,.49,.25);ell(body,cream,s*.21,.28,.26,.23,.25,.10);}ell(body,brown,0,-.53,.02,.45,.27,.32);}
 cyl(rig,fur,king?.22:.23,.30,0,headY-headRY-.06,0);
 const head=group(rig,0,headY,0,'Head');ell(head,fur,0,0,0,headRX,headRY,headRZ,true);
 for(const s of [-1,1]){const ear=group(head,s*(headRX+.10),.0,-.015,'Ear');ear.rotation.z=s*(king?-.16:-.12);ell(ear,fur,0,0,0,king?.36:.39,king?.41:.43,.145);ell(ear,innerEar,s*.025,.015,.12,king?.265:.28,king?.30:.32,.046);ell(head,fur,s*.64,-.34,-.02,.22,.26,.30);}
 const faceShape=new T.Shape();faceShape.moveTo(0,.45);faceShape.bezierCurveTo(-.28,.80,-.64,.39,-.61,.02);faceShape.bezierCurveTo(-.77,-.16,-.54,-.50,-.18,-.57);faceShape.bezierCurveTo(-.06,-.63,.08,-.63,.21,-.56);faceShape.bezierCurveTo(.56,-.48,.76,-.16,.60,.04);faceShape.bezierCurveTo(.64,.42,.27,.79,0,.45);patch(head,cream,faceShape,headRX,headRY,headRZ,.023);
 const eyes=[];
 for(const s of [-1,1]){
  const eye=group(head,s*.285,.055,headRZ*.94,'BlinkEye');eye.rotation.z=s*(king?-.11:-.13);ell(eye,white,0,0,0,.205,.205,.045);ell(eye,iris,-s*.024,-.012,.040,.112,.153,.024);ell(eye,pupil,-s*.028,-.01,.059,.055,.11,.012);ell(eye,white,-.035,.060,.070,.026,.037,.008);eyes.push(eye);
  tube(head,fur,[[s*.11,.29,.55],[s*.27,.26,.56],[s*.46,.37,.44]],king?.045:.034,12);
 }
 const nose=ell(head,flameRed,0,-.16,headRZ+.025,.069,.038,.042);nose.rotation.z=-.10;
 if(!king){
  const mouth=group(head,0,-.315,.571,'MischievousGrin');mouth.rotation.z=.11;ell(mouth,black,0,0,0,.285,.135,.035);ell(mouth,pink,.035,-.083,.055,.105,.13,.035);tube(mouth,darkRed,[[.035,-.16,.09],[.035,-.065,.09]],.007,8);
  for(const x of [-.19,-.09,.14]){const tooth=flat(mouth,white,[[x-.035,.078],[x+.032,.078],[x+.027,-.001],[x-.028,-.008]],.017);tooth.position.z=.035;}
  tube(head,fur,[[-.35,-.36,.525],[-.43,-.29,.477]],.018,8);
 }else {tube(head,darkRed,[[-.19,-.29,.57],[-.05,-.32,.60],[.10,-.30,.60],[.19,-.34,.57]],.014,16);}
 // Layered sculpted flames are geometry, not per-frame particles or lights.
 function flame(parent,scale=1){
  const f=group(parent);const sh=new T.Shape();sh.moveTo(-.19,0);sh.bezierCurveTo(-.48,.28,-.33,.47,-.22,.62);sh.bezierCurveTo(-.25,.32,.08,.48,-.02,1.0);sh.bezierCurveTo(.50,.81,.55,.32,.28,.04);sh.bezierCurveTo(.20,-.08,-.03,-.11,-.19,0);
  const g=geo(new T.ExtrudeGeometry(sh,{depth:.13,bevelEnabled:true,bevelSize:.035,bevelThickness:.04,bevelSegments:2,steps:1,curveSegments:12}));const outer=mesh(f,g,flameRed);outer.position.z=-.05;
  const mid=mesh(f,g,orange);mid.scale.set(.67,.78,.57);mid.position.set(.035,.01,.10);
  const heart=mesh(f,g,yellow);heart.scale.set(.36,.49,.38);heart.position.set(.055,.01,.16);f.scale.setScalar(scale);return f;
 }
 const crest=group(head,0,headRY*.81,-.12,'FlameCrest');
 flame(crest,king?1.06:.89);for(const s of [-1,1]){const tuft=flame(crest,king?.74:.54);tuft.position.set(s*.30,-.09,-.04);tuft.rotation.z=-s*.43;}
 if(king){for(const s of [-1,1]){const tuft=flame(crest,.55);tuft.position.set(s*.50,-.25,-.16);tuft.rotation.z=-s*.85;}const band=mesh(head,torus,gold);band.scale.set(.74,.74,.66);band.rotation.x=Math.PI/2;band.position.y=.42;
  for(const s of [-1,1]){const points=[];for(let j=0;j<23;j++){const a=j/22*Math.PI*2.1,r=.115*(1-j/28);points.push([s*(.11+Math.cos(a)*r),.49+Math.sin(a)*r,.53]);}tube(head,gold,points,.028,26);}
 }
 const collar=group(rig,0,headY-headRY+.03,0,'Scarf');const ring=mesh(collar,torus,red);ring.scale.set(king?.34:.31,king?.34:.31,king?.66:.54);ring.rotation.x=Math.PI/2;
 const bib=flat(collar,red,[[-.31,.05],[.31,.05],[.20,-.24],[.04,-.40],[-.22,-.20]],.045);bib.position.z=.27;
 if(!king){const emblem=flame(collar,.16);emblem.position.set(0,-.30,.35);}
 const ribbons=[];
 for(const s of [-1,1]){const r=group(collar,s*.21,.01,-.16,'ScarfRibbon');r.rotation.y=s*.32;r.rotation.z=s*.21;const len=king?1.20:.49;
  const cloth=flat(r,red,[[0,0],[s*.17,.07],[s*(king?.78:.36),-.17],[s*(king?1.0:.42),-len],[s*(king?.69:.17),-len*.79],[s*.12,-.23]],.027);cloth.rotation.y=s*.22;
  if(king){const goldTip=flat(r,orange,[[s*.65,-.67],[s*.80,-.53],[s*.82,-.87],[s*1.0,-1.20],[s*.70,-.95]],.029);goldTip.position.z=.037;}ribbons.push({node:r,s,base:r.rotation.z});
 }
 const limbs=[],legs=[];
 const shoulderY=king?2.23:1.31,shoulderX=king?.48:.47,upper=king?.45:.31,lower=king?.42:.30;
 for(const s of [-1,1]){
  const shoulder=group(rig,s*shoulderX,shoulderY,0,'Shoulder'),elbow=group(shoulder,0,-upper,0,'Elbow'),wrist=group(elbow,0,-lower,0,'Wrist');
  ell(shoulder,fur,0,-upper*.44,0,king?.17:.145,upper*.65,.16);ell(shoulder,king?cream:fur,0,-.09,.045,king?.165:.14,.18,.13);ell(elbow,fur,0,-lower*.41,0,king?.145:.13,lower*.64,.14);ell(wrist,cream,0,-.07,.02,king?.17:.145,.16,.13);
  for(const i of [-1,0,1])ell(wrist,cream,i*.064,-.15,.075,.042,.07,.05);ell(wrist,cream,-s*.13,-.04,.10,.065,.087,.065);
  if(king){cyl(elbow,gold,.165,.065,0,-.08,0);cyl(elbow,brown,.166,.23,0,-.22,0);cyl(elbow,gold,.17,.055,0,-.345,0);const plate=flat(elbow,gold,[[-.07,-.12],[.085,-.12],[.12,-.25],[0,-.30],[-.10,-.24]],.025);plate.position.z=.146;}
  shoulder.rotation.z=s*.15;limbs.push({s,shoulder,elbow,wrist});
  const hip=group(rig,s*(king?.26:.25),king?1.13:.60,0,'Hip'),knee=group(hip,0,-(king?.43:.22),0,'Knee');const thigh=king?.43:.22,shin=king?.38:.20,ankle=group(knee,0,-shin,0,'Ankle');
  ell(hip,king?brown:fur,0,-thigh*.43,0,king?.255:.19,thigh*.69,.22);ell(knee,fur,0,-shin*.42,0,king?.16:.145,shin*.70,.15);ell(ankle,cream,0,.018,.12,king?.225:.20,.115,king?.30:.255);
  for(const i of [-1,0,1])ell(ankle,cream,i*(king?.095:.078),.01,.31,king?.065:.057,.065,.091);
  if(king){cyl(knee,gold,.177,.075,0,-.08,0);const strap=mesh(knee,torus,gold);strap.scale.set(.165,.165,.27);strap.rotation.x=Math.PI/2;strap.position.y=-.27;const guard=flat(hip,red,[[-.15,-.18],[.15,-.18],[.16,-.41],[0,-.35],[-.15,-.41]],.035);guard.position.z=.19;}
  legs.push({s,hip,knee,ankle});
 }
 if(king){
  cyl(rig,darkRed,.455,.16,0,1.30,0);const buckle=ell(rig,gold,0,1.30,.39,.14,.14,.055);const jewel=flat(rig,orange,[[0,.09],[.06,0],[0,-.09],[-.06,0]],.02);jewel.position.set(0,1.30,.447);
  const skirt=group(rig,0,1.27,.15,'Skirt');for(const s of [-1,1]){const panel=flat(skirt,red,[[s*.03,0],[s*.34,-.05],[s*.43,-.54],[s*.15,-.41]],.035);panel.position.z=.18;const edge=flat(skirt,gold,[[s*.03,0],[s*.075,-.01],[s*.20,-.42],[s*.15,-.41]],.014);edge.position.z=.23;}
  const hand=limbs.find(a=>a.s===1).wrist,staff=group(hand,0,-.02,.09,'GoldenStaff');staff.rotation.z=-.15;const shaft=cyl(staff,red,.052,2.65,0,.38,0);
  for(const y of [-.945,1.705]){cyl(staff,gold,.095,.27,0,y,0);for(const d of [-.105,.105])cyl(staff,gold,.108,.04,0,y+d,0);const cap=ell(staff,gold,0,y+(y<0?-.146:.146),0,.094,.035,.094);}
  limbs.find(a=>a.s===1).staff=staff;
 }
 const tail=group(rig,0,king?1.05:.67,-.22,'CurledTail'),tailBones=[],tailCurve=new T.CatmullRomCurve3([[0,0,0],[.45,-.02,-.35],[.92,.18,-.48],[1.13,.58,-.37],[1.02,.82,-.26],[.78,.78,-.20],[.77,.56,-.17]].map(p=>new T.Vector3(...p)));
 let tailParent=tail,previous=new T.Vector3();
 for(let i=0;i<9;i++){const start=tailCurve.getPoint(i/9),end=tailCurve.getPoint((i+1)/9),mid=tailCurve.getPoint((i+.5)/9),node=group(tailParent,...start.clone().sub(previous).toArray(),'TailJoint'+i);tube(node,fur,[[0,0,0],mid.clone().sub(start).toArray(),end.clone().sub(start).toArray()],king?.105:.09,5);ell(node,fur,0,0,0,king?.105:.09,king?.105:.09,king?.105:.09);tailBones.push(node);tailParent=node;previous=start;}
 const tailFire=flame(tailParent,king?.52:.42);tailFire.position.copy(tailCurve.getPoint(1).sub(previous));tailFire.rotation.z=-.30;
 const projectile=group(root,0,0,0,'ReusableFireball');ell(projectile,orange,0,0,0,.17,.17,.23);ell(projectile,yellow,0,0,.09,.105,.105,.15);projectile.visible=false;const projectileOrigin=new T.Vector3(),projectileWorld=new T.Vector3();let projectileAge=0;
 // Merge static pieces within each moving pivot. Animated limbs still own their local geometry.
 const nodes=[];rig.traverse(o=>{if(o.isGroup)nodes.push(o);});
 for(const node of nodes){const buckets=new Map();for(const o of node.children.slice())if(o.isMesh){const a=buckets.get(o.material)||[];a.push(o);buckets.set(o.material,a);}for(const [m,list] of buckets){if(list.length<2)continue;const pos=[],normal=[];for(const o of list){o.updateMatrix();let g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);const p=g.attributes.position,n=g.attributes.normal;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(n.getX(i),n.getY(i),n.getZ(i));}g.dispose();node.remove(o);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));mesh(node,g,m);}}
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(rig),height=bounds.max.y,footCorrection=-bounds.min.y;rig.position.y=footCorrection;
 let mode='Idle',requested='Idle',time=0,age=0,speed=1,disposed=false,nextActionAt=7+Math.random()*5,fireballsThrown=0,staffStrikes=0,comboCycle=0,released=false,comboHits=0,autoAction=false;const modes=['Idle','Walk','Fireball','StaffCombo','React','Hurt','Jump'];
 const smooth=(a,b,k)=>a+(b-a)*k;
 function begin(name,automatic=false){mode=name;time=0;released=false;comboHits=0;autoAction=automatic;if(name==='StaffCombo')comboCycle++;}
 function setMode(name){const aliases={Wave:'React',Throw:'Attack',Run:'Walk',Celebrate:'React'};name=aliases[name]||name;if(name==='Attack')name=king?'StaffCombo':'Fireball';if(!modes.includes(name))name='Idle';
  // Walk/Idle transitions retain the scheduled deadline, so short wandering pauses can trigger a special.
  if(name==='Fireball'||name==='StaffCombo'){if(mode===name)return;requested='Idle';begin(name);return;}
  if(name!==requested){requested=name;begin(name);}
 }
 function update(dt){if(disposed)return;dt=Math.min(.05,Math.max(0,Number(dt)||0));time+=dt;age+=dt;
  if(mode==='Idle'&&requested==='Idle'&&age>=nextActionAt)begin(king?'StaffCombo':'Fireball',true);
  const duration=mode==='Fireball'?1.9:mode==='StaffCombo'?2.25:0;
  // Both automatic and explicit attacks are single routines with a recovery, never permanent attack loops.
  if(duration&&time>=duration){requested='Idle';begin('Idle');nextActionAt=age+7+Math.random()*5;}
  const k=1-Math.exp(-dt*11),phase=age*(6.4+speed*.7),walk=mode==='Walk',fireball=mode==='Fireball',combo=mode==='StaffCombo',attack=fireball||combo;let lift=0,pitch=0,yaw=0;
  if(walk){lift=Math.abs(Math.sin(phase))*.035;pitch=.045;}
  if(mode==='Jump'){const p=time%2.4;if(p<.35)lift=-.065*Math.sin(p/.35*Math.PI/2);else if(p<1.35)lift=(king?1.0:.78)*Math.sin((p-.35)*Math.PI);else if(p<1.60)lift=-.065*Math.sin((p-1.35)/.25*Math.PI);}
  if(fireball){yaw=time<.65?-.18:.12;pitch=time<.65?-.03:.10;}
  if(combo){yaw=time<.35?-.30:time<.80?.42:time<1.25?-.40:time<1.75?.12:0;pitch=time>1.25&&time<1.75?.14:0;for(const threshold of [.46,.97,1.48])if(time>=threshold&&comboHits<[.46,.97,1.48].indexOf(threshold)+1){staffStrikes++;comboHits++;}}
  if(mode==='React'){lift=Math.max(0,Math.sin(time*4))*.10;yaw=Math.sin(time*3)*.12;}
  rig.position.y=smooth(rig.position.y,footCorrection+lift,k);rig.rotation.x=smooth(rig.rotation.x,pitch,k);rig.rotation.y=smooth(rig.rotation.y,yaw,k);rig.rotation.z=smooth(rig.rotation.z,mode==='Hurt'?Math.sin(time*28)*.055:0,k);
  body.scale.y=1+Math.sin(age*2.4)*.008;head.rotation.y=smooth(head.rotation.y,Math.sin(age*.8)*.035,k);head.rotation.z=smooth(head.rotation.z,mode==='React'?Math.sin(time*4)*.07:0,k);
  for(const a of limbs){let sx=walk?Math.sin(phase+a.s*Math.PI/2)*.48:0,sz=a.s*.15,ex=-.09;
   let wx=0,wy=0,wz=0;
   if(fireball){if(a.s===-1){sx=time<.45?-.35:time<.8?-1.65:-.45;sz=-.32;ex=time<.5?-1.8:-.18;wx=time<.65?-.55:.30;}else {sx=-.15;ex=-.45;}}
   if(combo){if(a.s===1){if(time<.32){sx=-.65;sz=.85;ex=-1.0;wz=.75;}else if(time<.80){sx=-1.10;sz=-.68;ex=-.35;wz=-1.2;}else if(time<1.25){sx=-1.35;sz=.68;ex=-.85;wz=.95;wy=.70;}else if(time<1.75){sx=-2.35+(time-1.25)*3.9;sz=.25;ex=-.40;wx=-.75;wz=.12;}else {sx=-.3;sz=.20;ex=-.15;}}else {sx=-.75;sz=-.26;ex=-1.1;wx=.3;}}
   if(mode==='React'){sz=a.s*(.75+Math.sin(time*4)*.15);ex=-.40;}
   if(mode==='Jump'){sz=a.s*.35;ex=-.18;}
   a.shoulder.rotation.x=smooth(a.shoulder.rotation.x,sx,k);a.shoulder.rotation.z=smooth(a.shoulder.rotation.z,sz,k);a.elbow.rotation.x=smooth(a.elbow.rotation.x,ex,k);a.wrist.rotation.x=smooth(a.wrist.rotation.x,wx,k);a.wrist.rotation.y=smooth(a.wrist.rotation.y,wy,k);a.wrist.rotation.z=smooth(a.wrist.rotation.z,wz,k);
   if(a.staff)a.staff.rotation.z=smooth(a.staff.rotation.z,combo?-.35:-.15,k);
  }
  for(const l of legs){const cycle=phase-l.s*Math.PI/2;l.hip.rotation.x=smooth(l.hip.rotation.x,walk?Math.sin(cycle)*.48:combo?-l.s*.11:0,k);l.knee.rotation.x=smooth(l.knee.rotation.x,walk?Math.max(0,Math.sin(cycle))*.52:combo?.12:0,k);l.ankle.rotation.x=smooth(l.ankle.rotation.x,walk?-Math.sin(cycle)*.20:0,k);}
  tail.rotation.y=Math.sin(age*2.2)*.12;tail.rotation.x=Math.sin(age*2.7)*.045;for(let i=0;i<tailBones.length;i++){tailBones[i].rotation.z=Math.sin(age*2.6-i*.55)*.025;tailBones[i].rotation.y=Math.sin(age*2-i*.6)*.018;}tailFire.scale.y=(king?.52:.42)*(1+Math.sin(age*11)*.045);crest.rotation.z=Math.sin(age*3)*.025;
  for(const r of ribbons){r.node.rotation.z=r.base+Math.sin(age*3.3+r.s)*.10+(walk?r.s*.12:0);r.node.rotation.x=Math.sin(age*3.2+r.s)*.10;}
  const cycle=age%4.7,blink=cycle>4.48?Math.max(.06,Math.abs(cycle-4.59)/.11):1;for(const eye of eyes)eye.scale.y=blink;
  if(fireball&&time>=.65&&!released){released=true;fireballsThrown++;projectileAge=0;root.updateMatrixWorld(true);limbs[0].wrist.getWorldPosition(projectileWorld);projectileOrigin.copy(root.worldToLocal(projectileWorld));projectileOrigin.z+=.10;projectile.visible=true;}
  if(projectile.visible){projectileAge+=dt;projectile.position.copy(projectileOrigin);projectile.position.z+=projectileAge*3.0;projectile.position.y+=Math.sin(Math.min(1,projectileAge)*Math.PI)*.30;projectile.scale.setScalar(Math.max(.01,1-projectileAge*.65));projectile.rotation.z+=dt*9;if(projectileAge>1.12)projectile.visible=false;}
 }
 function dispose(){if(disposed)return;disposed=true;root.parent?.remove(root);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
 const metrics={meshes:0,triangles:0,vertices:0,materials:materials.size};root.traverse(o=>{if(o.isMesh){metrics.meshes++;metrics.vertices+=o.geometry.attributes.position.count;metrics.triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 update(0);return {root,update,setMode,setMotionSpeed:v=>{speed=Math.max(0,Math.min(3,Number(v)||0));},dispose,getState:()=>({stage,name:root.name,mode,requestedMode:requested,time,age,autoAction,specialActive:mode==='Fireball'||mode==='StaffCombo',actionDuration:mode==='Fireball'?1.9:mode==='StaffCombo'?2.25:0,nextActionAt,fireballsThrown,staffStrikes,comboCycle,projectileVisible:projectile.visible,height:height+footCorrection,bounds:{min:[bounds.min.x,0,bounds.min.z],max:[bounds.max.x,height+footCorrection,bounds.max.z]},joints:{shoulders:2,elbows:2,wrists:2,hips:2,knees:2,ankles:2,tail:9},...metrics})};
}
window.FireMonkeySpirit={create};
})();
