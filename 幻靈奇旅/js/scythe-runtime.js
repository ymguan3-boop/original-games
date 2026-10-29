/* Shared scythe presentation. Damage and inventory belong to the scene adapter. */
(function(global){'use strict';
const durations=[.85,.45,.65,.70,1.50,.45],bounds=[0];for(const d of durations)bounds.push(bounds[bounds.length-1]+d);
const rate=1.65,total=bounds[6],timings=[.52,1.55,2.23,2.93,3.67].map(t=>t/rate);
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
function create(options){
 const {THREE:T,model,clips,weapon}=options;
 if(!T||!model||!weapon||typeof global.createScytheGripMotion!=='function')throw new Error('Scythe requires Three, a hero, a weapon, and scythe-motion.js');
 const v=new T.Vector3(),qa=new T.Quaternion(),qb=new T.Quaternion(),baseQ=model.quaternion.clone(),outputQ=baseQ.clone();
 const samplers={};for(const name of ['Idle','SwordReady','SwordCombo','Walk','Run']){
  const clip=clips.find(c=>c.name===name);if(!clip)throw new Error('Missing scythe hero animation: '+name);
  samplers[name]=clip.tracks.map(track=>{const dot=track.name.lastIndexOf('.');return {node:model.getObjectByName(track.name.slice(0,dot)),key:track.name.slice(dot+1),read:track.createInterpolant()};}).filter(t=>t.node);
 }
 samplers.carry=samplers.SwordReady.filter(t=>/^(upperArmR|forearmR|handR|propR)$/.test(t.node.name));
 // Restore only properties still equal to our last overlay. An ordinary mixer
 // may cache constant tracks; leave newly written animated properties untouched.
 const remembered=[],seen=new Set();for(const list of Object.values(samplers))for(const track of list){const key=track.node.uuid+'.'+track.key;if(track.node===model||seen.has(key))continue;seen.add(key);remembered.push({node:track.node,key:track.key,before:track.node[track.key].clone(),after:track.node[track.key].clone()});}
 let poseOverlay=false;
 function clearPoseOverlay(){if(!poseOverlay)return;for(const record of remembered){const current=record.node[record.key];if(current.equals(record.after))current.copy(record.before);}poseOverlay=false;}
 function rememberPose(){for(const record of remembered)record.before.copy(record.node[record.key]);}
 function finishPose(){for(const record of remembered)record.after.copy(record.node[record.key]);poseOverlay=true;}
 const torsoRest=samplers.Idle.filter(t=>t.node.name==='hips'||t.node.name==='chest');
 function sample(list,time,weight=1){for(const t of list){const values=t.read.evaluate(time);if(weight===1)t.node[t.key].fromArray(values);else if(t.key==='quaternion'){qa.copy(t.node.quaternion);qb.fromArray(values);t.node.quaternion.copy(qa.slerp(qb,weight));}else t.node[t.key].lerp(v.fromArray(values),weight);}}
 // The grip controller works in the unscaled hero's native coordinate system.
 const grip=global.createScytheGripMotion(T,model,model,weapon);
 weapon.traverse(n=>{if(n.isMesh){n.castShadow=true;n.frustumCulled=false;}});grip.control.visible=false;
 let elapsed=0,clock=0,attacking=false,lastAttack=false,lastId,lastCue=-1,disposed=false,activeBefore=false;
 const metrics={phase:'hidden',grip:null,swishes:0,trailPoints:0,attacking:false,active:false,elapsed:0};
 // A pooled blade ribbon, attached outside the spinning model.
 const capacity=32,history=Array.from({length:capacity},()=>({tip:new T.Vector3(),inner:new T.Vector3(),time:0}));let head=0,count=0;
 const positions=new Float32Array((capacity-1)*18),colors=new Float32Array((capacity-1)*18),uvs=new Float32Array((capacity-1)*12);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));for(let i=0;i<capacity-1;i++)uvs.set([0,0,0,1,1,1,0,0,1,1,1,0],i*12);
 const pixels=new Uint8Array(64*4);for(let i=0;i<64;i++){pixels[i*4]=pixels[i*4+1]=pixels[i*4+2]=255;const t=i/63;pixels[i*4+3]=Math.round(255*Math.max(0,1-Math.abs((t-.70)/.30)));}
 const texture=new T.DataTexture(pixels,1,64,T.RGBAFormat);texture.needsUpdate=true;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;
 const material=new T.MeshBasicMaterial({map:texture,vertexColors:true,transparent:true,opacity:.52,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
 const ribbon=new T.Mesh(geometry,material);ribbon.name='ScytheBladeAir';ribbon.frustumCulled=false;let world=model;while(world.parent)world=world.parent;world.add(ribbon);geometry.setDrawRange(0,0);
 const tip=new T.Vector3(),inner=new T.Vector3(),local=new T.Vector3();
 function clearTrail(){count=0;head=0;geometry.setDrawRange(0,0);metrics.trailPoints=0;}
 function trail(active){weapon.updateMatrixWorld(true);weapon.localToWorld(tip.set(1.56,.073,0));weapon.localToWorld(inner.set(.26,1.048,0));const scale=model.getWorldScale(v).x,last=count?history[(head+count-1)%capacity]:null;if(active&&(!last||tip.distanceTo(last.tip)>.005*scale)){if(count===capacity){head=(head+1)%capacity;count--;}const item=history[(head+count++)%capacity];item.tip.copy(tip);item.inner.copy(inner);item.time=clock;}
  while(count&&clock-history[head].time>.18){head=(head+1)%capacity;count--;}
  let vertices=0;for(let i=1;i<count;i++){const a=history[(head+i-1)%capacity],b=history[(head+i)%capacity];if(a.tip.distanceTo(b.tip)>.55*scale)continue;const alpha=clamp(1-(clock-(a.time+b.time)/2)/.18);for(const point of [a.inner,a.tip,b.tip,a.inner,b.tip,b.inner]){world.worldToLocal(local.copy(point));const k=vertices++*3;positions[k]=local.x;positions[k+1]=local.y;positions[k+2]=local.z;colors[k]=.25*alpha;colors[k+1]=.83*alpha;colors[k+2]=alpha;}}
  geometry.attributes.position.needsUpdate=geometry.attributes.color.needsUpdate=true;geometry.setDrawRange(0,vertices);metrics.trailPoints=count;
 }
 let context=null,noise=null;const sounds=new Set();
 function swish(strong,sound){if(sound===false||options.sound===false||(options.volume??1)<=0)return;const Audio=global.AudioContext||global.webkitAudioContext;if(!Audio)return;
  try{if(!context){context=new Audio();noise=context.createBuffer(1,Math.ceil(context.sampleRate*.38),context.sampleRate);const data=noise.getChannelData(0);let seed=29;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=seed/4294967296*2-1;}}if(context.state==='suspended')context.resume().catch(()=>{});
   const emit=(offset,gain,pitch)=>{const now=context.currentTime+offset,src=context.createBufferSource(),filter=context.createBiquadFilter(),volume=context.createGain();src.buffer=noise;src.playbackRate.value=pitch;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(900,now);filter.frequency.exponentialRampToValueAtTime(4800,now+.065);filter.frequency.exponentialRampToValueAtTime(1300,now+.23);volume.gain.setValueAtTime(.0001,now);volume.gain.exponentialRampToValueAtTime(gain*Math.max(0,Math.min(1,options.volume??1)),now+.018);volume.gain.exponentialRampToValueAtTime(.0001,now+.25);src.connect(filter);filter.connect(volume);volume.connect(context.destination);const record={src,filter,volume};sounds.add(record);src.onended=()=>{src.disconnect();filter.disconnect();volume.disconnect();sounds.delete(record);};src.start(now);src.stop(now+.29);};emit(0,strong?.24:.18,1.05);if(strong)emit(.075,.14,1.22);metrics.swishes++;
  }catch(_){} }
 function restoreHeading(){if(model.quaternion.angleTo(outputQ)>1e-7)baseQ.copy(model.quaternion);model.quaternion.copy(baseQ);model.userData.scytheBodyTurn=0;outputQ.copy(baseQ);}
 function update(dt,state={}){if(disposed)return metrics;clearPoseOverlay();restoreHeading();clock+=Math.max(0,Math.min(.1,dt||0));const enabled=!!state.enabled,motion=state.motion||'Idle',blocked=/^(Throw|Roll|Hurt|Death|Wave|Celebrate|JumpCelebrate|Disappointed|GroundPoundDisappointed|Attack)/.test(motion);
  if(!enabled||blocked){attacking=false;lastAttack=!!state.attack;lastId=state.attackId;grip.control.visible=false;if(activeBefore)grip.reset();activeBefore=false;clearTrail();metrics.phase=blocked?motion:'hidden';metrics.grip=null;metrics.attacking=false;metrics.active=false;return metrics;}
  if(state.cancel)attacking=false;activeBefore=true;grip.control.visible=true;rememberPose();
  if(state.attack&&(!lastAttack||state.attackId!==lastId)){attacking=true;elapsed=0;lastCue=-1;clearTrail();}
  lastAttack=!!state.attack;lastId=state.attackId;
  if(attacking){elapsed+=Math.max(0,Math.min(.1,dt||0));if(elapsed>=total/rate)attacking=false;}
  if(!attacking){grip.reset();const name=motion==='Walk'||motion==='Run'?motion:'Idle',clip=clips.find(c=>c.name===name);sample(samplers[name],clock%clip.duration);sample(samplers.carry,.10);metrics.grip=grip.apply(-1,0);metrics.phase=name;trail(false);}
  else{sample(samplers.SwordReady,.10);const t=Math.min(total,elapsed*rate),phase=Math.max(0,bounds.findIndex((b,i)=>i>0&&t<b)-1),u=(t-bounds[phase])/durations[phase],weight=ease(t/.20),source=t<bounds[4]?t/bounds[4]*1.5:t<bounds[5]?1.5:1.5+(t-bounds[5])/durations[5]*.49;
   sample(samplers.SwordCombo,Math.min(1.99,source),weight);sample(torsoRest,.10);const drive=Math.sin(t/total*Math.PI*4)*weight,bend=Math.sin(t/total*Math.PI*2)*weight;model.getObjectByName('hips').rotation.y+=.10*drive;const chest=model.getObjectByName('chest');chest.rotation.y+=.20*drive;chest.rotation.x+=.10*bend;
   const bodyTurn=(phase===2?Math.PI*ease(u):phase===3?Math.PI*(1-ease(u/.5)):0)*weight;model.userData.scytheBodyTurn=bodyTurn;model.quaternion.copy(baseQ).multiply(qb.setFromAxisAngle(v.set(0,1,0),4*Math.PI*ease((t-bounds[4])/durations[4])+bodyTurn));outputQ.copy(model.quaternion);metrics.grip=grip.apply(phase,u,weight);metrics.phase=phase;trail(weight>.18&&phase!==5);for(let i=0;i<timings.length;i++)if(i>lastCue&&elapsed>=timings[i]){lastCue=i;swish(i>=3,state.sound);}
  }
  finishPose();outputQ.copy(model.quaternion);metrics.attacking=attacking;metrics.active=attacking;metrics.elapsed=elapsed;return metrics;
 }
 function dispose(){if(disposed)return;clearPoseOverlay();restoreHeading();disposed=true;grip.dispose();ribbon.parent?.remove(ribbon);geometry.dispose();material.dispose();texture.dispose();for(const {src,filter,volume}of sounds){src.onended=null;try{src.stop();}catch(_){}src.disconnect();filter.disconnect();volume.disconnect();}sounds.clear();if(context)context.close().catch(()=>{});noise=null;clearTrail();}
 return {update,dispose,metrics,totalDuration:4.6/rate,timings:timings.slice(),hitTimes:timings.slice(),control:grip.control};
}
global.PhantomScythe={create,totalDuration:4.6/rate,timings:timings.slice(),hitTimes:timings.slice()};
})(globalThis);
