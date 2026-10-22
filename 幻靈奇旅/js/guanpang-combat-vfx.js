/* Deterministic, seekable combat VFX. GLB clips are portable; these effects are rendered by Three.js. */
window.createGuanpangCombatVFX=function(T,scene,model,clips){
 const group=new T.Group();group.name='GuanpangCombatVFX';group.userData.isEffect=true;scene.add(group);
 const material=(color)=>new T.MeshBasicMaterial({color,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
 const rings=[];
 for(let i=0;i<4;i++){const m=new T.Mesh(new T.RingGeometry(.93,1,96),material(i%2?0xd8a3ff:0x982fff));m.rotation.x=-Math.PI/2;m.position.y=.025+i*.004;group.add(m);rings.push(m);}
 const glyph=new T.Group();glyph.position.y=.04;group.add(glyph);
 for(let i=0;i<12;i++){const m=new T.Mesh(new T.RingGeometry(.09,.12,4),material(0xd097ff));m.rotation.x=-Math.PI/2;const a=i*Math.PI/6;m.position.set(Math.sin(a)*1.35,0,Math.cos(a)*1.35);glyph.add(m);}
 const particles=[];for(let i=0;i<64;i++){const m=new T.Mesh(new T.OctahedronGeometry(.025+(i%4)*.009),material(i%3?0xb45aff:0xffdfff));group.add(m);particles.push(m);}
 const ribbon=new T.Mesh(new T.BufferGeometry(),material(0xd794ff));group.add(ribbon);
 const light=new T.PointLight(0xa636ff,0,5);light.position.set(0,1,1);group.add(light);
 // Bake the actual skinned weapon's path, so the ribbon follows the exported animation.
 const paths={};const bone=model.getObjectByName('handR');model.updateMatrixWorld(true);
 const localTip=bone.worldToLocal(new T.Vector3(-.885,.77,.935));
 const localEdge=bone.worldToLocal(new T.Vector3(-.885,1.17,.935));
 const sampler=new T.AnimationMixer(model);
 for(const name of ['Attack','Ultimate']){const clip=clips.find(c=>c.name===name);if(!clip)continue;sampler.stopAllAction();const action=sampler.clipAction(clip).play();const samples=[];
  for(let i=0;i<=160;i++){action.time=clip.duration*i/160;sampler.update(0);model.updateMatrixWorld(true);samples.push([bone.localToWorld(localTip.clone()),bone.localToWorld(localEdge.clone())]);}paths[name]={duration:clip.duration,samples};
 }sampler.stopAllAction();sampler.uncacheRoot(model);
 const cracks=new T.Group();group.add(cracks);
 for(let i=0;i<14;i++){const a=i*2.399;const points=[];for(let k=0;k<5;k++){const r=.25+k*.3;points.push(new T.Vector3(Math.sin(a+k*.07)*r,.027,Math.cos(a+k*.07)*r));}const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x592668,transparent:true,opacity:0}));cracks.add(line);}
 let state={};function update(name,time){const p=paths[name];group.visible=!!p;if(!p){state={name,active:false};return;}const u=time/p.duration,ultimate=name==='Ultimate';
  const impact=ultimate?.655:.50;const hit=p.samples[Math.floor(impact*160)][0];const age=(u-impact)*p.duration;const charge=ultimate&&u<impact?Math.sin(Math.min(1,u/.48)*Math.PI/2):0;const burst=age>=0?Math.max(0,1-age/(ultimate?.85:.35)):0;
  group.position.copy(model.position);group.quaternion.copy(model.quaternion);group.scale.copy(model.scale);
  rings.forEach((m,i)=>{const radius=age>=0?(ultimate?.65: .3)+age*(ultimate?3.3:2)+i*.13:1.05+i*.16;m.scale.setScalar(radius);m.material.opacity=ultimate?(age<0?0:burst*.8):burst*.5;m.position.x=hit.x;m.position.z=hit.z;});
  glyph.position.x=hit.x;glyph.position.z=hit.z;glyph.rotation.y=time*.35;glyph.children.forEach(m=>m.material.opacity=burst*.6);
  particles.forEach((m,i)=>{const a=i*2.39996;const active=age>=0;const t=active?age:time%1.2;const r=active?.3+t*(1+(i%7)*.36):1.1+.15*Math.sin(i);m.position.set(hit.x+Math.sin(a)*r,active?.08+Math.max(0,(.7+(i%5)*.25)*t-2*t*t):.1+(t+i*.04)%1.5,Math.cos(a)*r+hit.z);m.material.opacity=active?burst:(ultimate?charge*.5:0);m.rotation.set(time+i,time*2,i);});
  const start=ultimate?.53:.34,end=ultimate?.70:.59,vertices=[];
  if(u>=start&&u<=end){const hi=Math.min(160,Math.floor(u*160));const lo=Math.max(Math.floor(start*160),hi-14);for(let i=lo;i<hi;i++){const a=p.samples[i],b=p.samples[i+1];for(const v of [a[0],a[1],b[0],a[1],b[1],b[0]])vertices.push(...v.toArray());}}
  ribbon.geometry.dispose();ribbon.geometry=new T.BufferGeometry();ribbon.geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));ribbon.material.opacity=.25;
  cracks.position.set(hit.x,0,hit.z);cracks.children.forEach(o=>o.material.opacity=ultimate?burst:0);light.intensity=charge*1.5+burst*4;state={name,active:true,phase:age>=0?'impact/recovery':'charge/swing',trailTriangles:vertices.length/9,burst,charge,shake:ultimate&&age>=0?burst*.055:0};
 }
 return {update,get state(){return state;},dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});scene.remove(group);}};
};
