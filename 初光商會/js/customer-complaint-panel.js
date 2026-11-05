/* Shared compact, no-scroll customer event stage with real in-game choices. */
import {getCustomerComplaint} from './customer-complaints.js';
import {incidentSketch} from './incident-sketch.js';
const gifs={stockout:'question',queue:'cashier',angry:'angry',disappointed:'question'};
export function customerComplaintPanel(game,customerId,escape,button){
 const c=game.state.customers.find(c=>c.id===customerId),info=getCustomerComplaint(game.state,c,game);
 if(!info)return '<p class="note">顧客已離開或問題已解決，請關閉此視窗。</p>';
 const image=gifs[info.kind]||'question';
 const choices=info.options.map((o,i)=>`<div class="incident-choice">
 ${button(escape(o.label)+(o.cost?' · '+o.cost+' G':''),'resolveCustomerComplaint',{customerId:c.id,choice:o.id},'primary',!!o.disabled)}
 <small>${escape(o.disabled?o.reason:o.detail+(o.cost===0?' · 疲勞 +5／其他 +1':''))}</small></div>`).join('');
 return `<article class="incident-presentation customer-incident" data-customer="${escape(c.id)}">
  <div class="incident-media" aria-label="顧客事件動畫">
   <img class="incident-gif" src="./assets/event-gifs/${image}.gif" alt="${escape(info.title)}動態示意" loading="eager">
   ${incidentSketch(info,escape)}
  </div>
  <div class="incident-story"><span class="badge">${escape(c.name)} · 顧客抱怨</span>
   <h3>${escape(info.title)}</h3><p>${escape(info.description)}</p>
  </div>
  <div class="incident-choices cols-${Math.min(info.options.length,3)}" role="group" aria-label="選擇解決方法">${choices}</div>
 </article>`;
}
