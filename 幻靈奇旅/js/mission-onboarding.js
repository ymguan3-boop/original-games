/* Resumable first-three-mission coach. Completing later work never skips earlier work. */
(()=>{'use strict';
 const controls=['move','roll','lock','berry','throw'];
 let api,card,ring,last='',timer;
 const state=()=>api?.state;
 const flags=()=>state()?.journeyGuide;
 const progress=()=>flags()?.onboarding;
 function prepare(s){
  const f=s.journeyGuide;
  if(!f.onboarding){
   // Preserve already completed second missions from saves made before this coach existed.
   f.onboarding={version:1,taskLocation:false,controls:Object.fromEntries(controls.map(k=>[k,!!f.firstWildCapture])),gym:false,tower:false};
   if(f.firstWildCapture)f.controlsPracticed=true;
  }
  f.onboarding.controls||={};
  if(f.firstWildCapture&&controls.every(k=>f.onboarding.controls[k]))f.controlsPracticed=true;
  return f.onboarding;
 }
 function next(s,c={}){
  const f=s.journeyGuide||{},p=f.onboarding||{controls:{}};
  const starter=s.dreamLabLegendClaimed||f.legacyStarter;
  const second=f.exitedLab&&s.adventureClaimed&&f.outfitEquipped&&f.firstWildCapture&&f.controlsPracticed;
  if(starter&&second&&f.menuViewed)return 'done';
  if(!p.taskLocation)return 'tasks';
  if(!starter)return 'starter';
  if(!f.exitedLab)return 'exit';
  if(!s.adventureClaimed)return 'claim';
  if(!f.outfitEquipped)return 'equip';
  if(!f.controlsPracticed){
   if(c.modal||c.dialog)return 'close-controls';
   const missing=controls.find(k=>!p.controls?.[k]);
   if(missing)return 'control-'+missing;
   if(!f.firstWildCapture)return 'capture';
  }
  if(!f.menuViewed){
   if(c.modal&&c.title!=='旅人手冊'||c.dialog)return 'close-tools';
   if(c.title!=='旅人手冊')return 'menu';
   if(!p.gym)return 'gym';
   if(!p.tower)return 'tower';
   return 'finish';
  }
  return 'done';
 }
 function commit(fn){fn(progress(),flags());api.save();window.PhantomJourneyGuide?.refresh();tick();}
 function context(){return api.context();}
 function visible(selector){const el=document.querySelector(selector);return el&&el.getClientRects().length&&!el.closest('[hidden]')?el:null;}
 function close(){api.closePanels();}
 function specification(step,c){
  const closeSpec={title:'先關閉目前視窗',text:'點右上角的 ×，或按下方按鈕，回到遊戲操作畫面。',selector:c.dialog?'[data-npc="close"]':'#closeModal',action:close,label:'關閉視窗'};
  if(step==='tasks')return{title:'第一步｜找到任務選項',text:'上方工具列最右側的 ✦ 是「冒險任務」。可隨時查看目標與完成獎勵；我們會先從最早未完成的一項開始。',selector:'#journeyTaskBtn',action:()=>commit(p=>p.taskLocation=true),label:'知道了，開始任務引導'};
  if(step==='starter'){
   if(c.modal&&c.title==='大夢研究所 · 選擇初始幻靈')return{title:'選擇你的第一位夥伴',text:'點選大眼蛙、C囝仔或水毛蟲的幻靈球。只可選一位，選好後才會完成這一步。',selector:'.labOption'};
   if(c.dialog)return{title:'與大夢博士挑選幻靈球',text:'點「挑選幻靈球」，再選出陪你出發的夥伴。',selector:'[data-npc="lab_select"]',action:api.chooseStarter,label:'挑選幻靈球'};
   if(c.modal)return closeSpec;
   return{title:'第一步｜選擇初始幻靈球',text:c.inLab?'研究所桌上有三顆幻靈球。點下方按鈕，選一位初始幻靈同行。':'請先回到大夢研究所，抵達後點「進入」，再挑選初始幻靈球。',selector:c.inLab?'#scene':'#portal',action:c.inLab?api.chooseStarter:()=>api.navigate('building','dream_lab'),label:c.inLab?'挑選初始幻靈球':'導航至大夢研究所'};
  }
  if(step==='exit'){
   if(c.modal||c.dialog)return closeSpec;
   return{title:'第二步｜走出研究所',text:'第一位夥伴準備好了！從研究所出口回到初光鎮，去找門外的大夢博士。',selector:'#portal',action:api.leave,label:'走出目前建築'};
  }
  if(step==='claim'){
   if(c.dialog&&visible('[data-npc="adventure"]'))return{title:'向博士領取冒險服',text:'點「領取冒險服」。領取後，我們會帶你開啟衣櫃換裝。',selector:'[data-npc="adventure"]'};
   if(c.modal||c.dialog)return closeSpec;
   return{title:'第二步｜找門外的大夢博士',text:'走近博士會自動開啟對話，再點「領取冒險服」。下方可協助導航。',selector:'#scene',action:()=>api.navigate('npc','prof_daydream'),label:'導航至大夢博士'};
  }
  if(step==='equip'){
   if(c.dialog)return closeSpec;
   if(c.title==='冒險衣櫃')return{title:'換上博士贈送冒險服',text:'找到「博士贈送冒險服」，點右側「換裝」。穿著後會定時吸收場上補給。',selector:'[data-costume="adventure"]'};
   if(c.title==='旅人手冊')return{title:'開啟冒險衣櫃',text:'旅人手冊就是工具選單。現在點「冒險衣櫃」，準備換上剛領取的服裝。',selector:'[data-menu="costume"]'};
   if(c.modal)return closeSpec;
   return{title:'上方工具列｜旅人手冊',text:'左上角 ☰ 是旅人手冊。點這個工具列按鈕，再選「冒險衣櫃」。',selector:'#menuBtn'};
  }
  if(step.startsWith('close-'))return closeSpec;
  const lessons={
   'control-move':['移動按鈕','#joystick','請點擊並拖曳左下角搖桿移動。電腦也可使用 WASD／方向鍵，但請先點一下這個搖桿認識位置。'],
   'control-roll':['翻滾按鈕','#rollBtn','請點一下翻滾按鈕。配合移動方向可閃避；電腦也可使用 Shift。'],
   'control-lock':['鎖定幻靈按鈕','#lockBtn','靠近野生幻靈，點一下鎖定按鈕，讓鏡頭對準目標。'],
   'control-berry':['餵食星露果按鈕','#berryBtn','鎖定幻靈後，點一下星露果按鈕餵食，可提高締約機率。'],
   'control-throw':['投擲靈核球按鈕','#captureBtn','請點締約按鈕投球。第一次有效的野外捕捉必定成功；請先靠近可捕捉的幻靈。']
  };
  if(lessons[step]){const [title,selector,text]=lessons[step];return{title:'認識操作｜'+title,selector,text};}
  if(step==='capture')return{title:'完成你的第一次捕捉',text:'五個按鈕都認識了！現在靠近野生幻靈、鎖定並投球。第一次有效捕捉為 100% 成功；下方可協助繞過建物、靠近目標。',selector:'#captureBtn',action:api.approachWild,label:'協助靠近野生幻靈'};
  if(step==='menu')return{title:'第三步｜認識旅人手冊',text:'再點左上角 ☰ 工具列，我們介紹兩項推薦優先挑戰的玩法。',selector:'#menuBtn'};
  if(step==='gym')return{title:'推薦優先挑戰｜初光挑戰',text:'四大守護者的即時試煉：移動與翻滾閃避，再投球累積信任。通關可解鎖專屬服裝，適合先練習操作。',selector:'[data-menu="gym"]',action:()=>commit(p=>p.gym=true),label:'了解，看看星穹挑戰塔'};
  if(step==='tower')return{title:'推薦優先挑戰｜星穹挑戰塔',text:'使用武器、翻滾與素材強化，迎戰魔物與獨立首領。推薦在熟悉基本操作後優先挑戰！',selector:'[data-menu="tower"]',action:()=>commit(p=>p.tower=true),label:'了解，繼續'};
  if(step==='finish')return{title:'前三步引導完成',text:'其餘就由你自行發覺了!!',selector:'#closeModal',action:()=>{close();commit((p,f)=>f.menuViewed=true);},label:'關閉工具列，開始自由冒險'};
 }
 function ensure(){
  if(card)return;
  card=document.createElement('aside');card.id='missionCoach';card.setAttribute('aria-label','新手任務引導');
  card.innerHTML='<small></small><button type="button" class="coach-toggle" aria-expanded="true">收合提示</button><h3></h3><p aria-live="polite"></p><button type="button" class="coach-action"></button>';
  card.querySelector('.coach-toggle').onclick=()=>{const collapsed=card.classList.toggle('coach-collapsed');const b=card.querySelector('.coach-toggle');b.textContent=collapsed?'展開提示':'收合提示';b.setAttribute('aria-expanded',String(!collapsed));tick();};
  ring=document.createElement('div');ring.id='missionCoachRing';ring.setAttribute('aria-hidden','true');
  document.body.append(ring,card);
 }
 function position(target,c){
  const panel=c.modal?document.querySelector('#modal .panel'):null;
  if(panel){
   const changed=card.parentNode!==panel;
   if(changed)panel.insertBefore(card,document.getElementById('modalBody'));
   card.classList.add('coach-in-modal');
   if(changed&&target?.closest('#modalBody'))target.scrollIntoView({block:'center'});
  }else{
   if(card.parentNode!==document.body)document.body.append(card);
   card.classList.remove('coach-in-modal');
  }
  const w=innerWidth,h=innerHeight,r=target?.getBoundingClientRect();
  ring.hidden=!r||r.width>w*.8&&r.height>h*.6;
  if(!ring.hidden)Object.assign(ring.style,{left:Math.max(2,r.left-4)+'px',top:Math.max(2,r.top-4)+'px',width:Math.min(w-4,r.width+8)+'px',height:Math.min(h-4,r.height+8)+'px'});
  if(panel)return;
  const cw=card.offsetWidth,ch=card.offsetHeight;
  const candidates=[{x:10,y:Math.max(65,h*.3)},{x:w-cw-10,y:Math.max(65,h*.3)},{x:10,y:Math.max(65,h-ch-180)},{x:w-cw-10,y:65}];
  const overlap=p=>{if(!r)return 0;return Math.max(0,Math.min(p.x+cw,r.right)-Math.max(p.x,r.left))*Math.max(0,Math.min(p.y+ch,r.bottom)-Math.max(p.y,r.top));};
  candidates.sort((a,b)=>overlap(a)-overlap(b));
  card.style.left=Math.max(6,candidates[0].x)+'px';card.style.top=Math.max(6,Math.min(h-ch-8,candidates[0].y))+'px';
 }
 function tick(){
  if(!api)return;
  ensure();const c=context();
  if(!window.PhantomControlsReady||document.querySelector('#firstControls[open]')||document.body.dataset.ready!=='true'||c.busy||document.hidden){card.hidden=true;ring.hidden=true;return;}
  const step=next(state(),c);
  if(step==='done'){card.hidden=true;ring.hidden=true;return;}
  const spec=specification(step,c);if(!spec)return;
  card.hidden=false;
  if(last!==step+'|'+c.title+'|'+c.dialog+'|'+c.inLab){
   last=step+'|'+c.title+'|'+c.dialog+'|'+c.inLab;
   card.querySelector('small').textContent=step==='tasks'||step==='starter'?'冒險引導 · 第一步':['menu','gym','tower','finish','close-tools'].includes(step)?'冒險引導 · 第三步':'冒險引導 · 第二步';
   card.querySelector('h3').textContent=spec.title;card.querySelector('p').textContent=spec.text;
   const button=card.querySelector('.coach-action');button.hidden=!spec.action;button.textContent=spec.label||'';button.onclick=spec.action||null;
   const el=visible(spec.selector);if(el?.closest('#modalBody'))el.scrollIntoView({block:'center'});
  }
  position(visible(spec.selector),c);
 }
 function recordControl(name){
  if(!api||!window.PhantomControlsReady||context().busy||context().modal||context().dialog||document.querySelector('#firstControls[open]'))return;
  const p=progress();if(!p||p.controls[name])return;
  commit((p,f)=>{p.controls[name]=true;if(controls.every(k=>p.controls[k])&&f.firstWildCapture)f.controlsPracticed=true;});
 }
 function capture(){if(!api)return;const p=progress();if(controls.every(k=>p.controls[k]))commit((p,f)=>f.controlsPracticed=true);else tick();}
 function init(options){
  api=options;prepare(state());api.save();ensure();
  document.addEventListener('pointerdown',e=>{const ids={joystick:'move',rollBtn:'roll',lockBtn:'lock',berryBtn:'berry',captureBtn:'throw'};const id=e.target.closest('#joystick,button')?.id;if(ids[id])recordControl(ids[id]);},{passive:true,capture:true});
  document.addEventListener('click',e=>{const ids={rollBtn:'roll',lockBtn:'lock',berryBtn:'berry',captureBtn:'throw'};const id=e.target.closest('button')?.id;if(ids[id])recordControl(ids[id]);},true);
  // During the two short menu explanations, clicking the highlighted item advances the explanation instead of leaving it.
  document.addEventListener('click',e=>{const id=e.target.closest('[data-menu]')?.dataset.menu,c=context(),step=next(state(),c);if(step===id&&['gym','tower'].includes(step)){e.preventDefault();e.stopImmediatePropagation();commit(p=>p[step]=true);}},true);
  window.addEventListener('phantom-controls-ready',tick);window.addEventListener('resize',tick);
  clearInterval(timer);timer=setInterval(tick,250);tick();
 }
 function onMenuClosed(){if(api&&context().title==='旅人手冊'&&progress()?.gym&&progress()?.tower&&!flags().menuViewed){flags().menuViewed=true;api.save();window.PhantomJourneyGuide?.refresh();}}
 window.PhantomOnboarding={init,tick,onCapture:capture,onMenuClosed,next,prepare,get active(){return !!api&&next(state(),context())!=='done'},holdLabGreeting:()=>!window.PhantomControlsReady||!progress()?.taskLocation};
})();
