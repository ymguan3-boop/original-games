import {isPromoterLineage} from './promoter-lineage.js?v=20261111-ui-v23';
import {openingBlocker} from './shop-entry-rules.js?v=20261111-ui-v23';
import {resetMerchantRelease,resetMerchantOnly} from './save-reset.js?v=20261111-ui-v23';
import {createLoadingGate} from './loading-gate.js?v=20261111-ui-v23';
import {showChaseSuccess} from './chase-celebration.js?v=20261111-ui-v23';
import {environment} from './environment.js?v=20261111-ui-v23';
import {activeEvent} from './economy-v2.js?v=20261111-ui-v23';
import {chapterObjectives} from './shop-chapters.js?v=20261111-ui-v23';
import {clockText,clockLabel,upgradeProgress} from './shop-clock.js?v=20261111-ui-v23';
import {showLevelUp} from './levelup.js?v=20261111-ui-v23';
import {installShopNavigation} from './shop-navigation.js?v=20261111-ui-v23';
import {showZhaocaiNote} from './zhaocai-note.js?v=20261111-ui-v23';
import {installShopMusic} from './shop-music.js?v=20261111-ui-v23';
import {createActorVisuals} from './actor-visuals.js?v=20261111-ui-v23';
import {staffEvolutionInfo,readyStaffEvolutions} from './staff-evolution.js?v=20261111-ui-v23';
import {loadSpiritCards} from './spirit-cards.js?v=20261111-ui-v23';
import {createGame} from './core.js?v=20261111-ui-v23';
import {createStaffOverlay} from './staff-overlay.js?v=20261111-ui-v23';
import {installPatrolControls} from './patrol-controls.js?v=20261111-ui-v23';
import {playEvolution3D} from './evolution-3d.js?v=20261111-ui-v23';
import {createScene} from './scene.js?v=20261111-ui-v23';
import {createScene2D} from './scene-2d.js?v=20261111-ui-v23';
import {createHub} from './shop-hub.js?v=20261111-ui-v23';
import {installTutorial} from './shop-tutorial.js?v=20261111-ui-v23';
import {commissionNotice} from './commissions.js?v=20261111-ui-v23';
import {dailyTasks} from './management.js?v=20261111-ui-v23';
import {shelfTypes} from './furniture.js?v=20261111-ui-v23';
import {decorTypes} from './decorations.js?v=20261111-ui-v23';
import {pendingRewards} from './reward-collection.js?v=20261111-ui-v23';
/* 快捷鍵上的「新」提示：看過該頁就記下，有新東西才再亮 */
const SEEN_KEY='firstlight-shop-seen-v1',readSeen=()=>{try{return JSON.parse(localStorage.getItem(SEEN_KEY))||{};}catch{return {};}},seenNotice=readSeen();
const unlockedBuild=s=>[...shelfTypes,...decorTypes].filter(t=>(t.level||1)<=s.level).map(t=>t.id),hireable=(g,s)=>g.data.hirePool.filter(h=>!h.evolutionOnly&&!isPromoterLineage(g.data,h.spiritId||h.id)&&h.level<=s.level&&!s.employees.some(e=>e.baseId===h.id)).map(h=>h.id);
function markSeen(page){if(!game)return;const s=game.state;if(page==='build')seenNotice.build=unlockedBuild(s);if(page==='staff')seenNotice.staff=hireable(game,s);try{localStorage.setItem(SEEN_KEY,JSON.stringify(seenNotice));}catch{}}
const fresh=(list,seen)=>Array.isArray(seen)?list.some(id=>!seen.includes(id)):list.length>0;
import {installWindowControls} from './window-controls.js?v=20261111-ui-v23';
/* 2D 測試：在設定輸入代碼後切換並記住；本機開發可用 ?shopDev=1&view=2d 直接進入 */
const VIEW_KEY='firstlight-shop-view',VIEW_CODE='741216',viewParams=new URLSearchParams(location.search),readView=()=>{try{return localStorage.getItem(VIEW_KEY);}catch{return null;}},view2d=viewParams.get('view')==='2d'&&viewParams.has('shopDev')&&['localhost','127.0.0.1'].includes(location.hostname)||readView()==='2d';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Math.round(Number(v)||0).toLocaleString('zh-TW');
const confirmWindow=installWindowControls($('#confirm'),{onClose:()=>{$('#confirm-shield').hidden=true;}});
let game,scene,hub,tutorial,staffOverlay,actorVisuals,patrolControls,shopNavigation,shopMusic=null,evolutionInProgress=false,selectedShelf=null,seenPatrolResolution=null,patrolTimer=null,seenChapterClear=null,seenChase=null,toastTimer,quality='low';
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.className=error?'error':'';el.style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.style.display='none',3200);}
function action(type,payload={}){let r;try{r=game.act(type,payload);}catch(e){r={ok:false,message:e.message};}if(r?.message&&!['tutorial','已完成'].includes(type)&&r.message!=='已完成'&&type!=='tutorial')toast(r.message,!r.ok);renderHUD();staffOverlay?.render();return r;}
function switchView(code){if(!view2d&&code!==VIEW_CODE){toast('代碼不正確。',true);return;}try{localStorage.setItem(VIEW_KEY,view2d?'3d':'2d');}catch{toast('無法儲存畫面設定。',true);return;}location.reload();}
function confirmAction(message,fn){$('#confirm-message').textContent=message;$('#confirm-shield').hidden=false;confirmWindow.open();$('#confirm-yes').onclick=()=>{confirmWindow.close();fn();};}
$('#confirm-no').onclick=()=>confirmWindow.close();
function fullscreen(){const el=document.documentElement;if(document.fullscreenElement){document.exitFullscreen();return;}if(el.requestFullscreen)el.requestFullscreen().catch(()=>toast('這個瀏覽器不支援全螢幕，可以把遊戲加入主畫面。',true));else toast('這個瀏覽器不支援全螢幕，可以把遊戲加入主畫面。',true);}
/* 進度先存好再播 3D 演出，動畫失敗也不會損失進化 */
async function beginEvolution(employeeId){
 if(evolutionInProgress)return;const emp=game.state.employees.find(e=>e.id===employeeId),rule=staffEvolutionInfo(game.data,emp),spirit=id=>game.data.spirits.find(x=>x.id===id);
 if(!rule.eligible){toast('尚未達到進化門檻。',true);return;}
 const before=spirit(emp.spiritId);evolutionInProgress=true;game.uiBusy=true;
 const result=action('evolveEmployee',{employeeId});
 try{if(result.ok)await playEvolution3D({before,after:spirit(game.state.employees.find(e=>e.id===employeeId).spiritId),loadActor:sp=>scene.evolutionActor(sp.model)});}
 catch(e){console.warn('進化演出失敗',e);if(result.ok)toast(result.message);}
 finally{evolutionInProgress=false;game.uiBusy=false;renderHUD();}
}
function syncPatrolSolved(){const info=game.state.recentPatrolResolution;if(!info||seenPatrolResolution===info.id)return;seenPatrolResolution=info.id;if(info.focused&&scene?.metrics.mode==='follow')scene.setMode('play');const popup=$('#patrol-solved');clearTimeout(patrolTimer);$('#patrol-solved-title').textContent='✅ 問題解決了！';$('#patrol-solved-message').textContent=`${info.employeeName}｜${info.title}`;popup.hidden=false;patrolTimer=setTimeout(()=>{popup.hidden=true;},3000);}
let reportShownDay=null,seenMarket=undefined;
function syncNotices(s){{const ev=activeEvent(s),key=ev?ev.id+ev.startDay:null;if(seenMarket!==undefined&&key&&key!==seenMarket)toast(`📢 市場消息：${ev.title}，點「任務 → 今日歷程」查看`);seenMarket=key;}
 const clear=s.chapterClear;if(clear&&seenChapterClear!==clear.id){const first=seenChapterClear===undefined;seenChapterClear=clear.id;if(!first)showLevelUp(game,clear,esc);}
 const chase=s.customerChaseResult;if(chase&&seenChase!==chase.id){seenChase=chase.id;if(chase.success){showChaseSuccess(chase);scene?.playChaseSuccess?.();}else showZhaocaiNote('追客失敗了……');}
 const notice=$('#shop-notice');notice.hidden=!s.event||s.patrolFocus||hub?.isOpen;if(!notice.hidden)notice.textContent=`⚠ ${s.event.title}：按「任務」處理`;
}
function renderHUD(){if(!game)return;syncPatrolSolved();const s=game.state;syncNotices(s);
 $('#gold').innerHTML=`${fmt(s.gold)} <em>G</em>`;$('#level-name').textContent=`Lv.${s.level} ${game.data.levels[s.level-1]?.name||''}`;
 {const info=chapterObjectives(s,game.data.levels),pct=upgradeProgress(info);$('#hud-progress').textContent=s.upgradeProject?`🔨 ${Math.ceil(s.upgradeProject.remaining)}秒`:info.last?'★ 最高級':`▲ ${pct}%`;$('#hud-progress').classList.toggle('ready',info.ready&&!s.upgradeProject);{const env=environment(s,game.data.config);$('#hud-clock').textContent=`${env.weatherInfo.icon}${env.season.name} ${clockText(s,game.data.config)} ${clockLabel(s,game.data.config)}`;$('#hud-clock').title=`${env.season.name}季・${env.weatherInfo.name}`;}if(s.phase==='report'&&reportShownDay!==s.day&&hub&&!hub.isOpen){reportShownDay=s.day;hub.open('report');}}$('#upgrade-status').hidden=!s.upgradeProject;if(s.upgradeProject)$('#upgrade-status').textContent=`施工至 Lv.${s.upgradeProject.to} · ${Math.ceil(s.upgradeProject.remaining)} 秒`;
 $('#prep-bar').hidden=s.phase!=='closed'||!!s.patrolFocus;const blocked=openingBlocker(s);$('#start-business').disabled=!!blocked;$('#start-business').title=blocked;$('#prep-bar span').textContent=blocked||'🧰 店舖整備中：可以布置、招聘、調整職務';$('#start-business').textContent=(s.totals?.days||0)<1&&s.day<=1?'開門營業':'新的一天';
 const dot=(id,on)=>$(`.toolbar [data-hub=${id}]`).classList.toggle('has-notice',!!on&&!s.patrolFocus);
 const daily=dailyTasks(game,s);dot('staff',readyStaffEvolutions(game.data,s.employees).length||fresh(hireable(game,s),seenNotice.staff));dot('build',s.layoutPause||fresh(unlockedBuild(s),seenNotice.build)||(s.decorStorage||[]).length>0);let rewards=0;try{const r=pendingRewards(game,s);rewards=typeof r==='number'?r:(r?.total??Object.values(r||{}).reduce((n,v)=>n+(Number(v)||0),0));}catch{}dot('tasks',s.event||daily.tasks.some(t=>t.done&&!t.claimed)||(pendingRewards(game,s).daily+pendingRewards(game,s).chapter)>0);dot('shop',s.commissionBoard?.unread||pendingRewards(game,s).orders>0);$('#top-patrol').textContent=scene?.metrics.mode==='follow'?'返回總覽':'主管巡查';
 tutorial?.sync();}
