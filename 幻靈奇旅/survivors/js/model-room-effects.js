// Reuse the model room's authored SpiritVfx scripts; no alternate cave artwork.
export function modelRoomPlan(actor,plan,strong=false){
 if(actor.id==='mewtwo'||/water-dragon-king\.glb$/.test(actor.path||'')){const mode=strong?'Ultimate':'Attack',duration=actor.actions?.[mode]?.getClip?.().duration||(strong?5.8:1.9);return{...plan,mode,duration,playbackRate:1,authored:true,releaseFraction:(strong?2.9:.75)/duration};}
 if(actor.id==='pikachu'){const mode=strong?'Ultimate':'Attack',duration=actor.actions?.[mode]?.getClip?.().duration||(strong?3.6333333333333333:2.433333333333333);return{...plan,mode,duration,playbackRate:1,authored:true,releaseFraction:.38};}
 const clip=actor.actions?.[plan.mode]?.getClip?.();
 return {...plan,duration:plan.procedural?(plan.duration||.55):(clip?.duration||plan.nativeDuration||plan.duration||.65),playbackRate:1};
}
export function originalPresentation(actor,plan){return !!(actor.controller||actor.outomanFx||actor.duoFx||actor.guanpangFx||plan.nativeFx||globalThis.SpiritVfx?.has(actor.path));}
export function createModelRoomEffect(T,scene,actor,strong,target,metrics){
 if(!globalThis.SpiritVfx?.has(actor.path))return null;
 const group=new T.Group();group.name='cave-model-room-'+actor.id;scene.add(group);
 const proxy={root:new T.Object3D(),worldSize:new T.Vector3(.8,2,.8)};
 let clock=0,disposed=false,cleanup=null,cleaned=false;const jobs=[],scheduled=[],originalScale=actor.object.scale.clone();
 const refresh=()=>{const p=target();if(p){proxy.root.position.set(p.x,0,p.z);proxy.worldSize.set(p.width||.8,p.height||2,p.width||.8);}};refresh();
 actor.root.updateMatrixWorld(true);
 const runtime=SpiritVfx.script({T,path:actor.path,strong,attacker:{root:actor.root,object:actor.object,worldSize:new T.Vector3(actor.height*.6,actor.height,actor.height*.6),height:actor.height,path:actor.path,actions:actor.actions},defender:proxy,group,now:()=>clock,schedule:(delay,fn)=>{if(!disposed)scheduled.push({at:clock+delay,fn});},add:(duration,update,done)=>{if(!disposed&&jobs.length<256)jobs.push({start:clock,duration,update,done});},sound:()=>{},color:actor.color});
 cleanup=jobs[0]?.done;const clean=()=>{if(cleaned)return;cleaned=true;cleanup?.();};if(jobs[0])jobs[0].done=clean;
 function dispose(){if(disposed)return;disposed=true;clean();actor.object.scale.copy(originalScale);group.clear();scene.remove(group);jobs.length=0;scheduled.length=0;}
 return {total:runtime.total,group,dispose,update(dt){if(disposed)return;clock+=Math.max(0,dt);refresh();for(let i=scheduled.length-1;i>=0;i--){if(scheduled[i].at<=clock){const task=scheduled.splice(i,1)[0];task.fn();}}runtime.update(Math.min(clock,runtime.total));
   if(clock<=runtime.total){const delta=proxy.root.position.clone().sub(actor.root.position).setY(0),distance=delta.length(),gap=Math.max(1.2,Math.min(3.2,.3*actor.height+.35*proxy.worldSize.y+.6));if(distance>.001)actor.root.position.addScaledVector(delta.normalize(),Math.max(0,distance-gap)*(runtime.approach?.(clock)||0));const pose=runtime.pose?.(clock);if(pose){actor.root.position.y+=pose.y;actor.object.scale.set(originalScale.x*(1+pose.sq),originalScale.y*(1-pose.sq),originalScale.z*(1+pose.sq));}}
   else actor.object.scale.copy(originalScale);
   for(let i=jobs.length-1;i>=0;i--){const j=jobs[i];if(!j)continue;const u=Math.min(1,Math.max(0,(clock-j.start)/j.duration));j.update(u,u*j.duration);if(u>=1){j.done?.();jobs.splice(i,1);}}
   metrics.scriptClock=clock;metrics.scriptMeshes=group.children.length;if(clock>runtime.total+3.1)dispose();
 }};
}
