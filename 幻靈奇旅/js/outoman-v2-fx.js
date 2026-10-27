/* 歐頭慢 v2：與原模型工作坊共用的手腕白光／彩虹光束。固定池，不在每影格建立幾何。 */
(()=>{'use strict';
 const PATH='models/spirits/outoman-v2.glb',RELEASE=.38,END=.82;
 function create(T,root,object,clips=[]){
  const wrist=object.getObjectByName('wristL');if(!wrist)throw Error('歐頭慢 v2 缺少 wristL 發射骨架');
  const durations=Object.fromEntries(clips.map(c=>[c.name.replace(/.*[|]/,''),c.duration]));
  const group=new T.Group();group.name='OutomanV2Effects';group.userData.isEffect=true;root.add(group);group.visible=false;
  const geo=new T.CylinderGeometry(1,1,1,12,1,true),orbGeo=new T.SphereGeometry(1,12,8),materials=[],beams=[];
  const white=0xeaf8ff,colors=[0xff3838,0xff9c27,0xffeb3b,0x62f359,0x32d6ff,0x5679ff,0xce5cff];
  for(let i=0;i<8;i++){const m=new T.MeshBasicMaterial({color:white,transparent:true,opacity:i===7?.95:.82,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});materials.push(m);const b=new T.Mesh(geo,m);b.rotation.x=Math.PI/2;group.add(b);beams.push(b);}
  const orbMat=new T.MeshBasicMaterial({color:white,transparent:true,opacity:.7,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});materials.push(orbMat);const orb=new T.Mesh(orbGeo,orbMat);group.add(orb);
  // Restore the five travelling rings and 36 sparks from the original character workshop.
  // Sparks are instanced, so the runtime uses one draw call instead of 36 meshes.
  const waveGeo=new T.TorusGeometry(.20,.012,8,48),waves=[];
  for(let i=0;i<5;i++){const m=new T.MeshBasicMaterial({color:white,transparent:true,opacity:.6,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});materials.push(m);const ring=new T.Mesh(waveGeo,m);group.add(ring);waves.push(ring);}
  const sparkGeo=new T.SphereGeometry(.018,6,4),sparkMat=new T.MeshBasicMaterial({color:white,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending});materials.push(sparkMat);
  const sparks=new T.InstancedMesh(sparkGeo,sparkMat,36),dummy=new T.Object3D(),sparkColor=new T.Color();sparks.frustumCulled=false;sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);group.add(sparks);
  const start=new T.Vector3(),end=new T.Vector3(),localEnd=new T.Vector3(),delta=new T.Vector3(),forward=new T.Vector3(0,0,1),scale=new T.Vector3(),offset=new T.Vector3(0,-.15,.15),target=new T.Vector3();let hasTarget=false,disposed=false;
  const api={enabled:true,group,origin(out=new T.Vector3()){object.updateWorldMatrix(true,true);return out.copy(offset).applyMatrix4(wrist.matrixWorld);},setTarget(v){hasTarget=!!v;if(v)target.copy(v);},stop(){group.visible=false;},update(mode,time,aim){
   if(disposed)return;const attacking=mode==='Attack'||mode==='Ultimate',duration=durations[mode]||(mode==='Ultimate'?3.633333:2.433333),u=time/duration;
   if(!api.enabled||!attacking||u>=END||u<0){group.visible=false;return;}
   api.origin(start);if(aim)end.copy(aim);else if(hasTarget)end.copy(target);else{end.set(0,1.5,8).applyMatrix4(object.matrixWorld);}
   root.updateWorldMatrix(true,false);group.position.copy(start);root.worldToLocal(group.position);localEnd.copy(end);root.worldToLocal(localEnd);delta.copy(localEnd).sub(group.position);const length=delta.length();if(length<.01){group.visible=false;return;}
   group.quaternion.setFromUnitVectors(forward,delta.divideScalar(length));object.getWorldScale(scale);root.getWorldScale(delta);const unit=Math.max(.01,scale.y/Math.max(.001,delta.y)),beam=u>RELEASE?Math.max(0,Math.min(1,(u-RELEASE)*20,(END-u)*20)):0,charge=u<RELEASE?u/RELEASE:0,strong=mode==='Ultimate';group.visible=beam>0||charge>0;
   for(let i=0;i<beams.length;i++){const b=beams[i],a=i/7*Math.PI*2;b.visible=beam>0;b.material.color.setHex(i===7?white:strong?colors[i]:white);b.material.blending=strong&&i!==7?T.NormalBlending:T.AdditiveBlending;b.position.set(i===7?0:Math.cos(a)*.13*unit*beam,i===7?0:Math.sin(a)*.13*unit*beam,length*.5);b.scale.set((i===7?.045:.055)*unit*beam,length,(i===7?.045:.055)*unit*beam);}
   orb.material.color.setHex(strong?0xb9d6ff:white);orb.scale.setScalar(unit*(.09+charge*.19+beam*.06));
   waves.forEach((ring,i)=>{const v=(time*2+i/5)%1;ring.visible=beam>0;ring.position.z=v*length;ring.scale.setScalar(unit*(1+v*3));ring.material.opacity=(1-v)*beam*.6;ring.material.color.setHSL(strong?(i/5+time*.1)%1:.52,strong?1:.2,.75);});
   sparks.visible=beam>0;if(sparks.visible){for(let i=0;i<36;i++){const a=i*2.399+time*3,r=(.18+(i*13%31)/31*.4)*unit;dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,((time*3+i*.17)%1)*length);dummy.scale.setScalar(unit);dummy.updateMatrix();sparks.setMatrixAt(i,dummy.matrix);sparkColor.setHSL(strong?i/36:.5,strong?1:.1,.8);sparks.setColorAt(i,sparkColor);}sparks.instanceMatrix.needsUpdate=true;if(sparks.instanceColor)sparks.instanceColor.needsUpdate=true;}
  },getState(){return{visible:group.visible,beamVisible:beams[0].visible&&group.visible,colors:beams.slice(0,7).map(b=>b.material.color.getHex()),origin:api.origin(start).toArray(),meshCount:15,waveCount:waves.length,sparkCount:sparks.count,wavesVisible:group.visible&&waves.some(w=>w.visible),sparksVisible:group.visible&&sparks.visible};},dispose(){if(disposed)return;disposed=true;root.remove(group);geo.dispose();orbGeo.dispose();waveGeo.dispose();sparkGeo.dispose();materials.forEach(m=>m.dispose());}};return api;
 }
 create.PATH=PATH;create.releaseFraction=RELEASE;create.endFraction=END;window.createOutomanV2Fx=create;
})();
