/* Little Eagle juvenile — independent Three.js r128 articulated sculpture and reusable effects.
 * +Z forward, +Y up. Character bounds exclude waves, projectiles and motion trails.
 * No external assets, textures, lights, or per-frame geometry/particle allocation.
 */
(()=>{'use strict';
function create(options={}){
 const T=window.THREE;if(!T)throw new Error('LittleEagle requires THREE r128.');
 const root=new T.Group(),rig=new T.Group();root.name='小鷹';rig.name='LittleEagleRig';root.add(rig);
 const geometries=new Set(),materials=new Set(),joints=[],wings=[],legs=[],tails=[],crest=[],neckPlumes=[];
 const geo=g=>(geometries.add(g),g),linear=h=>new T.Color(h).convertSRGBToLinear();
 function material(hex,extra={}){const m=new T.MeshPhysicalMaterial(Object.assign({color:linear(hex),roughness:.60,metalness:0,clearcoat:.10,clearcoatRoughness:.40,envMapIntensity:.65},extra));materials.add(m);return m;}
 const ivory=material('#f5e7d1'),white=material('#fff5e4'),cream=material('#dfc29e'),brown=material('#9d6b49'),coverBrown=material('#a67651'),wingBrown=material('#714832'),darkBrown=material('#57392e');
 const gold=material('#bd7a29'),goldLight=material('#e9ad49');
 const goldGlow=material('#bd8959'),outerGold=material('#77513b');
 const tailGold=material('#644332'),tailWhite=material('#eee0c7');
 const dark=material('#3a251b'),talonMat=material('#413b36'),beakMat=material('#edb54b',{roughness:.36}),amber=material('#b47837');

 const coreMat=material('#fff0ce');
 const sphere=geo(new T.SphereGeometry(1,20,14)),fineSphere=geo(new T.SphereGeometry(1,28,20)),smallSphere=geo(new T.SphereGeometry(1,12,8)),diamond=geo(new T.OctahedronGeometry(1,0));
 function group(parent,x=0,y=0,z=0,name=''){const g=new T.Group();g.position.set(x,y,z);g.name=name;parent.add(g);if(name)joints.push(g);return g;}
 function mesh(parent,g,m){const o=new T.Mesh(g,m);o.castShadow=!m.transparent;o.receiveShadow=true;parent.add(o);return o;}
 function ell(parent,m,x,y,z,sx,sy,sz,fine=false){const o=mesh(parent,fine?fineSphere:sphere,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function tube(parent,m,points,r=.012,n=24){return mesh(parent,geo(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),n,r,6,false)),m);}
 function flow(parent,m,points,radius,n=34,sides=10){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),frames=curve.computeFrenetFrames(n,false),p=[],ix=[];
  for(let i=0;i<=n;i++){const t=i/n,c=curve.getPointAt(t),r=radius(t);for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(v.x,v.y,v.z);}}
  for(let i=0;i<n;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,b,a+1,b,b+1,a+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return mesh(parent,g,m);
 }
 // Canonical symmetric feather geometry; paired ornaments mirror the same local coordinates.
 const featherGeometry=(()=>{const rows=10,cols=4,p=[],ix=[];for(const side of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const t=i/rows,u=j/cols*2-1,w=.235*Math.pow(Math.sin(Math.PI*t),.68)*(1-t*.16),bend=.10*t*t+.045*Math.sin(t*Math.PI),thick=.019*Math.sin(t*Math.PI);p.push(w*u,t,bend+.075*Math.sin(Math.PI*t)*(1-u*u)+side*thick*(1-u*u));}const row=cols+1,layer=(rows+1)*row;for(let s=0;s<2;s++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=s*layer+i*row+j,b=a+row;if(s===0)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,a+1,b,b+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;})();
 const featherVein=geo(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.05,.018),new T.Vector3(0,.30,.107),new T.Vector3(0,.60,.149),new T.Vector3(0,.91,.114),new T.Vector3(0,.985,.106)]),20,.006,5,false));
 function feather(parent,m,x,y,z,width,length,rz=0,rx=0,ry=0,shine=false){const f=mesh(parent,featherGeometry,m);f.position.set(x,y,z);f.rotation.set(rx,ry,rz);f.scale.set(width,length,width);if(shine){const v=mesh(parent,featherVein,goldGlow);v.position.copy(f.position);v.rotation.copy(f.rotation);v.scale.copy(f.scale);}return f;}
 const body=group(rig,0,1.55,0,'Body');ell(body,brown,0,0,0,.62,.72,.51,true);ell(body,white,0,.10,.28,.50,.55,.255,true);ell(body,wingBrown,0,-.44,-.075,.36,.32,.34);
 const neck=group(body,0,.40,.13,'Neck');flow(neck,white,[[0,-.14,-.09],[0,.12,-.02],[0,.30,.095],[0,.48,.15]],t=>.33-t*.05,32,12);
 const head=group(neck,0,.43,.17,'Head');head.scale.setScalar(1.65);ell(head,white,0,0,0,.31,.33,.35,true);
 // Every eye vertex is projected onto the same head ellipsoid, then exactly mirrored in X.
 const eyeSurface=(x,y,offset)=>.35*Math.sqrt(Math.max(.001,1-x*x/(.31*.31)-y*y/(.33*.33)))+offset;
 const irisMat=material('#ffffff',{vertexColors:true,roughness:.29}),irisTop=linear('#593312'),irisBottom=linear('#e0a747'),blinkEyes=[];
 function eyePatch(parent,s,m,rx,ry,offset,dx=0,dy=0,almond=false,gradient=false){const p=[],c=[],ix=[],rows=9,sides=44;
  for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const r=i/rows,a=j/sides*Math.PI*2,u=r*Math.cos(a),v=r*Math.sin(a),xx=.16+dx+rx*u,yy=.060+dy+ry*v+(almond?.025*u:0),x=s*xx;p.push(x,yy-.060,eyeSurface(x,yy,offset));if(gradient){const col=irisTop.clone().lerp(irisBottom,Math.max(0,Math.min(1,(.70-v)*.65)));c.push(col.r,col.g,col.b);}}
  for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;if(s>0)ix.push(a,b,a+1,b,b+1,a+1);else ix.push(a,a+1,b,b,a+1,b+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(gradient)g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(parent,g,m);o.castShadow=false;
 }
 for(const s of [-1,1]){const eye=group(head,0,.060,0,'Eye'+s),blink=group(eye,0,0,0,'Eyelid'+s);eyePatch(blink,s,dark,.100,.078,.004,0,0,true);eyePatch(blink,s,white,.090,.070,.006,0,0,true);eyePatch(blink,s,irisMat,.048,.064,.007,0,0,false,true);eyePatch(blink,s,dark,.025,.050,.009,0,.001);eyePatch(blink,s,white,.013,.017,.011,-.013,.026);eyePatch(blink,s,white,.0035,.005,.011,.014,-.014);blinkEyes.push(blink);
  const brow=[];for(let i=0;i<=16;i++){const u=i/16,x=s*(.061+.197*u),y=.073+.059*u+.012*Math.sin(u*Math.PI);brow.push([x,y,eyeSurface(x,y,.010)]);}tube(head,ivory,brow,.014,20);
 }
 // Elliptical cross sections contract to an actual point along a centered hooked beak curve.
 const beakCurve=new T.CatmullRomCurve3([[0,.012,.265],[0,.025,.36],[0,.008,.44],[0,-.036,.49],[0,-.105,.51],[0,-.185,.48]].map(p=>new T.Vector3(...p)));
 function beakSample(t,angle){const c=beakCurve.getPointAt(t),tangent=beakCurve.getTangentAt(t),norm=Math.hypot(tangent.y,tangent.z)||1,rx=.110*Math.pow(1-t,.72),ry=.080*Math.pow(1-t,.72);return new T.Vector3(rx*Math.cos(angle),c.y+tangent.z/norm*ry*Math.sin(angle),c.z-tangent.y/norm*ry*Math.sin(angle));}
 {const p=[],ix=[],rows=48,sides=28;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const v=beakSample(i/rows,j/sides*Math.PI*2);p.push(v.x,v.y,v.z);}for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,a+1,b+1,b);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();g.clearGroups();g.addGroup(0,32*28*6,0);g.addGroup(32*28*6,(48-32)*28*6,1);const beak=mesh(head,g,[beakMat,talonMat]);beak.name='TaperedHookedBeak';}
 // Closed hooked beak is the only mouth; no separate lip or jaw bulb.
 for(const s of [-1,1]){const v=beakSample(.24,.12);ell(head,dark,s*(v.x+.002),v.y,v.z,.0025,.010,.019);const seam=[];for(let i=0;i<=10;i++){const v=beakSample(.12+i*.049,-.49);seam.push([s*(v.x+.001),v.y,v.z]);}tube(head,brown,seam,.0035,16);}
 for(let i=0;i<7;i++){const u=(i-3)/3,p=group(head,u*.058,.18-Math.abs(u)*.03,-.13,'Crest'+i);feather(p,Math.abs(u)>.5?brown:white,0,0,0,.62,.44-Math.abs(u)*.07,-u*.44,-.70-Math.abs(u)*.15,0);crest.push({node:p,i,k:Math.abs(i-3),s:Math.sign(u)});}

 // Layered throat and breast plumage, each layer overlaps the one below.
 for(let row=0;row<3;row++){const g=group(neck,0,.35-row*.15,.32-row*.006,'ThroatPlumes'+row);for(let i=0;i<5;i++){const u=(i-2)/2;feather(g,(Math.abs(i-2)+row)%4===0?ivory:white,u*(.13+row*.023),0,-Math.abs(u)*.06,.48+row*.08,.32+row*.020,Math.PI-u*.30,-.03,-u*.12);}neckPlumes.push({node:g,i:row});}
 for(let row=0;row<3;row++)for(let i=0;i<7;i++){const u=(i-3)/3;feather(body,(row+Math.abs(i-3))%6===0?white:ivory,u*(.34-row*.04),.30-row*.23,.565-Math.abs(u)*.14,.70-row*.03,.42,Math.PI-u*.27,-.02,-u*.20);}
 // Scapular coverts and back plumage have real thickness; no jewelry or crystal.
 for(let row=0;row<4;row++)for(let i=0;i<7;i++){const u=(i-3)/3;feather(body,row%2?brown:coverBrown,u*(.42-row*.035),.44-row*.23,-.40+Math.abs(u)*.09,.78,.40,Math.PI-u*.20,.12,Math.PI);}

 // Articulated wing skeleton; mirrored local space keeps corresponding feathers aligned.
 for(const s of [-1,1]){
  const mirror=group(body,s*.55,.34,-.09,'WingMirror'+s);mirror.scale.set(s*.70,.74,.85);const shoulder=group(mirror,0,0,0,'WingShoulder'+s),elbow=group(shoulder,.66,.25,0,'WingElbow'+s),wrist=group(elbow,.56,.25,0,'WingWrist'+s);
  // Hand-drawn compact wing: thick root, swept leading edge, four tapered fingers.
  const rootWing=flow(shoulder,brown,[[0,.02,0],[.22,.10,0],[.45,.20,0],[.66,.25,0]],t=>.145-.070*t,22,10);rootWing.scale.z=.65;
  const armWing=flow(elbow,coverBrown,[[0,0,0],[.22,.075,0],[.41,.18,0],[.56,.25,0]],t=>.092-.040*t,20,10);armWing.scale.z=.65;
  // Small overlapping root coverts, front and back, follow the triangular mass.
  for(let row=0;row<2;row++)for(let i=0;i<5;i++){const x=.02+i*.125,y=.13+i*.043-row*.13;feather(shoulder,(i+row)%3?brown:coverBrown,x,y,.065,.64,.39-row*.015,-2.03+i*.03,0,0);feather(shoulder,(i+row)%3?brown:coverBrown,x,y,-.095,.64,.39-row*.015,-2.03+i*.03,0,Math.PI);}
  for(let i=0;i<5;i++){const x=.02+i*.106,y=.045+i*.042;feather(elbow,i%2?ivory:cream,x,y,-.028,.77,.55-i*.046,-2.65+i*.12,0,0);feather(elbow,i%2?brown:coverBrown,x,y+.045,.06,.69,.37-i*.026,-2.57+i*.10,0,0);feather(elbow,brown,x,y+.045,-.085,.69,.37-i*.026,-2.57+i*.10,0,Math.PI);}
  const primaryFinish=material('#ffffff',{vertexColors:true,roughness:.65});const fingerEnds=[[.60,.01],[.70,.20],[.76,.43],[.72,.74]];
  for(let i=0;i<4;i++){const x=.012+i*.016,y=-.04+i*.071,e=fingerEnds[i],o=flow(wrist,primaryFinish,[[x,y,0],[x*.52+e[0]*.48,y*.52+e[1]*.48-.055,-.006],[e[0],e[1],0]],t=>(.145-i*.007)*Math.pow(Math.sin(Math.PI*t),.67)*(1-t*.24)+.012*(1-t),24,10);o.scale.z=.22;o.userData.keepSeparate=true;const colors=[],warm=linear('#a8754e'),tip=linear('#674531');for(let row=0;row<=24;row++){const color=warm.clone().lerp(tip,Math.pow(row/24,1.4));for(let side=0;side<=10;side++)colors.push(color.r,color.g,color.b);}o.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  }
  const leading=flow(wrist,brown,[[0,.11,0],[.25,.33,0],[.52,.56,0],[.72,.74,0]],t=>.069*Math.pow(1-t,.7),26,10);leading.scale.z=.70;

 wings.push({s,shoulder,elbow,wrist});
 }
 // Hip → knee → tarsus → ankle → individual articulated toes and hooked talons.
 for(const s of [-1,1]){const hip=group(body,s*.285,-.56,.04,'Hip'+s),knee=group(hip,0,-.22,.035,'Knee'+s),tarsus=group(knee,0,-.20,.005,'Tarsus'+s),ankle=group(tarsus,0,-.16,.025,'Ankle'+s),toes=[];
  ell(hip,brown,0,-.08,0,.18,.20,.18);ell(knee,goldLight,0,-.085,.015,.072,.15,.072);ell(tarsus,gold,0,-.055,.012,.062,.11,.064);ell(ankle,goldLight,0,.012,.025,.13,.083,.14);
  for(let i=0;i<4;i++){const front=i<3,x=front?(i-1)*.099:0,z=front?.07:-.08,toe=group(ankle,x,0,z,'Toe'+s+'-'+i);toe.rotation.y=front?(i-1)*.19:Math.PI;toes.push({node:toe,front});
   flow(toe,goldLight,[[0,0,0],[0,-.015,.095],[0,-.015,.205],[0,-.005,.25]],t=>.050*(1-t*.51),20,8);flow(toe,talonMat,[[0,-.006,.235],[0,-.014,.29],[0,-.067,.33],[0,-.104,.315]],t=>.032*(1-t*.98),20,8);
   for(let j=0;j<3;j++)tube(toe,gold,[[front?-.031:-.025,-.006,.06+j*.051],[0,.023,.065+j*.051],[front?.031:.025,-.006,.06+j*.051]],.004,8);
  }
  for(let i=0;i<5;i++)feather(hip,i%3?brown:coverBrown,(i-2)*.044,.045,-.055,.42,.35,Math.PI+(i-2)*.14,-.19,0);
  for(let i=0;i<4;i++)tube(knee,gold,[[ -.057,-.03-i*.034,.037],[0,-.025-i*.034,.079],[.057,-.03-i*.034,.037]],.005,9);
  legs.push({s,hip,knee,tarsus,ankle,toes});
 }
 // Seven short, two-tone juvenile tail feathers, rather than the adult long fan.
 const tailRoot=group(body,0,-.38,-.39,'TailRoot'),tailFinish=material('#ffffff',{vertexColors:true,roughness:.58});
 for(let i=0;i<7;i++){
  const u=(i-3)/3,node=group(tailRoot,u*.045,0,-.025*Math.abs(u),'TailFeather'+i),f=feather(node,tailFinish,0,0,0,1.15,.95-Math.abs(u)*.10,Math.PI,1.04,u*.30);f.geometry=geo(featherGeometry.clone());f.userData.keepSeparate=true;
  const colors=[],light=linear('#eee0ca'),tip=linear('#77503a');for(let side=0;side<2;side++)for(let row=0;row<=10;row++)for(let col=0;col<=4;col++){const c=light.clone().lerp(tip,Math.max(0,Math.min(1,(row/10-.55)/.27)));colors.push(c.r,c.g,c.b);}f.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));tails.push({node,i,part:0,s:Math.sign(u),k:Math.abs(i-3)});
 }
 // Connected lower mandible belongs to the beak, with no separate lip or face-mouth.
 const jaw=group(head,0,-.10,.27,'Mandible');const mandible=flow(jaw,beakMat,[[0,0,0],[0,-.015,.09],[0,-.018,.18]],t=>.067*Math.pow(1-t,.8),18,10);mandible.scale.y=.30;
 for(const side of [-1,1])for(let i=0;i<3;i++)feather(head,i%2?white:ivory,side*(.20+i*.022),-.09-i*.042,-.17-i*.035,.43,.28,Math.PI-side*.20,.35,side*.12);
 // Merge stationary pieces within each moving bone, including feather shafts by material.
 function mergeStatic(node){for(const child of node.children.slice())if(child.isGroup)mergeStatic(child);const buckets=new Map();function gather(parent,matrix){for(const o of parent.children.slice()){o.updateMatrix();const local=new T.Matrix4().multiplyMatrices(matrix,o.matrix);if(o.isMesh&&!Array.isArray(o.material)&&!o.userData.keepSeparate){const a=buckets.get(o.material)||[];a.push({o,matrix:local});buckets.set(o.material,a);}else if(o.isGroup&&!o.name)gather(o,local);}}gather(node,new T.Matrix4());
  for(const [m,list]of buckets){if(list.length<2)continue;const p=[],n=[];for(const entry of list){let g=entry.o.geometry.clone();g.applyMatrix4(entry.matrix);if(g.index){const non=g.toNonIndexed();g.dispose();g=non;}const a=g.attributes.position,b=g.attributes.normal;for(let i=0;i<a.count;i++){p.push(a.getX(i),a.getY(i),a.getZ(i));n.push(b.getX(i),b.getY(i),b.getZ(i));}g.dispose();entry.o.parent.remove(entry.o);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));mesh(node,g,m);}
  for(const child of node.children.slice())if(child.isGroup&&!child.name&&child.children.length===0)node.remove(child);
 }
