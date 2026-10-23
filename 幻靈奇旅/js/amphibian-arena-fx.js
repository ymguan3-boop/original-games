/* Arena-only native skill presentation: Water Caterpillar and Big-Eyed Frog.
 * Uses the original model poses; no rewrites of HP, energy, status or saved data.
 */
(()=>{'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function caterpillar({T,attacker,defender,group,plan,sound}){
 const actor=attacker.actor,enemy=defender.actor,rate=plan.playbackRate||1;
 const scene=new T.Group(),resources=[],nodes=[];
 const mat=(color,opacity)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide});
 const create=(geo,color,opacity)=>{const node=new T.Mesh(geo,mat(color,opacity));node.visible=false;scene.add(node);nodes.push(node);resources.push(geo,node.material);return node;};
 const orb=create(new T.SphereGeometry(.17,12,9),0x9bdcff,.95);
 const glow=create(new T.SphereGeometry(.26,12,9),0xe0faff,.32);
 const strands=Array.from({length:3},()=>create(new T.CylinderGeometry(.025,.042,1,8),0xc7f9ff,.88));
 const splash=create(new T.RingGeometry(.32,.44,24),0x97d8ff,.70);
 splash.rotation.x=-Math.PI/2;
 const web=new T.Group(),webMat=new T.LineBasicMaterial({color:0xd4faff,transparent:true,opacity:.78,depthWrite:false,blending:T.AdditiveBlending});
 // Final volley forms a web in front of the enemy, using 8 radial strands and
 // three connected rings; remain inexpensive on Android and clean up afterward.
 for(let i=0;i<8;i++){
  const theta=i*Math.PI/4,points=[new T.Vector3(0,0,0),new T.Vector3(Math.cos(theta)*1.05,Math.sin(theta)*1.05,0)];
  const geo=new T.BufferGeometry().setFromPoints(points);web.add(new T.Line(geo,webMat));resources.push(geo);
 }
 for(let ring=1;ring<=3;ring++){
  const radius=ring*.32,points=Array.from({length:33},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/16)*radius,Math.sin(i*Math.PI/16)*radius,0));
  const geo=new T.BufferGeometry().setFromPoints(points);web.add(new T.Line(geo,webMat));resources.push(geo);
 }
 scene.add(web);web.visible=false;resources.push(webMat);
 group.add(scene);
 let disposed=false,playedBullet=false,playedSilk=false;
 const mouth=()=>{
  actor.object.updateMatrixWorld(true);
  const head=actor.object.getObjectByName('head');
  if(head)return head.localToWorld(new T.Vector3(0,.44,.84));
  const origin=actor.root.getWorldPosition(new T.Vector3()),forward=enemy.root.position.clone().sub(origin).setY(0).normalize();
  return origin.add(new T.Vector3(0,actor.worldSize.y*.65,0)).addScaledVector(forward,actor.worldSize.z*.3);
 };
 const target=()=>enemy.root.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,enemy.worldSize.y*.55,0));
 function update(wallSeconds){
  if(disposed)return;
  const t=Math.max(0,wallSeconds)*rate,from=mouth(),to=target();
  if(!playedBullet&&!plan.strong&&t>=.62){playedBullet=true;sound?.('water',false);}
  if(!playedSilk&&plan.strong&&t>=1){playedSilk=true;sound?.('water',true);}
  orb.visible=glow.visible=!plan.strong&&t>=.62&&t<=1.14;
  if(orb.visible){
   const u=clamp((t-.62)/.52),point=from.clone().lerp(to,u);
   point.y+=Math.sin(u*Math.PI)*.12;
   orb.position.copy(point);glow.position.copy(point);
   orb.material.opacity=.95*(1-.4*u);glow.material.opacity=.32*(1-.3*u);
  }
  splash.visible=!plan.strong&&t>=.75&&t<1.19;
  if(splash.visible){const u=clamp((t-.75)/.44);splash.position.copy(to).setY(.07);splash.scale.setScalar(.5+u*2);splash.material.opacity=.7*(1-u);}
  [1,1.7,2.4].forEach((release,i)=>{
   const v=clamp((t-release)/.38),active=plan.strong&&t>=release&&t<=release+.45;
   const strand=strands[i];strand.visible=active;
   if(!active)return;
   const delta=to.clone().sub(from),distance=delta.length();
   if(distance<.001)return;
   const length=distance*Math.max(.015,v);
   strand.position.copy(from).addScaledVector(delta.normalize(),length*.5);
   strand.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta);
   strand.scale.set(1,length,1);
   strand.material.opacity=.86*(1-clamp((t-release-.30)/.15));
  });
  web.visible=plan.strong&&t>=2.4&&t<plan.nativeDuration;
  if(web.visible){
   const grow=clamp((t-2.4)/.36);
   web.position.copy(to);
   web.lookAt(from);web.scale.setScalar(.25+.95*grow);
   webMat.opacity=.83*(1-clamp((t-3.4)/.6));
  }
 }
 function dispose(){if(disposed)return;disposed=true;group.remove(scene);for(const resource of resources)resource.dispose?.();}
 return{update,approach:()=>0,dispose};
}
function frog({actor,plan}){
 const controller=actor.controller,mode=plan.mode,rate=plan.playbackRate||1;
 // Drive the authored bubbles and impact poses with the accelerated arena clock.
 // The normal game-loop update would otherwise double-advance or overwrite them.
 actor.nativePaused=true;let disposed=false;
 return{
  update(seconds){if(disposed)return;controller.seek(mode,Math.min(plan.nativeDuration,Math.max(0,seconds*rate)));},
  approach:()=>0,
  dispose(){if(disposed)return;disposed=true;actor.nativePaused=false;}
 };
}
window.AmphibianArenaFx={caterpillar,frog};
})();
