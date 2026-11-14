import{createMerchantMarquee}from'./merchant-marquee.js?v=20261114-v48';
const syncMarquee=createMerchantMarquee();
import {shopNotices} from './shop-notices.js?v=20261114-v48';
import {restoreMerchantGuest,carryMerchantGuest} from '../../幻靈奇旅/survivors/js/merchant-guest.js?v=20261111-meadow-v2';
restoreMerchantGuest();
import {MEADOW_KEY} from '../../幻靈奇旅/survivors/js/merchant-meadow.js?v=20261114-v48';
import {isPromoterLineage} from './promoter-lineage.js?v=20261114-v48';
import {openingBlocker} from './shop-entry-rules.js?v=20261114-v48';
import {resetMerchantRelease,resetMerchantOnly} from './save-reset.js?v=20261114-v48';
import {createLoadingGate} from './loading-gate.js?v=20261114-v48';
import {showChaseSuccess} from './chase-celebration.js?v=20261114-v48';
import {environment} from './environment.js?v=20261114-v48';
import {activeEvent} from './economy-v2.js?v=20261114-v48';
import {chapterObjectives} from './shop-chapters.js?v=20261114-v48';
import {clockText,clockLabel,upgradeProgress} from './shop-clock.js?v=20261114-v48';
import {showLevelUp} from './levelup.js?v=20261114-v48';
import {installShopNavigation} from './shop-navigation.js?v=20261114-v48';
import {showZhaocaiNote} from './zhaocai-note.js?v=20261114-v48';
import {installShopMusic} from './shop-music.js?v=20261114-v48';
import {createActorVisuals} from './actor-visuals.js?v=20261114-v48';
import {staffEvolutionInfo} from './staff-evolution.js?v=20261114-v48';
import {loadSpiritCards} from './spirit-cards.js?v=20261114-v48';
import {createGame} from './core.js?v=20261114-v48';
import {createStaffOverlay} from './staff-overlay.js?v=20261114-v48';
import {installPatrolControls} from './patrol-controls.js?v=20261114-v48';
import {playEvolution3D} from './evolution-3d.js?v=20261114-v48';
import {createScene} from './scene.js?v=20261114-v48';
import {createScene2D} from './scene-2d.js?v=20261114-v48';
import {createHub} from './shop-hub.js?v=20261114-v48';
import {showManagerDialogue} from './manager-dialogue.js?v=20261114-v48';
import {dailyTasks} from './management.js?v=20261114-v48';
import {shelfTypes,accepts as shelfAccepts} from './furniture.js?v=20261114-v48';
import {decorTypes} from './decorations.js?v=20261114-v48';
import {buildNotice} from './build-notices.js?v=20261114-v48';
/* 新解鎖在實際查看該分類後記為已讀；可執行提醒保留到完成。 */
const SEEN_KEY='firstlight-shop-seen-v1',readSeen=()=>{try{return JSON.parse(localStorage.getItem(SEEN_KEY))||{};}catch{return {};}},seenNotice=readSeen();
const hireable=(g,s)=>g.data.hirePool.filter(h=>!h.evolutionOnly&&!isPromoterLineage(g.data,h.spiritId||h.id)&&h.level<=s.level&&!s.employees.some(e=>e.baseId===h.id)).map(h=>h.id);
function markSeen(page,arg){if(!game)return;const s=game.state;let ids=[];
 if(page==='hire')seenNotice.staff=hireable(game,s);
 if(seenNotice.buildTier!==s.level){seenNotice.build=[];seenNotice.buildTier=s.level;}
 if(page==='rackShop')ids=shelfTypes.filter(t=>t.level<=s.level).map(t=>t.id);
 if(page==='decorShop')ids=decorTypes.filter(t=>t.group===arg&&t.level<=s.level).map(t=>t.id);
 if(ids.length)seenNotice.build=[...new Set([...(seenNotice.build||[]),...ids])];
 try{localStorage.setItem(SEEN_KEY,JSON.stringify(seenNotice));}catch{}}