// Double the wing chord around its swept leading edge, preserving span and joint centers.
 const wingAreaScale=2,wingAreaMetrics=[];
 function leadingEdgeY(x){if(x<=.66)return x*.25/.66;if(x<=1.22)return .25+(x-.66)*.25/.56;return .50+(x-1.22)*.74/.72;}
 root.updateMatrixWorld(true);
 for(const w of wings){const mirror=w.shoulder.parent,rootInverse=new T.Matrix4().copy(mirror.matrixWorld).invert();let before=0,after=0;
  mirror.traverse(o=>{if(!o.isMesh)return;const g=o.geometry.clone(),toWing=new T.Matrix4().multiplyMatrices(rootInverse,o.matrixWorld),fromWing=toWing.clone().invert(),p=g.attributes.position,original=[],changed=[],v=new T.Vector3();
   for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(toWing);original.push(v.x,v.y);v.y=leadingEdgeY(v.x)+wingAreaScale*(v.y-leadingEdgeY(v.x));changed.push(v.x,v.y);v.applyMatrix4(fromWing);p.setXYZ(i,v.x,v.y,v.z);}
   const idx=g.index,n=idx?idx.count:p.count;for(let i=0;i<n;i+=3){const a=idx?idx.getX(i):i,b=idx?idx.getX(i+1):i+1,c=idx?idx.getX(i+2):i+2;const area=q=>Math.abs((q[b*2]-q[a*2])*(q[c*2+1]-q[a*2+1])-(q[b*2+1]-q[a*2+1])*(q[c*2]-q[a*2]))*.5;before+=area(original);after+=area(changed);}
   p.needsUpdate=true;g.computeVertexNormals();o.geometry=geo(g);
  });wingAreaMetrics.push({side:w.s,projectedTriangleAreaBefore:before,projectedTriangleAreaAfter:after,ratio:after/before});
 }
 mergeStatic(rig);
