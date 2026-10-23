/* 幻靈奇旅｜冒險任務清單：雷達下方小按鈕，所有新手任務與一次性獎勵共用既有存檔。 */
(()=>{'use strict';
 const Rules=window.PhantomGameRules;
 let api=null,button=null,panel=null,opened=false,lastMarkup='';
 const tasks=[
  {id:'starter',title:'第一步｜選擇初始幻靈',detail:'在大夢研究所與大夢博士互動，從大眼蛙、C囝仔、水毛蟲中挑選第一位夥伴。',reward:['pokeballs',10,'靈核球']},
  {id:'exit',title:'第一步｜走出研究所',detail:'由研究所出口回到初光鎮，正式展開冒險。',reward:['greatBallCount',5,'高階靈核球']},
  {id:'claim',title:'第二步｜領取冒險服',detail:'到大夢研究所門口找大夢博士對話，點「領取冒險服」。',action:'導航至大夢博士',reward:['greatBallCount',10,'高階靈核球']},
  {id:'equip',title:'第二步｜換上冒險服',detail:'旅人手冊 → 冒險衣櫃，選「博士贈送冒險服」並換裝。',action:'開啟冒險衣櫃',reward:['berryCount',10,'星露果']},
  {id:'capture',title:'第二步｜首次野外締約',detail:'回到初光鎮，使用「鎖定」對準野生幻靈，再按「締約」投出靈核球並成功捕捉。',reward:['greatBallCount',5,'高階靈核球']},
  {id:'tools',title:'第三步｜認識工具列',detail:'開啟旅人手冊，認識圖鑑、隊伍、背包、衣櫃、道館、挑戰塔、設定；場景有移動、鎖定、締約、換球、星露果、翻滾與雷達。',action:'查看旅人手冊',reward:['pokeballs',10,'靈核球']},
  {id:'collect30',title:'第四步｜圖鑑達 30%',detail:'累積 18／58 種不同的一般幻靈圖鑑卡片。重複捕捉同一種類不增加種類數。',reward:['masterBallCount',10,'星耀靈核球']},
  {id:'arena',title:'第四步｜完成幻靈競技',detail:'編滿三位不同的已締約幻靈，找到擂台訓練家，完成一場 3 對 3 競技擂台（勝敗皆計）。',action:'導航至擂台訓練家',reward:['masterBallCount',10,'星耀靈核球']},
  {id:'collect50',title:'第五步｜圖鑑達 50%',detail:'累積 29／58 種不同的一般幻靈圖鑑卡片。',reward:['masterBallCount',10,'星耀靈核球']},
  {id:'tower',title:'第五步｜挑戰星穹挑戰塔',detail:'進入挑戰塔，實際選擇魔物關卡並開始戰鬥才算完成；只進入塔內不算。',action:'導航至星穹挑戰塔',reward:['masterBallCount',10,'星耀靈核球']}
 ];
 const flags=()=>api?.state?.journeyGuide;
 const count=()=>{const p=api?.progress?.()||{owned:0,total:Rules.mainSpeciesCount};return{owned:p.owned||0,total:p.total||Rules.mainSpeciesCount};};
 function finished(id,p=count()){
  const f=flags(),s=api?.state||{};
  switch(id){
   case 'starter':return !!s.dreamLabLegendClaimed||!!f?.legacyStarter;
   case 'exit':return !!f?.exitedLab;
   case 'claim':return !!s.adventureClaimed;
   case 'equip':return !!f?.outfitEquipped;
   case 'capture':return !!f?.firstWildCapture;
   case 'tools':return !!f?.menuViewed;
   case 'collect30':return p.owned>=Rules.countAt(p.total,Rules.thresholds.tutorialArena);
   case 'arena':return !!f?.arenaFinished;
   case 'collect50':return p.owned>=Rules.countAt(p.total,Rules.thresholds.tutorialTower);
   case 'tower':return !!f?.towerEntered;
   default:return false;
  }
 }
 function rewardSync(notify=false){
  const f=flags();if(!f?.enabled)return;
  if(!f.rewardsClaimed||typeof f.rewardsClaimed!=='object'||Array.isArray(f.rewardsClaimed))f.rewardsClaimed={};
  const p=count(),paid=[];
  for(const task of tasks){
   if(!finished(task.id,p)||f.rewardsClaimed[task.id])continue;
   const [field,amount,label]=task.reward;
   // 標記與數量必須在同一份遊戲存檔中保存，防止重新載入或重複回呼重複獎勵。
   f.rewardsClaimed[task.id]=true;
   api.state[field]=Math.max(0,Math.floor(Number(api.state[field])||0))+amount;
   paid.push(label+' ×'+amount);
  }
  if(paid.length){
   api.save();
   if(notify)api.notice('任務完成！獎勵已入背包：'+paid.slice(0,2).join('、')+(paid.length>2?' 等 '+paid.length+' 項':''));
  }
 }
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function ensure(){
  if(button)return;
  button=document.createElement('button');button.id='journeyTaskBtn';button.type='button';
  button.setAttribute('aria-controls','journeyGuide');button.setAttribute('aria-expanded','false');
  button.setAttribute('aria-label','開啟冒險任務清單');document.body.append(button);
  panel=document.createElement('aside');panel.id='journeyGuide';panel.setAttribute('role','region');
  panel.setAttribute('aria-label','冒險任務清單');panel.hidden=true;document.body.append(panel);
  button.addEventListener('click',()=>{opened=!opened;refresh();});
  panel.addEventListener('click',e=>{
   const control=e.target.closest('button[data-journey]');if(!control)return;
   const mode=control.dataset.journey;
   if(mode==='close'){opened=false;refresh();return;}
   if(mode==='action')perform(control.dataset.task);
  });
  document.addEventListener('pointerdown',e=>{
   if(opened&&!button.contains(e.target)&&!panel.contains(e.target)){opened=false;refresh();}
  });
  document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){opened=false;refresh();button.focus();}});
  window.addEventListener('resize',refresh);
 }
 function layout(){
  const radar=document.getElementById('radar');
  const rect=radar?.getBoundingClientRect();
  const top=Math.max(68,(rect?.bottom||105)+7);
  button.style.top=top+'px';
  if(rect)button.style.right=Math.max(7,window.innerWidth-rect.right)+'px';
  const panelTop=Math.round(top+button.getBoundingClientRect().height+7);
  panel.style.top=panelTop+'px';
  panel.style.right=button.style.right;
  panel.style.maxHeight=Math.max(124,Math.min(window.innerHeight*.64,window.innerHeight-panelTop-16))+'px';
 }
 function perform(id){
  if(!api||api.blocked()||finished(id))return;
  if(id==='claim'){
   if(api.inLab())api.notice('靠近大夢博士，對話後點「領取冒險服」。');
   else api.navigate('npc','prof_daydream');
  }else if(id==='equip'){opened=false;api.showCostumes();}
  else if(id==='tools'){opened=false;api.showMenu();}
  else if(id==='arena'){
   if(api.inBuilding())api.notice('請先離開建築物，再導航至擂台訓練家。');
   else api.navigate('npc','arena_coach');
  }else if(id==='tower'){
   if(api.inBuilding())api.notice('請先離開建築物，再導航至挑戰塔。');
   else api.navigate('building','tower_starspire');
  }
  refresh();
 }
 function refresh(){
  if(!api)return;
  ensure();rewardSync(false);
  // 不再在地圖中央浮現教學卡片；戰鬥、對話及選單期間隱藏清單。
  if(api.blocked()){opened=false;button.hidden=true;panel.hidden=true;return;}
  button.hidden=false;
  const p=count(),done=tasks.filter(t=>finished(t.id,p)).length;
  const current=tasks.find(t=>!finished(t.id,p));
  button.innerHTML='✦ 任務清單 <span>'+done+'/'+tasks.length+'</span>';
  button.setAttribute('aria-expanded',String(opened));
  button.setAttribute('aria-label','冒險任務清單，已完成 '+done+' / '+tasks.length+'，'+(opened?'收合':'展開'));
  layout();
  panel.hidden=!opened;
  if(!opened)return;
  let markup='<header><div><strong>冒險任務</strong><small>已完成 '+done+' / '+tasks.length+' 項 · 完成自動發獎</small></div><button type="button" data-journey="close" aria-label="關閉任務清單">×</button></header><ol class="journeyTasks">';
  for(const task of tasks){
   const doneTask=finished(task.id,p),active=task===current;
   const reward=task.reward[2]+' ×'+task.reward[1];
   markup+='<li class="'+(doneTask?'is-done':active?'is-current':'is-later')+'"><div class="journeyTaskLine"><span class="journeyMark" aria-hidden="true">'+(doneTask?'✓':active?'✦':'·')+'</span><b>'+esc(task.title)+'</b></div>'+
    '<small class="journeyReward">'+(doneTask?'已獲獎勵：':'完成獎勵：')+esc(reward)+'</small>'+
    (active?'<p>'+esc(task.detail)+'</p>':'')+
    (active&&task.id==='collect30'||active&&task.id==='collect50'?'<div class="journeyProgress"><i style="width:'+Math.min(100,Math.round(100*p.owned/p.total))+'%"></i></div><small>圖鑑 '+p.owned+' / '+p.total+' 種</small>':'')+
    (active&&task.action?'<button class="journeyGo" type="button" data-journey="action" data-task="'+task.id+'">'+esc(task.action)+'</button>':'')+'</li>';
  }
  markup+='</ol>'+(done===tasks.length?'<p class="journeyAllDone">✦ 所有冒險任務完成！</p>':'')+'<small class="journeyFoot">完成任務後獎勵立即存入本機背包，不必手動領取，亦不能重複領取。</small>';
  if(markup!==lastMarkup){const scroll=panel.scrollTop;panel.innerHTML=markup;panel.scrollTop=scroll;lastMarkup=markup;}
 }
 function record(name){
  const f=flags();if(!f||f[name])return;
  f[name]=true;api.save();rewardSync(true);refresh();
 }
 function init(options){
  api=options;
  let f=flags();
  if(!f){
   const captures=options.state.captureCounts||{};
   const prior=Object.entries(captures).some(([id,n])=>id!==options.state.dreamLabLegendChoice&&Number(n)>0);
   f={enabled:true,exitedLab:!options.inLab()&&!!options.state.dreamLabLegendClaimed,outfitEquipped:options.state.costume==='adventure',firstWildCapture:prior,menuViewed:false,arenaFinished:false,towerEntered:false,rewardsClaimed:{}};
   // 舊制遊戲可能已有多種圖鑑卻沒有「三選一」紀錄；不修改原本的研究所領取旗標。
   if(!options.newPlayer&&!options.state.dreamLabLegendClaimed&&count().owned>1)f.legacyStarter=true;
   api.state.journeyGuide=f;api.save();
  }
  f.enabled=true;
  if(!f.rewardsClaimed||typeof f.rewardsClaimed!=='object')f.rewardsClaimed={};
  ensure();rewardSync(false);refresh();
  setInterval(()=>{if(!document.hidden)refresh();},1500);
 }
 // 教學全文已整合至任務清單；旅人手冊不額外插入大型教學段落。
 function menuHelpHtml(){return '';}
 window.PhantomJourneyGuide={init,refresh,
  onLabExit(){record('exitedLab');},
  onCostume(id){if(id==='adventure')record('outfitEquipped');else refresh();},
  onWildCapture(){record('firstWildCapture');},
  onMenuOpened(){if(flags()?.firstWildCapture)record('menuViewed');else refresh();},
  onArenaFinished(){record('arenaFinished');},
  onTowerChallengeStarted(){record('towerEntered');},
  menuHelpHtml,get stage(){return tasks.find(t=>!finished(t.id))?.id||'done';}
 };
})();