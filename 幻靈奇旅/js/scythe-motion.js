/* Explicit scythe targets and analytic two-arm IK, in actor coordinates. */
globalThis.createScytheGripMotion=function(T,actor,hero,weapon){
 const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),Q=()=>new T.Quaternion();
 const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
 const socket=hero.getObjectByName('propR');actor.updateMatrixWorld(true);
 const readyP=actor.worldToLocal(socket.getWorldPosition(V()));
 const readyQ=actor.getWorldQuaternion(Q()).invert().multiply(socket.getWorldQuaternion(Q())).multiply(Q().setFromAxisAngle(V(1,0,0),Math.PI/2));
 const control=new T.Group();control.name='ScytheGripControl';actor.add(control);control.add(weapon);
 // Hold nearer the middle of the shaft, leaving the butt visible past the hands.
 weapon.position.set(0,.35,0);weapon.quaternion.identity();weapon.scale.setScalar(.70);
 const halfGrip=.17,ownedWrist=[],originalScales={};
 const nativeScale=()=>actor.getWorldScale(V()).x;
 const arms={};for(const side of ['R','L']){
  const upper=hero.getObjectByName('upperArm'+side),fore=hero.getObjectByName('forearm'+side),hand=hero.getObjectByName('hand'+side);
  // Named hero joints contain a translation-only child; palm contact is local to the wrist.
  originalScales[side]=upper.scale.clone();
  arms[side]={upper,fore,hand,contact:V(side==='R'?-.005:.005,-.0637,.020)};
  let skin;fore.traverse(o=>{if(o.isMesh&&o.userData.part?.m==='skin')skin=o.material;});
  if(skin){const wrist=new T.Mesh(new T.CylinderGeometry(.029,.035,.044,24),skin);wrist.position.set(0,-.008,.003);wrist.name='ConnectedWrist'+side;wrist.castShadow=true;hand.add(wrist);ownedWrist.push(wrist);}
 }
 function orientation(direction,extension){
  const y=direction.clone().normalize(),x=extension.clone().addScaledVector(y,-extension.dot(y)).normalize(),z=x.clone().cross(y).normalize();
  return Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
 }
 const downQ=orientation(V(0,-.30,.954),V(0,-.954,-.30));
 const sweepQ=angle=>orientation(V(Math.sin(angle),0,Math.cos(angle)),V(Math.cos(angle),0,-Math.sin(angle)));
 const lowStart=sweepQ(-Math.PI/2),lowEnd=sweepQ(Math.PI/2),counterEnd=sweepQ(-Math.PI/2);
 const highQ=orientation(V(0,.88,.475),V(1,0,0));
 const rearQ=orientation(V(-.94,.27,-.20),V(.21,0,-.98));
 const frontP=V(0,1.10,.74),highP=V(0,1.24,.70);
 // A forward, horizontal guard keeps the long blade clear of the head.
 readyP.copy(frontP);readyQ.copy(sweepQ(0));
 function lerpPose(pa,qa,pb,qb,t){return{p:pa.clone().lerp(pb,t),q:qa.clone().slerp(qb,t)};}
 function target(phase,u){
  if(phase===0){if(u<.25)return lerpPose(readyP,readyQ,highP,highQ,smooth(u/.25));return lerpPose(highP,highQ,frontP,downQ,smooth((u-.25)/.75));}
  if(phase===1){if(u<.55)return lerpPose(frontP,downQ,frontP,rearQ,smooth(u/.55));return lerpPose(frontP,rearQ,frontP,lowStart,smooth((u-.55)/.45));}
  if(phase===2)return{p:frontP.clone(),q:sweepQ(-Math.PI/2+Math.PI*smooth(u))};
  if(phase===3)return{p:frontP.clone(),q:sweepQ(Math.PI/2-Math.PI*smooth(u/.5))};
  if(phase===4)return{p:frontP.clone(),q:counterEnd.clone()};
  if(u<.70)return lerpPose(frontP,counterEnd,frontP,rearQ,smooth(u/.70));
  return lerpPose(frontP,rearQ,readyP,readyQ,smooth((u-.70)/.30));
 }
 function worldRotation(node,q){node.quaternion.copy(node.parent.getWorldQuaternion(Q()).invert().multiply(q));node.updateWorldMatrix(false,true);}
 function rotateToward(node,origin,point,target){
  const a=point.clone().sub(origin).normalize(),b=target.clone().sub(origin).normalize();
  worldRotation(node,Q().setFromUnitVectors(a,b).multiply(node.getWorldQuaternion(Q())));
 }
 // A cylindrical shaft permits the palm to roll independently of the blade.
 // Orient the wrist from shoulder to grip, so changing the blade plane cannot twist the arm.
 function handFrame(side,grip,shaft,elbow){
  const direction=grip.clone().sub(elbow||arms[side].upper.getWorldPosition(V()));
  direction.addScaledVector(shaft,-direction.dot(shaft));
  if(direction.lengthSq()<1e-8){direction.copy(V(0,-1,0).applyQuaternion(actor.getWorldQuaternion(Q())));direction.addScaledVector(shaft,-direction.dot(shaft));}
  const y=direction.normalize().negate(),z=shaft.clone().normalize(),x=y.clone().cross(z).normalize();
  const aligned=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
  // A closed fist can hold the round shaft diagonally. Allow a modest grip tilt
  // instead of bending the wrist backwards when the forearm approaches the shaft.
  const forward=grip.clone().sub(elbow||arms[side].upper.getWorldPosition(V())).normalize();
  const straightY=forward.negate(),straightZ=shaft.clone().addScaledVector(straightY,-shaft.dot(straightY)).normalize(),straightX=straightY.clone().cross(straightZ).normalize();
  const straight=Q().setFromRotationMatrix(new T.Matrix4().makeBasis(straightX,straightY,straightZ)),angle=aligned.angleTo(straight);
  return aligned.slerp(straight,Math.min(1,(Math.PI*35/180)/Math.max(angle,1e-6)));
 }
 function solveArm(side,grip,handQ,shaft){
  let error=0;
  for(let pass=0;pass<8;pass++){
   if(pass)handQ.slerp(handFrame(side,grip,shaft,arms[side].fore.getWorldPosition(V())),.4);
   error=solveArmPass(side,grip,handQ,shaft);
  }
  return error;
 }
 function solveArmPass(side,grip,handQ,shaft){
  const a=arms[side];actor.updateMatrixWorld(true);
  const shoulder=a.upper.getWorldPosition(V()),elbow=a.fore.getWorldPosition(V()),wrist=a.hand.getWorldPosition(V());
  const l1=shoulder.distanceTo(elbow),l2=elbow.distanceTo(wrist);
  const desiredWrist=grip.clone().sub(a.contact.clone().multiply(a.hand.getWorldScale(V())).applyQuaternion(handQ));
  const d=desiredWrist.clone().sub(shoulder),distance=Math.min(l1+l2-.0001*nativeScale(),Math.max(.02*nativeScale(),d.length()));d.normalize();
  const along=(l1*l1+distance*distance-l2*l2)/(2*distance),off=Math.sqrt(Math.max(0,l1*l1-along*along));
  const circleCenter=shoulder.clone().addScaledVector(d,along),chest=hero.getObjectByName('chest'),chestInv=chest.matrixWorld.clone().invert();
  const sign=side==='R'?-1:1,chestQ=chest.getWorldQuaternion(Q());
  const pole=V(sign*.7,-.8,.35).applyQuaternion(chestQ);pole.addScaledVector(d,-pole.dot(d)).normalize();
  const tangent=d.clone().cross(pole).normalize(),preferred=desiredWrist.clone().addScaledVector(V(0,1,0).applyQuaternion(handQ),l2);
  const point=V(),local=V(),profile=hero.userData.heroCostumeFit?.profile||[[.27,0],[.30,.25],[.27,.44],[.12,.55]];
  const anatomical=shoulder.clone().add(V(sign*.05,-.29,.15).multiplyScalar(nativeScale()).applyQuaternion(chestQ));
  function penetration(p,padding=0){
   local.copy(p).applyMatrix4(chestInv);
   if(local.y<-.06||local.y>.55)return 0;
   let radius=profile[0][0];
   for(let i=1;i<profile.length;i++){const [r,y]=profile[i],[previous,py]=profile[i-1];if(local.y<=y){radius=previous+(r-previous)*clamp((local.y-py)/(y-py));break;}}
   return Math.max(0,1-Math.sqrt((local.x/(radius+padding))**2+(local.z/(radius*.68+padding))**2));
  }
  function candidate(angle){return circleCenter.clone().addScaledVector(pole,off*Math.cos(angle)).addScaledVector(tangent,off*Math.sin(angle));}
  function score(e){
   const el=e.clone().applyMatrix4(chestInv);
   const foreDirection=desiredWrist.clone().sub(e).normalize();
   let cost=.05*e.distanceToSquared(preferred)/nativeScale()**2+.8*foreDirection.dot(shaft)**2+2*e.distanceToSquared(anatomical)/nativeScale()**2+80*Math.max(0,.22-sign*el.x)**2+3*Math.max(0,.02-el.z)**2+60*Math.max(0,el.y-.40)**2;
   for(let j=0;j<=6;j++){
    point.copy(shoulder).lerp(e,.5+.5*j/6);cost+=1000*penetration(point,.080)**2;
    point.copy(e).lerp(desiredWrist,j/6);cost+=1000*penetration(point,.113)**2;
   }
   return cost;
  }
  // Search the elbow reach circle for a body-clear solution, then refine it
  // continuously so the arm does not jump between discrete angular samples.
  const step=Math.PI*2/48;let bestAngle=0,bestScore=Infinity;
  for(let j=0;j<48;j++){const angle=j*step,cost=score(candidate(angle));if(cost<bestScore){bestScore=cost;bestAngle=angle;}}
  let lo=bestAngle-step,hi=bestAngle+step;
  for(let j=0;j<12;j++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(score(candidate(a))<score(candidate(b)))hi=b;else lo=a;}
  const nextElbow=candidate((lo+hi)/2);
  rotateToward(a.upper,shoulder,elbow,nextElbow);actor.updateMatrixWorld(true);
  const actualElbow=a.fore.getWorldPosition(V()),actualWrist=a.hand.getWorldPosition(V());
  rotateToward(a.fore,actualElbow,actualWrist,desiredWrist);actor.updateMatrixWorld(true);
  worldRotation(a.hand,handQ);actor.updateMatrixWorld(true);
  return a.hand.localToWorld(a.contact.clone()).distanceTo(grip);
 }
 function apply(phase,u,weight=1){
  if(phase<0){
   arms.R.upper.scale.setScalar(1.45);arms.L.upper.scale.setScalar(1.45);
   actor.updateMatrixWorld(true);
   const q=orientation(V(0,.90,.436),V(0,-.436,.90));
   const worldQ=actor.getWorldQuaternion(Q()).multiply(q),shaft=V(0,1,0).applyQuaternion(worldQ);
   const h=actor.localToWorld(V(-.40,.98,.44)),handQ=handFrame('R',h,shaft);
   const errorR=solveArm('R',h,handQ,shaft);
   // Use the actual palm so the weapon cannot slide out of the hand while walking.
   const palm=arms.R.hand.localToWorld(arms.R.contact.clone());
   control.position.copy(actor.worldToLocal(palm));control.quaternion.copy(q);actor.updateMatrixWorld(true);
   return {errorR,errorL:0,mode:'single',shaft:V(0,1,0).applyQuaternion(worldQ).toArray(),center:control.position.toArray()};
  }
  for(const side of ['R','L']) arms[side].upper.scale.setScalar(1.45);
  actor.updateMatrixWorld(true);
  const desired=phase<0?{p:readyP.clone(),q:readyQ.clone()}:target(phase,u);
  if(weight<1){desired.p.lerp(readyP,1-weight);desired.q.slerp(readyQ,1-weight);}
  // The torso follows the sweep; keep the blade on its authored world-space arc.
  desired.q.premultiply(Q().setFromAxisAngle(V(0,1,0),-(actor.userData.scytheBodyTurn||0)));
  actor.updateMatrixWorld(true);
  const actorQ=actor.getWorldQuaternion(Q()),worldQ=actorQ.clone().multiply(desired.q);
  const chest=hero.getObjectByName('chest');
  // Keep the grip in front of the animated chest, including its turns and lean.
  const shaft=V(0,1,0).applyQuaternion(worldQ),front=V(0,0,1).applyQuaternion(chest.getWorldQuaternion(Q()));
  const forwardAmount=Math.abs(shaft.dot(front)),gripSpan=halfGrip-.09*forwardAmount;
  const clearance=.40+.18*forwardAmount;
  const scaledGripSpan=gripSpan*nativeScale();
  let h=chest.localToWorld(V(0,desired.p.y-.82,clearance));
  // Keep both palm targets inside the reachable range without moving the blade's direction.
  for(let k=0;k<24;k++){let adjusted=false;for(const side of ['R','L']){
   const a=arms[side],s=a.upper.getWorldPosition(V()),e=a.fore.getWorldPosition(V()),w=a.hand.getWorldPosition(V());
   const radius=s.distanceTo(e)+e.distanceTo(w)-.009*nativeScale();
   const grip=h.clone().addScaledVector(shaft,side==='R'?scaledGripSpan:-scaledGripSpan),handQ=handFrame(side,grip,shaft),wanted=grip.clone().sub(a.contact.clone().multiplyScalar(1.45).applyQuaternion(handQ)),delta=wanted.sub(s),length=delta.length();
   if(length>radius){h.addScaledVector(delta,-(length-radius)/length);adjusted=true;}
  }if(!adjusted)break;}
  const right=h.clone().addScaledVector(shaft,scaledGripSpan),left=h.clone().addScaledVector(shaft,-scaledGripSpan);
  const errorR=solveArm('R',right,handFrame('R',right,shaft),shaft),errorL=solveArm('L',left,handFrame('L',left,shaft),shaft);
  control.position.copy(actor.worldToLocal(h));control.quaternion.copy(desired.q);actor.updateMatrixWorld(true);
  const hub=weapon.localToWorld(V(0,1.1,0)),tip=weapon.localToWorld(V(1.56,.073,0));
  return{errorR,errorL,shaft:shaft.toArray(),bladeDirection:tip.clone().sub(hub).normalize().toArray(),center:control.position.toArray()};
 }
 function reset(){for(const side of ['R','L'])arms[side].upper.scale.copy(originalScales[side]);}
 function dispose(){reset();for(const wrist of ownedWrist){wrist.parent?.remove(wrist);wrist.geometry.dispose();}control.parent?.remove(control);}
 return{apply,control,reset,dispose};
};