// A continuous leading edge blends across shoulder, elbow and wrist. The three
// rigid feather groups retain their articulation; this skin closes their joins.
const wingBridges=[];
root.updateMatrixWorld(true);
for(const wing of wings){
 const mirror=wing.shoulder.parent,bones=[wing.shoulder,wing.elbow,wing.wrist],inverseRoot=new T.Matrix4().copy(mirror.matrixWorld).invert();
 const curve=new T.CatmullRomCurve3([[0,.10,.105],[.25,.19,.10],[.66,.32,.10],[.96,.45,.09],[1.22,.57,.07],[1.55,.89,.035],[1.94,1.24,0]].map(p=>new T.Vector3(...p)));
 const points=[],weights=[],indices=[],rows=42,sides=10;
 for(let i=0;i<=rows;i++){
  const t=i/rows,c=curve.getPoint(t),d=curve.getTangent(t),perp=new T.Vector3(-d.y,d.x,0).normalize(),r=.105*Math.pow(1-t,.62);
  let wa=1,wb=0,wc=0;
  if(c.x>.48){const u=T.MathUtils.clamp((c.x-.48)/.33,0,1);wa=1-u;wb=u;}
  if(c.x>1.04){const u=T.MathUtils.clamp((c.x-1.04)/.36,0,1);wa=0;wb=1-u;wc=u;}
  for(let j=0;j<=sides;j++){const a=j/sides*Math.PI*2,v=c.clone().addScaledVector(perp,Math.cos(a)*r);v.z+=Math.sin(a)*r*.60;points.push(v.x,v.y,v.z);weights.push(wa,wb,wc);}
 }
 for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
 const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();
 const o=mesh(mirror,g,brown);o.name='ContinuousWingEdge'+wing.s;o.frustumCulled=false;
 wingBridges.push({mesh:o,mirror,bones,rest:new Float32Array(points),restNormal:new Float32Array(g.attributes.normal.array),weights:new Float32Array(weights),bindInverse:bones.map(b=>new T.Matrix4().multiplyMatrices(inverseRoot,b.matrixWorld).invert()),matrices:bones.map(()=>new T.Matrix4()),normals:bones.map(()=>new T.Matrix3()),inverseRoot:new T.Matrix4(),v:new T.Vector3(),n:new T.Vector3(),sum:new T.Vector3(),sumN:new T.Vector3()});
}
function updateWingBridges(){
 root.updateMatrixWorld(true);
 for(const skin of wingBridges){
  skin.inverseRoot.copy(skin.mirror.matrixWorld).invert();
  for(let k=0;k<3;k++){skin.matrices[k].multiplyMatrices(skin.inverseRoot,skin.bones[k].matrixWorld).multiply(skin.bindInverse[k]);skin.normals[k].getNormalMatrix(skin.matrices[k]);}
  const p=skin.mesh.geometry.attributes.position,n=skin.mesh.geometry.attributes.normal;
  for(let i=0;i<p.count;i++){
   skin.sum.set(0,0,0);skin.sumN.set(0,0,0);
   for(let k=0;k<3;k++){const w=skin.weights[i*3+k];if(!w)continue;skin.v.fromArray(skin.rest,i*3).applyMatrix4(skin.matrices[k]);skin.n.fromArray(skin.restNormal,i*3).applyMatrix3(skin.normals[k]);skin.sum.addScaledVector(skin.v,w);skin.sumN.addScaledVector(skin.n,w);}
   skin.sumN.normalize();p.setXYZ(i,skin.sum.x,skin.sum.y,skin.sum.z);n.setXYZ(i,skin.sumN.x,skin.sumN.y,skin.sumN.z);
  }p.needsUpdate=true;n.needsUpdate=true;skin.mesh.geometry.computeBoundingBox();
 }
}

 // Preallocated wind effects; no model textures or CDN required.
 // Texture-free radial shaders: small chest halo and narrow annular expanding waves.
 const haloGeometry=geo(new T.CircleGeometry(1,48)),waveGeometry=geo(new T.RingGeometry(.88,1.12,112));
 function glowMaterial(annulus=false){const m=new T.ShaderMaterial({uniforms:{tint:{value:linear('#f1e5cd')},strength:{value:annulus?.75:.15}},vertexShader:'varying vec2 vLocal; void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:annulus?'uniform vec3 tint; uniform float strength; varying vec2 vLocal; void main(){float r=length(vLocal);float a=exp(-pow((r-1.0)/0.037,2.0))*strength;gl_FragColor=vec4(tint,a);}':'uniform vec3 tint; uniform float strength; varying vec2 vLocal; void main(){float r=length(vLocal);float a=exp(-r*r*5.5)*(1.0-smoothstep(0.65,1.0,r))*strength;gl_FragColor=vec4(tint,a);}',transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});materials.add(m);return m;}
 const coreHaloMat=glowMaterial();

 const fx=group(root,0,0,0,'ReusableLightEffects'),waves=[],bolts=[],dust=[],trail=[];
 const sparkMat=new T.MeshBasicMaterial({color:linear('#eee2cd'),transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false});materials.add(sparkMat);
 for(let i=0;i<3;i++){const m=glowMaterial(true),o=mesh(fx,waveGeometry,m);o.rotation.x=-Math.PI/2;o.visible=false;o.castShadow=false;o.renderOrder=6;waves.push({node:o,material:m,release:.90+i*.16});}
 const volleyTimes=[.75,1.25,1.75,2.25];
 const boltMaterial=material('#d7b88b',{emissive:linear('#e2d2ae'),emissiveIntensity:.22,transparent:true,opacity:1,depthWrite:false,roughness:.25}),boltShaftMaterial=sparkMat.clone(),boltHaloMaterial=glowMaterial();materials.add(boltShaftMaterial);boltHaloMaterial.uniforms.strength.value=.04;
 for(let i=0;i<18;i++){const m=sparkMat.clone();materials.add(m);const o=mesh(fx,smallSphere,m);o.scale.setScalar(.011+(i%3)*.007);o.visible=false;o.castShadow=false;dust.push({node:o,material:m,phase:i*2.399,offset:(i%7)/7});}
 // Short, slender luminous droplets sit behind the tail; no broad trail planes obscure it.
 for(let i=0;i<9;i++){const m=sparkMat.clone();materials.add(m);const o=mesh(fx,smallSphere,m);o.visible=false;o.castShadow=false;o.scale.set(.013,.013,.12+(i%3)*.035);trail.push({node:o,material:m,i});}
 const slashes=[];for(let i=0;i<6;i++){const m=new T.MeshBasicMaterial({color:linear('#fff0c7'),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending});materials.add(m);const o=tube(fx,m,[[-.28,.35,-.10],[-.11,.14,0],[.07,-.12,.16],[.19,-.28,.24]],.014,18);o.visible=false;slashes.push(o);}
 // Author a fixed full-motion framing envelope from the rest sculpture. Effects stay outside it.
 root.updateMatrixWorld(true);const restBounds=new T.Box3().setFromObject(rig),floorOffset=-restBounds.min.y+.025;rig.position.y=floorOffset;
 const fixedBounds=restBounds.clone();fixedBounds.min.y=0;fixedBounds.max.y+=floorOffset+1.75;fixedBounds.min.min(new T.Vector3(-2.7,0,-2.0));fixedBounds.max.max(new T.Vector3(2.7,8.5,6.6));const fixedSize=new T.Vector3();fixedBounds.getSize(fixedSize);
const modes=['Idle','Rest','Walk','Takeoff','Fly','Glide','Land','Peck','WingPounce'],duration={Takeoff:1.5,Land:1.6,Peck:1.7,WingPounce:3.4};
const smooth=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
let mode='Idle',phase='idle',elapsed=0,modeTime=0,motionSpeed=1,altitude=0,bodyPitch=0,kneeBend=0,grounding=1,motionZ=0,attackCompleted=false,disposed=false,startAltitude=0;
const isAttack=n=>n==='Peck'||n==='WingPounce';
fx.name='Effects';fx.userData.isEffect=true;
function setMode(n){n=({Attack:'Peck',Ultimate:'WingPounce',Run:'Walk'})[n]||n;if(!modes.includes(n))n='Idle';startAltitude=altitude;mode=n;modeTime=0;attackCompleted=false;return mode;}
function setMotionSpeed(n){motionSpeed=Math.max(0,Math.min(3,Number(n)||0));return motionSpeed;}
const upperLength=Math.hypot(.22,.035),lowerLength=Math.hypot(.20,.005),upperOffset=Math.atan2(-.035,.22),lowerOffset=Math.atan2(-.005,.20);
function groundLeg(l,footY,footZ){const cp=Math.cos(body.rotation.x),sp=Math.sin(body.rotation.x),dy=footY-body.position.y,dz=footZ-body.position.z,y=cp*dy+sp*dz+.56-(-.16*cp+.025*sp),z=-sp*dy+cp*dz-.04-(.16*sp+.025*cp),reach=Math.min(upperLength+lowerLength-.00001,Math.max(.0001,Math.hypot(y,z))),q2=-Math.acos(T.MathUtils.clamp((reach*reach-upperLength*upperLength-lowerLength*lowerLength)/(2*upperLength*lowerLength),-1,1)),q1=Math.atan2(-z,-y)-Math.atan2(lowerLength*Math.sin(q2),upperLength+lowerLength*Math.cos(q2));l.hip.rotation.x=q1-upperOffset;l.knee.rotation.x=q2+upperOffset-lowerOffset;l.tarsus.rotation.x=-body.rotation.x-l.hip.rotation.x-l.knee.rotation.x;l.ankle.rotation.x=0;}
function update(dt){if(disposed)return;const d=Math.max(0,Math.min(.075,Number(dt)||0))*motionSpeed;elapsed+=d;modeTime+=d;const t=elapsed,a=modeTime,walk=mode==='Walk',rest=mode==='Rest',fly=mode==='Fly'||mode==='Glide',attack=isAttack(mode);let crouch=0,fold=walk||rest?1:0,sy=0,sz=.14,ez=0,wz=0;altitude=0;bodyPitch=0;grounding=1;motionZ=0;phase=walk?'stride':rest?'rest':'idle';
 if(fly){phase='flight';altitude=.95+Math.sin(t*4)*.035;bodyPitch=1.43;grounding=0;const amp=mode==='Glide'?.06:.48;sy=Math.sin(t*12)*amp;sz=.14+Math.cos(t*12-.2)*amp*.65;ez=Math.cos(t*12-.4)*.13;wz=Math.cos(t*12-.7)*.09;}
 if(mode==='Takeoff'){const lift=smooth((a-.55)/.85);phase=a<.3?'crouch':a<.55?'lean-forward':'lift-off';crouch=.18*smooth(a/.3)*(1-lift);bodyPitch=.4*smooth((a-.3)/.25)+1.03*lift;altitude=.95*lift;grounding=1-smooth((a-.55)/.25);sy=Math.cos(a*12)*.5;sz=.14+Math.sin(a*12)*.32;}
 if(mode==='Land'){const u=smooth(a/1.1);phase=a<1.1?'descending':'stand-up';altitude=startAltitude*(1-u);bodyPitch=1.43*(1-u);crouch=.16*Math.sin(Math.PI*smooth((a-.8)/.8));grounding=smooth((a-.75)/.35);sy=Math.cos(a*12)*.4*(1-u);}
 if(mode==='Peck'){const hop=Math.sin(Math.PI*smooth((a-.3)/.8));phase=a<.3?'crouch':a<.75?'hop-peck':a<1.1?'beak-strike':'recover';crouch=.12*smooth(a/.3)*(1-smooth((a-.3)/.3));altitude=.23*hop;grounding=1-Math.min(1,hop*3);bodyPitch=.55*Math.sin(Math.PI*smooth((a-.35)/.85));motionZ=.65*Math.sin(Math.PI*smooth((a-.35)/1.1));fold=.7;sy=1.1;sz=-.04;}
 if(mode==='WingPounce'){phase=a<.35?'crouch':a<1.15?'low-ascent':a<1.95?'wing-pounce':a<2.7?'descending':'recover';const lift=smooth((a-.35)/.8),land=smooth((a-1.95)/.75);crouch=.20*smooth(a/.35)*(1-lift);altitude=.95*lift*(1-land);grounding=1-Math.min(1,lift*3)*(1-land);bodyPitch=.9*lift*(1-land);motionZ=1.45*Math.sin(Math.PI*smooth((a-1)/2));sy=Math.cos(a*13)*.65*lift*(1-land);sz=.14+Math.sin(a*13)*.4*lift*(1-land);ez=Math.cos(a*13-.4)*.16;}
 rig.position.set(0,floorOffset+altitude,options.inPlace===false?motionZ:0);body.position.set(0,1.55-crouch,0);body.rotation.set(bodyPitch,0,walk?Math.sin(t*5)*.025:0);neck.rotation.set(-bodyPitch*.25,0,0);head.rotation.set(-bodyPitch*.75-(mode==='Peck'?.3*Math.sin(Math.PI*smooth((a-.35)/.8)):0),0,0);jaw.rotation.x=attack?.15*Math.sin(Math.PI*Math.min(1,a/(duration[mode]||1))):.025+Math.sin(t*1.6)*.018;
 for(const w of wings){w.shoulder.rotation.set(0,fold?1.57:sy,fold?-.10:sz);w.elbow.rotation.set(0,fold?-3.05:sy*.24,fold?-.10:ez);w.wrist.rotation.set(0,fold?3.05:sy*.12,fold?-1.45:wz);}
 kneeBend=0;for(const l of legs){const air=1-grounding;l.hip.rotation.set(air*.85,0,0);l.knee.rotation.set(-air*1.55,0,0);l.tarsus.rotation.set(air*.8,0,0);l.ankle.rotation.set(air*.36,0,0);for(const toe of l.toes)toe.node.rotation.x=air*(toe.front?.7:-.4);if(grounding>.9){const step=t*7+(l.s<0?0:Math.PI);groundLeg(l,.10-altitude+(walk?Math.max(0,Math.sin(step))*.08:0),.105+(walk?Math.sin(step)*.13:0));}kneeBend=Math.max(kneeBend,Math.abs(l.knee.rotation.x));}
 for(const p of crest)p.node.rotation.x=Math.sin(t*3+p.k)*.025;for(const p of neckPlumes)p.node.rotation.x=Math.sin(t*3+p.i)*.015;tailRoot.rotation.x=-bodyPitch*.7;for(const p of tails)p.node.rotation.y=Math.sin(t*3+p.i)*.018;const bt=t%5.2;for(const e of blinkEyes)e.scale.y=bt>5.0?Math.max(.08,Math.abs((bt-5.1)/.1)):1;updateWingBridges();
 for(let i=0;i<waves.length;i++){const w=waves[i],age=a-(1.35+i*.16);w.node.visible=mode==='WingPounce'&&i<3&&age>=0&&age<.65;if(w.node.visible){w.node.rotation.set(Math.PI/2,0,0);w.node.position.set(0,floorOffset+1.35,motionZ+.7+age*5);w.node.scale.setScalar(.28+age*1.1);w.material.uniforms.strength.value=(1-age/.65)*.7;}}
 for(const s of slashes)s.visible=false;for(const p of dust){p.node.visible=fly||attack||mode==='Takeoff';if(p.node.visible){const q=(t*.8+p.offset)%1;p.node.position.set(Math.sin(p.phase)*.55,floorOffset+altitude+.5+q*.5,(options.inPlace===false?motionZ:0)-q*.8);p.material.opacity=Math.sin(q*Math.PI)*.18;}}for(const p of trail)p.node.visible=false;
 if(mode==='Takeoff'&&a>=duration.Takeoff)setMode('Fly');else if(mode==='Land'&&a>=duration.Land)setMode('Idle');else if(attack&&a>=duration[mode]){mode='Idle';modeTime=0;attackCompleted=true;}
}
function getMotionState(){return{name:root.name,mode,phase,modeTime,altitude,bodyPitch,kneeBend,grounding,motionZ,renderedMotionZ:rig.position.z,attackProgress:isAttack(mode)?Math.min(1,modeTime/duration[mode]):attackCompleted?1:0,specialActive:isAttack(mode),attackCompleted,completed:attackCompleted,disposed};}
function getState(){let triangles=0;rig.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});return Object.assign(getMotionState(),{triangles:Math.round(triangles),joints:joints.length,modes:modes.slice(),durations:Object.assign({},duration),bounds:{min:[-2,0,-1.5],max:[2,3.3,1.5],size:[4,3.3,3]}});}
function seek(n,time=0){elapsed=0;altitude=0;setMode(n);update(0);for(let left=Math.max(0,time);left>1e-8;){const d=Math.min(1/60,left);update(d);left-=d;}return getMotionState();}

 function dispose(){if(disposed)return;disposed=true;if(root.parent)root.parent.remove(root);root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}
 update(0);return{root,update,seek,setMode,setMotionSpeed,dispose,getState,getMotionState,get mode(){return mode;},get phase(){return phase;},get attackProgress(){return isAttack(mode)?Math.min(1,modeTime/duration[mode]):attackCompleted?1:0;},get completed(){return attackCompleted;}};
}
window.LittleEagle={create,version:'1.0.0-juvenile'};
})();
