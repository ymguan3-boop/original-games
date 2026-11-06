/* 商會音樂：這台裝置第一次進店播一次主題曲，之後一律循環純音樂 BGM。音量獨立於操作音效，存在這台裝置上。
   瀏覽器要求先有使用者操作才能出聲，所以在第一次點擊時啟動。 */
const SONG_SEEN='firstlight-shop-theme-played',VOLUME_KEY='firstlight-shop-bgm-volume',DEFAULT_VOLUME=40;
const readVolume=()=>{try{const v=Number(localStorage.getItem(VOLUME_KEY));return localStorage.getItem(VOLUME_KEY)!==null&&v>=0&&v<=100?v:DEFAULT_VOLUME;}catch{return DEFAULT_VOLUME;}};
export function installShopMusic(){
 const audio=new Audio();audio.preload='none';let started=false,track='',volume=readVolume();
 const applyVolume=()=>{audio.volume=volume/100;};
 const play=name=>{track=name;audio.src=`./assets/audio/${name}.mp3`;audio.loop=name==='bgm';applyVolume();audio.play().catch(()=>{});};
 const firstTrack=()=>{try{if(localStorage.getItem(SONG_SEEN))return 'bgm';localStorage.setItem(SONG_SEEN,'1');}catch{return 'bgm';}return 'theme';};
 audio.addEventListener('ended',()=>{if(track==='theme')play('bgm');});
 const sync=()=>{if(!started)return;if(!volume||document.hidden)audio.pause();else if(audio.src&&audio.paused)audio.play().catch(()=>{});else if(!audio.src)play('bgm');};
 const unlock=()=>{if(started)return;started=true;removeEventListener('pointerdown',unlock);removeEventListener('keydown',unlock);if(volume)play(firstTrack());};
 addEventListener('pointerdown',unlock);addEventListener('keydown',unlock);document.addEventListener('visibilitychange',sync);
 return{sync,get volume(){return volume;},setVolume(value){volume=Math.max(0,Math.min(100,Number(value)||0));try{localStorage.setItem(VOLUME_KEY,String(volume));}catch{}applyVolume();sync();},playTheme(){started=true;if(volume)play('theme');}};
}
