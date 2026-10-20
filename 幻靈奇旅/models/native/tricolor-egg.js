/* 三色蛋 — hand-authored curved feather-shell sculpture, Three.js r128.
 * +Y up, +Z front, origin at the resting base. No texture or network dependency.
 * Every shell plume has a closed, curved, thick surface and an articulated root.
 */
(()=>{'use strict';
function create(options={}){
 const T=window.THREE;if(!T)throw Error('TricolorEgg requires THREE r128');
 const root=new T.Group(),rig=new T.Group();root.name='三色蛋';rig.name='StationaryEggShell';root.add(rig);
 const geometries=new Set(),materials=new Set(),plumes=[],crown=[],support=[];
 const H=2.62,TAU=Math.PI*2;
 const modes=['Idle','Armor','Restore','Evolve'];
 const durations={Idle:4.2,Armor:2.8,Restore:3.2,Evolve:4.8};
 const geo=g=>(geometries.add(g),g),color=h=>new T.Color(h).convertSRGBToLinear();
 function mat(h,extra){const m=new T.MeshStandardMaterial(Object.assign({color:color(h),roughness:.67,metalness:0},extra));materials.add(m);return m;}
 const palette={deep:mat('#5d3f30'),brown:mat('#8a5a3c'),tan:mat('#a66e44'),gold:mat('#dca157'),red:mat('#cf5447'),coral:mat('#dc6552'),ivory:mat('#fff0d7'),cream:mat('#f3e2c7'),gray:mat('#b6acb6'),grayDark:mat('#a39ba9')};
 const veinMats={deep:mat('#694a36'),brown:mat('#976847'),tan:mat('#b47e51'),gold:mat('#e4b16b'),red:mat('#d86151'),coral:mat('#e3725e'),ivory:mat('#f5e2c6'),cream:mat('#e9d4b7'),gray:mat('#c3bac4'),grayDark:mat('#b5aab9')};
 function mesh(parent,g,m,name){const o=new T.Mesh(g,m);o.name=name||'';o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
 function radius(y){const t=Math.max(0,Math.min(1,y/H));return .94*Math.pow(Math.sin(Math.PI*t),.62)*(1.13-.30*t);}
 function point(y,a,out){const r=radius(y)+out;return new T.Vector3(Math.sin(a)*r,y,Math.cos(a)*r*.93);}
 // Continuous egg core closes all seams during the gentle shell-opening motion.
 {const p=[],ix=[],rows=40,sides=64;for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const y=H*i/rows,v=point(y,j/sides*TAU,-.012);p.push(v.x,y,v.z);if(j===0||j%8===0)support.push(v.clone());}for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=i*(sides+1)+j,b=a+sides+1;ix.push(a,a+1,b,a+1,b+1,b);}const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(rig,g,palette.deep,'ContinuousEggCore');}
 function tube(parent,points,m,r=.004){const g=geo(new T.TubeGeometry(new T.CatmullRomCurve3(points),16,r,4,false));return mesh(parent,g,m,'SculptedFeatherMidrib');}
 function shellPlume(row,index,count,start,end,span,key,theta,offset=.035){
  const yaw=new T.Group(),hinge=new T.Group();yaw.name='ShellRoot_'+row+'_'+index;hinge.name='ShellHinge_'+row+'_'+index;
  yaw.rotation.y=theta;const rootRadius=radius(start)*.93;yaw.position.set(Math.sin(theta)*radius(start),start,Math.cos(theta)*rootRadius);
  // Elliptic radial position matches the core; local yaw retains a consistent hinge axis.
  yaw.add(hinge);rig.add(yaw);
  const p=[],ix=[],rows=14,cols=7,layer=(rows+1)*(cols+1),rootPoint=point(start,theta,0),cy=Math.cos(theta),sy=Math.sin(theta);
  const length=start-end;
  function sample(t,u,side){
   const y=start-length*t;
   // Broad rounded shoulders taper into a softly pointed end, never a flat quad.
   const silhouette=(.16*(1-t)+1.02*Math.pow(Math.sin(Math.PI*t),.65))*(1-.08*t);
   const width=span*silhouette,delta=u*width;
   // A visible cushioned vane and a raised trailing lip give each plume its own surface.
   // Neighboring feathers no longer share a nearly coplanar mathematical egg skin.
   const belly=Math.pow(Math.sin(Math.PI*t),.80),cross=Math.pow(Math.max(0,1-u*u),.75);
   const ridge=.026+.084*belly*cross+.014*belly*u+.018*t*t;
   const thickness=.010+.018*belly*cross;
   const q=point(y,theta+delta,offset+ridge+side*thickness).sub(rootPoint);
   // First evaluate the actual elliptic shell in world coordinates, then inverse-yaw.
   // Rotating an ellipse-shaped patch as if the shell were circular causes crossings.
   const x=q.x,z=q.z;q.x=x*cy-z*sy;q.z=x*sy+z*cy;
   return q;
  }
  for(const side of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const v=sample(i/rows,j/cols*2-1,side);p.push(v.x,v.y,v.z);}
  const n=cols+1;
  for(let s=0;s<2;s++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=s*layer+i*n+j,b=a+n;if(s===0)ix.push(a,b,a+1,b,b+1,a+1);else ix.push(a,a+1,b,b,a+1,b+1);}
  // Close the perimeter with indexed side walls; no paper-thin feather boundaries.
  const edge=[];for(let j=0;j<=cols;j++)edge.push(j);for(let i=1;i<=rows;i++)edge.push(i*n+cols);for(let j=cols-1;j>=0;j--)edge.push(rows*n+j);for(let i=rows-1;i>0;i--)edge.push(i*n);
  for(let i=0;i<edge.length;i++){const a=edge[i],b=edge[(i+1)%edge.length];ix.push(a,a+layer,b,b,a+layer,b+layer);}
  const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(hinge,g,palette[key],'CurvedShellFeather_'+key);
  const vein=[];for(let i=1;i<16;i++)vein.push(sample(i/16,0,1).add(new T.Vector3(0,0,.004)));tube(hinge,vein,veinMats[key],.0032);
  plumes.push({yaw,hinge,row,index,theta,key});return hinge;
 }
 // Lower rows are built before upper rows, like overlapping roof shingles.
 const rows=[
  {start:1.02,end:.035,count:10,span:.345,colors:['deep','deep','brown','deep','deep'],offset:.024},
  {start:1.36,end:.16,count:11,span:.310,colors:['gold','brown','gold','tan','gold','brown'],offset:.074},
  {start:1.67,end:.44,count:11,span:.310,colors:['brown','tan','brown','brown','tan'],offset:.124},
  {start:2.03,end:.84,count:10,span:.345,colors:['red','coral','red','red','coral'],offset:.174},
  {start:2.40,end:1.40,count:9,span:.385,colors:['ivory','cream','ivory'],offset:.224},
  {start:2.58,end:2.13,count:8,span:.420,colors:['gray','grayDark','gray'],offset:.274}
 ];
 rows.forEach((r,row)=>{for(let i=0;i<r.count;i++){
  // Front is centered on a single plume, while alternate rows stagger their seams.
  const theta=i/r.count*TAU+(row%2?.5/r.count*TAU:0);
  let end=r.end+.035*Math.cos(theta*2+row),key=r.colors[i%r.colors.length],start=r.start;
  const front=Math.cos(theta),back=-front;
  if(row===4){end-=.30*Math.pow(Math.max(0,front),7);if(back>.7)end+=.12;}
  if(row===3&&back>.75){end-=.26;key='red';}
  shellPlume(row,i,r.count,start,end,r.span,key,theta,r.offset);
 }});
 // A long centered white front plume and the red V beneath it establish the reference face.
 shellPlume(4,90,1,2.39,1.10,.285,'ivory',0,.255);
 shellPlume(3,91,1,1.91,.67,.265,'red',0,.205);
 // The back has a distinct long russet center feather rather than the white front panel.
 shellPlume(3,92,1,1.83,.42,.265,'red',Math.PI,.215);
 function crownFeather(index,key,x,y,z,len,width,rz,rx,ry){
  const pivot=new T.Group();pivot.position.set(x,y,z);pivot.rotation.set(rx,ry,rz);pivot.name='CrestRoot_'+index;rig.add(pivot);
  const p=[],ix=[],rows=18,cols=8,layer=(rows+1)*(cols+1);
  const sample=(t,u,s)=>{const w=width*Math.pow(Math.sin(Math.PI*t),.72)*(.92+.18*t);return new T.Vector3(u*w,len*t,.095*Math.sin(Math.PI*t)+.14*t*t+s*.025*Math.sin(Math.PI*t)*(1-u*u));};
  for(const s of [1,-1])for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++){const v=sample(i/rows,j/cols*2-1,s);p.push(v.x,v.y,v.z);}
  for(let s=0;s<2;s++)for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=s*layer+i*(cols+1)+j,b=a+cols+1;if(s===0)ix.push(a,a+1,b,a+1,b+1,b);else ix.push(a,b,a+1,b,b+1,a+1);}
  const g=geo(new T.BufferGeometry());g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();mesh(pivot,g,palette[key],'UprightCrownFeather_'+key);
  const v=[];for(let i=1;i<18;i++)v.push(sample(i/18,0,1).add(new T.Vector3(0,0,.004)));tube(pivot,v,veinMats[key],.0035);
  crown.push({pivot,base:pivot.rotation.clone(),index});
 }
 // Overlapping fan: muted lavender back, brown/gold edges, taller red and ivory blades.
 crownFeather(0,'gray',-.10,2.57,-.10,.62,.20,.88,-.40,-.1);
 crownFeather(1,'brown',.08,2.58,-.09,.58,.13,-.60,-.22,.1);
 crownFeather(2,'gold',.09,2.59,.015,.49,.13,-.51,.16,.12);
 crownFeather(3,'tan',-.06,2.58,.01,.47,.13,.56,.10,-.10);
 crownFeather(4,'red',-.025,2.59,-.03,.89,.21,.37,-.28,-.05);
 crownFeather(5,'ivory',.045,2.60,.065,.79,.14,-.09,.04,.05);
 const effects=new T.Group();effects.name='Effects';effects.userData.isEffect=true;root.add(effects);
 const healingMat=mat('#c3f5ce',{emissive:color('#8bd7ac'),emissiveIntensity:.85,transparent:true,opacity:0,depthWrite:false}),armorMat=mat('#f2d5a2',{emissive:color('#d6aa67'),emissiveIntensity:.55,transparent:true,opacity:0,depthWrite:false});
 const ringGeo=geo(new T.TorusGeometry(1,.014,6,48)),rings=[];
 for(let i=0;i<3;i++){const ring=mesh(effects,ringGeo,i===0?armorMat:healingMat,'StationaryAuraRing_'+i);ring.rotation.x=Math.PI/2;ring.position.y=.045+i*.12;ring.castShadow=false;ring.receiveShadow=false;rings.push(ring);}
 const sparks=[],sparkGeo=geo(new T.OctahedronGeometry(.030,0));
 for(let i=0;i<10;i++){const s=mesh(effects,sparkGeo,healingMat,'HealingSpark_'+i);s.castShadow=false;s.receiveShadow=false;sparks.push(s);}
 let mode='Idle',modeTime=0,elapsed=0,motionSpeed=1,disposed=false;
 const loopModes=new Set(['Idle']),clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 function motion(){
  const duration=durations[mode],time=loopModes.has(mode)?modeTime%duration:Math.min(modeTime,duration),p=clamp(time/duration),envelope=Math.sin(Math.PI*p);
  let opening=0,rock=0,lift=0,squash=0,phase='rest';
  if(mode==='Idle'){squash=.003*Math.sin(time*TAU/duration);phase='breathing';}
  if(mode==='Armor'){opening=-.10*Math.pow(envelope,.75);phase=p<.25?'sealing':p<.75?'armored':'release';}
  if(mode==='Restore'){phase=p<.2?'gathering':p<.82?'healing':'settling';}
  if(mode==='Evolve'){opening=ease(p/.35)*(1-ease((p-.67)/.33));phase=p<.35?'unfurling':p<.67?'open':'closing';}
  // The egg never translates, rotates, hops or rocks. Breathing is anchored at Y=0.
  rig.rotation.set(0,0,0);rig.scale.set(1-squash*.42,1+squash,1-squash*.42);rig.position.set(0,0,0);
  plumes.forEach(f=>{const stagger=.78+.22*Math.sin(f.row*.80);f.hinge.rotation.x=-opening*.23*stagger;f.hinge.rotation.z=opening*.024*Math.sin(f.theta);});
  crown.forEach(c=>{c.pivot.rotation.copy(c.base);c.pivot.rotation.z+=opening*(c.index-2.5)*.045+rock*.12*Math.sin(c.index);c.pivot.rotation.x+=opening*.10;});
  const healing=mode==='Restore'?Math.pow(envelope,.75):0,armor=mode==='Armor'?Math.pow(envelope,.65):0;
  effects.visible=healing>0||armor>0;healingMat.opacity=.52*healing;armorMat.opacity=.50*armor;
  rings.forEach((r,i)=>{r.visible=i===0?armor>0:healing>0;r.scale.setScalar(i===0?1.12:1.04+.28*Math.sin(p*Math.PI+i*.7));r.position.y=i===0?.04:.18+i*.37+healing*.12;});
  sparks.forEach((s,i)=>{const a=i/10*TAU,q=(p*1.6+i*.13)%1;s.visible=healing>0;s.position.set(Math.sin(a)*(1.13-.16*q),.20+q*2.6,Math.cos(a)*(1.13-.16*q));s.scale.setScalar(.75+.50*Math.sin(Math.PI*q));});
  rig.updateMatrixWorld(true);return {mode,phase,modeTime,time,completed:!loopModes.has(mode)&&modeTime>=duration,attackCompleted:!loopModes.has(mode)&&modeTime>=duration,attackProgress:p,opening,lift,rock};
 }
 motion();root.updateMatrixWorld(true);
 const restingBounds=new T.Box3().setFromObject(root),baseOffset=-restingBounds.min.y;
 rig.position.y+=baseOffset;
 function bounds(){root.updateMatrixWorld(true);const b=new T.Box3().setFromObject(rig),s=b.getSize(new T.Vector3());return {min:b.min.toArray(),max:b.max.toArray(),size:s.toArray()};}
 let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 function apply(){const s=motion();rig.position.y+=baseOffset;root.updateMatrixWorld(true);return s;}
 const api={root,
  update(delta){if(disposed)return;const dt=clamp(Number(delta)||0,0,.10)*motionSpeed;elapsed+=dt;modeTime+=dt;apply();},
  setMode(next){if(!modes.includes(next))next='Idle';mode=next;modeTime=0;apply();return api;},
  setMotionSpeed(value){motionSpeed=clamp(Number(value)||1,.05,4);},
  seek(value){modeTime=Math.max(0,Number(value)||0);apply();return api;},
  getState(){return {name:'三色蛋',id:'tricolor-egg',profile:'low-poly',triangles,meshes,joints:1+plumes.length+crown.length,modes:modes.slice(),durations:Object.assign({},durations),bounds:bounds(),artStatus:'ART_REVIEW_PENDING',shellFeathers:plumes.length,crownFeathers:crown.length,stationary:true,captureRate:.05};},
  getMotionState(){const s=motion();rig.position.y+=baseOffset;return s;},
  dispose(){if(disposed)return;disposed=true;geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.removeFromParent?root.removeFromParent():root.parent&&root.parent.remove(root);}
 };
 return api;
}
window.TricolorEgg={create,version:'1.1.0-layered-shell',name:'三色蛋'};
})();
