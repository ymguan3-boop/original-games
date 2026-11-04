const restores=new WeakMap();
export function resetCashierPose(object){const rows=restores.get(object);if(!rows)return;for(const row of rows){row.node.position.copy(row.position);row.node.quaternion.copy(row.quaternion);}restores.delete(object);}
// Sesame's original articulated rig is Z-up inside its -90 degree root.
// Apply after AnimationMixer so knees bend locally, then reset naturally via Idle/Walk.
export function cashierPose(T,object,path,pose){
 if(!pose?.atDesk||!path.includes('sesame-spirit-'))return null;
 const node=name=>object.getObjectByName(name),phase=pose.collecting?(Math.sin(pose.time*5.5)+1)/2:0;
 restores.set(object,['thighL','thighR','shinL','shinR','footL','footR','armL','armR','forearmL','forearmR','handL','handR'].map(node).filter(Boolean).map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone()})));
 for(const side of ['L','R']){const thigh=node('thigh'+side),shin=node('shin'+side),foot=node('foot'+side);if(thigh){thigh.position.y=-.42;thigh.rotation.set(-1.30,0,side==='L'?-.06:.06);}if(shin)shin.rotation.set(1.30,0,0);if(foot)foot.rotation.set(0,0,0);
 const arm=node('arm'+side),forearm=node('forearm'+side),hand=node('hand'+side);if(arm)arm.rotation.set(-.40-phase*(side==='R'?.95:.45),side==='L'?-.10:.10,0);if(forearm)forearm.rotation.set(-.30-phase*.25,0,0);if(hand)hand.rotation.set(phase*.22,0,side==='R'?phase*.3:0);}
 return {kind:'seated',phase,seatY:.384,hip:node('thighL'),hand:node('handR'),knee:node('shinR'),foot:node('footR')};
}
