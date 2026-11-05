/* Floating non-modal management window: touch drag, mouse drag, ±size, restore. */
const PAD=8;
export function clampWindowRect(rect,viewport,pad=PAD){
 const availableWidth=Math.max(1,viewport.width-2*pad),availableHeight=Math.max(1,viewport.height-2*pad);
 const minWidth=Math.min(240,availableWidth),minHeight=Math.min(174,availableHeight);
 const width=Math.min(availableWidth,Math.max(minWidth,Number(rect.width)||minWidth));
 const height=Math.min(availableHeight,Math.max(minHeight,Number(rect.height)||minHeight));
 const left=Math.min(viewport.width-pad-width,Math.max(pad,Number(rect.left)||0));
 const top=Math.min(viewport.height-pad-height,Math.max(pad,Number(rect.top)||0));
 return {left,top,width,height};
}
export function defaultWindowRect(viewport){
 const mobile=viewport.width<=700;
 const width=mobile?Math.min(viewport.width-16,Math.max(280,viewport.width*.94)):Math.min(viewport.width-32,650);
 const height=mobile?Math.min(viewport.height-24,Math.max(245,viewport.height*.53)):Math.min(viewport.height-32,Math.max(350,viewport.height*.63));
 return clampWindowRect({left:(viewport.width-width)/2,top:mobile?Math.max(108,viewport.height*.22):(viewport.height-height)/2,width,height},viewport);
}
export function resizeWindowRect(rect,multiplier,viewport){
 const width=rect.width*multiplier,height=rect.height*multiplier;
 return clampWindowRect({width,height,left:rect.left+(rect.width-width)/2,top:rect.top+(rect.height-height)/2},viewport);
}
export function installWindowControls(panel,{onClose=()=>{}}={}){
 const header=panel.querySelector('.panel-head'),minimize=panel.querySelector('#panel-smaller,[data-window="smaller"]'),maximize=panel.querySelector('#panel-larger,[data-window="larger"]'),resetButton=panel.querySelector('#panel-reset,[data-window="reset"]');
 const viewport=()=>({width:window.innerWidth,height:window.innerHeight});
 let geometry=null,drag=null;
 const freshRect=()=>{if(panel.id!=='confirm')return defaultWindowRect(viewport());const v=viewport(),width=Math.min(420,v.width-18),height=Math.min(260,v.height-24);return clampWindowRect({width,height,left:(v.width-width)/2,top:(v.height-height)/2},v);};
 function apply(rect){geometry=clampWindowRect(rect,viewport());for(const [key,value]of Object.entries(geometry))panel.style[key]=Math.round(value)+'px';return {...geometry};}
 function open(){if(!panel.open)panel.show();apply(geometry||freshRect());}
 function close(){if(panel.open)panel.close();onClose();}
 function reset(){apply(freshRect());}
 function resize(multiplier){if(!panel.open)return;apply(resizeWindowRect(geometry||freshRect(),multiplier,viewport()));}
 const down=e=>{
  if(e.button!==0||e.target.closest('button,a,input,select,textarea,[role="button"]')||!panel.open)return;
  e.preventDefault();drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,start:{...geometry}};
  header.setPointerCapture?.(e.pointerId);
 };
 const move=e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();apply({...drag.start,left:drag.start.left+e.clientX-drag.x,top:drag.start.top+e.clientY-drag.y});};
 const release=e=>{if(!drag||drag.pointer!==e.pointerId)return;drag=null;if(header.hasPointerCapture?.(e.pointerId))header.releasePointerCapture(e.pointerId);};
 const onViewportResize=()=>{if(!geometry)return;apply(geometry);};
 const onKeyDown=e=>{if(e.key==='Escape'&&panel.open&&(panel.id==='confirm'||!document.getElementById('confirm')?.open)){e.preventDefault();close();}if(!panel.open||!e.altKey||!e.shiftKey)return;const delta={ArrowLeft:[-22,0],ArrowRight:[22,0],ArrowUp:[0,-22],ArrowDown:[0,22]}[e.key];if(delta){e.preventDefault();apply({...geometry,left:geometry.left+delta[0],top:geometry.top+delta[1]});}};
 header.addEventListener('pointerdown',down);header.addEventListener('pointermove',move);header.addEventListener('pointerup',release);header.addEventListener('pointercancel',release);
 minimize.addEventListener('click',()=>resize(.83));maximize.addEventListener('click',()=>resize(1.20));resetButton.addEventListener('click',reset);
 window.addEventListener('resize',onViewportResize);window.addEventListener('keydown',onKeyDown);
 return {open,close,reset,zoomIn:()=>resize(1.20),zoomOut:()=>resize(.83),get geometry(){return geometry?{...geometry}:null;},
  dispose(){header.removeEventListener('pointerdown',down);header.removeEventListener('pointermove',move);header.removeEventListener('pointerup',release);header.removeEventListener('pointercancel',release);window.removeEventListener('resize',onViewportResize);window.removeEventListener('keydown',onKeyDown);}};
}
