/* Hand-attached effects for the two Blender characters; action time is the sole clock. */
(()=>{'use strict';
window.createDuoCombatVFX=function(T,parent,model,path){
 const mage=/starlight-mage/.test(path),group=new T.Group();group.name='CombatEffects';group.userData.isEffect=true;parent.add(group);
 const mat=new T.MeshBasicMaterial({color:mage?0x6ccaff:0xffcf60,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending});
 const gold=new T.MeshBasicMaterial({color:0xffe4a1,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending});
 const bolts=Array.from({length:6},()=>{const m=new T.Mesh(new T.SphereGeometry(1,12,8),mat);group.add(m);return m;});
 const rings=Array.from({length:3},()=>{const m=new T.Mesh(new T.TorusGeometry(1,.013,6,80),gold);group.add(m);return m;});
 const sparks=Array.from({length:12},()=>{const m=new T.Mesh(new T.OctahedronGeometry(.045),gold);group.add(m);return m;});
 const hands={};model.traverse(o=>{if(o.isBone&&/^hand[LR]$/.test(o.name))hands[o.name.slice(-1)]=o;});
 const p=new T.Vector3(),q=new T.Vector3();let disposed=false;
 function hand(side){hands[side]?.getWorldPosition(p);return group.worldToLocal(p.clone());}
 function update(mode,time){if(disposed)return;const strong=mode==='Ultimate',active=strong||mode==='Attack';group.visible=active;if(!active)return;model.updateMatrixWorld(true);group.updateMatrixWorld(true);const scale=model.getWorldScale(q).x;const k=Math.max(.1,scale);const duration=mage?(strong?3:1.2):(strong?2.4:1);const events=mage?(strong?[1.35,1.48,1.61,1.74,1.87,2]:[.52]):(strong?[.48,.70,.92,1.14,1.36,1.58]:[.34,.54]);
  bolts.forEach((m,i)=>{const age=time-events[i];m.visible=i<events.length&&age>=0&&age<.40;if(!m.visible)return;const side=mage?'L':(i%2?'L':'R');m.position.copy(hand(side));m.position.z+=.12*k+age*5*k;m.position.x+=(mage&&strong?(i-2.5)*.08:0)*k;m.scale.set(.035*k,.035*k,(mage?.21:.14)*k);});
  rings.forEach((m,i)=>{m.visible=mage&&strong&&time>.25&&time<2.5;if(!m.visible)return;m.position.copy(hand('L'));m.rotation.set(i*.7,time*(i%2?-1:1),time*.8);m.scale.setScalar(k*(.18+.09*i)*Math.min(1,(time-.25)*3));});
  sparks.forEach((m,i)=>{m.visible=mage&&strong&&time>.4&&time<2.5;if(!m.visible)return;const a=i*Math.PI/6+time;m.position.copy(hand('L')).add(new T.Vector3(Math.cos(a)*.42*k,Math.sin(a)*.42*k,.03*k));m.rotation.set(a,a,0);m.scale.setScalar(k);});
  mat.opacity=Math.min(1,(duration-time)*4);gold.opacity=Math.max(0,Math.min(.8,(duration-time)*3));
 }
 return{update,dispose(){disposed=true;parent.remove(group);group.traverse(o=>o.geometry?.dispose());mat.dispose();gold.dispose();}};
};})();