import {installWindowControls} from './window-controls.js?v=20261114-v48';
/* 2D 測試：在設定輸入代碼後切換並記住；本機開發可用 ?shopDev=1&view=2d 直接進入 */
const VIEW_KEY='firstlight-shop-view',VIEW_CODE='741216',viewParams=new URLSearchParams(location.search),readView=()=>{try{return localStorage.getItem(VIEW_KEY);}catch{return null;}},view2d=viewParams.get('view')==='2d'&&viewParams.has('shopDev')&&['localhost','127.0.0.1'].includes(location.hostname)||readView()==='2d';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Math.round(Number(v)||0).toLocaleString('zh-TW');
const confirmWindow=installWindowControls($('#confirm'),{onClose:()=>{$('#confirm-shield').hidden=true;}});
let game,scene,hub,staffOverlay,actorVisuals,patrolControls,shopNavigation,shopMusic=null,evolutionInProgress=false,selectedShelf=null,seenPatrolResolution=null,patrolTimer=null,seenChapterClear=null,seenChase=null,toastTimer,quality='low';
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
function syncPatrolSolved(){const info=game.state.recentPatrolResolution;if(!info||seenPatrolResolution===info.id)return;seenPatrolResolution=info.id;if(info.focused&&scene?.metrics.mode==='follow')scene.setMode('play');showManagerDialogue(`問題解決了！${info.employeeName}：${info.title}`,{duration:4200});}
let reportShownDay=null,seenMarket=undefined;
function syncNotices(s){{const ev=activeEvent(s),key=ev?ev.id+ev.startDay:null;if(seenMarket!==undefined&&key&&key!==seenMarket)toast(`📢 市場消息：${ev.title}，點「任務 → 突發事件」查看`);seenMarket=key;}
 const clear=s.chapterClear;if(clear&&seenChapterClear!==clear.id){const first=seenChapterClear===undefined;seenChapterClear=clear.id;if(!first)showLevelUp(game,clear,esc);}
 const chase=s.customerChaseResult;if(chase&&seenChase!==chase.id){seenChase=chase.id;if(chase.success){showChaseSuccess(chase);showManagerDialogue('追上顧客了！謝謝你願意再給我們一次機會。',{duration:4200});scene?.playChaseSuccess?.();}else showZhaocaiNote('追客失敗了……');}
 const toolbar=document.querySelector('nav.toolbar'),toolbarRect=toolbar?.getBoundingClientRect();if(toolbarRect?.height)document.documentElement.style.setProperty('--shop-notice-bottom',Math.max(12,innerHeight-toolbarRect.top+10)+'px');const build=buildNotice(game,s,seenNotice.buildTier===s.level?seenNotice.build:[]),notice=$('#shop-notice');notice.hidden=(!s.event&&!build)||s.patrolFocus||hub?.isOpen;if(!notice.hidden)notice.textContent=s.event?`⚠ ${s.event.title}：按「任務」處理`:`📌 ${build.message}`;
}
function renderHUD(){if(!game)return;syncPatrolSolved();const s=game.state;syncMarquee(s);syncNotices(s);setTimeout(weaponGuide,0);
 let hint=$('#patrol-rack-hint');if(!hint){hint=document.createElement('div');hint.id='patrol-rack-hint';hint.setAttribute('role','status');document.body.append(hint);}const rack=s.patrolShelf;hint.hidden=!(game.managerActive&&rack);if(!hint.hidden){const product=game.data.catalog.find(c=>c.sku===rack.sku);hint.textContent=`${rack.name} · ${product?.displayName||'商品'} ${rack.stock}/${rack.capacity}`;hint.style.top=(document.querySelector('.topbar').getBoundingClientRect().bottom+8)+'px';}
 $('#gold').innerHTML=`${fmt(s.gold)} <em>G</em>`;$('#level-name').textContent=`Lv.${s.level} ${game.data.levels[s.level-1]?.name||''}`;
 {const info=chapterObjectives(s,game.data.levels),pct=upgradeProgress(info);$('#shop-goal').classList.toggle('upgrade-ready',info.ready&&!info.last);$('#shop-goal').setAttribute('aria-label',info.ready&&!info.last?'可升級，點擊打烊並升級':'查看商會升級目標');$('#hud-progress').textContent=s.upgradeProject?`🔨 ${Math.ceil(s.upgradeProject.remaining)}秒`:info.last?'★ 最高級':`▲ ${pct}%`;$('#hud-progress').classList.toggle('ready',info.ready&&!s.upgradeProject);$('#goal-fill').style.width=pct+'%';const next=info.goals.find(g=>!g.done);$('#goal-next').textContent=s.upgradeProject?'施工升級中':next?`${next.title} ${Math.floor(Math.min(next.value,next.target))}/${next.target}`:info.last?'已達最高級':'目標已完成';{const env=environment(s,game.data.config);$('#hud-clock').textContent=`${env.weatherInfo.icon}${env.season.name} ${clockText(s,game.data.config)} ${clockLabel(s,game.data.config)}`;$('#hud-clock').title=`${env.season.name}季・${env.weatherInfo.name}`;}if(s.phase==='report'&&reportShownDay!==s.day&&hub&&!hub.isOpen){reportShownDay=s.day;hub.open('report');}}$('#upgrade-status').hidden=!s.upgradeProject;if(s.upgradeProject)$('#upgrade-status').textContent=`施工至 Lv.${s.upgradeProject.to} · ${Math.ceil(s.upgradeProject.remaining)} 秒`;
 $('#prep-bar').hidden=!!s.patrolFocus;const blocked=openingBlocker(s);$('#start-business').disabled=false;$('#start-business').title=blocked;$('#prep-bar span').textContent=blocked||'🧰 店舖整備中：可以布置、招聘、調整職務';$('#start-business').textContent=s.phase==='open'?'打烊結算':s.phase==='report'?'查看結算':'開門營業';
 const dot=(id,on,message='')=>{const button=$(`.toolbar [data-hub=${id}]`);button.classList.toggle('has-notice',!!on&&!s.patrolFocus);button.title=on?message:'';if(message&&on)button.setAttribute('aria-label',button.textContent.trim()+'：'+message);else button.removeAttribute('aria-label');};
 const notices=shopNotices(game,s,{...seenNotice,build:seenNotice.buildTier===s.level?seenNotice.build:[]}),{build,rewards}=notices;dot('staff',notices.staff,'有新夥伴可招聘或員工可進化，請到「員工」查看。');dot('build',!!build,build?.message);dot('tasks',notices.tasks,s.event?'有營業事件待處理。':activeEvent(s)?'有市場突發事件與特殊加成可查看。':`有 ${rewards.total} 項任務獎勵可領取。`);dot('shop',notices.shop,rewards.orders?`有 ${rewards.orders} 件委託可交付。`:'收到新商會委託，請開啟訊息。');$('#top-patrol').textContent=scene?.metrics.mode==='follow'?'返回總覽':'主管巡查';
}
const pageFor={goods:'goods',shelves:'build',staff:'staff',quests:'tasks',upgrade:'upgrade',settings:'settings'};
const openPanel=name=>hub.open(pageFor[name]||'shop');
$('#start-business').onclick=()=>{if(game.state.phase==='open'){confirmAction('現在打烊並結算今日營業？',()=>action('close'));return;}if(game.state.phase==='report'){hub.open('report');return;}const blocked=openingBlocker(game.state);if(blocked){showManagerDialogue(blocked,{actionLabel:game.state.shelves.length?'去招聘':'去布置',onAction:()=>hub.open(game.state.shelves.length?'promoters':'racks')});return;}action('open');};
$('#shop-goal').onclick=()=>hub.open('upgrade');$('#quick-settings').onclick=()=>hub.open('settings');$('#top-fullscreen').onclick=fullscreen;$('#top-patrol').onclick=()=>scene.setMode(scene.metrics.mode==='follow'?'play':'follow');document.querySelector('.top-actions').prepend($('#prep-bar'));document.addEventListener('click',e=>{const menu=$('#quick-menu');if(!menu.contains(e.target)||e.target.closest('.quick-menu-items button'))menu.open=false;});
for(const b of document.querySelectorAll('.toolbar [data-hub]'))b.onclick=()=>{const page=b.dataset.hub;hub.prepareNotices();setTimeout(renderHUD,0);if(document.body.classList.contains('view-2d')&&hub.isOpen&&hub.rootPage===page){hub.close();return;}if(page==='shop'){if(game.state.commissionBoard?.unread)action('readCommissions');hub.open('orders');}else hub.open(page);};
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
function importMeadow(){try{const field=JSON.parse(localStorage.getItem(MEADOW_KEY)||'null'),totals=field?.merchantCargo;if(!totals)return null;const result=game.act('importMeadowCargo',{totals});if(result.ok&&result.message?.startsWith('帶回'))toast(result.message);return result;}catch(e){toast('採集物暫未入庫：'+e.message,true);return null;}}
/* 第一次擺好能放武器的貨架、但倉庫還沒有武器時：引導到「武器商品 → 武器 → 前往草原採集」 */
const WEAPON_GUIDE_KEY='firstlight-weapon-guide-v1';
function weaponGuide(){let seen=false;try{seen=!!localStorage.getItem(WEAPON_GUIDE_KEY);}catch{}if(seen||!game||hub?.isOpen)return;const s=game.state,weapons=game.data.catalog.filter(c=>c.lootOnly);if(s.phase==='open'||!weapons.length)return;const rack=s.shelves.some(sh=>weapons.some(c=>shelfAccepts(sh,c)));const stock=weapons.some(c=>(s.inventory[c.sku]||0)>0)||s.shelves.some(sh=>sh.stock>0&&weapons.some(c=>c.sku===sh.sku));if(!rack||stock)return;try{localStorage.setItem(WEAPON_GUIDE_KEY,'1');}catch{}showManagerDialogue('武器架擺好了！武器不能用買的，要到草原擊倒魔物拾取。我帶你到「武器商品」，按「前往草原採集」就能出發。',{actionLabel:'帶我去',onAction:()=>{hub.open('goods');setTimeout(()=>{document.querySelector('#hub [data-tutor=weapon-goods]')?.click();setTimeout(()=>{document.querySelector('#hub [data-label="武器"]')?.click();setTimeout(()=>document.querySelector('#hub [data-label="前往草原採集"]')?.classList.add('tutor-focus'),80);},80);},80);}});}
function enterMeadow(){hub.close();const depart=()=>{const paused=game.act('departMeadow');if(!paused.ok){toast(paused.message,true);return;}const url=new URL('../幻靈奇旅/survivors/?merchantMeadow=1',location.href);if(globalThis.PORTAL_GUEST){url.searchParams.set('guest','1');if(url.pathname.startsWith('/game/'))url.pathname=url.pathname.replace('/game/','/game/guest/');carryMerchantGuest();}location.assign(url);};let visited=!!game.state.tutorialSeen?.['meadow-entry'];try{visited||=localStorage.getItem(MEADOW_KEY)!==null;}catch{}if(visited){if(!game.state.tutorialSeen?.['meadow-entry'])game.act('ackTutorial',{id:'meadow-entry'});depart();return;}showManagerDialogue('草原每波 24 秒，共 10 波。擊倒魔物後走近拾取武器，再帶回商會販售；首次入場會協助設定自動補血。',{actionLabel:'前往草原',onAction:()=>{const result=game.act('ackTutorial',{id:'meadow-entry'});if(!result.ok){toast(result.message,true);return;}depart();}});}
async function boot(){let gate;try{
 const loading=$('#loading');loading.style.display='flex';loading.setAttribute('aria-busy','true');$('#load-message').textContent='正在準備商會資料與場景素材…';
 gate=createLoadingGate(globalThis.THREE,(done,total)=>{$('#load-message').textContent='正在載入場景素材 '+done+' / '+total;});
 const reset=resetMerchantRelease(localStorage);if(reset){loading.dataset.reset='true';for(const key of Object.keys(seenNotice))delete seenNotice[key];}

 shopMusic=installShopMusic();game=await createGame({storage:localStorage,key:'firstlight_shop_v1'});if(game.state.meadowAway)game.act('returnMeadow');game.act('tutorial',{done:true});importMeadow();seenPatrolResolution=game.state.recentPatrolResolution?.id||null;seenChapterClear=game.state.chapterClear?.id||null;seenChase=game.state.customerChaseResult?.id||null;
 shopNavigation=installShopNavigation({game,onError:e=>toast(e.message,true)});
 hub=createHub({game,getScene:()=>scene,act:action,toast,esc,evolve:beginEvolution,leave:()=>$('#return-to-game').click(),settings:{enterMeadow,importMeadow,notices:()=>shopNotices(game,game.state,{...seenNotice,build:seenNotice.buildTier===game.state.level?seenNotice.build:[]}),onVisit:markSeen,buildNotice:()=>buildNotice(game,game.state,seenNotice.buildTier===game.state.level?seenNotice.build:[]),volume:()=>shopMusic?.volume??40,quality:()=>quality,resetTest:()=>{resetMerchantOnly(localStorage);location.reload();},canResetTest:()=>['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('shopDev'),exportSave,recover:recoverSave,is2D:()=>view2d,switchView},onChange:()=>{game.uiBusy=evolutionInProgress||game.fortunePaused||hub?.isOpen;renderHUD();}});
 const trial=['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('shopDev');if(innerWidth<700)game.data.config.maxCustomers=6;
 await loadSpiritCards();actorVisuals=createActorVisuals($('#actor-reactions'),{onEventClick:()=>hub.open('event'),onComplaintClick:id=>hub.open('complaint',id),onFortuneClick:()=>hub.openFortune(),onStaffClick:id=>hub.open('exhausted',id)});window.shop=game;window.shopTrial=trial;window.addEventListener('focus',()=>{importMeadow();renderHUD();});
 const sceneFactory=view2d?createScene2D:createScene;document.body.classList.toggle('view-2d',view2d);
 scene=sceneFactory({canvas:$('#world'),game,
  onSelect:o=>{if(game.state.patrolFocus)return;if(o.type==='passer'){const r=action('greetPasser',{visitorId:o.id});if(r.ok)scene.greetPasser?.(o.id,game.state.passerInterest?.[o.id]?.converted);return;}if(o.type==='promoter'){hub.open('promoters');return;}if(o.type==='staff')hub.open('worker',o.id);else if(o.type==='shelf'&&scene.metrics.mode==='play'){if(game.state.phase==='open'&&!game.state.layoutPause)return;scene.setMode('decorate');scene.selectShelf(o.id);}},
  onStaffPositions:rows=>staffOverlay?.position(rows),
  onActorVisuals:view=>{const focus=game.state.patrolFocus?.employeeId;actorVisuals?.render(focus?{actors:view.actors.filter(v=>v.id===focus),notices:view.notices.filter(n=>n.targetId===focus)}:view);},
  onPlacementChange:p=>{$('#placement-hint').hidden=!p;if(p)$('#placement-message').textContent=p.ok?(p.wall?'點亮起的牆壁位置，再按 ✓':'點地板選位置，再按 ✓'):'這裡不能放：'+p.message;document.body.classList.toggle('placement-bad',!!p&&!p.ok);},
  onFurnitureSelect:sh=>{$('#rotate-furniture').hidden=!!sh?.mount;selectedShelf=sh&&!sh.decoration&&!sh.isPlacement?sh.id:null;$('#shelf-goods').hidden=!selectedShelf;$('#retract-furniture').hidden=!!sh?.isPlacement;document.body.classList.toggle('editing-furniture',!!sh&&!sh.lockedOnly);const el=$('#furniture-controls');el.hidden=!sh||!!sh.lockedOnly;},
  onFurniturePosition:p=>{if(!p)return;const el=$('#furniture-controls'),w=el.offsetWidth||148,h=el.offsetHeight||64,v=document.documentElement.clientWidth,vh=document.documentElement.clientHeight,bar=document.querySelector('header.topbar')?.getBoundingClientRect().bottom||0,dock=document.querySelector('nav.toolbar')?.getBoundingClientRect().top||vh;el.style.left=`${Math.max(w/2+8,Math.min(v-w/2-8,p.x))}px`;/* 控制列以 translateY(-100%) 掛在頭頂；太靠上就改到物件下方 */let top=p.y-8;if(top-h<bar+6)top=Math.min(dock-8,p.y+h+70);el.style.top=`${Math.max(bar+h+6,top)}px`;},
  onModeChange:mode=>{const patrol=mode==='follow',decorate=mode==='decorate';document.body.classList.toggle('patrol-active',patrol);document.body.classList.toggle('decorate-active',decorate);$('#patrol-controls').hidden=!patrol;patrolControls?.reset();if(patrol&&game.state.layoutPause)action('setLayoutPause',{value:false});},
  onActionResult:r=>toast(r.message,!r.ok),onError:e=>toast('模型載入異常：'+(e.message||e),true)});
 window.shopScene=scene;window.shopHub=hub;
 staffOverlay=createStaffOverlay({game,labels:$('#staff-labels'),card:$('#staff-card'),escape:esc,onEventClick:()=>hub.open('event'),onOpen:id=>hub.open('worker',id)});staffOverlay.render();
 patrolControls=installPatrolControls({joystick:$('#joystick'),stick:$('#stick'),scene});scene.setMode('play');renderHUD();await scene.ready;await gate.wait(scene);gate.dispose();$('#loading').setAttribute('aria-busy','false');$('#loading').style.display='none';document.body.classList.remove('app-loading');
 let last=performance.now(),ui=0;function frame(now){requestAnimationFrame(frame);const elapsed=(now-last)/1000,dt=Math.min(.1,elapsed);last=now;if(document.hidden||document.body.classList.contains('orientation-blocked')||shopNavigation?.leaving)return;try{if(!evolutionInProgress&&!$('#confirm').open){const result=game.tick(dt,elapsed);if(result&&!result.ok)toast(result.message,true);}scene.update(dt);}catch(e){if(!window.lastShopError){console.error(e);toast('執行發生錯誤：'+e.message,true);window.lastShopError=e.message;}}ui+=dt;if(ui>.5){ui=0;renderHUD();staffOverlay?.render();if(hub.isOpen&&['chapter','upgrade','daily'].includes(document.querySelector('#hub')?.dataset.page))hub.render();}}requestAnimationFrame(frame);
 if(innerWidth<700)scene.setQuality?.('low');
}catch(e){console.error(e);gate?.dispose();$('#loading').innerHTML=`<h2>商會素材尚未就緒</h2><p>${esc(e.message)}</p><button id="retry-shop">重新載入</button><button id="reset-shop">重置商會並重試</button>`;$('#retry-shop').onclick=()=>location.reload();$('#reset-shop').onclick=()=>{resetMerchantOnly(localStorage);location.reload();};}}
boot();
