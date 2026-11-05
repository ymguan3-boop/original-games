/* Focused incident detail, used by staff/customer head labels. */
import {incidentSketch} from './incident-sketch.js';
const roleName={cashier:'收銀員',stocker:'補貨員',sales:'推銷員',smith:'鍛造師',warehouse:'倉管員',security:'保全員',cleaner:'清潔員',host:'招待員'};
export function incidentDetailPanel(game,escape,button){
 const event=game.state.event;
 if(!event)return '<p class="note">這件事件已經結束。新的事件發生時，再點擊角色頭上的事件名稱即可查看。</p>';
 const employee=game.state.employees.find(e=>e.role===event.role);
 const who=employee?.name||roleName[event.role]||'商會夥伴';
 const options=(event.choices||[]).map(c=>button(escape(c.label),'resolveEvent',{choice:c.id},'primary')).join('');
 return `<article class="patrol-event incident-detail">
 ${incidentSketch(event,escape)}
 <div class="patrol-event-text"><span class="badge">${event.funny?'😂 趣味事件':'⚠ 商會待處理事件'}</span>
 <strong>${escape(event.title)}</strong>
 <p><b>發生對象：</b>${escape(who)}（${escape(roleName[event.role]||'顧客相關')}）</p>
 <p>${escape(event.dialogue||event.description||'請查看事件內容後選擇處理方式。')}</p>
 <p><b>處理結果：</b>${escape(event.effectText||'處理後可改善商會營運')}</p></div>
 <div class="actions">${options||'<p class="note">目前沒有需要處理的選項。</p>'}</div>
 </article>`;
}
