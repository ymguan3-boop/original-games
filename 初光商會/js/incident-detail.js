/* Full event explanation and genuine in-game choice buttons, kept inside a compact window. */
import {incidentSketch} from './incident-sketch.js?v=20261106-fx9';
import {eventEmployee} from './patrol-events.js';
import {requiresManagerPatrol,patrolEventInstructions} from './event-routing.js';
const roleName={cashier:'收銀員',stocker:'補貨員',sales:'推銷員',smith:'鍛造師',warehouse:'倉管員',security:'保全員',cleaner:'清潔員',host:'迎賓員'};
/* Display costs and penalties once. Event choices may be one, two or three. */
export function eventChoiceHint(choice,gold){
 const label=String(choice?.label||''),cost=Number(choice?.cost)||0;
 if(cost>gold)return '金幣不足';
 if(cost>0)return new RegExp(String(cost)+'\\s*(?:G|金幣|元)','i').test(label)?'':`費用 ${cost} G`;
 if(/疲勞|體力/.test(label)){
  return /其他員工|其餘員工/.test(label)?'':'其他員工疲勞 +2';
 }
 return '免費處理的體力代價：當事人疲勞 +8、其他員工 +2';
}

export function incidentDetailPanel(game,escape,button){
 const event=game.state.event;if(!event)return '<p class="note">事件已結束，請點擊新的事件名稱查看。</p>';
 const person=eventEmployee(game.state,event),who=person?.name||roleName[event.role]||'商會夥伴';
 const patrolOnly=requiresManagerPatrol(event),choices=patrolOnly?[]:(Array.isArray(event.choices)?event.choices:[]);
 const optionCount=Math.min(3,choices.length);
 const options=choices.slice(0,3).map(c=>{
  const cost=Number(c.cost)||0,disabled=cost>game.state.gold,hint=eventChoiceHint(c,game.state.gold);
  return `<div class="incident-choice">
   ${button(escape(c.label||'處理事件')+(hint?`<small class="incident-choice-hint">${escape(hint)}</small>`:''),'resolveEvent',{choice:c.id},'primary',disabled)}
  </div>`;
 }).join('');

 return `<article class="incident-presentation" data-incident-id="${escape(event.instanceId||event.id)}">
 <div class="incident-media" aria-label="事件動畫">
   ${incidentSketch(event,escape)}
 </div>
 <div class="incident-story"><span class="badge">${event.funny?'😂 搞笑事件':'⚠ 待處理事件'} · ${escape(who)}</span>
   <h3>${escape(event.title)}</h3>
   <p>${escape(event.dialogue||event.description||'選擇一項方式處理此事件。')}</p>
   <small>${escape(event.effectText||'完成後可改善商會營運')}</small>
 </div>
 ${patrolOnly?`<div class="patrol-required-note">${escape(patrolEventInstructions(event,{patrol:game.managerActive}))}</div><div class="incident-choices cols-1" role="group" aria-label="主管巡店專屬處理"><button type="button" id="patrol-required-go" class="primary">主管巡店</button></div>`:`<div class="incident-choices cols-${optionCount}" role="group" aria-label="選擇處理方式">${options||'<p class="note">此事件暫無可用處理選項，請返回商會等待更新。</p>'}</div>`}
 </article>`;
}