const pageFor={goods:'goods',shelves:'build',staff:'staff',quests:'tasks',upgrade:'upgrade',settings:'settings'};
const openPanel=name=>hub.open(pageFor[name]||'shop');
$('#start-business').onclick=()=>{const r=action('open');if(r.ok)tutorial?.sync();};
$('#hud-progress').onclick=()=>hub.open('upgrade');$('#top-fullscreen').onclick=fullscreen;$('#top-patrol').onclick=()=>scene.setMode(scene.metrics.mode==='follow'?'play':'follow');document.querySelector('.status-row').appendChild($('#prep-bar'));
for(const b of document.querySelectorAll('.toolbar [data-hub]'))b.onclick=()=>{const page=b.dataset.hub;markSeen(page);setTimeout(renderHUD,0);if(document.body.classList.contains('view-2d')&&hub.isOpen&&hub.rootPage===page){hub.close();return;}if(page==='tasks'&&game.state.event){hub.open('event');return;}if(page==='shop'){if(game.state.commissionBoard?.unread)action('readCommissions');hub.open('orders');}else hub.open(page);};
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!game||game.state.patrolFocus)return;
 if(b.id==='rotate-furniture'){const r=scene.editShelf(0,0,90);if(!r.ok)toast(r.message,true);}
 if(b.id==='retract-furniture'){const r=scene.cancelEdit();toast(r.message||'已收納',!r.ok);if(r.ok)scene.setMode('play');}
 if(b.id==='shelf-goods'&&selectedShelf)hub.open('shelfGoods',selectedShelf);
 if(b.id==='finish-decorate'){if(scene.metrics.placement)scene.confirmPlacement();else scene.setMode('play');}
 if(b.id==='cancel-placement'){scene.cancelPlacement();scene.setMode('play');}
});
document.addEventListener('input',e=>{if(e.target.id==='bgm-volume')shopMusic?.setVolume(e.target.value);});
document.addEventListener('change',e=>{if(e.target.id==='quality'){quality=e.target.value;scene.setQuality?.(quality);}});
$('#camera-mode').onclick=()=>{if(!scene.cameraLocked&&!game.state.patrolFocus)scene.setMode('play');};
$('#patrol-event').onclick=()=>{if(game.state.event)hub.open('event');else toast('目前沒有事件。');};
function exportSave(){const blob=new Blob([JSON.stringify(game.state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`初光商會-第${game.state.day}天.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function recoverSave(){confirmAction('恢復前一個備份會取代目前進度，確定嗎？',()=>{const key='firstlight_shop_v1',backup=localStorage.getItem(key+'.backup');if(!backup)return toast('沒有可用的備份。',true);try{game.validate(JSON.parse(backup));localStorage.setItem(key,backup);location.reload();}catch(err){toast('備份無法恢復：'+err.message,true);}});}
async function boot(){let gate;try{
 const loading=$('#loading');loading.style.display='flex';loading.setAttribute('aria-busy','true');$('#load-message').textContent='正在準備商會資料與場景素材…';
 gate=createLoadingGate(globalThis.THREE,(done,total)=>{$('#load-message').textContent='正在載入場景素材 '+done+' / '+total;});
 const reset=resetMerchantRelease(localStorage);if(reset)loading.dataset.reset='true';

 shopMusic=installShopMusic();game=await createGame({storage:localStorage,key:'firstlight_shop_v1'});seenPatrolResolution=game.state.recentPatrolResolution?.id||null;seenChapterClear=game.state.chapterClear?.id||null;seenChase=game.state.customerChaseResult?.id||null;
 shopNavigation=installShopNavigation({game,onError:e=>toast(e.message,true)});
 hub=createHub({game,getScene:()=>scene,act:action,toast,esc,evolve:beginEvolution,leave:()=>$('#return-to-game').click(),settings:{volume:()=>shopMusic?.volume??40,quality:()=>quality,exportSave,recover:recoverSave,is2D:()=>view2d,switchView},onChange:()=>{game.uiBusy=evolutionInProgress||hub?.isOpen;renderHUD();}});
 tutorial=installTutorial({game,act:action,fullscreen,closeHub:()=>hub.close(),openHub:page=>hub.open(page),confirmSkip:fn=>confirmAction('要跳過新手教學嗎？之後只有店內沒有貨架時，才可到「商會 → 存檔與教學」重播。',fn)});
 const trial=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('shopDev');if(innerWidth<700)game.data.config.maxCustomers=6;
 await loadSpiritCards();actorVisuals=createActorVisuals($('#actor-reactions'),{onEventClick:()=>hub.open('event'),onComplaintClick:id=>hub.open('complaint',id)});window.shop=game;window.shopTrial=trial;
 const sceneFactory=view2d?createScene2D:createScene;document.body.classList.toggle('view-2d',view2d);
 scene=sceneFactory({canvas:$('#world'),game,
  onSelect:o=>{if(game.state.patrolFocus)return;if(o.type==='promoter'){hub.open('promoters');return;}if(o.type==='staff')hub.open('worker',o.id);else if(o.type==='shelf'&&scene.metrics.mode==='play'){if(game.state.phase==='open'&&!game.state.layoutPause)return;scene.setMode('decorate');scene.selectShelf(o.id);}},
  onStaffPositions:rows=>staffOverlay?.position(rows),
  onActorVisuals:view=>{const focus=game.state.patrolFocus?.employeeId;actorVisuals?.render(focus?{actors:view.actors.filter(v=>v.id===focus),notices:view.notices.filter(n=>n.targetId===focus)}:view);},
  onPlacementChange:p=>{$('#placement-hint').hidden=!p;if(p)$('#placement-message').textContent=p.ok?'點地板選位置，再按 ✓':'這裡不能放：'+p.message;document.body.classList.toggle('placement-bad',!!p&&!p.ok);},
  onFurnitureSelect:sh=>{$('#rotate-furniture').hidden=!!sh?.mount;selectedShelf=sh&&!sh.decoration&&!sh.isPlacement?sh.id:null;$('#shelf-goods').hidden=!selectedShelf;$('#retract-furniture').hidden=!!sh?.isPlacement;document.body.classList.toggle('editing-furniture',!!sh&&!sh.lockedOnly);const el=$('#furniture-controls');el.hidden=!sh||!!sh.lockedOnly;},
  onFurniturePosition:p=>{if(!p)return;const el=$('#furniture-controls'),w=el.offsetWidth||148,v=document.documentElement.clientWidth;el.style.left=`${Math.max(w/2+8,Math.min(v-w/2-8,p.x))}px`;el.style.top=`${p.y-8}px`;},
  onModeChange:mode=>{const patrol=mode==='follow',decorate=mode==='decorate';document.body.classList.toggle('patrol-active',patrol);document.body.classList.toggle('decorate-active',decorate);$('#patrol-controls').hidden=!patrol;patrolControls?.reset();if(patrol&&game.state.layoutPause)action('setLayoutPause',{value:false});const t=game.state.tutorialState;if(t&&!t.done){if(patrol)action('tutorial',{patch:{patrolled:true}});else if(t.patrolled)action('tutorial',{patch:{patrolReturned:true}});}},
  onActionResult:r=>toast(r.message,!r.ok),onError:e=>toast('模型載入異常：'+(e.message||e),true)});
 window.shopScene=scene;window.shopHub=hub;
 staffOverlay=createStaffOverlay({game,labels:$('#staff-labels'),card:$('#staff-card'),escape:esc,onEventClick:()=>hub.open('event'),onOpen:id=>hub.open('worker',id)});staffOverlay.render();
 patrolControls=installPatrolControls({joystick:$('#joystick'),stick:$('#stick'),scene});scene.setMode('play');renderHUD();await scene.ready;await gate.wait(scene);gate.dispose();$('#loading').setAttribute('aria-busy','false');$('#loading').style.display='none';document.body.classList.remove('app-loading');
 let last=performance.now(),ui=0;function frame(now){requestAnimationFrame(frame);const elapsed=(now-last)/1000,dt=Math.min(.1,elapsed);last=now;if(document.hidden||shopNavigation?.leaving)return;try{if(!evolutionInProgress&&!$('#confirm').open){const result=game.tick(dt);if(result&&!result.ok)toast(result.message,true);}scene.update(dt);}catch(e){if(!window.lastShopError){console.error(e);toast('執行發生錯誤：'+e.message,true);window.lastShopError=e.message;}}ui+=dt;if(ui>.5){ui=0;renderHUD();staffOverlay?.render();if(hub.isOpen&&['chapter','upgrade','daily'].includes(document.querySelector('#hub')?.dataset.page))hub.render();}}requestAnimationFrame(frame);
 if(innerWidth<700)scene.setQuality?.('low');
}catch(e){console.error(e);gate?.dispose();$('#loading').innerHTML=`<h2>商會素材尚未就緒</h2><p>${esc(e.message)}</p><button id="retry-shop">重新載入</button><button id="reset-shop">重置商會並重試</button>`;$('#retry-shop').onclick=()=>location.reload();$('#reset-shop').onclick=()=>{resetMerchantOnly(localStorage);location.reload();};}}
boot();
