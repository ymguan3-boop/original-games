/* Full event explanation and genuine in-game choice buttons, kept inside a compact window. */
import {incidentSketch} from './incident-sketch.js';
const roleName={cashier:'收銀員',stocker:'補貨員',sales:'推銷員',smith:'鍛造師',warehouse:'倉管員',security:'保全員',cleaner:'清潔員',host:'迎賓員'};
export function incidentDetailPanel(game,escape,button){
 const event=game.state.event;if(!event)return '<p class="note">事件已結束，請點擊新的事件名稱查看。</p>';
 const person=game.state.employees.find(e=>e.role===event.role),who=person?.name||roleName[event.role]||'商會夥伴';
 const image=['cashier','stocker','sales','smith','warehouse','security','cleaner','host'].includes(event.role)?event.role:'question';
 const options=(event.choices||[]).slice(0,3).map(c=>`<div class="incident-choice">
  ${button(escape(c.label),'event',{id:event.id,choice:c.id},'primary',!!(c.cost>game.state.gold))}
  <small>${c.cost>game.state.gold?'金幣不足':escape(c.cost?'費用 '+c.cost+' G':'免費處理')}</small></div>`).join('');
 return `<article class="incident-presentation" data-incident-id="${escape(event.instanceId||event.id)}">
 <div class="incident-media" aria-label="事件動畫">
   <img class="incident-gif" src="./assets/event-gifs/${image}.gif" alt="${escape(event.title)}動態示意" loading="eager">
   ${incidentSketch(event,escape)}
 </div>
 <div class="incident-story"><span class="badge">${event.funny?'😂 搞笑事件':'⚠ 待處理事件'} · ${escape(who)}</span>
   <h3>${escape(event.title)}</h3>
   <p>${escape(event.dialogue||event.description||'選擇一項方式處理此事件。')}</p>
   <small>${escape(event.effectText||'完成後可改善商會營運')}</small>
 </div>
 <div class="incident-choices cols-${Math.min((event.choices||[]).length,3)}" role="group" aria-label="選擇處理方式">${options}</div>
 </article>`;
}
