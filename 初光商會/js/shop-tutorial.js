import {canStartTutorial} from './shop-entry-rules.js?v=20261110-shop-pk-r1';
/* 首次進商會的新手引導：一次一個目標，動作完成才過關。進度存在 tutorialState，重新整理會接續。 */
const seq=['orient','tour-build','tour-staff','promoter','tour-tasks','tour-shop','shelf','goods','hire','assign','open','sale','reward','evolve','events','patrol','patrol-back','home'];
const STEPS={
 orient:{title:'用手機玩嗎？',text:'商會建議直立遊玩，單手就能經營。也可以切換全螢幕。',info:true,fullscreen:true},
 'tour-build':{title:'布置',text:'買貨架、家具和裝飾，自由擺放。現在實際擺一座貨架：布置 → 貨架 → 選一座 → 點地板放置，再按 ✓。',done:s=>!!s.tutorialState?.placed,focus:['#finish-decorate','#hub [data-label="購買並擺放"]','#hub [data-tutor=rack]','#hub [data-label^="貨架"]','.toolbar [data-hub=build]']},
 'tour-staff':{title:'員工',text:'招聘夥伴、安排職務和進化。現在實際招聘一位：員工 → 招聘 → 選一位 → 聘用。',done:s=>!!s.tutorialState?.hired,focus:['#hub [data-label="聘用"]','#hub [data-tutor=hire]','#hub [data-label^="招聘"]','.toolbar [data-hub=staff]']},
 promoter:{title:'招聘宣傳員',text:'首次聘請免費，而且必須有一位門口宣傳員才能營業。員工 → 招聘 → 最上方的「宣傳員」，挑一位幻靈吉祥物聘請。牠會在門口附近走動，向路過的客人打招呼。',done:s=>!!s.promoter,focus:['#hub [data-label$="聘請"]','#hub [data-tutor=promoter-pick]','#hub [data-tutor=promoter]','#hub [data-label^="招聘"]','.toolbar [data-hub=staff]']},
 'tour-tasks':{title:'任務',text:'每日任務、委託和事件都在這裡。',info:true,focus:['.toolbar [data-hub=tasks]'],show:true},
 'tour-shop':{title:'商會',text:'升級、主管巡查和返回初光鎮。',info:true,focus:['.toolbar [data-hub=shop]'],show:true},
 shelf:{title:'擺第一個貨架',text:'布置 → 貨架 → 選一座 → 點地板放置，再按 ✓。',done:s=>s.shelves.length>0,focus:['#finish-decorate','#hub [data-label="購買並擺放"]','#hub [data-tutor=rack]','#hub [data-label="貨架"]','.toolbar [data-hub=build]']},
 goods:{title:'選商品',text:'貨架會自動上貨。之後點店內貨架，可以換販售的商品。',info:true},
 hire:{title:'招聘第一位夥伴',text:'員工 → 招聘。招聘過的夥伴不會再出現。',done:s=>s.employees.length>0,focus:['#hub [data-label="聘用"]','#hub [data-tutor=hire]','#hub [data-label="招聘"]','.toolbar [data-hub=staff]']},
 assign:{title:'安排工作',text:'員工 → 編組與職務，按一鍵最佳配置。在班時經驗累積較快。',done:s=>s.tutorialState?.assigned,focus:['#hub [data-label^="一鍵最佳配置"]','#hub [data-label^="編組與職務"]','.toolbar [data-hub=staff]']},
 open:{title:'親手開門營業',text:'準備好了，點下方「開門營業」，顧客才會從小路走來。',done:s=>s.phase==='open',focus:['#start-business']},
 sale:{title:'等第一筆交易',text:'顧客會自己選購、排隊、付款。等他們結帳吧！',done:s=>(s.totals?.sales||0)>=1},
 reward:{title:'領任務獎勵',text:'任務 → 每日任務，領取第一筆交易的獎勵。',done:s=>!!s.quests?.sale,focus:['#hub [data-tutor=quest]','#hub [data-label^="每日任務"]','.toolbar [data-hub=tasks]']},
 evolve:{title:'熟練與進化',text:'夥伴工作會累積經驗，熟練 Lv.4、Lv.8 時到「進化」手動進化。',info:true,focus:['.toolbar [data-hub=staff]'],show:true},
 events:{title:'事件',text:'事件出現時「任務」會亮起，最多兩個選項，不會打斷經營。',info:true,focus:['.toolbar [data-hub=tasks]'],show:true},
 patrol:{title:'主管巡查',text:'商會 → 主管巡查。主角會從門口進場，用搖桿走動。',done:s=>s.tutorialState?.patrolled,focus:['#hub [data-label^="主管巡查"]','.toolbar [data-hub=shop]']},
 'patrol-back':{title:'返回商會',text:'逛完後按「返回商會」回到總覽。',done:s=>s.tutorialState?.patrolReturned,focus:['#camera-mode'],show:true},
 home:{title:'返回初光鎮',text:'想回去時：上方快捷列 → 初光鎮。進度會先存好，也隨時能再回來。',info:true,last:true,focus:['#return-to-game'],show:true}
};
export const TUTORIAL_STEPS=seq;
export function installTutorial({game,act,confirmSkip,fullscreen}){
 const box=document.getElementById('tutor'),[title,text]=[box.querySelector('strong'),box.querySelector('p')],next=box.querySelector('[data-next]'),skip=box.querySelector('[data-skip]'),full=box.querySelector('[data-full]');let focused=null;
 const setFocus=list=>{const el=(list||[]).map(q=>document.querySelector(q)).find(n=>n&&n.getClientRects().length)||null;if(el===focused)return;focused?.classList.remove('tutor-focus');el?.classList.add('tutor-focus');focused=el;};
 const go=id=>act('tutorial',{patch:{step:id}});
 const after=id=>{const i=seq.indexOf(id);return i<seq.length-1?seq[i+1]:null;};
 const finish=()=>act('tutorial',{done:true});
 next.onclick=()=>{const raw=game.state.tutorialState.step,id=raw==='welcome'?'orient':raw,following=after(id);following?go(following):finish();sync();};
 skip.onclick=()=>confirmSkip(()=>{finish();sync();});full.onclick=fullscreen;
 /* Only an empty shop may begin/restart onboarding. A shelf placed during this session does not interrupt it. */
 if(!canStartTutorial(game.state)&&!game.state.tutorialState?.done)finish();
 /* 未完成就離開：下次進來從頭開始 */
 if(game.state.tutorialState&&!game.state.tutorialState.done&&game.state.tutorialState.step!=='welcome')act('tutorial',{patch:{step:'welcome',placed:false,hired:false,assigned:false,patrolled:false,patrolReturned:false}});
 const allowed=t=>{if(!t||box.contains(t)||!focused||focused.contains(t))return true;if(t.closest?.('#hub [data-close],.fortune-mask,#loading-gate,#furniture-controls'))return true;if(document.body.classList.contains('decorate-active')&&t.closest?.('canvas,#finish-decorate,.placement-controls'))return true;return false;};
 for(const ev of ['pointerdown','mousedown','touchstart','click'])document.addEventListener(ev,e=>{const st=game.state.tutorialState;if(!st||st.done||box.hidden)return;if(allowed(e.target))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();},{capture:true,passive:false});
 /* 選單換頁時重新找要框的按鈕 */
 let pending=0;const refocus=()=>{if(pending)return;pending=requestAnimationFrame(()=>{pending=0;const t=game.state.tutorialState;if(!t||t.done)return;const step=STEPS[t.step==='welcome'?'orient':t.step];if(step)setFocus(step.focus);});};
 {const mo=new MutationObserver(refocus),hubEl=document.getElementById('hub');if(hubEl)mo.observe(hubEl,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});mo.observe(document.body,{attributes:true,attributeFilter:['class']});}
 function sync(){skip.disabled=!game.state.promoter;skip.title=skip.disabled?'請先完成免費聘請門口宣傳員':'';const t=game.state.tutorialState;if(!t||t.done){box.hidden=true;document.body.removeAttribute('data-tutorial');setFocus(null);return;}
  let id=t.step==='welcome'?'orient':t.step;const step=STEPS[id];if(!step){finish();return;}
  if(step.done?.(game.state)){const following=after(id);following?go(following):finish();return;}
  document.body.dataset.tutorial=step.show?'show':'task';title.textContent=step.title;text.textContent=step.text;next.hidden=!step.info;next.textContent=step.last?'完成教學':'下一步';full.hidden=!step.fullscreen;box.hidden=false;setFocus(step.focus);}
 return {sync};
}
