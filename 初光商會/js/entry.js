import {restoreMerchantGuest,sharePortraitGuest} from '../../幻靈奇旅/survivors/js/merchant-guest.js?v=20261111-meadow-v2';
restoreMerchantGuest();sharePortraitGuest();
/* 商會只有直立場景。電腦使用同一份直立文件預覽，不啟動另一個 renderer。 */
const params=new URLSearchParams(location.search),is2D=params.get('view')==='2d'&&params.has('shopDev')&&['localhost','127.0.0.1'].includes(location.hostname)||(()=>{try{return localStorage.getItem('firstlight-shop-view')==='2d';}catch{return false;}})();
const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
if(!is2D&&!mobile&&!params.has('portraitFrame')&&innerWidth>innerHeight){
 document.body.className='portrait-preview';document.body.replaceChildren();
 const frame=document.createElement('iframe'),url=new URL(location.href);url.searchParams.set('portraitFrame','1');frame.src=url.href;frame.title='初光商會直立手機預覽';frame.allow='fullscreen';frame.dataset.merchantPreview='true';
 Object.assign(document.body.style,{margin:'0',height:'100dvh',display:'grid',placeItems:'center',background:'#26352d',overflow:'hidden'});
 Object.assign(frame.style,{width:'min(440px, calc((100dvh - 16px) * 9 / 16))',height:'calc(100dvh - 16px)',border:'0',borderRadius:'18px',boxShadow:'0 8px 40px #0006'});document.body.append(frame);
}else{
 const gate=document.createElement('aside');gate.id='portrait-gate';gate.hidden=true;gate.setAttribute('role','status');gate.innerHTML='<div aria-hidden="true">↻</div><strong>請將手機轉為直立</strong><p>初光商會採用直立畫面遊玩</p>';document.body.append(gate);
 const orient=()=>{const blocked=!is2D&&innerWidth>innerHeight;gate.hidden=!blocked;document.body.classList.toggle('orientation-blocked',blocked);};
 addEventListener('resize',orient);orient();await import('./app.js?v=20261114-v50');
}
