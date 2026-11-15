import {SPIN_TOPS,SPIN_SKILLS,spinTop,spinBonusText} from './spin-arena-config.js?v=20261115-v61';
export const SPIN_SOUND_PROFILES={
 flame:{wave:'sawtooth',from:130,to:48,noise:.65,filter:650,notes:[1,1.5]},
 wind:{wave:'sine',from:470,to:1250,noise:.6,filter:2800,notes:[1,1.33]},
 crystal:{wave:'sine',from:880,to:660,noise:.05,filter:1800,notes:[1,1.25,1.5]},
 thunder:{wave:'square',from:210,to:75,noise:1,filter:3300,notes:[1,2.01]},
 shield:{wave:'sine',from:520,to:780,noise:.06,filter:1500,notes:[1,1.25,1.5,2]},
 shadow:{wave:'triangle',from:1450,to:180,noise:.4,filter:4400,notes:[1,1.07]}
};
export function createSpinAudio(){
 let ctx=null,muted=false,played=0,lastId=null,dead=false;const nodes=new Set();
 function unlock(){if(dead)return;try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return;ctx??=new C();if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{}}
 function stop(){for(const n of nodes){try{n.stop();}catch{}}nodes.clear();}
 function play(id){
  const p=SPIN_SOUND_PROFILES[id];if(!p||muted||dead||ctx?.state!=='running')return;
  const now=ctx.currentTime,duration=.58,master=ctx.createGain();master.gain.setValueAtTime(.001,now);master.gain.linearRampToValueAtTime(.075,now+.035);master.gain.exponentialRampToValueAtTime(.001,now+duration);master.connect(ctx.destination);
  let remaining=p.notes.length+1;const ended=node=>{nodes.delete(node);if(--remaining===0)master.disconnect();};
  for(const ratio of p.notes){const o=ctx.createOscillator(),gain=ctx.createGain();o.type=p.wave;o.frequency.setValueAtTime(p.from*ratio,now);o.frequency.exponentialRampToValueAtTime(p.to*ratio,now+duration);gain.gain.value=.35/p.notes.length;o.connect(gain);gain.connect(master);nodes.add(o);o.onended=()=>{o.disconnect();gain.disconnect();ended(o);};o.start(now);o.stop(now+duration);}
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);let seed=97+SPIN_TOPS.findIndex(t=>t.id===id)*43;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*p.noise;}
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();filter.type=id==='wind'?'bandpass':'lowpass';filter.frequency.value=p.filter;noise.buffer=buffer;noise.connect(filter);filter.connect(master);nodes.add(noise);noise.onended=()=>{noise.disconnect();filter.disconnect();ended(noise);};noise.start(now);noise.stop(now+duration);played++;lastId=id;
 }
 return {unlock,play,stop,setMuted(value){muted=!!value;if(muted)stop();},get metrics(){return {state:ctx?.state||'locked',played,lastId,voices:nodes.size,muted};},dispose(){if(dead)return;dead=true;stop();ctx?.close().catch(()=>{});}};
}
export function createSpinPresentation(stage,audio){
 const el=document.createElement('div');el.className='spin-cutin';el.hidden=true;el.setAttribute('role','status');
 el.innerHTML='<div class="spin-cutin-ribbon"></div><img alt=""><div class="spin-cutin-title"><small></small><strong></strong></div><p></p>';stage.append(el);
 const art=el.querySelector('img'),small=el.querySelector('small'),title=el.querySelector('strong'),description=el.querySelector('p');let key=null;
 // Warm the illustrations while the energy gauge fills, not during the cut-in.
 const images=new Map();function prepare(ids){for(const id of ids){if(!id||images.has(id))continue;const img=new Image();img.src=new URL(`../assets/spin-arena/cards-v61/${id}.webp`,import.meta.url).href;images.set(id,img);}}
 function update(match,extraTime=0){
  prepare([match.topId,match.opponentTopId]);const cue=match.cutin;
  if(!cue){el.hidden=true;key=null;return;}
  const top=spinTop(cue.topId),skill=SPIN_SKILLS[cue.topId];if(!top||!skill)return;
  const nextKey=`${match.id}:${match.round}:${cue.id}`;
  if(key!==nextKey){key=nextKey;art.src=images.get(cue.topId).src;art.alt=top.name;small.textContent=`${cue.actor?'對手':'我方'} · ${top.name}`;title.textContent=top.skill;description.textContent=`${spinBonusText(skill.bonuses)} · ${skill.seconds}秒`;el.style.setProperty('--skill-color','#'+top.color.toString(16).padStart(6,'0'));audio.play(cue.topId);}
  const progress=Math.min(1,(cue.elapsed+extraTime)/cue.duration),offset=progress<.18?-110*(1-progress/.18):progress>.8?110*((progress-.8)/.2):0;
  el.style.transform=`translateX(${offset}%)`;el.style.opacity=progress>.95?String((1-progress)/.05):'1';el.hidden=false;
 }
 return {update,element:el,dispose(){el.remove();images.clear();audio.stop();}};
}
