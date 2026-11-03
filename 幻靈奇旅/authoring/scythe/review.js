/* Stable scythe review: deterministic poses, rigid grip, blade-space air trail. */
(()=>{'use strict';
const names=['上段下斬','轉身換勢','低身橫掃','中段回斬','原地雙旋斬','收勢回架'];
const durations=[.85,.45,.65,.70,1.50,.45],bounds=[0];
for(const d of durations)bounds.push(bounds[bounds.length-1]+d);
const total=bounds[bounds.length-1],comboRate=1.65;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
let state='SwordReady',began=0,from=0,to=total,rate=1,chosen='all',soundOn=true;
let samplers=null,feet=null,lastCue=-1,ctx=null,noise=null,gripMotion=null;
const metrics={revision:21,phase:'預備',rate:1,swishes:0,trailPoints:0,ground:0,grip:null};
const temp=new T.Vector3(),box=new T.Box3(),qa=new T.Quaternion(),qb=new T.Quaternion();

// Write every track on every sample, including unchanged values. Manual wrist
// edits must not accumulate behind the animation mixer's value cache.
function sampler(clip){return clip.tracks.map(track=>{
 const dot=track.name.lastIndexOf('.'),node=hero.getObjectByName(track.name.slice(0,dot));
 return {node,key:track.name.slice(dot+1),read:track.createInterpolant()};
}).filter(t=>t.node);}
function apply(sample,time){for(const t of sample)t.node[t.key].fromArray(t.read.evaluate(time));}
function mix(sample,time,weight){for(const t of sample){
 const value=t.read.evaluate(time);
 if(t.key==='quaternion'){qa.copy(t.node.quaternion);qb.fromArray(value);t.node.quaternion.copy(qa.slerp(qb,weight));}
 else{temp.fromArray(value);t.node[t.key].lerp(temp,weight);}
}}
function prepare(){if(samplers)return;
 samplers={};for(const name of ['Idle','SwordReady','SwordCombo','Walk','Run'])samplers[name]=sampler(clips.find(c=>c.name===name));
 samplers.carry=samplers.SwordReady.filter(t=>/^(upperArmR|forearmR|handR|propR)$/.test(t.node.name));
 feet=[];for(const side of ['L','R'])hero.getObjectByName('foot'+side).traverse(o=>{
  if(o.isMesh&&o.visible){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();feet.push(o);}
 });
 const socket=hero.getObjectByName('propR');socket.add(weapon);
 weapon.position.set(0,0,0);weapon.rotation.set(Math.PI/2,0,0);weapon.scale.setScalar(.70);
 weapon.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
 mixer.stopAllAction();
 apply(samplers.SwordReady,.10);actor.updateMatrixWorld(true);gripMotion=createScytheGripMotion(T,actor,hero,weapon);
}
function ground(){
 actor.position.y=0;actor.updateMatrixWorld(true);let lowest=Infinity;
 for(const o of feet){box.copy(o.geometry.boundingBox);for(let k=0;k<8;k++){
  temp.set(k&1?box.max.x:box.min.x,k&2?box.max.y:box.min.y,k&4?box.max.z:box.min.z).applyMatrix4(o.matrixWorld);lowest=Math.min(lowest,temp.y);
 }}
 if(Number.isFinite(lowest))actor.position.y=.012-lowest;metrics.ground=lowest;actor.updateMatrixWorld(true);
}

// Air-only filtered noise: a soft attack and short tail, without a metallic
// impact or bass thump. Two closely spaced swishes accent the spinning cuts.
function unlockAudio(){
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 ctx??=new Audio();ctx.resume().catch(()=>{});
 if(!noise){noise=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.38),ctx.sampleRate);const data=noise.getChannelData(0);let seed=29;for(let i=0;i<data.length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/4294967296)*2-1;}}
}
function swish(strong){if(!soundOn||!ctx||!noise)return;
 const emit=(offset,gain,pitch)=>{
  const now=ctx.currentTime+offset,src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),volume=ctx.createGain();
  src.buffer=noise;src.playbackRate.value=pitch;filter.type='bandpass';filter.Q.value=.65;
  filter.frequency.setValueAtTime(900,now);filter.frequency.exponentialRampToValueAtTime(4800,now+.065);filter.frequency.exponentialRampToValueAtTime(1300,now+.23);
  volume.gain.setValueAtTime(.0001,now);volume.gain.exponentialRampToValueAtTime(gain,now+.018);volume.gain.exponentialRampToValueAtTime(.0001,now+.25);
  src.connect(filter);filter.connect(volume);volume.connect(ctx.destination);src.start(now);src.stop(now+.29);src.onended=()=>{src.disconnect();filter.disconnect();volume.disconnect();};
 };
 emit(0,strong?.24:.18,1.05);if(strong)emit(.075,.14,1.22);metrics.swishes++;
}

