/* Review animation: use the game's existing two-hand grip tracks and weapon socket. */
(()=>{'use strict';
let readyAction,comboAction,active='ready',sequenceStart=0,rangeStart=0,rangeEnd=0,lastAudioEvent=-1;
const names=['上段揮斬','轉身換勢','低身橫掃','踢擊轉勢','中段回斬','旋身連斬','再次旋斬','收勢回架'],times=[.72,.55,.66,.58,.60,.80,.80,.55];
const boundaries=[0];for(const duration of times)boundaries.push(boundaries[boundaries.length-1]+duration);const total=boundaries[boundaries.length-1];
const sounds=['sword-normal.ogg','sword-combo.ogg','sword-normal.ogg','knife-normal.ogg','sword-combo.ogg','sword-combo.ogg','sword-final.ogg',null];
const soundPool=sounds.map(file=>file?new Audio('../../assets/audio/weapons-v19/'+file):null);let soundOn=true;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x)};
// Roll the wrists together about the shaft, anticipating each next cut. The
// sequence ends at its initial angle, avoiding a flip when the loop restarts.
const wristAxis=new T.Vector3(0,0,1),bendAxis=new T.Vector3(1,0,0);
let soleMeshes=null;const soleBox=new T.Box3(),solePoint=new T.Vector3();
function groundFeet(){
 if(!soleMeshes){soleMeshes=[];for(const side of ['L','R'])hero.getObjectByName('foot'+side).traverse(o=>{if(o.isMesh&&o.visible){if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();soleMeshes.push(o);}});}
 actor.position.y=0;actor.updateMatrixWorld(true);let lowest=Infinity;
 for(const o of soleMeshes){soleBox.copy(o.geometry.boundingBox);for(let k=0;k<8;k++){solePoint.set(k&1?soleBox.max.x:soleBox.min.x,k&2?soleBox.max.y:soleBox.min.y,k&4?soleBox.max.z:soleBox.min.z).applyMatrix4(o.matrixWorld);lowest=Math.min(lowest,solePoint.y);}}
 if(Number.isFinite(lowest))actor.position.y=.015-lowest;
}
function orientGrip(angle){
 const socket=hero.getObjectByName('propR'),right=hero.getObjectByName('handR'),left=hero.getObjectByName('handL');
 hero.updateMatrixWorld(true);const anchor=socket.getWorldPosition(new T.Vector3());
 const q=new T.Quaternion().setFromAxisAngle(wristAxis,angle);
 right.quaternion.multiply(q);left.quaternion.multiply(q);
 hero.updateMatrixWorld(true);socket.position.copy(socket.parent.worldToLocal(anchor));
}
function attach(){
 const socket=hero.getObjectByName('propR');if(!socket)throw Error('找不到雙手握持掛點');
 if(weapon.parent!==socket){socket.add(weapon);weapon.position.set(0,0,0);weapon.rotation.set(Math.PI/2,0,0);weapon.scale.setScalar(.70);}
}
function runClip(name){
 const clip=clips.find(c=>c.name===name);if(!clip)return;
 mixer.stopAllAction();const a=mixer.clipAction(clip);a.enabled=true;a.reset();a.setEffectiveWeight(1);a.setEffectiveTimeScale(1);a.play();current=a;return a;
}
// The walk/run lower body keeps moving while the ready pose controls both arms and socket.
function carryClip(name){
 const locomotion=clips.find(c=>c.name===name),ready=clips.find(c=>c.name==='SwordReady');
 const selected=t=>/^(upperArm[LR]|forearm[LR]|hand[LR]|propR)\./.test(t.name);
 const tracks=locomotion.tracks.filter(t=>!selected(t)).map(t=>t.clone());
 for(const track of ready.tracks.filter(selected)){const t=track.clone(),values=t.values.slice(0,t.getValueSize());t.times=new Float32Array([0,locomotion.duration]);t.values=new Float32Array([...values,...values]);tracks.push(t);}
 return new T.AnimationClip('Carry'+name,locomotion.duration,tracks);
}
play=function(name){
 if(!mixer)return;attach();attack='';actor.rotation.y=0;actor.position.y=0;weapon.rotation.set(Math.PI/2,0,0);
 const actionName=(name==='Idle'||name==='SwordReady')?'SwordReady':name;
 if(name==='Walk'||name==='Run'){let c=clips.find(x=>x.name==='Carry'+name);if(!c){c=carryClip(name);clips.push(c)}runClip('Carry'+name);}else runClip(actionName);
 active='ready';document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.action===name));document.querySelector('.hint b').textContent='雙手持鐮預備';
};
strike=function(which){
 if(!mixer)return;attach();attack=which;active=which;sequenceStart=performance.now();attackStart=sequenceStart;lastAudioEvent=-1;actor.rotation.y=0;
 const index=which==='all'?-1:Number(which)-1;rangeStart=index<0?0:boundaries[index];rangeEnd=index<0?total:boundaries[index+1];
 mixer.stopAllAction();readyAction=mixer.clipAction(clips.find(c=>c.name==='SwordReady'));comboAction=mixer.clipAction(clips.find(c=>c.name==='SwordCombo'));
 readyAction.reset().play();readyAction.paused=true;readyAction.time=0;comboAction.reset().play();comboAction.paused=true;
 document.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.strike===which));
};
poseAttack=function(now){
 if(!attack||!hero)return;const elapsed=Math.max(0,(now-sequenceStart)/1000),span=rangeEnd-rangeStart;
 if(elapsed>=span+.24){play('SwordReady');return;}
 const t=Math.min(rangeEnd,rangeStart+elapsed),phaseTime=Math.min(t,rangeEnd-1e-6),n=Math.max(0,boundaries.findIndex((v,i)=>i>0&&phaseTime<v)-1);
 // Both actions remain active. Blend into and out of the single uninterrupted
 // two-handed motion; the segment labels do not reset or slow the pose.
 const blend=ease(elapsed/.24)*(1-ease((elapsed-span)/.24));
 readyAction.weight=1-blend;comboAction.weight=blend;
 comboAction.time=Math.min(1.99,1.99*t/total);mixer.update(0);
 // One smooth wrist rotation over the entire phrase rather than per-hit stops.
 orientGrip(-.65*Math.sin(Math.PI*2*t/total)*blend);
 weapon.rotation.set(Math.PI/2,0,0);
 // Rotations are continuous at both turns; 4π and zero are the same orientation.
 const turnAt=x=>4*Math.PI*ease((x-boundaries[5])/(boundaries[7]-boundaries[5]));
 actor.rotation.y=turnAt(t)-turnAt(rangeStart);
 if(t>=boundaries[3]&&t<boundaries[4]){
  // Lift at the hip, bend the knee forward, and counter-rotate the ankle.
  // Add rotations in joint-local coordinates to the existing parented rig.
  const kick=Math.sin(Math.PI*(t-boundaries[3])/times[3])*blend,joint=(name,angle)=>{const o=hero.getObjectByName(name);if(o)o.quaternion.multiply(new T.Quaternion().setFromAxisAngle(bendAxis,angle*kick));};
  joint('thighR',-.42);joint('shinR',.62);joint('footR',-.20);
 }
 groundFeet();
 if(n!==lastAudioEvent&&t>=boundaries[n]+times[n]*.3){lastAudioEvent=n;if(soundOn&&soundPool[n]){const sound=soundPool[n];sound.currentTime=0;sound.volume=n>=5?.65:.48;sound.play().catch(()=>{});}}
 document.querySelector('.hint b').textContent=(n+1)+' · '+names[n];
};
document.querySelector('.hint').lastChild.textContent='雙手握柄 · 主角全身帶動鐮刀';
document.querySelectorAll('[data-action]')[0].textContent='雙手預備';document.querySelectorAll('[data-action]')[1].textContent='持鐮預備';
const row=document.querySelector('[data-strike="1"]').parentElement;row.replaceChildren();
names.forEach((name,i)=>{const b=document.createElement('button');b.dataset.strike=String(i+1);b.textContent=(i+1)+' '+name;b.onclick=()=>strike(b.dataset.strike);row.append(b)});
const all=document.createElement('button');all.dataset.strike='all';all.textContent='完整連段';all.onclick=()=>strike('all');row.append(all);
const toggle=document.createElement('button');toggle.textContent='音效：開';toggle.onclick=()=>{soundOn=!soundOn;toggle.textContent='音效：'+(soundOn?'開':'關')};row.append(toggle);
row.previousElementSibling.textContent='影片參考 · 八段連擊示意';
const description=document.querySelector('.panel > p:nth-of-type(2)');if(description)description.textContent='參考影片的高低段、踢擊及連續旋身；音效使用遊戲現有刀風與重擊聲。';
})();
