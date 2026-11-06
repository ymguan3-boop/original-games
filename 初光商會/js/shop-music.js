/* 商會音樂：每次開店先播一次主題曲，接著循環店內 BGM。瀏覽器要求先有使用者操作才能出聲，所以在第一次點擊時啟動。 */
const SONG_SEEN='firstlight-shop-theme-played';
export function installShopMusic({enabled}){
 const audio=new Audio();audio.preload='none';let started=false,track='';
 const play=name=>{track=name;audio.src=`./assets/audio/${name}.mp3`;audio.loop=name==='bgm';audio.volume=name==='bgm'?.32:.42;audio.play().catch(()=>{});};
 const firstTrack=()=>{try{if(sessionStorage.getItem(SONG_SEEN))return 'bgm';sessionStorage.setItem(SONG_SEEN,'1');}catch{return 'bgm';}return 'theme';};
 audio.addEventListener('ended',()=>{if(track==='theme')play('bgm');});
 const sync=()=>{if(!started)return;if(!enabled()||document.hidden)audio.pause();else if(audio.src&&audio.paused)audio.play().catch(()=>{});};
 const unlock=()=>{if(started)return;started=true;removeEventListener('pointerdown',unlock);removeEventListener('keydown',unlock);if(enabled())play(firstTrack());};
 addEventListener('pointerdown',unlock);addEventListener('keydown',unlock);document.addEventListener('visibilitychange',sync);
 return{sync,playTheme(){started=true;if(enabled())play('theme');}};
}
