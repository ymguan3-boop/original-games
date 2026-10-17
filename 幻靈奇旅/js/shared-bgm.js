/* One user-supplied soundtrack at a time; gesture-gated mobile playback. */
(()=>{'use strict';
const script=document.currentScript,base=new URL('../assets/audio/',script?.src||location.href),tracks={general:'general.mp3',arena:'arena.mp3',challenge:'challenge.mp3'};
const audio=new Audio();audio.loop=true;audio.preload='metadata';let bgmVolume=27;try{const saved=localStorage.getItem('phantom-bgm-volume');if(saved!==null&&Number.isFinite(+saved))bgmVolume=Math.max(0,Math.min(100,Math.round(+saved)));}catch{}audio.volume=bgmVolume/100;
let scene='general',active='',unlocked=false,ducked=false,muted=false,pending=false,error='';
try{muted=localStorage.getItem('phantom-bgm-muted')==='true';}catch{}
function sync(){if(!unlocked||muted||ducked||document.hidden){audio.pause();return;}const next=tracks[scene]?scene:'general';if(active!==next){audio.pause();audio.src=window.PhantomBgmSources?.[next]||new URL(tracks[next],base).href;active=next;audio.load();}if(audio.paused&&!pending){pending=true;audio.play().then(()=>{error='';if(muted||ducked||document.hidden)audio.pause();}).catch(e=>{error=e.name==='AbortError'?'':e.name;}).finally(()=>{pending=false;if(!error&&audio.paused&&unlocked&&!muted&&!ducked&&!document.hidden)queueMicrotask(sync);});}}
function unlock(){unlocked=true;sync();}
addEventListener('pointerdown',unlock,{passive:true,capture:true});addEventListener('keydown',unlock,true);
document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>audio.pause());
window.PhantomBgm={setScene(value){scene=value;sync();},setVolume(value){const v=Number(value);if(!Number.isFinite(v))return bgmVolume;bgmVolume=Math.max(0,Math.min(100,Math.round(v)));audio.volume=bgmVolume/100;try{localStorage.setItem('phantom-bgm-volume',String(bgmVolume));}catch{}return bgmVolume;},get volume(){return bgmVolume;},setMuted(value){muted=!!value;try{localStorage.setItem('phantom-bgm-muted',String(muted));}catch{}sync();return muted;},toggle(){return this.setMuted(!muted);},setDucked(value){ducked=!!value;sync();},get muted(){return muted;},diagnostics(){return{scene,active,unlocked,muted,ducked,volume:bgmVolume,paused:audio.paused,currentTime:audio.currentTime,src:audio.currentSrc,error};}};
})();
