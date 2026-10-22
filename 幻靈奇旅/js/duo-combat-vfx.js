/* Pooled, action-clock effects. Optional target is in world space, +Z preview fallback. */
(()=>{'use strict';window.createDuoCombatVFX=function(T,parent,model,path){
 const mage=/starlight-mage/.test(path),group=new T.Group();group.name='CombatEffects';group.userData.isEffect=true;parent.add(group);
 const mat=new T.MeshBasicMaterial({color:mage?0x258fe3:0xffc650,transparent:true,opacity:.9,depthWrite:false,blending:T.NormalBlending});
 const gold=new T.MeshBasicMaterial({color:0xd8a32b,transparent:true,opacity:.85,depthWrite:false,blending:T.NormalBlending});
 const bolts=Array.from({length:6},()=>{const m=new T.Mesh(new T.SphereGeometry(1,12,8),mat);group.add(m);return m;});
 const rings=Array.from({length:7},()=>{const m=new T.Mesh(new T.TorusGeometry(1,.018,6,64),gold);group.add(m);return m;});
 const sparks=Array.from({length:24},()=>{const m=new T.Mesh(new T.OctahedronGeometry(.065),gold);group.add(m);return m;});
 const core=new T.Mesh(new T.SphereGeometry(1,20,12),mat);group.add(core);
 const shaft=new T.Mesh(new T.CylinderGeometry(1,1,1,14,1,true),mat);group.add(shaft);
 const hands={},weapons={};model.traverse(o=>{if(o.isBone&&/^hand[LR]$/.test(o.name))hands[o.name.slice(-1)]=o;if(o.isBone&&/^weapon[LR]$/.test(o.name))weapons[o.name.slice(-1)]=o;});
 const p=new T.Vector3(),q=new T.Vector3(),origin=new T.Vector3(),end=new T.Vector3(),direction=new T.Vector3(),up=new T.Vector3(0,1,0),target=new T.Vector3();let hasTarget=false,disposed=false;
 function hand(side,out){const bone=mage?hands[side]:weapons[side];out.set(0,0,0);if(!bone)return out;if(!mage)out.set(0,.37,.01);bone.localToWorld(out);return group.worldToLocal(out);}
 function destination(start,k){if(hasTarget){end.copy(target);group.worldToLocal(end);}else end.copy(start).add(q.set(0,0,3*k));}
 function update(mode,time){if(disposed)return;const strong=mode==='Ultimate',active=strong||mode==='Attack';group.visible=active;if(!active)return;model.updateMatrixWorld(true);group.updateMatrixWorld(true);const k=Math.max(.1,model.getWorldScale(q).x),duration=mage?(strong?3:1.2):(strong?2.4:1);const events=mage?(strong?[1.35,1.48,1.61,1.74,1.87,2]:[.52]):(strong?[.24,.84,1.44,1.44]:[.24,.54]);
  bolts.forEach((m,i)=>{const age=time-events[i];m.visible=i<events.length&&age>=0&&age<.4;if(!m.visible)return;const side=mage?'L':(strong?(['R','L','R','L'][i]):(i%2?'L':'R'));hand(side,origin);destination(origin,k);direction.subVectors(end,origin);m.position.copy(origin).lerp(end,age/.4);m.quaternion.setFromUnitVectors(up,direction.normalize());m.scale.set((mage&&strong?.12:.04)*k,(mage&&strong?.46:.20)*k,(mage&&strong?.12:.04)*k);});
  hand('L',origin);destination(origin,k);
  const charge=mage&&strong&&time>.25&&time<1.35,blast=mage&&strong&&time>=1.35&&time<2.45,fade=Math.min(1,(2.45-time)*5);core.visible=charge||blast;shaft.visible=blast;
  if(core.visible){core.position.copy(charge?origin:end);core.scale.setScalar(k*(charge?(.08+(time-.25)*.35):(.65+.08*Math.sin(time*28)))*Math.max(0,charge?1:fade));}
  if(blast){direction.subVectors(end,origin);shaft.position.copy(origin).add(end).multiplyScalar(.5);shaft.quaternion.setFromUnitVectors(up,direction.clone().normalize());shaft.scale.set(.20*k*Math.max(0,fade),direction.length(),.20*k*Math.max(0,fade));}
  rings.forEach((m,i)=>{m.visible=mage&&strong&&time>.25&&time<2.75;if(!m.visible)return;const hit=time>=1.35;m.position.copy(hit?end:origin);m.rotation.set(i%2?Math.PI/2:0,time*(i%2?-1:1),time*.8+i);m.scale.setScalar(k*(hit?(.35+i*.11+(time-1.35)*.35):(.22+.11*i))*Math.min(1,(time-.25)*3));});
  sparks.forEach((m,i)=>{m.visible=mage&&strong&&time>.4&&time<2.65;if(!m.visible)return;const a=i*Math.PI/12+time*2,r=(time<1.35?.45:1.3)*k;m.position.copy(time<1.35?origin:end).add(q.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*3+time)*.3*k));m.rotation.set(a,a,0);m.scale.setScalar(k*(time<1.35?.65:1.25));});
  mat.opacity=Math.max(0,Math.min(.52,(duration-time)*4));gold.opacity=Math.max(0,Math.min(.68,(duration-time)*3));
 }
 return{update,setTarget(worldPosition){hasTarget=!!worldPosition;if(hasTarget){if(Array.isArray(worldPosition))target.fromArray(worldPosition);else target.copy(worldPosition);}},dispose(){disposed=true;parent.remove(group);group.traverse(o=>o.geometry?.dispose());mat.dispose();gold.dispose();}};
};})();