// Fading ribbon sampled from the actual moving blade in world space.
const history=[],capacity=32,positions=new Float32Array((capacity-1)*18),colors=new Float32Array((capacity-1)*18),uvs=new Float32Array((capacity-1)*12);
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('color',new T.BufferAttribute(colors,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('uv',new T.BufferAttribute(uvs,2));
for(let i=0;i<capacity-1;i++)uvs.set([0,0,0,1,1,1,0,0,1,1,1,0],i*12);
const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const brush=glowCanvas.getContext('2d'),fadeAcross=brush.createLinearGradient(0,0,0,64);
fadeAcross.addColorStop(0,'rgba(255,255,255,0)');fadeAcross.addColorStop(.40,'rgba(255,255,255,.18)');fadeAcross.addColorStop(.83,'rgba(255,255,255,.85)');fadeAcross.addColorStop(1,'rgba(255,255,255,0)');brush.fillStyle=fadeAcross;brush.fillRect(0,0,64,64);
const material=new T.MeshBasicMaterial({map:new T.CanvasTexture(glowCanvas),vertexColors:true,transparent:true,opacity:.52,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending});
const ribbon=new T.Mesh(geometry,material);ribbon.name='ScytheBladeAir';ribbon.frustumCulled=false;scene.add(ribbon);geometry.setDrawRange(0,0);
const tip=new T.Vector3(),inner=new T.Vector3();
function clearTrail(){history.length=0;geometry.setDrawRange(0,0);metrics.trailPoints=0;}
function bladeTrail(now,active){
 weapon.updateMatrixWorld(true);tip.set(1.56,.073,0);weapon.localToWorld(tip);inner.set(.26,1.048,0);weapon.localToWorld(inner);
 const last=history[history.length-1],movement=last?tip.distanceTo(last.tip):0;
 if(active&&(!last||movement>.005))history.push({tip:tip.clone(),inner:inner.clone(),time:now});
 while(history.length&&(history.length>capacity||now-history[0].time>.18))history.shift();
 let count=0;
 for(let i=1;i<history.length;i++){
  const a=history[i-1],b=history[i];if(a.tip.distanceTo(b.tip)>.55)continue;
  const points=[a.inner,a.tip,b.tip,a.inner,b.tip,b.inner],alpha=clamp(1-(now-(a.time+b.time)/2)/.18);
  for(const point of points){const k=count*3;positions[k]=point.x;positions[k+1]=point.y;positions[k+2]=point.z;colors[k]=.25*alpha;colors[k+1]=.83*alpha;colors[k+2]=alpha;count++;}
 }
 geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.setDrawRange(0,count);metrics.trailPoints=history.length;
}
function buttons(){document.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b.dataset.action===state));document.querySelectorAll('[data-strike]').forEach(b=>b.classList.toggle('active',state==='attack'&&b.dataset.strike===chosen));}
play=function(name){if(!hero||!mixer)return;prepare();state=name;weapon.visible=state!=='Idle';attack='';began=performance.now();actor.rotation.y=0;actor.position.y=0;clearTrail();buttons();metrics.phase=state;};
strike=function(which){if(!hero||!mixer)return;prepare();unlockAudio();state='attack';weapon.visible=true;attack=which;chosen=which;rate=which==='all'?comboRate:1;began=performance.now();lastCue=-1;
 const i=which==='all'?-1:Number(which)-1;from=i<0?0:bounds[i];to=i<0?total:bounds[i+1];clearTrail();buttons();metrics.rate=rate;
};
function renderPose(now){
 if(!hero||!weapon)return;prepare();const elapsed=Math.max(0,(now-began)/1000);
 actor.rotation.y=0;actor.userData.scytheBodyTurn=0;actor.position.y=0;weapon.visible=state!=='Idle';apply(samplers.SwordReady,.10);
 if(state==='Idle'){
  apply(samplers.Idle,.10);for(const side of ['L','R'])hero.getObjectByName('upperArm'+side).scale.setScalar(1);
  metrics.grip=null;ground();clearTrail();document.querySelector('.hint b').textContent='空手預備';return;
 }
 if(state==='Walk'||state==='Run'){
  const clip=clips.find(c=>c.name===state);apply(samplers[state],elapsed%clip.duration);apply(samplers.carry,.10);metrics.grip=gripMotion.apply(-1,0);ground();bladeTrail(now/1000,false);return;
 }
 if(state!=='attack'){apply(samplers.Idle,.10);metrics.grip=gripMotion.apply(-1,0);ground();bladeTrail(now/1000,false);document.querySelector('.hint b').textContent='單手持鐮 · 刀頭朝前';return;}
 const span=to-from,local=elapsed*rate,fade=.20;
 if(local>=span+fade){play('SwordReady');apply(samplers.SwordReady,.10);metrics.grip=gripMotion.apply(-1,0);ground();bladeTrail(now/1000,false);return;}
 const t=Math.min(to,from+local),phaseTime=Math.min(t,to-1e-6),phase=Math.max(0,bounds.findIndex((v,i)=>i>0&&phaseTime<v)-1);
 const weight=ease(local/fade)*(1-ease((local-span)/fade));
 const sourceTime=t<bounds[4]?t/bounds[4]*1.5:t<bounds[5]?1.5:1.5+(t-bounds[5])/durations[5]*.49;
 mix(samplers.SwordCombo,Math.min(1.99,sourceTime),weight);
 // Keep the scythe wind-up in a controlled body frame; the sword clip's
 // extreme torso twists put the shoulders behind the two-handed grip.
 mix(samplers.Idle.filter(t=>t.node.name==='hips'||t.node.name==='chest'),.10,1);
 const drive=Math.sin(t/total*Math.PI*4)*weight,bend=Math.sin(t/total*Math.PI*2)*weight;
 hero.getObjectByName('hips').rotation.y+=.10*drive;
 const torso=hero.getObjectByName('chest');torso.rotation.y+=.20*drive;torso.rotation.x+=.10*bend;
 // No kick or knee/ankle overrides. Retain the authored connected leg chain.
 const turnAt=x=>4*Math.PI*ease((x-bounds[4])/durations[4]);
 const phaseU=(t-bounds[phase])/durations[phase];
 const bodyTurn=(phase===2?Math.PI*ease(phaseU):phase===3?Math.PI*(1-ease(phaseU/.5)):0)*weight;
 actor.userData.scytheBodyTurn=bodyTurn;
 actor.rotation.y=turnAt(t)-turnAt(from)+bodyTurn;
 metrics.grip=gripMotion.apply(phase,(t-bounds[phase])/durations[phase],weight);
 ground();bladeTrail(now/1000,weight>.18&&phase!==5);
 const soundMarks=[bounds[0]+.52,bounds[2]+.25,bounds[3]+.28,bounds[4]+.28,bounds[4]+1.02];
 for(let i=0;i<soundMarks.length;i++)if(i>lastCue&&soundMarks[i]>=from&&soundMarks[i]<=to&&t>=soundMarks[i]){lastCue=i;swish(i>=3);}
 metrics.phase=names[phase];document.querySelector('.hint b').textContent=(phase+1)+' · '+names[phase]+(chosen==='all'?' / 1.65×':'');
}
poseAttack=renderPose;
const row=document.querySelector('[data-strike="1"]').parentElement;row.replaceChildren();

const all=document.createElement('button');all.dataset.strike='all';all.textContent='完整連段 · 1.65×';all.onclick=()=>strike('all');row.append(all);
const toggle=document.createElement('button');toggle.textContent='刷刷音效：開';toggle.onclick=()=>{soundOn=!soundOn;if(soundOn)unlockAudio();toggle.textContent='刷刷音效：'+(soundOn?'開':'關');};row.append(toggle);
row.previousElementSibling.textContent='鐮刀攻擊';
document.querySelectorAll('[data-action]')[0].textContent='單手預備';document.querySelectorAll('[data-action]')[1].textContent='持鐮預備';
document.querySelector('.panel > p:nth-of-type(2)').textContent='點擊即可完成下斬、換勢、橫掃、回斬與原地雙旋斬。';
document.querySelector('.hint').lastChild.textContent='單手移動 · 雙手連斬';
SCYTHE_HERO.review={metrics,names,total,comboRate,play:name=>play(name),strike:name=>strike(name),seek(seconds){renderPose(began+seconds*1000);scene.updateMatrixWorld(true);}};
})();


