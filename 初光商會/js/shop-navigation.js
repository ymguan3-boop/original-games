export const SHOP_LEVEL_KEY='firstlight-commerce-level-v1';
export function resolveGameReturn(href){
 const here=new URL(href),base=new URL(here);
 if(['shop','初光商會'].includes(decodeURIComponent(base.pathname.split('/').at(-1)||'')))base.pathname+='/';
 const directory=new URL('./',base),parts=directory.pathname.split('/').filter(Boolean);
 const shopName=decodeURIComponent(parts.at(-1)||'');
 const parent=new URL('../',directory),fallback=new URL(shopName==='shop'?(here.searchParams.get('guest')==='1'?'game/guest/':'game/'):'幻靈奇旅/',parent);
 const allowed=['game/','game/guest/','幻靈奇旅/'].flatMap(name=>{const root=new URL(name,parent);return [root.pathname,new URL('index.html',root).pathname];});
 const raw=here.searchParams.get('return');if(!raw)return fallback.href;
 try{const target=new URL(raw,here);if(!['http:','https:'].includes(target.protocol)||target.origin!==here.origin||target.username||target.password||!allowed.includes(target.pathname))return fallback.href;target.search='';target.hash='';return target.href;}catch{return fallback.href;}
}
export function watchShopLevel(game,storage,now=Date.now,onError=()=>{}){
 let writtenLevel;
 const publish=()=>{const level=game.state.level;if(!Number.isInteger(level)||level<1||level>5||writtenLevel===level)return;writtenLevel=level;try{storage.setItem(SHOP_LEVEL_KEY,JSON.stringify({level,updatedAt:now()}));}catch(error){onError(error);}};
 publish();const unsubscribe=game.subscribe(publish);return unsubscribe;
}
export function installShopNavigation({game,storage=globalThis.localStorage,document=globalThis.document,location=globalThis.location,onError=()=>{},navigate=url=>location.assign(url),paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))}){
 const stop=watchShopLevel(game,storage,Date.now,onError),button=document.getElementById('return-to-game'),overlay=document.getElementById('return-loading');let leaving=false;
 // 只有一顆返回鍵：手機放在資訊列，電腦放在標題列，都不會蓋到其他面板。
 const mobileBar=document.querySelector('.mobile-strip');
 const topbar=document.querySelector('.topbar'),patrol=document.getElementById('camera-mode'),mobileSettings=mobileBar?.querySelector('[data-panel="settings"]'),desktopSettings=topbar?.querySelector('.time-controls [data-panel="settings"]');
 const updateHeaderBottom=()=>{if(topbar)document.documentElement.style.setProperty('--shop-header-bottom',Math.ceil(topbar.getBoundingClientRect().bottom)+'px');};
 const reposition=()=>{if(!mobileBar)return;const mobile=window.matchMedia('(max-width:700px)').matches;
  if(mobile&&button.parentNode!==mobileBar)mobileBar.append(button);
  else if(!mobile&&button.parentNode!==topbar)topbar.querySelector('.brand').after(button);
  button.textContent='← 初光鎮';
  if(patrol){const target=mobile?mobileSettings:desktopSettings;if(target&&patrol.previousElementSibling!==target)target.after(patrol);}
  updateHeaderBottom();};
 const headerObserver=typeof ResizeObserver!=='undefined'&&topbar?new ResizeObserver(updateHeaderBottom):null;
 headerObserver?.observe(topbar);window.addEventListener('resize',reposition);reposition();
 const go=async()=>{if(leaving)return;leaving=true;button.disabled=true;
  const result=game.act('save');if(!result.ok){leaving=false;button.disabled=false;onError(new Error(result.message));return;}
  overlay.hidden=false;overlay.setAttribute('aria-busy','true');
  try{await paint();navigate(resolveGameReturn(location.href));}catch(error){leaving=false;button.disabled=false;overlay.hidden=true;overlay.setAttribute('aria-busy','false');onError(error);}
 };
 button.addEventListener('click',go);
 return {get leaving(){return leaving;},dispose(){stop();headerObserver?.disconnect();window.removeEventListener('resize',reposition);button.removeEventListener('click',go);}};
}
