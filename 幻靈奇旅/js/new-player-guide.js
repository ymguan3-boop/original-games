/* 新手旅程：以既有存檔狀態與遊戲事件推動，不重寫圖鑑或戰鬥系統。 */
(()=>{'use strict';
 let api=null,root=null,activeStage='',expanded=true,lastMarkup='';
 const Rules=window.PhantomGameRules;
 const pct=n=>Math.round(n*100);
 function flags(){return api?.state?.journeyGuide;}
 function progress(){const p=api?.progress?.()||{owned:0,total:1};return {...p,ratio:p.total?Math.min(1,p.owned/p.total):0};}
 function determine(){
  const f=flags();if(!f?.enabled)return null;
  if(!api.state.dreamLabLegendClaimed)return {id:'starter',silent:true};
  if(!f.exitedLab)return {id:'exit',silent:api.inLab(),title:'第一步完成｜準備出發',detail:'你已從大夢博士的三顆幻靈球中選擇第一位夥伴。請走出研究所，繼續冒險教學。'};
  if(!api.state.adventureClaimed)return {id:'claim',title:'第二步｜領取冒險服',detail:'請先導航至大夢研究所門口，與門口的大夢博士對話，點「領取冒險服」。領取後仍需穿上，才能開始捕捉練習。',action:'導航至研究所門口・大夢博士'};
  if(!f.outfitEquipped)return {id:'equip',title:'第二步｜換上冒險服',detail:'已領得冒險服！開啟旅人手冊 → 冒險衣櫃，選擇「博士贈送冒險服」並點換裝。',action:'開啟冒險衣櫃'};
  if(!f.firstWildCapture)return {id:'capture',title:'第二步｜試著捕捉幻靈',detail:'前往初光鎮，靠近野生幻靈，使用右側「鎖定」選取目標，再按「締約」投出靈核球；捕捉成功後就會進入第三步。'};
  if(!f.menuViewed)return {id:'tools',title:'第三步｜認識工具列',detail:'先看右側鎖定、締約、換球、星露果與翻滾，以及左側移動搖桿；再開啟「旅人手冊」查看圖鑑、隊伍、冒險衣櫃、背包、道館、挑戰塔、導航與設定的用途。',action:'查看旅人手冊與工具說明'};
  const p=progress();
  if(!f.arenaFinished){
   if(p.owned<Rules.countAt(p.total,Rules.thresholds.tutorialArena))return {id:'collect30',quiet:true,title:'第四步｜圖鑑蒐集至 '+Rules.pct(Rules.thresholds.tutorialArena),detail:'累積不同種類的幻靈圖鑑卡片，達到 '+Rules.pct(Rules.thresholds.tutorialArena)+' 時將引導你參加幻靈競技擂台。',progress:p};
   return {id:'arena',title:'第四步｜參與幻靈競技擂台',detail:'圖鑑蒐集已達 '+Rules.pct(Rules.thresholds.tutorialArena)+'！請在圖鑑編滿 3 位不同的已締約幻靈，再前往擂台訓練家，完成一場 3 對 3 對戰（勝敗皆計）。',action:'導航至擂台訓練家',progress:p};
  }
  if(!f.towerEntered){
   if(p.owned<Rules.countAt(p.total,Rules.thresholds.tutorialTower))return {id:'collect50',quiet:true,title:'第五步｜圖鑑蒐集至 '+Rules.pct(Rules.thresholds.tutorialTower),detail:'持續蒐集不同種類的幻靈；圖鑑達到 '+Rules.pct(Rules.thresholds.tutorialTower)+' 後將帶你挑戰星穹挑戰塔。',progress:p};
   return {id:'tower',title:'第五步｜挑戰星穹挑戰塔',detail:'圖鑑蒐集已達 '+Rules.pct(Rules.thresholds.tutorialTower)+'！前往星穹挑戰塔，實際選擇魔物關卡並開始戰鬥，才會完成教學；光是進塔不算。',action:'導航至星穹挑戰塔',progress:p};
  }
  return {id:'done',silent:true};
 }
 function persist(){api?.save?.();}
 function record(name){
  const f=flags();if(!f||f[name])return;
  f[name]=true;persist();refresh();
 }
 function ensureRoot(){
  if(root)return;
  root=document.createElement('aside');root.id='journeyGuide';root.setAttribute('aria-label','新手旅程指引');
  root.setAttribute('role','region');root.hidden=true;document.body.append(root);
  root.addEventListener('click',e=>{
   const b=e.target.closest('button[data-journey]');if(!b)return;
   if(b.dataset.journey==='collapse'){expanded=false;refresh();return;}
   if(b.dataset.journey==='expand'){expanded=true;refresh();return;}
   if(b.dataset.journey==='action')perform();
  });
 }
 function perform(){
  if(!api||api.blocked())return;
  const stage=determine();if(!stage)return;
  if(stage.id==='claim'){
   if(api.inLab())api.notice('靠近大夢博士並點「對話」→「領取冒險服」。');
   else api.navigate('npc','prof_daydream');
  }else if(stage.id==='equip')api.showCostumes();
  else if(stage.id==='tools')api.showMenu();
  else if(stage.id==='arena'){
   if(api.inBuilding())api.notice('先離開建築物，再使用指引導航到擂台訓練家。');
   else api.navigate('npc','arena_coach');
  }else if(stage.id==='tower'){
   if(api.inBuilding())api.notice('先離開建築物，再導航至星穹挑戰塔。');
   else api.navigate('building','tower_starspire');
  }
  refresh();
 }
 function refresh(){
  if(!api)return;
  const stage=determine();ensureRoot();
  if(!stage||stage.silent||api.blocked()){root.hidden=true;return;}
  if(stage.id!==activeStage){activeStage=stage.id;expanded=!stage.quiet;lastMarkup='';}
  const p=stage.progress,summary=p?'　'+p.owned+' / '+p.total+'（'+pct(p.ratio)+'%）':'';
  const markup=expanded?
   '<header><strong>'+stage.title+'</strong><button type="button" data-journey="collapse" aria-label="收合旅程指引">−</button></header><p>'+stage.detail+'</p>'+
   (p?'<div class="journeyProgress" aria-label="圖鑑完成度 '+pct(p.ratio)+'%"><i style="width:'+pct(p.ratio)+'%"></i></div><small>圖鑑：'+p.owned+' / '+p.total+' 種（'+pct(p.ratio)+'%）</small>':'')+
   (stage.action?'<button type="button" class="journeyGo" data-journey="action">'+stage.action+'</button>':''):
   '<button class="journeyCompact" type="button" data-journey="expand">✦ '+stage.title+summary+'　展開</button>';
  if(markup!==lastMarkup){root.innerHTML=markup;lastMarkup=markup;}
  root.hidden=false;
 }
 function init(options){
  api=options;
  if(!api.state.journeyGuide){
   if(!options.newPlayer&&!options.earlyStarter)return;
   api.state.journeyGuide={enabled:true,exitedLab:!api.inLab(),outfitEquipped:api.state.costume==='adventure',firstWildCapture:false,menuViewed:false,arenaFinished:false,towerEntered:false};
   persist();
  }
  ensureRoot();refresh();
  // 僅每 1.5 秒重算 UI，事件發生時則立即刷新。
  setInterval(()=>{if(!document.hidden)refresh();},1500);
 }
 function menuHelpHtml(){
  if(determine()?.id!=='tools')return '';
  return '<section class="journeyMenuHelp"><h3>第三步｜工具列使用指南</h3>'+
   '<p><b>場景工具：</b>左側搖桿用來移動；右側「鎖定」找幻靈、「締約」投球、「換球」切換球種、「星露果」增加締約機會、「翻滾」閃避攻擊。地圖雷達可辨別方向，鏡頭按鈕可旋轉與縮放。</p>'+
   '<p><b>旅人手冊：</b>圖鑑查看已收錄幻靈、進階及卡牌；幻靈隊伍安排 3 位出戰夥伴；冒險衣櫃更換服裝與被動技能；旅人背包查看球與道具。</p>'+
   '<p><b>探索挑戰：</b>初光挑戰進入道館；星穹挑戰塔挑戰魔獸；寵物商人兌換寵物與坐騎；建物與居民提供自動導航；旅行指南說明操作，顯示設定可調整畫質。</p></section>';
 }
 window.PhantomJourneyGuide={init,refresh,onLabExit(){record('exitedLab');},onCostume(id){if(id==='adventure')record('outfitEquipped');else refresh();},onWildCapture(){record('firstWildCapture');},onMenuOpened(){if(determine()?.id==='tools')record('menuViewed');else refresh();},onArenaFinished(){record('arenaFinished');},onTowerChallengeStarted(){record('towerEntered');},menuHelpHtml,get stage(){return determine()?.id||null;}};
})();