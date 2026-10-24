/* 幻靈奇旅｜冒險任務清單：雷達下方小按鈕，所有新手任務與一次性獎勵共用既有存檔。 */
(()=>{'use strict';
 const Rules=window.PhantomGameRules;
 const GYM_STAGES=Object.freeze([{id:'gym_1',name:'雷電奔襲'},{id:'gym_2',name:'紫波滾動'},{id:'gym_3',name:'木頭人驚跳'},{id:'gym_4',name:'光鳳破綻'}]);
 const gymCompleted=()=>GYM_STAGES.filter(g=>api?.state?.gyms?.[g.id]?.cleared).length;
 let api=null,button=null,panel=null,opened=false,selectedTask='',lastMarkup='';
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
  {id:'gym',title:'第五步｜初光道館四大守護者',detail:'前往初光道館進行「初光挑戰」，分別擊敗雷電奔襲、紫波滾動、木頭人驚跳、光鳳破綻四大守護者。四項試煉全部通關可立即獲得星耀靈核球 ×30；已通關紀錄直接計入，不需重打。',action:'導航至初光道館',reward:['masterBallCount',30,'星耀靈核球']},
  {id:'tower',title:'第五步｜挑戰星穹挑戰塔',detail:'進入挑戰塔，實際選擇魔物關卡並開始戰鬥才算完成；只進入塔內不算。',action:'導航至星穹挑戰塔',reward:['masterBallCount',10,'星耀靈核球']},
  {id:'cave-fishing',cave:true,title:'第六步｜河畔釣魚擂台獲勝3場',detail:'河畔釣魚的3對3挑戰累積獲勝3場，獲得洞穴1000點。完成後沿北側橋梁前往探索山洞。',action:'導航至河畔對戰處',reward:['cavePoints',1000,'洞穴點數']},
  {id:'cave-enter',cave:true,title:'第六步｜探索無盡洞穴',detail:'前往北側橋梁盡頭的探索山洞，進入初光無盡洞穴。點數可用於召喚、道具與永久武器，三種靈核球與主遊戲共用。',action:'導航至探索山洞',reward:['cavePoints',0,'操作引導']},
  {id:'cave-dragon',cave:true,title:'第六步｜締約水蛟龍王',detail:'收集小金魚卡片，3張可隨機進化成金魚國王或皇后。國王與皇后卡片各3張向釣魚郎換1份魚飼料，河邊使用後召喚並締約水蛟龍王；完成釣魚3勝後可再得洞穴1000點。',action:'前往收集魚飼料',reward:['cavePoints',1000,'洞穴點數']}
 ];
 const flags=()=>api?.state?.journeyGuide;
 const count=()=>{const p=api?.progress?.()||{owned:0,total:Rules.mainSpeciesCount};return{owned:p.owned||0,total:p.total||Rules.mainSpeciesCount};};
 function finished(id,p=count()){
  const f=flags(),s=api?.state||{};
  switch(id){
   case 'cave-fishing':return (s.caveQuest?.fishingWins||0)>=3;
   case 'cave-enter':return !!s.caveQuest?.caveEntered;
   case 'cave-dragon':return !!s.caveQuest?.claims?.['cave-dragon'];
   case 'starter':return !!s.dreamLabLegendClaimed||!!f?.legacyStarter;
   case 'exit':return !!f?.exitedLab;
   case 'claim':return !!s.adventureClaimed;
   case 'equip':return !!f?.outfitEquipped;
   case 'capture':return !!f?.firstWildCapture;
   case 'tools':return !!f?.menuViewed;
   case 'collect30':return p.owned>=Rules.countAt(p.total,Rules.thresholds.tutorialArena);
   case 'arena':return !!f?.arenaFinished;
   case 'collect50':return p.owned>=Rules.countAt(p.total,Rules.thresholds.tutorialTower);
   case 'gym':return gymCompleted()===GYM_STAGES.length;
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
   if(field==='cavePoints'){if(amount===0||api.state.caveQuest?.claims?.[task.id])f.rewardsClaimed[task.id]=true;continue;}
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
  button.setAttribute('aria-label','開啟冒險任務清單');
  const bar=document.getElementById('topBar'),hud=document.getElementById('hud');
  if(bar)bar.append(button);else document.body.append(button);
  panel=document.createElement('aside');panel.id='journeyGuide';panel.setAttribute('role','region');
  panel.setAttribute('aria-label','冒險任務清單');panel.hidden=true;document.body.append(panel);
  button.addEventListener('click',()=>{if(api?.blocked?.())return;opened=!opened;selectedTask='';refresh();});
  panel.addEventListener('click',e=>{
   const control=e.target.closest('button[data-journey]');if(!control)return;
   const mode=control.dataset.journey;
   if(mode==='close'){opened=false;selectedTask='';refresh();return;}
   if(mode==='inspect'){selectedTask=selectedTask===control.dataset.task?'':control.dataset.task;refresh();return;}
   if(mode==='action')perform(control.dataset.task);
  });
  document.addEventListener('pointerdown',e=>{
   if(opened&&!button.contains(e.target)&&!panel.contains(e.target)){opened=false;refresh();}
  });
  document.addEventListener('keydown',e=>{if(opened&&e.key==='Escape'){opened=false;refresh();button.focus();}});
  window.addEventListener('resize',refresh);
 }
 function layout(){
  const radarRect=document.getElementById('radar')?.getBoundingClientRect();
  const bar=document.getElementById('topBar');
  // 單列頂部快捷列統一排版，任務按鈕不再依雷達位置獨立漂浮。
  if(bar){
   button.style.removeProperty('top');
   button.style.removeProperty('right');
   button.style.removeProperty('left');
   const barRect=bar.getBoundingClientRect();
   // 展開清單放在頂部工具列和雷達的下方，避免蓋住快捷列與雷達。
   const panelTop=Math.ceil(Math.max(barRect.bottom,radarRect?.bottom||0)+8);
   panel.style.top=panelTop+'px';
   panel.style.right='max(8px,env(safe-area-inset-right,0px))';
   panel.style.maxHeight=Math.max(110,Math.min(window.innerHeight*.64,window.innerHeight-panelTop-12))+'px';
   return;
  }
  // 相容尚未有 topBar 的版本。
  const top=Math.max(54,(radarRect?.top||94)-(button.getBoundingClientRect().height||29)-8);
  button.style.top=top+'px';
  button.style.right=Math.max(7,window.innerWidth-(radarRect?.right||window.innerWidth-12))+'px';
  const panelTop=Math.round((radarRect?.bottom||top+90)+8);
  panel.style.top=panelTop+'px';
  panel.style.right=button.style.right;
  panel.style.maxHeight=Math.max(110,Math.min(window.innerHeight*.64,window.innerHeight-panelTop-12))+'px';
 }
 function perform(id){
  if(!api||api.blocked())return;if(id.startsWith('cave-')){opened=false;api.caveAction?.(id);refresh();return;}if(finished(id))return;
  if(id==='claim'){
   if(api.inLab())api.notice('靠近大夢博士，對話後點「領取冒險服」。');
   else api.navigate('npc','prof_daydream');
  }else if(id==='equip'){opened=false;api.showCostumes();}
  else if(id==='tools'){opened=false;api.showMenu();}
  else if(id==='arena'){
   if(api.inBuilding())api.notice('請先離開建築物，再導航至擂台訓練家。');
   else api.navigate('npc','arena_coach');
  }else if(id==='gym'){
   if(api.inGym()){opened=false;api.showGyms();}
   else if(api.inBuilding())api.notice('請先離開目前建築物，再導航至初光道館。');
   else api.navigate('building','gym_light');
  }else if(id==='tower'){
   if(api.inBuilding())api.notice('請先離開建築物，再導航至挑戰塔。');
   else api.navigate('building','tower_starspire');
  }
  refresh();
 }
 function refresh(){
  if(!api)return;
  ensure();rewardSync(false);
  // 投擲靈核球時只禁止展開任務面板，不可把頂部任務快捷鍵從 HUD 隱藏。
  // 只有戰鬥、對話、模態視窗、場景載入等狀態才隱藏快捷鍵。
  if(api.shortcutBlocked?.()??api.blocked()){opened=false;button.hidden=true;panel.hidden=true;return;}
  if(api.blocked()){opened=false;panel.hidden=true;}
  button.hidden=false;
  const p=count(),done=tasks.filter(t=>finished(t.id,p)).length;
  const current=tasks.find(t=>!finished(t.id,p));
  button.innerHTML='<span class="taskIcon" aria-hidden="true">✦</span><span class="taskCount">'+done+'/'+tasks.length+'</span>';
  button.title='冒險任務清單 '+done+'/'+tasks.length;
  button.setAttribute('aria-expanded',String(opened));
  button.setAttribute('aria-label','冒險任務清單，已完成 '+done+' / '+tasks.length+'，'+(opened?'收合':'展開'));
  layout();
  panel.hidden=!opened;
  if(!opened)return;
  let markup='<header><div><strong>冒險任務</strong><small>已完成 '+done+' / '+tasks.length+' 項 · 完成自動發獎</small></div><button type="button" data-journey="close" aria-label="關閉任務清單">×</button></header><ol class="journeyTasks">';
  for(const task of tasks){
   const doneTask=finished(task.id,p),active=task===current,inspecting=selectedTask===task.id||!selectedTask&&active;
   const reward=task.reward[1]?task.reward[2]+' ×'+task.reward[1]:'首次進入有操作教學';
   markup+='<li class="'+(doneTask?'is-done':active?'is-current':'is-later')+'"><button class="journeyTaskLine" type="button" data-journey="inspect" data-task="'+task.id+'" aria-expanded="'+inspecting+'"><span class="journeyMark" aria-hidden="true">'+(doneTask?'✓':active?'✦':'·')+'</span><b>'+esc(task.title)+'</b><span class="journeyChevron">'+(inspecting?'−':'+')+'</span></button>'+
    '<small class="journeyReward">'+(doneTask?'已獲獎勵：':'完成獎勵：')+esc(reward)+'</small>'+
    (inspecting?'<p>'+esc(task.detail)+'</p>':'')+
    (inspecting&&(task.id==='collect30'||task.id==='collect50')?'<div class="journeyProgress"><i style="width:'+Math.min(100,Math.round(100*p.owned/p.total))+'%"></i></div><small>圖鑑 '+p.owned+' / '+p.total+' 種</small>':'')+
    (inspecting&&task.id==='cave-fishing'?'<p class="journeyCaveProgress">釣魚勝場 '+Math.min(3,api.state.caveQuest?.fishingWins||0)+' / 3</p>':'')+
    (inspecting&&task.id==='gym'?'<div class="journeyProgress"><i style="width:'+(gymCompleted()*100/GYM_STAGES.length)+'%"></i></div><small class="journeyGymCount">初光挑戰 '+gymCompleted()+' / '+GYM_STAGES.length+' 項已通關</small><div class="journeyGymStages">'+GYM_STAGES.map(g=>'<span class="'+(api.state.gyms?.[g.id]?.cleared?'cleared':'')+'">'+(api.state.gyms?.[g.id]?.cleared?'✓':'○')+' '+esc(g.name)+'</span>').join('')+'</div>':'')+
    (inspecting&&(active||task.cave)&&task.action?'<button class="journeyGo" type="button" data-journey="action" data-task="'+task.id+'">'+esc(task.action)+'</button>':'')+'</li>';
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
 window.PhantomJourneyGuide={init,refresh,showTask(id){opened=true;selectedTask=id;refresh();},
  onLabExit(){record('exitedLab');},
  onCostume(id){if(id==='adventure')record('outfitEquipped');else refresh();},
  onWildCapture(){record('firstWildCapture');},
  onMenuOpened(){if(flags()?.firstWildCapture)record('menuViewed');else refresh();},
  onArenaFinished(){record('arenaFinished');},
  onGymCleared(){rewardSync(true);refresh();},
  onTowerChallengeStarted(){record('towerEntered');},
  menuHelpHtml,get stage(){return tasks.find(t=>!finished(t.id))?.id||'done';}
 };
})();