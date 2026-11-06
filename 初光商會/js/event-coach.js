/* One-time, persisted explanations of store incidents and limited commissions. */
import {incidentSketch} from './incident-sketch.js?v=20261106-fx9';
import {requiresManagerPatrol} from './event-routing.js';
import {activeCommissions} from './commissions.js?v=20261106-fx9';
import {clampWindowRect,resizeWindowRect} from './window-controls.js?v=20261105-customer1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function movableCoach(box){
 const header=box.querySelector('.event-coach-head'),viewport=()=>({width:innerWidth,height:innerHeight});
 let rect=null,drag=null;
 const initial=()=>{const v=viewport(),w=Math.min(v.width-16,Math.max(280,v.width*.9),390),h=Math.min(v.height-16,Math.max(300,v.height*.52));
  const headerBottom=document.querySelector('.topbar')?.getBoundingClientRect().bottom||0;
  return clampWindowRect({width:w,height:h,left:(v.width-w)/2,top:Math.min(Math.max(10,headerBottom+8),v.height-h-8)},v);};
 const apply=value=>{const v=viewport(),maxW=Math.max(1,Math.min(v.width-16,v.width*.82,390)),maxH=Math.max(1,Math.min(v.height-16,v.height*.69,440));rect=clampWindowRect({...value,width:Math.min(value.width,maxW),height:Math.min(value.height,maxH)},v);for(const k of ['left','top','width','height'])box.style[k]=Math.round(rect[k])+'px';};
 const down=e=>{if(e.button!==0||e.target.closest('button'))return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...rect}};header.setPointerCapture?.(e.pointerId);};
 const move=e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();apply({...drag.start,left:drag.start.left+e.clientX-drag.x,top:drag.start.top+e.clientY-drag.y});};
 const end=e=>{if(!drag||drag.id!==e.pointerId)return;drag=null;header.hasPointerCapture?.(e.pointerId)&&header.releasePointerCapture(e.pointerId);};
 header.addEventListener('pointerdown',down);header.addEventListener('pointermove',move);header.addEventListener('pointerup',end);header.addEventListener('pointercancel',end);
 box.querySelector('[data-coach-smaller]').onclick=()=>apply(resizeWindowRect(rect||initial(),.83,viewport()));
 box.querySelector('[data-coach-larger]').onclick=()=>apply(resizeWindowRect(rect||initial(),1.2,viewport()));
 box.querySelector('[data-coach-reset]').onclick=()=>apply(initial());
 window.addEventListener('resize',()=>{if(rect)apply(rect);});
 return {show(){apply(rect||initial());}};
}
const ROLES={
 cashier:['🧾','收銀狀況','確認收銀員在崗、檢查排隊長度；必要時調整排班，再到「主管巡查」選擇處理方式。'],
 stocker:['📦','商品補貨','先到「商品採購」進貨，再確認貨架有陳列商品、補貨員有被指派。事件也可在「主管巡查」處理。'],
 sales:['💬','銷售狀況','檢查商品售價、推銷員職務與顧客預算，再到「主管巡查」處理。'],
 smith:['⚒','鍛造狀況','請檢查鍛造師疲勞與鍛造訂單，前往「主管巡查」處理。'],
 warehouse:['📋','庫房狀況','確認倉庫存貨及可行通道，再透過「主管巡查」協助。'],
 security:['⚠','保全狀況','留意店門與顧客動線，可指派保全員，再進入「主管巡查」。'],
 cleaner:['🧹','清潔狀況','安排清潔員維護環境，在「主管巡查」選擇協助或指導。'],
 host:['♫','迎賓狀況','看看迎賓員疲勞與現場客流，前往「主管巡查」協助。']
};
export function installEventCoach({game,openPanel,openAchievements=()=>openPanel('quests')}){
 const box=document.getElementById('event-coach');if(!box)return {sync(){}};
 const figure=box.querySelector('.event-coach-figure'),title=box.querySelector('h3'),desc=box.querySelector('p'),go=box.querySelector('[data-coach-go]'),later=box.querySelector('[data-coach-later]');
 let current=null;const floating=movableCoach(box);
 function select(s){
  const ev=s.event;
  // Customer shortages and queue complaints use the compact actionable guide instead.
  if(ev&&(['stockout','queue-complaint'].includes(ev.id)||requiresManagerPatrol(ev)))return null;
  if(ev&&!s.tutorialSeen?.['event-'+ev.id]){
   const [icon,group,help]=ROLES[ev.role]||['!','商會事件','查看主管巡查並選擇對應處理方式。'];
   const shortage=ev.id==='stockout';
   return {id:'event-'+ev.id,event:ev,icon,title:'第一次遇到｜'+ev.title,desc:shortage?'顧客頭上的問號代表缺貨。先檢查「商品採購」和貨架庫存，並指派補貨員；再到「主管巡查」處理待辦事件。':group+'：'+help,panel:shortage?'goods':'manager',button:shortage?'前往商品採購':'前往主管巡查'};
  }
  const board=s.commissionBoard;
  // Live commission guidance is now handled by the compact actionable event card.
  // Do not stack the old first-commission coach over the new mission prompt.
  const claimable=game.questList().some(q=>q.done&&!s.quests[q.id]);
  if(claimable&&!s.tutorialSeen?.['first-achievement'])
   return {id:'first-achievement',event:{title:'首次商會成就',role:'sales',emoji:['⭐','🎁','🥳'],animation:'pop',effect:'morale',effectText:'完成成就可領獎'},icon:'★',title:'首次商會成就可領獎',desc:'你的商會已經達成一項成就。打開「商會委託」的「商會成就」分頁，點擊領取金幣，獎勵只能領取一次。',panel:'quests',button:'查看商會成就'};
  return null;
 }
 function acknowledge(open){
  if(!current)return;const target=current;current=null;box.hidden=true;
  box.classList.remove('active');document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
  const result=game.act('ackTutorial',{id:target.id});
  if(result.ok&&open){if(target.id==='first-achievement')openAchievements();else openPanel(target.panel);}
 }
 go.addEventListener('click',()=>acknowledge(true));later.addEventListener('click',()=>acknowledge(false));box.querySelector('[data-coach-close]').addEventListener('click',()=>acknowledge(false));
 function sync(s=game.state){
  if(s.patrolFocus||document.body.classList.contains('patrol-recovering')||document.querySelector('dialog[open]')||document.hidden){box.hidden=true;box.classList.remove('active');return;}
  const item=select(s);if(!item){current=null;box.hidden=true;box.classList.remove('active');document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));return;}
  if(current?.id===item.id&&!box.hidden)return;
  current=item;figure.innerHTML=incidentSketch(item.event||{},esc);title.textContent=item.title;desc.textContent=item.desc;go.textContent=item.button;box.hidden=false;box.classList.add('active');floating.show();
  document.querySelectorAll('.tutorial-focus').forEach(el=>el.classList.remove('tutorial-focus'));
  document.querySelector('.toolbar [data-panel="'+item.panel+'"]')?.classList.add('tutorial-focus');
 }
 return {sync};
}
