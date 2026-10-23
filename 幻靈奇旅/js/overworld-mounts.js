/* +Y up / +Z forward. Call update AFTER the hero AnimationMixer each frame. */
(()=>{'use strict';window.OverworldMounts={create({THREE:T,parent,hero,createDeer}){
 if(!T||!parent||!hero?.object)throw Error('Mounts require THREE, parent and hero.object');
 const root=new T.Group();root.name='OverworldMount';parent.add(root);root.visible=false;
 const geometries=new Set(),materials=new Set(),wheels=[],pedals=[];let chosen=null,permitted=false,bicycle=null,deer=null,phase=0,wasRiding=false,disposed=false;
 const base={position:hero.object.position.clone(),quaternion:hero.object.quaternion.clone(),scale:hero.object.scale.clone()};
 const nodes={},rest={};hero.object.traverse(o=>{if(/^(root|hips|thigh[LR]|shin[LR]|foot[LR]|upperArm[LR]|forearm[LR]|hand[LR])$/.test(o.name)){nodes[o.name]=o;const source=hero.restScene?.getObjectByName(o.name)||o;rest[o.name]={p:source.position.clone(),q:source.quaternion.clone(),s:source.scale.clone()};}});
 const axisX=new T.Vector3(1,0,0),axisZ=new T.Vector3(0,0,1),q=new T.Quaternion(),qz=new T.Quaternion(),v=new T.Vector3();
 hero.root.updateMatrixWorld(true);const initialHip=nodes.hips?hero.root.worldToLocal(nodes.hips.getWorldPosition(v)).y:.74;
 function material(color,metalness=0){const m=new T.MeshStandardMaterial({color,metalness,roughness:.48});materials.add(m);return m;}
 const blue=material(0x287caa,.35),rubber=material(0x26343d),steel=material(0xb8c8cd,.65),saddleMat=material(0x594638);
 function mesh(g,m,p,group){geometries.add(g);const o=new T.Mesh(g,m);o.position.fromArray(p);o.castShadow=true;(group||bicycle).add(o);return o;}
 function bar(a,b,r,m){const av=new T.Vector3().fromArray(a),bv=new T.Vector3().fromArray(b),delta=bv.clone().sub(av),o=mesh(new T.CylinderGeometry(r,r,delta.length(),8),m,av.add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 function makeBike(){bicycle=new T.Group();bicycle.name='LowPolyBicycle';root.add(bicycle);
  for(const z of [-.82,.82]){const w=new T.Group();w.position.set(0,.48,z);bicycle.add(w);wheels.push(w);const tire=mesh(new T.TorusGeometry(.43,.045,6,28),rubber,[0,0,0],w);tire.rotation.y=Math.PI/2;const rim=mesh(new T.TorusGeometry(.385,.012,4,28),steel,[0,0,0],w);rim.rotation.y=Math.PI/2;for(let i=0;i<8;i++){const a=i*Math.PI/4,o=mesh(new T.CylinderGeometry(.005,.005,.77,4),steel,[0,0,0],w);o.rotation.x=a;}const hub=mesh(new T.CylinderGeometry(.04,.04,.18,8),steel,[0,0,0],w);hub.rotation.z=Math.PI/2;}
  const rear=[0,.48,-.82],front=[0,.48,.82],crank=[0,.61,.08],seat=[0,1.13,-.15],steer=[0,1.19,.58];for(const [a,b]of [[rear,seat],[seat,crank],[rear,crank],[seat,steer],[crank,steer],[steer,front]])bar(a,b,.033,blue);
  bar([0,1.18,.58],[0,1.55,.40],.024,steel);bar([-.39,1.55,.40],[.39,1.55,.40],.025,rubber);
  mesh(new T.BoxGeometry(.34,.075,.30),saddleMat,[0,1.15,-.15]);
  for(const s of [-1,1]){const pivot=new T.Group();pivot.position.set(0,.61,.08);bicycle.add(pivot);const pedal=mesh(new T.BoxGeometry(.20,.035,.10),rubber,[s*.22,s*.15,0],pivot);pedals.push(pivot);}
 }
 function ensure(type){if(type==='bicycle'&&!bicycle)makeBike();if(type==='mirror-deer'&&!deer){if(!createDeer)throw Error('createDeer missing');deer=createDeer();deer.root.position.set(0,0,.15);root.add(deer.root);const saddle=new T.Mesh(new T.BoxGeometry(.66,.075,.58),saddleMat);geometries.add(saddle.geometry);saddle.position.set(0,2.15,-.24);root.add(saddle);saddle.name='DeerRidingSaddle';}}
 function restorePose(){hero.object.position.copy(base.position);hero.object.quaternion.copy(base.quaternion);hero.object.scale.copy(base.scale);for(const [name,n]of Object.entries(nodes)){const r=rest[name];n.position.copy(r.p);n.quaternion.copy(r.q);n.scale.copy(r.s);}hero.root.updateMatrixWorld(true);}
 function pose(name,x=0,z=0){const n=nodes[name],r=rest[name];if(!n)return;n.position.copy(r.p);n.scale.copy(r.s);q.setFromAxisAngle(axisX,x);qz.setFromAxisAngle(axisZ,z);n.quaternion.copy(r.q).multiply(q).multiply(qz);}
 function update(dt,state={}){if(disposed)return;dt=Math.max(0,Math.min(.06,Number(dt)||0));permitted=state.allowed!==false;const riding=!!chosen&&permitted;if(!riding){root.visible=false;if(wasRiding)restorePose();wasRiding=false;return;}
  if(!wasRiding){base.position.copy(hero.object.position);base.quaternion.copy(hero.object.quaternion);base.scale.copy(hero.object.scale);}wasRiding=true;root.visible=true;ensure(chosen);if(bicycle)bicycle.visible=chosen==='bicycle';if(deer)deer.root.visible=chosen==='mirror-deer';const saddle=root.getObjectByName('DeerRidingSaddle');if(saddle)saddle.visible=chosen==='mirror-deer';if(state.position){if(Array.isArray(state.position))root.position.fromArray(state.position);else root.position.copy(state.position);}else root.position.copy(hero.root.position);root.rotation.y=Number.isFinite(state.yaw)?state.yaw:hero.root.rotation.y;
  const moving=!!state.moving,speed=Math.max(0,Number(state.speed)||0),step=moving?dt*speed:0;phase+=step/.15;
  const bike=chosen==='bicycle',seatY=bike?1.13:2.15,bob=bike?0:(moving?.025*Math.sin(phase*.45):0);
  hero.object.position.copy(base.position);hero.object.position.y+=seatY-initialHip+bob;hero.object.position.z+=bike?-.15:-.24;
  const action=String(state.action||hero.mode||'').toLowerCase(),throwing=/throw|attack|guns|roll|hurt|react/.test(action);
  if(!throwing)pose('root');pose('hips');
  for(const s of [1,-1]){const side=s===1?'L':'R';if(bike){const p=phase+(s===1?0:Math.PI),dy=.61+.15*Math.cos(p)-(seatY-.066),dz=.08+.15*Math.sin(p)-(-.15),l1=.28*base.scale.y,l2=.21*base.scale.y,d=Math.min(l1+l2-.005,Math.max(.06,Math.hypot(dy,dz))),knee=Math.PI-Math.acos(Math.max(-1,Math.min(1,(l1*l1+l2*l2-d*d)/(2*l1*l2)))),a=Math.atan2(-dz,-dy)-Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));pose('thigh'+side,a,s*.08);pose('shin'+side,knee);pose('foot'+side,-a-knee);}
   else{pose('thigh'+side,-.40,s*.95);pose('shin'+side,.70);pose('foot'+side,-.30,-s*.12);}}
  if(!throwing){for(const s of [1,-1]){const side=s===1?'L':'R';pose('upperArm'+side,bike?-.62:-.45,-s*.07);pose('forearm'+side,bike?-.63:-.48);pose('hand'+side,.08);}}
  if(bike){wheels.forEach(w=>w.rotation.x+=step/.43);pedals.forEach(p=>p.rotation.x=phase);}else{deer.setMode(moving?'Walk':'Idle');deer.setMotionSpeed?.(moving?Math.min(2.3,speed/3):0);deer.update(dt);}
  // Costume hover wrappers may retain a vertical offset: seat using the actual hip, not only the GLB origin.
  hero.root.updateMatrixWorld(true);
  if(nodes.hips){const hipY=hero.root.worldToLocal(nodes.hips.getWorldPosition(v)).y;const parentScale=hero.object.parent.getWorldScale(v).y;hero.object.position.y+=(seatY+bob-hipY)/Math.max(.001,parentScale);}
  hero.root.updateMatrixWorld(true);root.updateMatrixWorld(true);
 }
 return{setMount(value){if(value!==null&&!['bicycle','mirror-deer'].includes(value))throw Error('Unknown mount '+value);if(chosen===value)return;if(wasRiding)restorePose();wasRiding=false;chosen=value;root.visible=false;},update,get active(){return chosen;},get speedMultiplier(){return chosen&&permitted?1.5:1;},get root(){return root;},getState(){let triangles=0;bicycle?.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});return{active:chosen,riding:wasRiding,allowed:permitted,bicycleTriangles:triangles,seatHeight:chosen==='bicycle'?1.13:2.15};},dispose(){if(disposed)return;restorePose();disposed=true;root.parent?.remove(root);deer?.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}};})();

