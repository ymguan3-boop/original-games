/* Light Phoenix — independent Three.js r128 articulated sculpture and reusable effects.
 * +Z forward, +Y up. Character bounds exclude waves, projectiles and motion trails.
 * No external assets, textures, lights, or per-frame geometry/particle allocation.
 */
(()=>{'use strict';
function create(options={}){
 const T=window.THREE;if(!T)throw new Error('LightPhoenix requires THREE r128.');
 const root=new T.Group(),rig=new T.Group();root.name='光鳳鷹';rig.name='LightPhoenixRig';root.add(rig);
 const geometries=new Set(),materials=new Set(),joints=[],wings=[],legs=[],tails=[],crest=[],neckPlumes=[];
 const geo=g=>(geometries.add(g),g),linear=h=>new T.Color(h).convertSRGBToLinear();
 function material(hex,extra={}){const m=new T.MeshPhysicalMaterial(Object.assign({color:linear(hex),roughness:.37,metalness:.02,clearcoat:.45,clearcoatRoughness:.23,envMapIntensity:.65},extra));materials.add(m);return m;}
 const ivory=material('#fff7e5'),white=material('#fffdf3',{roughness:.41}),cream=material('#ecdfc2',{roughness:.46}),gold=material('#dba13f',{metalness:.63,roughness:.27}),goldLight=material('#f3cd72',{metalness:.32,roughness:.27});
 const goldGlow=material('#ffdc8a',{emissive:linear('#ffc647'),emissiveIntensity:.32,metalness:.17,roughness:.30}),outerGold=material('#ffe29a',{emissive:linear('#ffcf62'),emissiveIntensity:.30,metalness:.08,transparent:true,opacity:.88,depthWrite:false,roughness:.34});
 const tailGold=material('#ffdc87',{emissive:linear('#ffd462'),emissiveIntensity:.42,roughness:.32,metalness:.10}),tailWhite=material('#fff3cb',{emissive:linear('#f6d37c'),emissiveIntensity:.18,roughness:.36});
 const dark=material('#3d281c',{roughness:.43}),talonMat=material('#735337',{roughness:.34}),beakMat=material('#efbb4a',{metalness:.35,roughness:.28}),amber=material('#cc8c28',{emissive:linear('#c77721'),emissiveIntensity:.10,roughness:.21});
 const coreMat=material('#fff0bb',{emissive:linear('#ffd35f'),emissiveIntensity:.95,metalness:.07,roughness:.19});
 const sphere=geo(new T.SphereGeometry(1,22,16)),fineSphere=geo(new T.SphereGeometry(1,32,24)),smallSphere=geo(new T.SphereGeometry(1,12,8)),diamond=geo(new T.OctahedronGeometry(1,0));
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
 const featherGeometry=(()=>{const rows=22,cols=8,p=[],ix=[];for(const side of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const t=i/rows,u=j/cols*2-1,w=.235*Math.pow(Math.sin(Math.PI*t),.68)*(1-t*.16),bend=.10*t*t+.045*Math.sin(t*Math.PI),thick=.019*Math.sin(t*Math.PI);p.push(w*u,t,bend+.075*Math.sin(Math.PI*t)*(1-u*u)+side*thick*(1-u*u));}const row=cols+1,layer=(rows+1)*row;for(let s=0;s<2;s++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=s*layer+i*row+j,b=a+row;if(s===0)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,a+1,b,b+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();return g;})();
 const featherVein=geo(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0,.05,.018),new T.Vector3(0,.30,.107),new T.Vector3(0,.60,.149),new T.Vector3(0,.91,.114),new T.Vector3(0,.985,.106)]),20,.006,5,false));
 function feather(parent,m,x,y,z,width,length,rz=0,rx=0,ry=0,shine=false){const f=mesh(parent,featherGeometry,m);f.position.set(x,y,z);f.rotation.set(rx,ry,rz);f.scale.set(width,length,width);if(shine){const v=mesh(parent,featherVein,goldGlow);v.position.copy(f.position);v.rotation.copy(f.rotation);v.scale.copy(f.scale);}return f;}
 const body=group(rig,0,1.55,0,'Body');ell(body,ivory,0,0,0,.60,.86,.49,true);ell(body,white,0,.12,.285,.48,.66,.29,true);ell(body,cream,0,-.52,-.075,.36,.42,.34);
 const neck=group(body,0,.56,.13,'Neck');flow(neck,white,[[0,-.15,-.09],[0,.23,-.02],[0,.57,.095],[0,.84,.15]],t=>.31-t*.09,40,14);
 const head=group(neck,0,.82,.17,'Head');ell(head,white,0,0,0,.285,.325,.345,true);ell(head,ivory,0,-.14,.22,.155,.15,.17,true);
 // Every eye vertex is projected onto the same head ellipsoid, then exactly mirrored in X.
 const eyeSurface=(x,y,offset)=>.345*Math.sqrt(Math.max(.001,1-x*x/(.285*.285)-y*y/(.325*.325)))+offset;
 const irisMat=material('#ffffff',{vertexColors:true,roughness:.29}),irisTop=linear('#593312'),irisBottom=linear('#e0a747'),blinkEyes=[];
 function eyePatch(parent,s,m,rx,ry,offset,dx=0,dy=0,almond=false,gradient=false){const p=[],c=[],ix=[],rows=9,sides=44;
  for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const r=i/rows,a=j/sides*Math.PI*2,u=r*Math.cos(a),v=r*Math.sin(a),xx=.16+dx+rx*u,yy=.060+dy+ry*v+(almond?.025*u:0),x=s*xx;p.push(x,yy-.060,eyeSurface(x,yy,offset));if(gradient){const col=irisTop.clone().lerp(irisBottom,Math.max(0,Math.min(1,(.70-v)*.65)));c.push(col.r,col.g,col.b);}}
  for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;if(s>0)ix.push(a,b,a+1,b,b+1,a+1);else ix.push(a,a+1,b,b,a+1,b+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));if(gradient)g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(ix);g.computeVertexNormals();const o=mesh(parent,g,m);o.castShadow=false;
 }
 for(const s of [-1,1]){const eye=group(head,0,.060,0,'Eye'+s),blink=group(eye,0,0,0,'Eyelid'+s);eyePatch(blink,s,dark,.105,.041,.004,0,0,true);eyePatch(blink,s,irisMat,.037,.036,.007,0,0,false,true);eyePatch(blink,s,dark,.011,.029,.009,0,.001);eyePatch(blink,s,white,.009,.011,.011,-.012,.013);eyePatch(blink,s,white,.0035,.005,.011,.014,-.014);blinkEyes.push(blink);
  const brow=[];for(let i=0;i<=16;i++){const u=i/16,x=s*(.061+.197*u),y=.073+.059*u+.012*Math.sin(u*Math.PI);brow.push([x,y,eyeSurface(x,y,.010)]);}tube(head,ivory,brow,.014,20);
  const cheek=group(head,0,0,0,'CheekPlumes'+s);cheek.scale.x=s;for(let i=0;i<4;i++)feather(cheek,i%2?ivory:white,.19+i*.013,-.03-i*.045,.12-i*.055,.48,.28,-(2.65+i*.10),-.30,-.28);
 }
 // Elliptical cross sections contract to an actual point along a centered hooked beak curve.
 const beakCurve=new T.CatmullRomCurve3([[0,.012,.255],[0,.025,.39],[0,.008,.53],[0,-.047,.627],[0,-.135,.654],[0,-.243,.608]].map(p=>new T.Vector3(...p)));
 function beakSample(t,angle){const c=beakCurve.getPointAt(t),tangent=beakCurve.getTangentAt(t),norm=Math.hypot(tangent.y,tangent.z)||1,rx=.129*Math.pow(1-t,.72),ry=.092*Math.pow(1-t,.72);return new T.Vector3(rx*Math.cos(angle),c.y+tangent.z/norm*ry*Math.sin(angle),c.z-tangent.y/norm*ry*Math.sin(angle));}
 {const p=[],ix=[],rows=48,sides=28;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const v=beakSample(i/rows,j/sides*Math.PI*2);p.push(v.x,v.y,v.z);}for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,a+1,b+1,b);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(head,g,beakMat);}
 ell(head,gold,0,-.132,.397,.074,.034,.125);for(const s of [-1,1]){const v=beakSample(.24,.12);ell(head,dark,s*(v.x+.002),v.y,v.z,.0025,.010,.019);const seam=[];for(let i=0;i<=10;i++){const v=beakSample(.12+i*.049,-.49);seam.push([s*(v.x+.001),v.y,v.z]);}tube(head,gold,seam,.0035,16);}
 for(let i=0;i<9;i++){const s=i<4?-1:1,k=Math.abs(i-4),p=group(head,s*k*.032,.19-k*.013,-.12-k*.010,'Crest'+i);p.scale.x=s;feather(p,k%3?goldGlow:white,0,0,0,.58-k*.035,.88-k*.065,k?.20:0,-.79-k*.09,k?.08:0,true);crest.push({node:p,i,k,s});}
 // Layered throat and breast plumage, each layer overlaps the one below.
 for(let row=0;row<4;row++){const g=group(neck,0,.63-row*.22,.24-row*.006,'ThroatPlumes'+row);for(let i=0;i<5;i++){const u=(i-2)/2;feather(g,(Math.abs(i-2)+row)%4===0?ivory:white,u*(.13+row*.023),0,-Math.abs(u)*.06,.48+row*.08,.40+row*.035,Math.PI-u*.30,-.03,-u*.12);}neckPlumes.push({node:g,i:row});}
 for(let row=0;row<3;row++)for(let i=0;i<7;i++){const u=(i-3)/3;feather(body,(row+Math.abs(i-3))%6===0?goldLight:ivory,u*(.34-row*.04),.30-row*.29,.43-Math.abs(u)*.15,.70-row*.03,.51,Math.PI-u*.27,-.02,-u*.20);}
 const coreMount=group(body,0,.22,.575,'ChestCrystal');const bezel=mesh(coreMount,diamond,gold);bezel.scale.set(.245,.386,.105);const core=mesh(coreMount,diamond,coreMat);core.position.z=.075;core.scale.set(.178,.287,.105);
 for(const s of [-1,1]){feather(coreMount,gold,s*.10,-.10,-.01,.38,.47,-s*.55,0,0,true);feather(body,gold,s*.44,.55,.19,.65,.59,-s*.69,-.11,s*.21,true);}
 // Articulated wing skeleton; mirrored local space keeps corresponding feathers aligned.
 for(const s of [-1,1]){
  const mirror=group(body,s*.53,.44,-.09,'WingMirror'+s);mirror.scale.x=s;const shoulder=group(mirror,0,0,0,'WingShoulder'+s),elbow=group(shoulder,1.04,.29,-.015,'WingElbow'+s),wrist=group(elbow,.91,.28,-.02,'WingWrist'+s);
  ell(shoulder,ivory,.20,.055,0,.32,.245,.18);flow(shoulder,ivory,[[0,.05,0],[.40,.18,-.005],[.76,.22,-.01],[1.04,.29,-.015]],t=>.14-t*.055,30,12);
  flow(elbow,ivory,[[0,0,0],[.33,.105,-.015],[.65,.19,-.015],[.91,.28,-.02]],t=>.10-t*.047,28,10);ell(elbow,ivory,0,0,0,.13,.13,.11);ell(wrist,goldLight,0,0,0,.09,.10,.08);
  for(let i=0;i<9;i++){const a=-.67-i*.148,len=1.82-i*.059;feather(wrist,i%3===0?goldGlow:outerGold,.045+i*.023,.10-i*.070,-.025,1.17-i*.025,len,a,-.025,0,true);feather(wrist,i%3?white:ivory,.015+i*.020,.08-i*.060,.035,.88-i*.015,len*.72,a+.035,-.015,0);}
  for(let i=0;i<8;i++){const x=.05+i*.105,y=.035+i*.020;feather(elbow,outerGold,x,y,-.055,1.02,1.12-i*.025,-2.12+i*.054,-.015,0,true);feather(elbow,i%3?white:ivory,x-.012,y+.055,.023,.94,.86-i*.019,-2.08+i*.05,-.015,0);}
  for(let row=0;row<3;row++)for(let i=0;i<7;i++){const x=.16+i*.118,y=.17-row*.125+i*.015;feather(shoulder,(i+row)%4?white:ivory,x,y,.045+row*.018,.69,.58+row*.07,-2.15+i*.035,-.025,0);}
  flow(shoulder,gold,[[.02,.16,.12],[.24,.34,.115],[.57,.40,.095],[.91,.37,.065],[1.09,.45,.045]],t=>.014+.069*Math.pow(Math.sin(Math.PI*t),.65),38,10);
  flow(elbow,gold,[[0,.075,.065],[.28,.20,.055],[.60,.28,.043],[.92,.36,.02]],t=>.012+.040*Math.sin(Math.PI*t),30,9);
  for(let i=0;i<3;i++)feather(shoulder,goldLight,.22+i*.20,.28+i*.018,.12,.63,.64-i*.09,-.82-i*.08,0,0,true);
  const scroll=[];for(let i=0;i<=26;i++){const a=i/26*Math.PI*2.0,r=.13*(1-i/34);scroll.push([.14+Math.cos(a)*r,.19+Math.sin(a)*r,.20]);}tube(shoulder,goldLight,scroll,.027,30);
  wings.push({s,shoulder,elbow,wrist});
 }
 // Hip → knee → tarsus → ankle → individual articulated toes and hooked talons.
 for(const s of [-1,1]){const hip=group(body,s*.285,-.56,.04,'Hip'+s),knee=group(hip,0,-.34,.035,'Knee'+s),tarsus=group(knee,0,-.31,.005,'Tarsus'+s),ankle=group(tarsus,0,-.24,.025,'Ankle'+s),toes=[];
  ell(hip,ivory,0,-.115,0,.19,.29,.19);ell(knee,goldLight,0,-.13,.015,.075,.22,.075);ell(tarsus,gold,0,-.095,.012,.064,.17,.066);ell(ankle,goldLight,0,.012,.025,.13,.083,.14);
  for(let i=0;i<4;i++){const front=i<3,x=front?(i-1)*.099:0,z=front?.07:-.08,toe=group(ankle,x,0,z,'Toe'+s+'-'+i);toe.rotation.y=front?(i-1)*.19:Math.PI;toes.push({node:toe,front});
   flow(toe,goldLight,[[0,0,0],[0,-.015,.095],[0,-.015,.205],[0,-.005,.25]],t=>.050*(1-t*.51),20,8);flow(toe,talonMat,[[0,-.006,.235],[0,-.014,.29],[0,-.067,.33],[0,-.104,.315]],t=>.032*(1-t*.98),20,8);
   for(let j=0;j<3;j++)tube(toe,gold,[[front?-.031:-.025,-.006,.06+j*.051],[0,.023,.065+j*.051],[front?.031:.025,-.006,.06+j*.051]],.004,8);
  }
  for(let i=0;i<5;i++)feather(hip,i%3?ivory:goldLight,(i-2)*.044,.045,-.055,.42,.47,Math.PI+(i-2)*.14,-.19,0);
  for(let i=0;i<4;i++)tube(knee,gold,[[ -.057,-.03-i*.05,.037],[0,-.025-i*.05,.079],[.057,-.03-i*.05,.037]],.005,9);
  legs.push({s,hip,knee,tarsus,ankle,toes});
 }
 // Seven broad, closed-volume ribbon feathers with five connected tail joints each.
 const tailRoot=group(body,0,-.43,-.37,'TailRoot');
 for(let i=0;i<7;i++){
  const u=(i-3)/3,s=i===3?0:i<3?-1:1,length=1-Math.abs(u)*.17,x=u*.72,curve=new T.CatmullRomCurve3([[u*.08,0,0],[u*.15,-.13,-.46],[u*.29,-.35,-1.0*length],[x*.70,-.53,-1.67*length],[x,-.40,-2.40*length],[x+s*.10,-.09,-2.94*length],[x+s*.15,.17,-3.11*length],[x+s*.08,.24,-2.94*length]].map(p=>new T.Vector3(...p)));
  const fullN=110,frames=curve.computeFrenetFrames(fullN,false);let parent=tailRoot,previous=new T.Vector3();
  for(let part=0;part<5;part++){
   const a=part/5,b=(part+1)/5,start=curve.getPointAt(a),node=group(parent,...start.clone().sub(previous).toArray(),'Tail'+i+'Joint'+part),p=[],ix=[],n=22,sides=10;
   for(let k=0;k<=n;k++){const t=a+(b-a)*k/n,c=curve.getPointAt(t).sub(start),frame=Math.min(fullN,Math.round(t*fullN)),width=.010+(.18-Math.abs(u)*.027)*Math.pow(Math.sin(Math.PI*t),.53),thickness=.008+.019*Math.sin(Math.PI*t);for(let j=0;j<=sides;j++){const angle=j/sides*Math.PI*2,v=c.clone().addScaledVector(frames.normals[frame],Math.cos(angle)*width).addScaledVector(frames.binormals[frame],Math.sin(angle)*thickness);p.push(v.x,v.y,v.z);}}
   for(let k=0;k<n;k++)for(let j=0;j<sides;j++){const q=k*(sides+1)+j,r=q+sides+1;ix.push(q,r,q+1,r,r+1,q+1);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(node,g,Math.abs(i-3)%3===1?tailWhite:tailGold);
   const vein=[];for(let k=0;k<=12;k++){const t=a+(b-a)*k/12,c=curve.getPointAt(t).sub(start),frame=Math.min(fullN,Math.round(t*fullN));c.addScaledVector(frames.binormals[frame],.028);vein.push(c.toArray());}tube(node,goldGlow,vein,.006,16);
   tails.push({node,i,part,s,k:Math.abs(i-3)});parent=node;previous=start;
  }
 }
 // Merge stationary pieces within each moving bone, including feather shafts by material.
 function mergeStatic(node){for(const child of node.children.slice())if(child.isGroup)mergeStatic(child);const buckets=new Map();function gather(parent,matrix){for(const o of parent.children.slice()){o.updateMatrix();const local=new T.Matrix4().multiplyMatrices(matrix,o.matrix);if(o.isMesh){const a=buckets.get(o.material)||[];a.push({o,matrix:local});buckets.set(o.material,a);}else if(o.isGroup&&!o.name)gather(o,local);}}gather(node,new T.Matrix4());
  for(const [m,list]of buckets){if(list.length<2)continue;const p=[],n=[];for(const entry of list){let g=entry.o.geometry.clone();g.applyMatrix4(entry.matrix);if(g.index){const non=g.toNonIndexed();g.dispose();g=non;}const a=g.attributes.position,b=g.attributes.normal;for(let i=0;i<a.count;i++){p.push(a.getX(i),a.getY(i),a.getZ(i));n.push(b.getX(i),b.getY(i),b.getZ(i));}g.dispose();entry.o.parent.remove(entry.o);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));mesh(node,g,m);}
  for(const child of node.children.slice())if(child.isGroup&&!child.name&&child.children.length===0)node.remove(child);
 }
 mergeStatic(rig);
 // Texture-free radial shaders: small chest halo and narrow annular expanding waves.
 const haloGeometry=geo(new T.CircleGeometry(1,48)),waveGeometry=geo(new T.RingGeometry(.88,1.12,112));
 function glowMaterial(annulus=false){const m=new T.ShaderMaterial({uniforms:{tint:{value:linear('#ffce68')},strength:{value:annulus?.75:.15}},vertexShader:'varying vec2 vLocal; void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:annulus?'uniform vec3 tint; uniform float strength; varying vec2 vLocal; void main(){float r=length(vLocal);float a=exp(-pow((r-1.0)/0.037,2.0))*strength;gl_FragColor=vec4(tint,a);}':'uniform vec3 tint; uniform float strength; varying vec2 vLocal; void main(){float r=length(vLocal);float a=exp(-r*r*5.5)*(1.0-smoothstep(0.65,1.0,r))*strength;gl_FragColor=vec4(tint,a);}',transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});materials.add(m);return m;}
 const coreHaloMat=glowMaterial(),coreHalo=mesh(coreMount,haloGeometry,coreHaloMat);coreHalo.position.z=.17;coreHalo.scale.set(.56,.68,1);coreHalo.castShadow=false;coreHalo.renderOrder=5;
 const fx=group(root,0,0,0,'ReusableLightEffects'),waves=[],bolts=[],dust=[],trail=[];
 const sparkMat=new T.MeshBasicMaterial({color:linear('#ffd679'),transparent:true,opacity:.65,blending:T.AdditiveBlending,depthWrite:false});materials.add(sparkMat);
 for(let i=0;i<3;i++){const m=glowMaterial(true),o=mesh(fx,waveGeometry,m);o.rotation.x=-Math.PI/2;o.visible=false;o.castShadow=false;o.renderOrder=6;waves.push({node:o,material:m,release:.90+i*.16});}
 const volleyTimes=[.75,1.25,1.75];
 const boltMaterial=material('#fff1ab',{emissive:linear('#ffd16b'),emissiveIntensity:1.10,transparent:true,opacity:1,depthWrite:false,roughness:.25}),boltShaftMaterial=sparkMat.clone(),boltHaloMaterial=glowMaterial();materials.add(boltShaftMaterial);boltHaloMaterial.uniforms.strength.value=.14;
 for(let i=0;i<18;i++){
  const node=group(fx,0,0,0,'ReusableGoldenFeather'+i),m=boltMaterial,shaftMat=boltShaftMaterial;
  const f=mesh(node,featherGeometry,m);f.scale.set(.53,.76,.53);f.rotation.x=Math.PI/2;const shaft=mesh(node,featherVein,shaftMat);shaft.scale.copy(f.scale);shaft.rotation.copy(f.rotation);node.visible=false;
  const haloMat=boltHaloMaterial,halo=mesh(node,haloGeometry,haloMat);halo.rotation.x=-Math.PI/2;halo.scale.set(.18,.44,1);halo.position.z=.29;halo.castShadow=false;
  const wave=Math.floor(i/6),index=i%6,source=index<3?0:1,fan=index%3,s=source===0?-1:1,yaw=s*(.07+fan*.14),direction=new T.Vector3(Math.sin(yaw),.025+fan*.030,Math.cos(yaw)).normalize();
  node.rotation.set(-Math.asin(direction.y),yaw,0);bolts.push({node,material:m,shaftMat,haloMat,origin:new T.Vector3(),direction,released:false,release:volleyTimes[wave],source,fan,wave});
 }
 for(let i=0;i<18;i++){const m=sparkMat.clone();materials.add(m);const o=mesh(fx,smallSphere,m);o.scale.setScalar(.011+(i%3)*.007);o.visible=false;o.castShadow=false;dust.push({node:o,material:m,phase:i*2.399,offset:(i%7)/7});}
 // Short, slender luminous droplets sit behind the tail; no broad trail planes obscure it.
 for(let i=0;i<9;i++){const m=sparkMat.clone();materials.add(m);const o=mesh(fx,smallSphere,m);o.visible=false;o.castShadow=false;o.scale.set(.013,.013,.12+(i%3)*.035);trail.push({node:o,material:m,i});}
 // Author a fixed full-motion framing envelope from the rest sculpture. Effects stay outside it.
 root.updateMatrixWorld(true);const restBounds=new T.Box3().setFromObject(rig),floorOffset=-restBounds.min.y+.025;rig.position.y=floorOffset;
 const fixedBounds=restBounds.clone();fixedBounds.min.y+=floorOffset;fixedBounds.max.y+=floorOffset;fixedBounds.min.min(new T.Vector3(-4.75,0,-4.15));fixedBounds.max.max(new T.Vector3(4.75,6.40,3.10));const fixedSize=new T.Vector3();fixedBounds.getSize(fixedSize);
 const pose=[];rig.traverse(node=>{if(node.isGroup)pose.push({node,position:new T.Vector3(),quaternion:new T.Quaternion(),scale:new T.Vector3(),targetPosition:new T.Vector3(),targetQuaternion:new T.Quaternion(),targetScale:new T.Vector3()});});
 const modes=['Idle','Walk','Takeoff','Fly','Land','WingBurst','FeatherVolley'],duration={Takeoff:2.10,Land:2.10,WingBurst:2.40,FeatherVolley:2.70},volleyPhases=['volley-1','volley-2','volley-3'];
 let mode='Idle',phase='idle',elapsed=0,modeTime=0,motionSpeed=1,transitionAge=.25,altitude=0,startAltitude=0,bodyPitch=0,startBodyPitch=0,kneeBend=0,grounding=1,returnMode='Idle',disposed=false,attackCompleted=false,lastAttackTime=0,lastAttackDuration=0,lastAttackName='',shotsFired=0,burstCount=0,volleyCount=0;
 const smooth=v=>{const x=Math.max(0,Math.min(1,v));return x*x*(3-2*x);};
 function isAttack(name){return name==='WingBurst'||name==='FeatherVolley';}
 function capturePose(){for(const p of pose){p.position.copy(p.node.position);p.quaternion.copy(p.node.quaternion);p.scale.copy(p.node.scale);}transitionAge=0;}
 function hideEffects(){for(const w of waves)w.node.visible=false;for(const b of bolts){b.node.visible=false;b.released=false;}}
 function beginMode(name){const previous=mode;capturePose();mode=name;phase=name==='Fly'?'flight':name==='Walk'?'stride':name==='Takeoff'?'crouch':name==='Land'?'descending':isAttack(name)?'charge':'idle';modeTime=0;startAltitude=altitude;startBodyPitch=bodyPitch;hideEffects();if(isAttack(name)){returnMode=previous==='Fly'||previous==='Takeoff'||altitude>.35?'Fly':'Idle';attackCompleted=false;lastAttackTime=0;lastAttackDuration=duration[name];lastAttackName=name;shotsFired=0;burstCount=0;volleyCount=0;}}
 function setMode(value){const aliases={Attack:'WingBurst',Burst:'WingBurst',Volley:'FeatherVolley',Run:'Walk'};let name=String(value||'Idle');name=aliases[name]||name;if(!modes.includes(name))name='Idle';if(mode===name)return mode;beginMode(name);return mode;}
 function setMotionSpeed(value){const n=Number(value);motionSpeed=Number.isFinite(n)?Math.max(0,Math.min(3,n)):1;return motionSpeed;}
 const upperLength=Math.hypot(.34,.035),lowerLength=Math.hypot(.31,.005),upperOffset=Math.atan2(-.035,.34),lowerOffset=Math.atan2(-.005,.31);
 function groundLeg(l,weight,footY,footZ){
  // Inverse body rotation maps an anchored ankle into the body frame. The terminal tarsus
  // stays vertical in world space; a closed-form two-bone solution supplies hip and knee.
  const pitch=body.rotation.x,cp=Math.cos(pitch),sp=Math.sin(pitch),dy=footY-body.position.y,dz=footZ-body.position.z;
  const targetY=cp*dy+sp*dz+.56,targetZ=-sp*dy+cp*dz-.04,lastY=-.24*cp+.025*sp,lastZ=.24*sp+.025*cp;
  const y=targetY-lastY,z=targetZ-lastZ,reach=Math.min(upperLength+lowerLength-.00001,Math.max(.0001,Math.hypot(y,z)));
  const cosine=Math.max(-1,Math.min(1,(reach*reach-upperLength*upperLength-lowerLength*lowerLength)/(2*upperLength*lowerLength))),q2=-Math.acos(cosine),q1=Math.atan2(-z,-y)-Math.atan2(lowerLength*Math.sin(q2),upperLength+lowerLength*Math.cos(q2));
  const hip=q1-upperOffset,knee=q2+upperOffset-lowerOffset,tarsus=-pitch-hip-knee;
  l.hip.rotation.x+=(hip-l.hip.rotation.x)*weight;l.knee.rotation.x+=(knee-l.knee.rotation.x)*weight;l.tarsus.rotation.x+=(tarsus-l.tarsus.rotation.x)*weight;l.ankle.rotation.x*=1-weight;
  for(const toe of l.toes)toe.node.rotation.x*=1-weight;
 }
 function update(dt){
  if(disposed)return;const d=Math.min(.075,Math.max(0,Number(dt)||0));elapsed+=d;modeTime+=d;const t=elapsed,a=modeTime,walk=mode==='Walk',fly=mode==='Fly',takeoff=mode==='Takeoff',land=mode==='Land',burst=mode==='WingBurst',volley=mode==='FeatherVolley',attack=burst||volley,moving=walk||fly||takeoff||land,flap=t*7.2*Math.max(.25,motionSpeed);
  let shoulderZ=.14+Math.sin(t*1.55)*.020,shoulderY=0,elbowZ=.025,wristZ=.015,crouch=0,corePower=.95+Math.sin(t*1.9)*.025;
  phase='idle';altitude=0;bodyPitch=0;grounding=1;
  // Walking uses a three-joint folded Z-chain: upper wing sweeps aft, forearm folds forward, primaries tuck aft/down.
  if(walk){phase='stride';shoulderZ=-.10+Math.sin(t*3.5)*.008;shoulderY=1.45+Math.sin(t*2.1)*.008;elbowZ=.20;wristZ=-1.45;bodyPitch=.035;}
  if(fly){phase='flight';altitude=1.75+Math.sin(t*2.8)*.055;bodyPitch=Math.PI/2;grounding=0;shoulderY=Math.sin(flap)*.52;shoulderZ=.14+Math.cos(flap-.18)*.27;elbowZ=Math.cos(flap-.42)*.14;wristZ=Math.cos(flap-.72)*.09;}
  if(takeoff){
   const squat=smooth(a/.40),lean=smooth((a-.40)/.45),lift=smooth((a-.85)/.95),finish=smooth((a-1.55)/.55);phase=a<.40?'crouch':a<.85?'lean-forward':a<1.80?'lift-off':'flight-settle';
   crouch=.24*squat*(1-lift);bodyPitch=.48*lean+(Math.PI/2-.48)*lift;altitude=startAltitude+(1.75-startAltitude)*lift;grounding=1-smooth((a-.85)/.52);
   shoulderY=(1-lift)*(.28+.38*Math.sin(a*5.8))+lift*Math.sin(a*9.2)*.52;shoulderZ=.14+Math.sin(a*9.2)*(lift*.30+(1-lift)*.10);elbowZ=Math.sin(a*9.2-.40)*.13;wristZ=Math.sin(a*9.2-.70)*.09;corePower=1.10+finish*.05;
  }
  if(land){
   const descend=smooth(a/1.05),upright=smooth((a-1.05)/.60),stand=smooth((a-1.65)/.45);phase=a<1.05?'descending':a<1.65?'touchdown-upright':'stand-up';
   altitude=startAltitude*(1-descend);bodyPitch=startBodyPitch*(1-descend)+.48*descend*(1-upright);crouch=.24*smooth((a-.72)/.33)*(1-stand);grounding=smooth((a-.78)/.27);
   shoulderY=Math.sin(a*7.2)*.38*(1-descend);shoulderZ=.14+Math.cos(a*7.2)*.20*(1-descend);elbowZ=.10*(1-descend);wristZ=.06*(1-descend);
  }
  if(attack){const air=returnMode==='Fly';altitude=air?startAltitude+Math.sin(t*2.4)*.025:0;bodyPitch=air?Math.PI/2:0;grounding=air?0:1;lastAttackTime=Math.min(a,duration[mode]);
   if(burst){const charge=smooth(a/.60),slam=smooth((a-.60)/.36),recover=smooth((a-1.30)/1.10),sweep=.98*charge*(1-slam)-.90*slam*(1-recover);phase=a<.60?'charge':a<1.30?'forward-wing-sweep':'recover';
    shoulderY=sweep*(air?.68:1);shoulderZ=.14+.24*charge*(1-slam)-.46*slam*(1-recover);elbowZ=.11*charge*(1-slam)-.16*slam*(1-recover);wristZ=.08*charge*(1-slam)-.10*slam*(1-recover);corePower=1.10+charge*1.50*(1-recover);crouch=air?0:.11*charge*(1-slam);
   }else{
    const charge=smooth(a/.50),recover=smooth((a-2.00)/.70),cycle=Math.max(0,Math.min(2,Math.floor((a-.50)/.50))),q=Math.max(0,Math.min(1,(a-.50-cycle*.50)/.50));
    phase=a<.50?'charge':a<2.00?volleyPhases[cycle]:'recover';const stroke=a<.50?charge:Math.cos(q*Math.PI*2)*(1-recover);shoulderY=.98*stroke*(air?.68:1);shoulderZ=.14+(a<.50?.13*charge:-.37*Math.sin(q*Math.PI*2)*(1-recover));elbowZ=.13*stroke;wristZ=.09*stroke;corePower=1.05+charge*.95*(1-recover);
   }
  }
  // Pitch the complete skeleton around the torso's own pivot, never around the ground origin.
  rig.position.set(0,floorOffset+altitude,options.inPlace===false&&moving?Math.sin(t*.45)*.18*motionSpeed:0);rig.rotation.set(0,0,0);body.position.set(0,1.55-crouch,0);body.rotation.set(bodyPitch,0,0);body.scale.set(1,1,1);
  const nod=Math.sin(t*1.5)*.010;neck.rotation.set(-bodyPitch*.20+nod,0,0);head.rotation.set(-bodyPitch*.80-nod,0,0);
  // A separate unrotated mirror parent applies S*R, not R*S. Both wing joints use the same canonical pose.
  for(const w of wings){w.shoulder.rotation.set(0,shoulderY,shoulderZ);w.elbow.rotation.set(0,walk?-2.80:shoulderY*.24,elbowZ);w.wrist.rotation.set(0,walk?2.80:shoulderY*.12,wristZ);}
  const flyingClaws=1-grounding;for(const l of legs){l.hip.rotation.set(flyingClaws*.85,0,0);l.knee.rotation.set(-flyingClaws*1.55,0,0);l.tarsus.rotation.set(flyingClaws*.80,0,0);l.ankle.rotation.set(flyingClaws*.36,0,0);for(const toe of l.toes)toe.node.rotation.x=flyingClaws*(toe.front?.72:-.43);}
  for(const p of crest){p.node.rotation.x=Math.sin(t*2.5+p.k*.3)*(fly?.045:.018);p.node.rotation.z=p.k?p.s*Math.sin(t*1.8+p.k*.4)*.010:0;}
  for(const p of neckPlumes)p.node.rotation.x=Math.sin(t*2.4+p.i*.6)*(fly?.027:.012);
  tailRoot.rotation.set(-bodyPitch+Math.sin(t*1.7)*.022,0,0);for(const p of tails){p.node.rotation.y=p.s*Math.sin(t*(fly?3.0:1.7)-p.part*.60+p.k*.29)*(fly?.025:.011);p.node.rotation.x=Math.sin(t*(fly?3.1:1.8)-p.part*.65+p.k*.2)*(fly?.033:.015);}
  const blinkPhase=t%6.3,blink=blinkPhase>6.02&&blinkPhase<6.18?Math.max(.08,Math.abs((blinkPhase-6.10)/.08)):1;for(const e of blinkEyes)e.scale.y=blink;
  coreMat.emissiveIntensity=corePower;goldGlow.emissiveIntensity=.30+(attack?Math.min(1,corePower-1)*.30:0);outerGold.emissiveIntensity=.26+(attack?Math.max(0,corePower-1)*.13:0);coreHaloMat.uniforms.strength.value=.12+Math.max(0,corePower-.9)*.10;
  if(transitionAge<.25){transitionAge=Math.min(.25,transitionAge+d);const k=smooth(transitionAge/.25);for(const p of pose){p.targetPosition.copy(p.node.position);p.targetQuaternion.copy(p.node.quaternion);p.targetScale.copy(p.node.scale);p.node.position.lerpVectors(p.position,p.targetPosition,k);p.node.quaternion.copy(p.quaternion).slerp(p.targetQuaternion,k);p.node.scale.lerpVectors(p.scale,p.targetScale,k);}}
  // Solve contact after pose blending, so a mode blend cannot slide the crouching feet.
  kneeBend=0;for(const l of legs){if(grounding>0){const stride=t*4.8*motionSpeed+(l.s<0?0:Math.PI),step=walk?Math.sin(stride):0,lift=walk?Math.max(0,Math.sin(stride))*.085:0;groundLeg(l,grounding,.10-(rig.position.y-floorOffset)+lift,.105+step*.16);}kneeBend=Math.max(kneeBend,Math.abs(l.knee.rotation.x));}bodyPitch=body.rotation.x;altitude=rig.position.y-floorOffset;
  for(const w of waves){const age=a-w.release;w.node.visible=burst&&age>=0&&age<1.08;if(w.node.visible){const u=age/1.08;w.node.position.set(0,floorOffset+.17+(w.release-.90)*.20,0);w.node.scale.setScalar(.65+u*6.20);w.material.uniforms.strength.value=(1-u)*(1-u)*.82;}}
  if(burst)burstCount=a>=1.22?3:a>=1.06?2:a>=.90?1:0;
  let launch=false;if(volley)for(const b of bolts)if(!b.released&&a>=b.release){launch=true;break;}if(launch)root.updateMatrixWorld(true);
  for(const b of bolts){const age=a-b.release;if(volley&&!b.released&&age>=0){b.origin.set(.04+b.fan*.10,-.08,.10);wings[b.source].wrist.localToWorld(b.origin);root.worldToLocal(b.origin);b.released=true;shotsFired++;}b.node.visible=volley&&b.released&&age>=0&&age<.82;if(b.node.visible){const u=age/.82,travel=age*9.5;b.node.position.set(b.origin.x+b.direction.x*travel,b.origin.y+b.direction.y*travel+.045*Math.sin(u*Math.PI),b.origin.z+b.direction.z*travel);b.node.scale.setScalar(Math.max(.001,1-smooth((u-.64)/.36)));}}
  if(volley)volleyCount=Math.min(3,Math.floor(shotsFired/6));
  const trailActive=walk||fly||takeoff||land;for(const p of dust){p.node.visible=trailActive||attack;if(p.node.visible){const q=(t*.32+p.offset)%1,r=.40+.22*Math.sin(p.phase);p.node.position.set(Math.sin(p.phase+t*.4)*r,floorOffset+altitude+.30+q*1.6,-.45-Math.cos(p.phase)*.40-q*.65);p.material.opacity=Math.sin(q*Math.PI)*(attack?.55:.37);}}
  for(const p of trail){p.node.visible=trailActive;if(p.node.visible){const q=(t*.65+p.i/9)%1;p.node.position.set(Math.sin(p.i*1.9+t*.7)*(.23+q*.18),floorOffset+altitude+.55+Math.sin(p.i*.8+t)*.10,-1.0-q*2.3);p.material.opacity=(1-q)*.40;}}
  if(takeoff&&a>=duration.Takeoff)beginMode('Fly');else if(land&&a>=duration.Land)beginMode('Idle');else if(attack&&a>=duration[mode]){lastAttackTime=duration[mode];attackCompleted=true;beginMode(returnMode);}
 }
 function getMotionState(){const active=isAttack(mode),progress=active?Math.min(1,modeTime/duration[mode]):attackCompleted?1:0;return{name:root.name,mode,phase,modeTime,altitude,bodyPitch,kneeBend,grounding,attack:lastAttackName,attackTime:lastAttackTime,attackElapsed:lastAttackTime,attackDuration:lastAttackDuration,attackProgress:progress,specialActive:active,completed:attackCompleted,attackCompleted,returnMode,shotsFired,volleyCount,burstCount,transitioning:transitionAge<.25,motionSpeed,disposed};}
 function getState(){let meshes=0,triangles=0;rig.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return Object.assign(getMotionState(),{height:fixedSize.y,bounds:{min:fixedBounds.min.toArray(),max:fixedBounds.max.toArray(),size:fixedSize.toArray()},min:fixedBounds.min.toArray(),max:fixedBounds.max.toArray(),size:fixedSize.toArray(),meshes,triangles:Math.round(triangles),joints:joints.length,modes:modes.slice()});}
 function dispose(){if(disposed)return;disposed=true;if(root.parent)root.parent.remove(root);root.clear();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();geometries.clear();materials.clear();}
 update(0);return{root,update,setMode,setMotionSpeed,dispose,getState,getMotionState,get mode(){return mode;},get phase(){return phase;},get attackProgress(){return isAttack(mode)?Math.min(1,modeTime/duration[mode]):attackCompleted?1:0;},get completed(){return attackCompleted;}};
}
window.LightPhoenix={create,version:'2.1.0'};
})();
