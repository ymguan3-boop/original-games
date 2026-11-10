/* 2D 版下方常駐面板：上面一條顯示最該處理的事（事件 → 顧客問題 → 章節目標），下面是員工卡。
 * 只有名單變動才重建卡片，平常只更新文字，員工 GIF 才不會一直重播。 */
import {activeEvent} from './economy-v2.js?v=20261110-shop-pk-r1';
import {spiritArtPath} from './spirit-cards.js?v=20261110-shop-pk-r1';
import {chapterObjectives} from './shop-chapters.js?v=20261110-shop-pk-r1';
import {getCustomerComplaint} from './customer-complaints.js?v=20261110-shop-pk-r1';
import {staffEvolutionInfo} from './staff-evolution.js?v=20261110-shop-pk-r1';
import {capacityOf} from './management.js?v=20261110-shop-pk-r1';

const SLOTS=4;
export function createDock({game,hub,esc}){
 const root=document.createElement('section');root.id='dock2d';root.setAttribute('aria-label','員工狀態與目前目標');
 root.innerHTML='<button type="button" class="dock-goal"><b></b><small></small></button><div class="dock-staff"></div>';
 document.querySelector('.toolbar').before(root);
 const goal=root.querySelector('.dock-goal'),list=root.querySelector('.dock-staff');let rosterKey='',goalTap=()=>{};
 const job=id=>id==='standby'?'備用':game.data.management.jobs[id]?.name||id;
 goal.onclick=()=>goalTap();
 list.addEventListener('click',e=>{const b=e.target.closest('[data-staff],[data-hire]');if(!b)return;if(b.dataset.staff)hub.open('worker',b.dataset.staff);else hub.open('hire');});
 list.addEventListener('error',e=>{const i=e.target;if(i.dataset?.fallback&&i.getAttribute('src')!==i.dataset.fallback)i.src=i.dataset.fallback;},true);
 const face=e=>`<span class="dock-face"><img src="./assets/staff-gifs/${esc(e.spiritId)}.gif" data-fallback="${esc(spiritArtPath(e.spiritId))}" alt=""><i class="dock-ready" hidden>✨</i></span>`;
 function renderGoal(s){
  if(s.phase==='open'&&s.layoutPause){goal.dataset.tone='alert';goal.children[0].textContent='暫停營業中，顧客正在等候';goal.children[1].textContent='點這裡恢復';goalTap=()=>hub.open('build');return;}
  const issue=s.customers.map(c=>[c,getCustomerComplaint(s,c,game)]).find(x=>x[1]);
  if(s.event){goal.dataset.tone='alert';goal.children[0].textContent='待處理：'+s.event.title;goal.children[1].textContent='點這裡處理';goalTap=()=>hub.open('event');return;}
  if(issue){goal.dataset.tone='alert';goal.children[0].textContent='顧客：'+issue[1].title;goal.children[1].textContent=issue[1].customerName||'點這裡協助';goalTap=()=>hub.open('complaint',issue[0].id);return;}
  const mk=activeEvent(s);if(mk&&s.phase==='open'&&(s.totalTime||0)%20<6){goal.dataset.tone='';goal.children[0].textContent='📢 '+mk.title;goal.children[1].textContent=`剩 ${mk.endDay-s.day+1} 天`;goalTap=()=>hub.open('market');return;}
  const c=chapterObjectives(s,game.data.levels),g=c.goals.find(x=>!x.done);goal.dataset.tone='';goal.children[0].textContent=g?g.title:'本章目標已完成';goal.children[1].textContent=g?`${Math.floor(Math.min(g.value,g.target))}/${g.target}`:'準備升級';goalTap=()=>hub.open('chapter');
 }
 function renderStaff(s){
  const key=s.employees.map(e=>e.id+':'+e.spiritId).join(',');
  if(key!==rosterKey){rosterKey=key;const empty=Math.max(0,SLOTS-s.employees.length);list.innerHTML=s.employees.map(e=>`<button type="button" class="dock-card" data-staff="${esc(e.id)}">${face(e)}<b></b><small class="dock-job"></small><small class="dock-level"></small><span class="dock-bar"><i></i></span></button>`).join('')+Array.from({length:empty},()=>'<button type="button" class="dock-card add" data-hire="1"><b>＋</b><small>招聘</small></button>').join('');}
  for(const e of s.employees){const c=list.querySelector(`[data-staff="${CSS.escape(e.id)}"]`);if(!c)continue;c.querySelector('b').textContent=e.name;c.querySelector('.dock-job').textContent=job(e.role);c.querySelector('.dock-level').textContent=`Lv.${e.workLevel}`;c.querySelector('.dock-bar i').style.width=Math.min(100,Math.round(e.fatigue||0))+'%';c.querySelector('.dock-ready').hidden=!staffEvolutionInfo(game.data,e).eligible;}
  root.dataset.staffCount=s.employees.length+'/'+capacityOf(game,s);
 }
 const render=()=>{if(!game.state)return;renderGoal(game.state);renderStaff(game.state);};
 const timer=setInterval(render,400);render();
 return {render,dispose(){clearInterval(timer);root.remove();}};
}
