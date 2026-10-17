/* 歐頭慢 — standalone Three.js r128. +Z face, +Y up, feet at Y=0. */
(()=>{'use strict';
function create(options={}){
 const T=THREE,root=new T.Group(),rig=new T.Group(),geos=new Set(),mats=new Set();root.name='Outouman';rig.name='ConnectedCharacterRig';root.add(rig);
 const geometry=g=>(geos.add(g),g),material=m=>(mats.add(m),m);
 const color=h=>new T.Color(h).convertSRGBToLinear();
 const silver=material(new T.MeshStandardMaterial({color:color('#b7bec8'),metalness:.48,roughness:.31,envMapIntensity:.65}));
 const edge=material(new T.MeshStandardMaterial({color:color('#f0eee9'),metalness:.72,roughness:.25}));
 const red=material(new T.MeshStandardMaterial({color:color('#c72d31'),metalness:.25,roughness:.35}));
 const joint=material(new T.MeshStandardMaterial({color:color('#7d2226'),metalness:.16,roughness:.50}));
 const eyeMat=material(new T.MeshStandardMaterial({color:color('#ffdd7c'),emissive:color('#ffc94e'),emissiveIntensity:.65,roughness:.19,metalness:.06}));
 const blue=material(new T.MeshStandardMaterial({color:color('#008cde'),emissive:color('#006dc4'),emissiveIntensity:.55,roughness:.20,metalness:.12,envMapIntensity:.18}));
 const glow=material(new T.MeshBasicMaterial({color:0x62cfff,transparent:true,opacity:.22,depthWrite:false,blending:T.AdditiveBlending}));
 const sphere=geometry(new T.SphereGeometry(1,40,28)),small=geometry(new T.SphereGeometry(1,18,12));
 function mesh(g,m,parent=rig){const o=new T.Mesh(g,m);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function ball(parent,m,x,y,z,sx,sy,sz,detail=false){const o=mesh(detail?sphere:small,m,parent);o.position.set(x,y,z);o.scale.set(sx,sy,sz);return o;}
 function cylinder(parent,m,r1,r2,length,x=0,y=0,z=0,segments=32){const o=mesh(geometry(new T.CylinderGeometry(r1,r2,length,segments)),m,parent);o.position.set(x,y,z);return o;}
 function tube(parent,m,points,r=.02){return mesh(geometry(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(24,points.length*3),r,8,false)),m,parent);}
 // Curved armor panels are triangulated directly onto ellipsoid surfaces.
 function patch(parent,m,points,rx,ry,rz,offset=.012,back=false){
  const p=points.map(v=>new T.Vector2(v[0],v[1])),tri=T.ShapeUtils.triangulateShape(p,[]),verts=[],normals=[],N=10;
  function vertex(a,b,c,u,v){const x=a.x+(b.x-a.x)*u+(c.x-a.x)*v,y=a.y+(b.y-a.y)*u+(c.y-a.y)*v,z=(back?-1:1)*(rz*Math.sqrt(Math.max(.015,1-x*x/(rx*rx)-y*y/(ry*ry)))+offset);verts.push(x,y,z);const n=new T.Vector3(x/(rx*rx),y/(ry*ry),z/(rz*rz)).normalize();normals.push(n.x,n.y,n.z);}
  for(const ids of tri){const [a,b,c]=ids.map(i=>p[i]);for(let i=0;i<N;i++)for(let j=0;j<N-i;j++){vertex(a,b,c,i/N,j/N);vertex(a,b,c,(i+1)/N,j/N);vertex(a,b,c,i/N,(j+1)/N);if(i+j<N-1){vertex(a,b,c,(i+1)/N,j/N);vertex(a,b,c,(i+1)/N,(j+1)/N);vertex(a,b,c,i/N,(j+1)/N);}}}
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));const o=mesh(g,m,parent);o.material.side=T.DoubleSide;return o;
 }
 function lens(parent,points,m,offset){
  const center=points.reduce((a,p)=>a.add(p),new T.Vector2()).multiplyScalar(1/points.length),v=[],idx=[];
  const surface=(x,y,extra=0)=>.91*Math.sqrt(Math.max(.012,1-x*x/(1.18*1.18)-y*y/(1.14*1.14)))+offset+extra;
  v.push(center.x,center.y,surface(center.x,center.y,.042));
  for(const p of points)v.push(p.x,p.y,surface(p.x,p.y));
  for(let i=0;i<points.length;i++)idx.push(0,i+1,(i+1)%points.length+1);
  const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();const o=mesh(g,m,parent);o.material.side=T.DoubleSide;return o;
 }
 const pelvis=new T.Group();pelvis.position.y=.96;rig.add(pelvis);ball(pelvis,silver,0,0,0,.43,.28,.30,true);
 patch(pelvis,red,[[-.38,.14],[-.24,.04],[0,-.12],[.24,.04],[.38,.14],[.33,-.15],[.17,-.25],[-.17,-.25],[-.33,-.15]],.43,.28,.30,.015);
 patch(pelvis,red,[[-.39,.13],[0,-.12],[.39,.13],[.32,-.18],[0,-.26],[-.32,-.18]],.43,.28,.30,.015,true);
 const torso=new T.Group();torso.position.y=1.48;rig.add(torso);ball(torso,silver,0,0,0,.47,.57,.30,true);
 const chestV=[[-.42,.42],[-.29,.29],[0,.16],[.29,.29],[.42,.42],[.44,.19],[.23,-.03],[0,-.29],[-.23,-.03],[-.44,.19]];
 patch(torso,red,chestV,.47,.57,.30,.015);
 patch(torso,edge,[[-.40,.36],[-.25,.20],[0,.08],[.25,.20],[.40,.36],[.42,.27],[.25,.11],[0,-.025],[-.25,.11],[-.42,.27]],.47,.57,.30,.026);
 patch(torso,red,[[-.37,-.22],[0,-.47],[.37,-.22],[.38,-.39],[0,-.56],[-.38,-.39]],.47,.57,.30,.013);
 for(const sign of [-1,1])patch(torso,red,[[sign*.04,.52],[sign*.37,.40],[sign*.42,.14],[sign*.20,.04],[sign*.05,.27]],.47,.57,.30,.018,true);
 const backSpine=ball(torso,red,0,.02,-.305,.035,.48,.025);
 const neck=cylinder(rig,joint,.19,.23,.24,0,2.0,0);cylinder(rig,edge,.24,.22,.10,0,1.96,0);
 // Recessed circular silver bezel, luminous blue core, subtle surrounding halo.
 const badge=new T.Group();badge.position.set(0,1.76,.307);badge.rotation.x=Math.PI/2;rig.add(badge);
 cylinder(badge,silver,.168,.168,.065);cylinder(badge,edge,.135,.135,.071);const core=cylinder(badge,blue,.104,.104,.079);
 const halo=ball(rig,glow,0,1.76,.348,.19,.19,.028);halo.castShadow=false;
 const head=new T.Group();head.name='HelmetPivot';head.position.set(0,2.99,0);rig.add(head);
 ball(head,silver,0,0,0,1.18,1.14,.91,true);
 // Shaped almond lenses follow the curved helmet instead of protruding eyeballs.
 const shape=new T.Shape();shape.moveTo(.15,-.38);shape.bezierCurveTo(.14,-.08,.35,.15,.59,.25);shape.bezierCurveTo(.73,.31,.86,.37,.99,.38);shape.bezierCurveTo(.99,.12,.88,-.23,.70,-.38);shape.bezierCurveTo(.51,-.53,.24,-.52,.15,-.38);
 const contour=shape.getPoints(36);
 for(const sign of [-1,1]){
  const pts=contour.map(p=>new T.Vector2(sign*p.x,p.y));lens(head,pts,edge,.036);
  const c=pts.reduce((a,p)=>a.add(p),new T.Vector2()).multiplyScalar(1/pts.length);const inner=pts.map(p=>p.clone().sub(c).multiplyScalar(.91).add(c));lens(head,inner,eyeMat,.065);
  const curve=pts.map(p=>new T.Vector3(p.x,p.y,.91*Math.sqrt(Math.max(.012,1-p.x*p.x/1.3924-p.y*p.y/1.2996))+.055));tube(head,silver,curve,.022);
  patch(head,red,[[sign*.84,.66],[sign*1.08,.42],[sign*1.08,.15],[sign*.91,.23]],1.18,1.14,.91,.013);
  patch(head,red,[[sign*.91,-.46],[sign*.77,-.79],[sign*.35,-1.03],[sign*.75,-.82]],1.18,1.14,.91,.015);
  patch(head,red,[[sign*1.0,-.27],[sign*.45,-.51],[sign*.10,-1.10],[sign*.68,-.88],[sign*.99,-.53]],1.18,1.14,.91,.013,true);
  const ear=new T.Group();ear.position.set(sign*1.12,-.12,-.005);ear.rotation.z=-sign*Math.PI/2;head.add(ear);
  cylinder(ear,silver,.31,.31,.13);cylinder(ear,edge,.267,.267,.16);cylinder(ear,red,.205,.205,.175);
 }
 // Continuous sagittal fin, a rounded silver-edged red crest from brow to nape.
 const profile=[[.93,.16],[.85,.73],[.48,1.20],[.14,1.51],[.07,1.53],[-.16,1.28],[-.57,.93],[-.89,.37],[-.94,-.57],[-.78,-.91],[-.71,-.43],[-.69,.22],[-.42,.69],[0,.99],[.40,.89],[.65,.52]];
 function fin(width,m,scale=1,xOffset=0){
  const points=profile.map(([z,y])=>new T.Vector2(z*scale,y*scale)),tris=T.ShapeUtils.triangulateShape(points,[]),v=[],idx=[];for(const x of [-width/2,width/2])for(const p of points)v.push(x+xOffset,p.y,p.x);
  const n=points.length;for(const a of tris){idx.push(a[2],a[1],a[0],a[0]+n,a[1]+n,a[2]+n);}for(let i=0;i<n;i++){const j=(i+1)%n;idx.push(i,j,j+n,i,j+n,i+n);}const g=geometry(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,m,head);
 }
 fin(.18,silver);fin(.187,red,.965);
 const crestVertices=[],crestIndices=[];for(let i=0;i<4;i++){const [z,y]=profile[i];crestVertices.push(-.061,y,z+.009,.061,y,z+.009);if(i<3){const j=i*2;crestIndices.push(j,j+1,j+2,j+1,j+3,j+2);}}const crestGeo=geometry(new T.BufferGeometry());crestGeo.setAttribute('position',new T.Float32BufferAttribute(crestVertices,3));crestGeo.setIndex(crestIndices);crestGeo.computeVertexNormals();mesh(crestGeo,red,head);
 // Thin forehead plate and inset diamond gem; back red center strip is raised slightly.
 patch(head,edge,[[0,.91],[.22,.47],[0,.18],[-.22,.47]],1.18,1.14,.91,.078);
 patch(head,silver,[[0,.80],[.15,.47],[0,.26],[-.15,.47]],1.18,1.14,.91,.088);
 patch(head,blue,[[0,.70],[.10,.47],[0,.32],[-.10,.47]],1.18,1.14,.91,.099);
 patch(head,red,[[-.055,.99],[.055,.99],[.067,-.99],[-.067,-.99]],1.18,1.14,.91,.018,true);
 const arms=[];
 for(const sign of [-1,1]){
  const shoulder=new T.Group();shoulder.name=sign<0?'LeftShoulder':'RightShoulder';shoulder.position.set(sign*.48,1.89,0);shoulder.rotation.z=sign*.24;rig.add(shoulder);
  ball(shoulder,silver,0,0,0,.205,.205,.205);ball(shoulder,red,sign*.026,-.06,0,.192,.17,.195);
  cylinder(shoulder,silver,.16,.145,.40,0,-.23,0);cylinder(shoulder,red,.166,.155,.115,0,-.30,0);
  const elbow=new T.Group();elbow.position.y=-.42;shoulder.add(elbow);ball(elbow,silver,0,0,0,.148,.145,.148);
  cylinder(elbow,silver,.145,.151,.31,0,-.17,.012);cylinder(elbow,red,.153,.157,.10,0,-.10,.012);
  const hand=new T.Group();hand.position.set(0,-.37,.025);elbow.add(hand);ball(hand,silver,0,-.025,0,.177,.19,.16);
  for(let i=0;i<3;i++)ball(hand,silver,(i-1)*.072,-.11,.104,.050,.071,.055);ball(hand,silver,-sign*.13,.0,.08,.075,.105,.085);
  arms.push({shoulder,elbow,hand,sign});
 }
 const legs=[];
 for(const sign of [-1,1]){
  const hip=new T.Group();hip.name=sign<0?'LeftHip':'RightHip';hip.position.set(sign*.245,.98,0);hip.rotation.z=sign*.04;rig.add(hip);
  ball(hip,silver,0,-.13,0,.205,.24,.21);cylinder(hip,silver,.19,.17,.37,0,-.23,0);
  const knee=new T.Group();knee.position.y=-.43;hip.add(knee);ball(knee,silver,0,0,0,.175,.16,.18);cylinder(knee,silver,.16,.19,.32,0,-.18,.01);
  const stripe=cylinder(knee,red,.181,.179,.13,0,-.045,0);stripe.rotation.z=sign*.2;
  patch(knee,red,[[-.15,.10],[-.04,.02],[.04,.10],[.15,.02],[.14,-.12],[.03,-.05],[-.05,-.12],[-.16,-.04]],.18,.19,.185,.012);
  ball(knee,silver,0,-.34,.10,.212,.185,.315,true);ball(knee,red,0,-.477,.117,.216,.032,.32);legs.push({hip,knee,sign});
 }
 const beamRig=new T.Group();rig.add(beamRig);const beamMat=material(new T.MeshBasicMaterial({color:0xb4eaff,transparent:true,opacity:.6,depthWrite:false,blending:T.AdditiveBlending}));
 const beam=mesh(geometry(new T.CylinderGeometry(.09,.22,3.8,16,1,true)),beamMat,beamRig);beam.rotation.x=Math.PI/2;beam.position.set(.04,1.65,2.1);beam.castShadow=false;beamRig.visible=false;
 let mode='Idle',time=0,age=0,disposed=false;const modes=['Idle','Walk','Wave','Beam','BeamPose','Roll','Throw','Hurt','Jump'],smooth=(a,b,k)=>a+(b-a)*k;
 function setMode(value){if(!modes.includes(value))throw Error('Unknown Outouman mode: '+value);if(mode!==value){mode=value;time=0;}}
 function update(dt){if(disposed)return;dt=Math.min(.05,Math.max(0,+dt||0));time+=dt;age+=dt;const k=1-Math.exp(-dt*10),phase=age*6;
  let lift=0,bodyPitch=0,headYaw=Math.sin(age*.65)*.035,compression=1;
  for(const a of arms){let sx=0,sz=a.sign*.24,ex=-.12,ez=0;
   if(mode==='Walk')sx=Math.sin(phase+a.sign*Math.PI/2)*.45;
   if(mode==='Wave'&&a.sign===-1){sz=-2.15+Math.sin(time*5.0)*.20;ex=-.40;ez=-.22+Math.sin(time*6)*.18;headYaw=-.10;}
   if(['Beam','BeamPose','Throw'].includes(mode)){sx=-1.27;sz=a.sign===-1?-.12:-.52;ex=a.sign===-1?-1.2:-.28;ez=a.sign===-1?.76:-.65;bodyPitch=-.035;}
   if(mode==='Roll'){sx=-1.1;sz=a.sign*.25;ex=-1.15;}
   if(mode==='Jump'){sx=-.4;sz=a.sign*.50;}
   a.shoulder.rotation.x=smooth(a.shoulder.rotation.x,sx,k);a.shoulder.rotation.z=smooth(a.shoulder.rotation.z,sz,k);a.elbow.rotation.x=smooth(a.elbow.rotation.x,ex,k);a.elbow.rotation.z=smooth(a.elbow.rotation.z,ez,k);
  }
  for(const l of legs){const walk=mode==='Walk';l.hip.rotation.x=smooth(l.hip.rotation.x,walk?Math.sin(phase-l.sign*Math.PI/2)*.42:0,k);l.knee.rotation.x=smooth(l.knee.rotation.x,walk?Math.max(0,Math.sin(phase-l.sign*Math.PI/2))*.46:0,k);}
  if(mode==='Walk'){lift=Math.abs(Math.sin(phase))*.045;bodyPitch=.035;}
  if(mode==='Jump'){const p=time%2.5;if(p<.45)compression=1-.09*Math.sin(p/.45*Math.PI/2);else if(p<1.55){lift=1.55*Math.sin((p-.45)/1.10*Math.PI);compression=1+.035*Math.sin((p-.45)/1.10*Math.PI);}else if(p<1.85)compression=1-.10*Math.sin((p-1.55)/.30*Math.PI);}
  rig.position.y=smooth(rig.position.y,lift,k);rig.scale.y=smooth(rig.scale.y,compression+Math.sin(age*2.2)*.002,k);rig.rotation.x=smooth(rig.rotation.x,bodyPitch,k);head.rotation.y=smooth(head.rotation.y,headYaw,k);
  const rollAngle=mode==='Roll'?Math.min(1,time/.60)*Math.PI*2:0;// Model faces +Z: positive X-axis pitch sends the head forward (+Z).
  rig.rotation.x=mode==='Roll'?rollAngle:smooth(rig.rotation.x,bodyPitch,k);
  // The guardian's world root already travels toward its dodge goal; do not double-shift the rig.
  rig.position.z=smooth(rig.position.z,0,k);
  if(mode==='Roll'){const c=Math.cos(rollAngle),sn=-Math.sin(rollAngle);let contact=0;for(const [cy,cz,ry,rz] of [[2.99,0,1.14,.91],[1.48,0,.57,.3],[.13,.13,.19,.34]])contact=Math.max(contact,-cy*c-cz*sn+Math.hypot(ry*c,rz*sn));for(const [z,y]of profile)contact=Math.max(contact,-(y+2.99)*c-z*sn);rig.position.y=contact+.02;}
  if(mode==='Hurt')rig.rotation.z=Math.sin(time*27)*.025;else rig.rotation.z=smooth(rig.rotation.z,0,k);
  blue.emissiveIntensity=.50+.12*Math.sin(age*2.2);halo.material.opacity=.045+.015*Math.sin(age*2.2);eyeMat.emissiveIntensity=.65+.05*Math.sin(age*1.3);
  const active=options.beamEffects!==false&&mode==='Beam'&&time>1.1;beamRig.visible=active;beamMat.opacity=.42+.18*Math.sin(age*35);beam.scale.x=beam.scale.z=.75+.1*Math.sin(age*31);
 }
 function dispose(){if(disposed)return;disposed=true;root.parent?.remove(root);for(const g of geos)g.dispose();for(const m of mats)m.dispose();}
 update(0);return {root,update,setMode,dispose,setMotionSpeed:()=>{},getState:()=>({mode,time,height:4.53,beamVisible:beamRig.visible,headYaw:head.rotation.y,meshes:(()=>{let n=0;root.traverse(o=>{if(o.isMesh)n++;});return n;})()})};
}
window.OutoumanSpirit={create};})();
