/* Shared, event-driven loading progress. Percent is a phase estimate, never a timer. */
(()=>{'use strict';let active=false,shown=0,label='正在載入場景',started=0,finished=0,overlay=null,hideTimer=0;const history=[];
 function mount(){if(!document.body)return null;if(!overlay){overlay=document.createElement('section');overlay.id='sceneLoading';overlay.hidden=true;overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');overlay.innerHTML='<div class="scene-loading-card"><small>LOADING</small><strong></strong><div class="scene-loading-track" role="progressbar" aria-label="場景讀取進度" aria-valuemin="0" aria-valuemax="100"><i></i></div><p></p></div>';document.body.append(overlay);}return overlay;}
 function draw(){if(!mount())return;const percent=Math.round(shown*100),description=label+' · '+(started?'素材 '+finished+' / '+started+' 項 · ':'')+percent+'%';overlay.hidden=false;overlay.classList.toggle('compact',!active);overlay.setAttribute('aria-label',description);overlay.title=description;overlay.querySelector('strong').textContent=label;overlay.querySelector('i').style.width=percent+'%';const bar=overlay.querySelector('[role=progressbar]');bar.setAttribute('aria-valuenow',percent);bar.setAttribute('aria-valuetext',description);overlay.querySelector('p').textContent=percent+'%';}
 function begin(text){clearTimeout(hideTimer);active=true;shown=0;started=finished=0;label=text||'正在載入場景';history.push({label,start:performance.now()});draw();}
 function stage(text,fraction){label=text||label;shown=Math.max(shown,Math.min(.97,Number(fraction)||0));if(active)draw();}
 function end(){if(!overlay)return;shown=1;draw();active=false;const last=history.at(-1);if(last&&!last.end)last.end=performance.now();clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(overlay&&!active)overlay.hidden=true;},180);}
 function fail(text){label=text||'讀取失敗，請重新整理重試';active=false;clearTimeout(hideTimer);draw();}
 function install(){const m=globalThis.THREE?.DefaultLoadingManager;if(!m||m.__phantomProgress)return;m.__phantomProgress=true;const start=m.itemStart.bind(m),endItem=m.itemEnd.bind(m);m.itemStart=url=>{if(!active&&finished===started){started=finished=0;shown=0;}started++;clearTimeout(hideTimer);if(!active)label='正在載入模型與特效';draw();start(url);};m.itemEnd=url=>{finished++;shown=Math.max(shown,Math.min(.92,finished/Math.max(1,started)*.9));draw();endItem(url);if(!active&&finished>=started){shown=1;draw();hideTimer=setTimeout(()=>{if(!active)overlay.hidden=true;},180);}};}
 globalThis.PhantomLoading={begin,stage,end,fail,install,get active(){return active;},diagnostics:()=>({active,started,finished,progress:shown,label,history:history.slice(-20)})};
 document.addEventListener('DOMContentLoaded',()=>{install();if(active)draw();});install();
 addEventListener('pageshow',event=>{if(event.persisted){active=false;clearTimeout(hideTimer);if(overlay)overlay.hidden=true;}});
})();

/* Full-scene handoff. Deliberately independent from the tiny in-play progress widget. */
(()=>{'use strict';
 const KEY='phantom-scene-handoff-v1';let node=null,epoch=0,current=null,slowTimer=0;
 const raf=()=>new Promise(resolve=>requestAnimationFrame(resolve));
 async function paint(){await raf();await raf();}
 function mount(){
  if(node||!document.body)return node;
  node=document.createElement('dialog');node.id='sceneTransition';node.setAttribute('aria-labelledby','sceneTransitionTitle');node.setAttribute('aria-describedby','sceneTransitionHint');
  node.innerHTML='<div class="scene-transition-sky" aria-hidden="true"><i></i><i></i><i></i></div><div class="scene-transition-content"><div class="scene-transition-orbit" aria-hidden="true"><i></i><b>✦</b><span></span></div><small>PHANTOM JOURNEY</small><h2 id="sceneTransitionTitle"></h2><p id="sceneTransitionHint">正在整理旅途，請稍候片刻</p><div class="scene-transition-actions" hidden><button type="button" data-transition-retry>重新載入</button><button type="button" data-transition-close>返回上一畫面</button></div></div>';
  node.addEventListener('cancel',e=>{e.preventDefault();if(current?.error)dismiss();});
  node.querySelector('[data-transition-close]').onclick=dismiss;
  node.querySelector('[data-transition-retry]').onclick=()=>{const retry=current?.retry;if(current?.error&&retry){dismiss();retry();}else location.reload();};
  document.body.append(node);return node;
 }
 function show(){if(!mount()||!current)return;node.classList.remove('is-leaving','has-error');node.querySelector('h2').textContent=current.label;node.querySelector('p').textContent='正在整理旅途，請稍候片刻';node.querySelector('.scene-transition-actions').hidden=true;if(!node.open)node.showModal();}
 function begin(label='正在準備下一段旅程',options={}){
  clearTimeout(slowTimer);current={id:++epoch,label,start:performance.now(),retry:options.retry,error:false};show();
  const id=current.id;slowTimer=setTimeout(()=>{if(current?.id===id&&node){node.querySelector('p').textContent='素材仍在讀取中，首次進入可能需要較久';node.querySelector('.scene-transition-actions').hidden=false;}},20000);return id;
 }
 async function finish(id=current?.id){
  if(!current||current.id!==id)return;await paint();if(current?.id!==id)return;
  clearTimeout(slowTimer);node?.classList.add('is-leaving');await new Promise(resolve=>{setTimeout(resolve,180);});if(current?.id===id)dismiss();
 }
 function dismiss(){++epoch;clearTimeout(slowTimer);if(node?.open)node.close();current=null;try{sessionStorage.removeItem(KEY);}catch{}}
 function fail(error,retry){if(!current)begin('旅途準備尚未完成');current.error=true;if(retry)current.retry=retry;clearTimeout(slowTimer);show();node?.classList.add('has-error');if(node){node.querySelector('p').textContent=typeof error==='string'?error:(error?.message||'讀取失敗，請重試');node.querySelector('.scene-transition-actions').hidden=false;}}
 async function run(label,work){const id=begin(label,{retry:()=>run(label,work).catch(()=>{})});await paint();try{const result=await work();await finish(id);return result;}catch(error){if(current?.id===id)fail(error);throw error;}}
 async function navigate(url,label='正在前往下一段旅程'){
  const destination=new URL(url,document.baseURI);if(destination.origin!==location.origin){location.assign(destination.href);return;}
  begin(label);await paint();try{sessionStorage.setItem(KEY,JSON.stringify({label,to:destination.pathname,at:Date.now()}));}catch{}location.assign(destination.href);
 }
 globalThis.PhantomTransition={begin,finish,fail,dismiss,run,navigate,paint,get active(){return !!current;},diagnostics:()=>current?{label:current.label,error:current.error,elapsed:performance.now()-current.start}:null};
 try{const pending=JSON.parse(sessionStorage.getItem(KEY)||'null');sessionStorage.removeItem(KEY);if(pending&&Date.now()-pending.at<60000&&pending.to===location.pathname)begin(pending.label);}catch{}
 document.addEventListener('DOMContentLoaded',()=>{if(current)show();});
 addEventListener('pageshow',e=>{if(e.persisted)dismiss();});
})();
