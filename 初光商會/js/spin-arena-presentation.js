import {SPIN_TOPS,SPIN_SKILLS,spinTop,spinBonusText} from './spin-arena-config.js?v=20261117-v67';
export const SPIN_SOUND_PROFILES={
 flame:{wave:'sawtooth',from:130,to:48,noise:.65,filter:650,notes:[1,1.5]},
 wind:{wave:'sine',from:470,to:1250,noise:.6,filter:2800,notes:[1,1.33]},
 crystal:{wave:'sine',from:880,to:660,noise:.05,filter:1800,notes:[1,1.25,1.5]},
 thunder:{wave:'square',from:210,to:75,noise:1,filter:3300,notes:[1,2.01]},
 shield:{wave:'sine',from:520,to:780,noise:.06,filter:1500,notes:[1,1.25,1.5,2]},
 shadow:{wave:'triangle',from:1450,to:180,noise:.4,filter:4400,notes:[1,1.07]}
};
Object.assign(SPIN_SOUND_PROFILES,{"frost":{"wave":"sine","from":1400,"to":680,"noise":0.16,"filter":2400,"notes":[1,1.5,2]},"tide":{"wave":"sine","from":210,"to":72,"noise":0.8,"filter":950,"notes":[1,1.33]},"thorn":{"wave":"triangle","from":620,"to":1600,"noise":0.3,"filter":3200,"notes":[1,1.2,1.5]},"terra":{"wave":"square","from":95,"to":38,"noise":0.7,"filter":420,"notes":[1,1.25]},"sun":{"wave":"sawtooth","from":330,"to":990,"noise":0.5,"filter":2200,"notes":[1,1.5,2]},"nebula":{"wave":"sine","from":740,"to":1110,"noise":0.12,"filter":4000,"notes":[1,1.25,1.5,2]}});
export function createSpinAudio(){
 let ctx=null,muted=false,played=0,lastId=null,dead=false;const nodes=new Set();
 async function unlock(){if(dead)return false;try{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)return false;ctx??=new C();if(ctx.state!=='running')await ctx.resume();return ctx.state==='running';}catch{return false;}}
 function stop(){for(const n of nodes){try{n.stop();}catch{}}nodes.clear();}
 function play(id,collision=false){
  const p=SPIN_SOUND_PROFILES[id];if(!p||muted||dead)return;if(ctx?.state!=='running'){unlock().then(ready=>{if(ready&&!muted&&!dead)play(id,collision);});return;}
  const now=ctx.currentTime,duration=collision?.1:.58,master=ctx.createGain();master.gain.setValueAtTime(.001,now);master.gain.linearRampToValueAtTime(collision?.16:.45,now+(collision?.008:.035));master.gain.exponentialRampToValueAtTime(.001,now+duration);master.connect(ctx.destination);
  let remaining=p.notes.length+1;const ended=node=>{nodes.delete(node);if(--remaining===0)master.disconnect();};
  for(const ratio of p.notes){const o=ctx.createOscillator(),gain=ctx.createGain();o.type=p.wave;o.frequency.setValueAtTime((collision?440:p.from)*ratio,now);o.frequency.exponentialRampToValueAtTime(p.to*ratio,now+duration);gain.gain.value=.35/p.notes.length;o.connect(gain);gain.connect(master);nodes.add(o);o.onended=()=>{o.disconnect();gain.disconnect();ended(o);};o.start(now);o.stop(now+duration);}
  const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);let seed=97+SPIN_TOPS.findIndex(t=>t.id===id)*43;
  for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*p.noise;}
  const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter();filter.type=id==='wind'?'bandpass':'lowpass';filter.frequency.value=p.filter;noise.buffer=buffer;noise.connect(filter);filter.connect(master);nodes.add(noise);noise.onended=()=>{noise.disconnect();filter.disconnect();ended(noise);};noise.start(now);noise.stop(now+duration);played++;lastId=id;
 }
 /* 技能專屬音效：蓄力上升音＋屬性和弦＋重低音爆擊＋金屬餘韻 */
 function skill(id){
  const p=SPIN_SOUND_PROFILES[id];if(!p||muted||dead)return;if(ctx?.state!=='running'){unlock().then(ready=>{if(ready&&!muted&&!dead)skill(id);});return;}
  const now=ctx.currentTime,out=ctx.createGain();out.gain.value=.55;out.connect(ctx.destination);const kill=[];
  const tone=(type,f0,f1,t0,dur,vol,dest=out)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,now+t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),now+t0+dur);g.gain.setValueAtTime(.0001,now+t0);g.gain.exponentialRampToValueAtTime(vol,now+t0+Math.min(.04,dur/4));g.gain.exponentialRampToValueAtTime(.0001,now+t0+dur);o.connect(g);g.connect(dest);o.start(now+t0);o.stop(now+t0+dur+.02);kill.push(o);o.onended=()=>{o.disconnect();g.disconnect();};};
  const len=Math.ceil(ctx.sampleRate*.5),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);let seed=131+SPIN_TOPS.findIndex(t=>t.id===id)*17;for(let i=0;i<len;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=(seed/2147483648-1)*(i/len);}
  const riser=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),rg=ctx.createGain();riser.buffer=buf;bp.type='bandpass';bp.Q.value=4;bp.frequency.setValueAtTime(400,now);bp.frequency.exponentialRampToValueAtTime(p.filter*2.2,now+.45);rg.gain.value=.5*p.noise+.15;riser.connect(bp);bp.connect(rg);rg.connect(out);riser.start(now);riser.stop(now+.5);kill.push(riser);riser.onended=()=>{riser.disconnect();bp.disconnect();rg.disconnect();};
  for(const ratio of p.notes)tone(p.wave,p.from*ratio*.5,p.to*ratio,.05,.42,.12/p.notes.length+.05);
  tone('sine',110,32,.46,.55,.9);tone('triangle',p.from*2,p.from*4,.48,.25,.12);
  for(let k=0;k<3;k++)tone('sine',1600+k*640,1200+k*500,.5+k*.03,.6,.05);
  for(const n of kill)nodes.add(n);setTimeout(()=>{for(const n of kill)nodes.delete(n);out.disconnect();},1300);played++;lastId=id;
 }
 /* 熱血對戰 BGM：158 BPM 小調搖滾，程式即時合成（不需另外下載音檔），可循環 */
 /* 暴擊音：金屬高音＋重擊；爆裂時加長碎裂聲 */
 function crit(burst=false){if(muted||dead)return;if(ctx?.state!=='running'){unlock().then(ready=>{if(ready&&!muted&&!dead)crit(burst);});return;}
  const now=ctx.currentTime,out=ctx.createGain();out.gain.value=.6;out.connect(ctx.destination);const list=[];
  const tone=(type,f0,f1,t0,dur,vol)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f0,now+t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),now+t0+dur);g.gain.setValueAtTime(vol,now+t0);g.gain.exponentialRampToValueAtTime(.0001,now+t0+dur);o.connect(g);g.connect(out);o.start(now+t0);o.stop(now+t0+dur+.02);list.push(o);o.onended=()=>{o.disconnect();g.disconnect();};};
  tone('square',2400,1800,0,.12,.18);tone('triangle',3600,2900,.01,.18,.1);tone('sine',140,40,0,.32,.9);
  if(burst){const len=Math.ceil(ctx.sampleRate*.7),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);let sd=991;for(let i=0;i<len;i++){sd=(Math.imul(sd,1664525)+1013904223)>>>0;d[i]=(sd/2147483648-1)*(1-i/len)**2;}const src=ctx.createBufferSource(),hp=ctx.createBiquadFilter();src.buffer=buf;hp.type='highpass';hp.frequency.value=1200;src.connect(hp);hp.connect(out);src.start(now+.02);list.push(src);src.onended=()=>{src.disconnect();hp.disconnect();};for(let k=0;k<4;k++)tone('sine',1800+k*700,900+k*300,.05+k*.06,.3,.08);}
  for(const n of list)nodes.add(n);setTimeout(()=>{for(const n of list)nodes.delete(n);out.disconnect();},1200);played++;}
 let music=null;
 function startMusic(){
  if(music||muted||dead)return;if(ctx?.state!=='running'){unlock().then(ready=>{if(ready&&!muted&&!dead)startMusic();});return;}
  const bus=ctx.createGain(),comp=ctx.createDynamicsCompressor();bus.gain.setValueAtTime(.0001,ctx.currentTime);bus.gain.exponentialRampToValueAtTime(.2,ctx.currentTime+.6);bus.connect(comp);comp.connect(ctx.destination);
  const nb=ctx.createBuffer(1,ctx.sampleRate*.25,ctx.sampleRate),nd=nb.getChannelData(0);let sd=7;for(let i=0;i<nd.length;i++){sd=(Math.imul(sd,1664525)+1013904223)>>>0;nd[i]=sd/2147483648-1;}
  const step=60/158/4,E2=82.41,root=[0,0,3,0,5,0,7,10, 0,0,3,0,5,7,10,12],chords=[[0,7,12],[0,7,12],[-4,3,8],[-2,5,10]],lead=[12,15,17,19,17,15,12,10, 12,15,19,22,24,22,19,17];
  let next=ctx.currentTime+.08,n=0;
  const hz=(base,semi)=>base*2**(semi/12);
  const note=(type,f,t,dur,vol,cut=2400)=>{const o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();o.type=type;o.frequency.value=f;lp.type='lowpass';lp.frequency.value=cut;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(lp);lp.connect(g);g.connect(bus);o.start(t);o.stop(t+dur+.02);o.onended=()=>{o.disconnect();lp.disconnect();g.disconnect();};};
  const noise=(t,dur,vol,type,f)=>{const src=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=nb;fl.type=type;fl.frequency.value=f;g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);src.connect(fl);fl.connect(g);g.connect(bus);src.start(t);src.stop(t+dur+.02);src.onended=()=>{src.disconnect();fl.disconnect();g.disconnect();};};
  const kick=t=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(150,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(.9,t);g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.18);o.onended=()=>{o.disconnect();g.disconnect();};};
  const tick=()=>{if(!music)return;while(next<ctx.currentTime+.25){const i=n%16,bar=Math.floor(n/16)%4,ch=chords[bar];
    if(i%4===0||i===10)kick(next);if(i===4||i===12)noise(next,.16,.5,'bandpass',1800);if(i%2===0)noise(next,.04,.16,'highpass',7000);
    note('sawtooth',hz(E2,root[i]+ch[0]),next,step*.9,.22,700);
    if(i%8===0)for(const c of ch)note('sawtooth',hz(E2*2,c),next,step*7.5,.06,1800);
    if(bar>=2&&i%2===0)note('square',hz(E2*4,lead[(i+bar*3)%16]+ch[0]),next,step*1.8,.05,3200);
    next+=step;n++;}};
  music={bus,comp,timer:setInterval(tick,60)};tick();
 }
 function stopMusic(){if(!music)return;const m=music;music=null;clearInterval(m.timer);try{m.bus.gain.cancelScheduledValues(ctx.currentTime);m.bus.gain.setValueAtTime(m.bus.gain.value,ctx.currentTime);m.bus.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.35);}catch{}setTimeout(()=>{m.bus.disconnect();m.comp.disconnect();},500);}
 return {unlock,play,skill,crit,startMusic,stopMusic,stop,setMuted(value){muted=!!value;if(muted){stop();stopMusic();}},get musicPlaying(){return !!music;},get metrics(){return {state:ctx?.state||'locked',played,lastId,voices:nodes.size,muted,music:!!music};},dispose(){if(dead)return;dead=true;stop();stopMusic();ctx?.close().catch(()=>{});}};
}
export function createSpinPresentation(stage,audio){
 const el=document.createElement('div');el.className='spin-cutin';el.hidden=true;el.setAttribute('role','status');
 el.innerHTML='<div class="spin-cutin-ribbon"></div><img alt=""><div class="spin-cutin-title"><small></small><strong></strong></div><p></p>';stage.append(el);
 const art=el.querySelector('img'),small=el.querySelector('small'),title=el.querySelector('strong'),description=el.querySelector('p');let key=null,hitKey=null;
 // Warm the illustrations while the energy gauge fills, not during the cut-in.
 const images=new Map();function prepare(ids){for(const id of ids){if(!id||images.has(id))continue;const img=new Image();img.src=new URL(`../assets/spin-arena/${SPIN_TOPS.findIndex(t=>t.id===id)>=6?'cards-v63':'cards-v61'}/${id}.webp`,import.meta.url).href;images.set(id,img);}}
 function update(match,extraTime=0){
  prepare([match.topId,match.opponentTopId]);const hit=match.effects?.findLast(fx=>fx.kind==='hit');if(hit){const next=`${match.id}:${match.round}:${hit.id}`;if(hitKey!==next){hitKey=next;if(match.time-hit.at<.25){if(hit.crit)audio.crit(false);else audio.play(match.topId,true);}}}const cue=match.cutin;
  if(!cue){el.hidden=true;key=null;return;}
  const top=spinTop(cue.topId),skill=SPIN_SKILLS[cue.topId];if(!top||!skill)return;
  const nextKey=`${match.id}:${match.round}:${cue.id}`;
  if(key!==nextKey){key=nextKey;art.src=images.get(cue.topId).src;art.alt=top.name;small.textContent=`${cue.actor?'對手':'我方'} · ${top.name}`;title.textContent=top.skill;description.textContent=`${spinBonusText(skill.bonuses)} · ${skill.seconds}秒`;el.style.setProperty('--skill-color','#'+top.color.toString(16).padStart(6,'0'));audio.skill(cue.topId);}
  const progress=Math.min(1,(cue.elapsed+extraTime)/cue.duration),offset=progress<.18?-110*(1-progress/.18):progress>.8?110*((progress-.8)/.2):0;
  el.style.transform=`translateX(${offset}%)`;el.style.opacity=progress>.95?String((1-progress)/.05):'1';el.hidden=false;
 }
 return {update,element:el,dispose(){el.remove();images.clear();audio.stop();}};
}
