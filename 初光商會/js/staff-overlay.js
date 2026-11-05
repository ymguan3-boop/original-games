import {spiritCard} from './spirit-cards.js';
export function createStaffOverlay({game,labels,card,onAction,escape}){
 const nodes=new Map(),anchors=new Map();let selected=null;
 const esc=escape;
 function render(){
  const s=game.state;for(const [id,node]of nodes)if(!s.employees.some(e=>e.id===id)){node.remove();nodes.delete(id);}
  for(const e of s.employees){let node=nodes.get(e.id);if(!node){node=document.createElement('button');node.className='staff-head-label';node.hidden=true;node.dataset.staffId=e.id;labels.append(node);nodes.set(e.id,node);}node.setAttribute('aria-label',`${e.name}，熟練度等級 ${e.workLevel}，疲勞 ${Math.round(e.fatigue)}%`);const feedback=e.reactionUntil>s.totalTime?({training:'•̀_•́　專心練習',proud:'≧▽≦　謝謝主管',stressed:'＞﹏＜　忙不過來',bored:'－_－　等客中'})[e.feedbackKind]:null;node.innerHTML=`${s.event?.role===e.role?'<span class="staff-event-icon" aria-label="有事件待處理">⚠ 待處理</span>':''}${feedback?`<span class="staff-emotion ${e.feedbackKind}">${feedback}</span>`:''}<b>${esc(e.name)} · Lv.${e.workLevel}</b><span>疲勞 ${Math.round(e.fatigue)}%<i><em style="width:${e.fatigue}%"></em></i></span>`;node.classList.toggle('selected',e.id===selected);}
  if(selected)renderCard();
 }
 function renderCard(){const e=game.state.employees.find(e=>e.id===selected);if(!e)return close();if(card.contains(document.activeElement)&&document.activeElement.tagName==='SELECT')return;
  card.innerHTML=`<div class="staff-card-head"><strong>${esc(e.name)} <small>Lv.${e.workLevel}</small></strong><button data-close-staff aria-label="關閉員工狀態">×</button></div>${spiritCard(game.data.spirits.find(sp=>sp.id===e.spiritId),e.rarity,esc)}<div class="staff-card-stats"><span>熟練度 ${e.xp}/${e.workLevel*25}</span><span>士氣 ${Math.round(e.mood)}</span></div><div class="staff-xp"><i style="width:${Math.min(100,e.xp/(e.workLevel*25)*100)}%"></i></div><div class="staff-fatigue">疲勞 ${Math.round(e.fatigue)}%<i><em style="width:${e.fatigue}%"></em></i></div><label>職務 <select data-role="${esc(e.id)}" aria-label="${esc(e.name)}職務">${game.data.jobs.map(j=>`<option value="${j.id}" ${j.id===e.role?'selected':''}>${j.name}</option>`).join('')}</select></label><div class="staff-card-actions"><button data-action="train" data-payload='${JSON.stringify({employeeId:e.id})}'>訓練 ${game.data.config.trainCost}G</button><button data-action="praise" data-payload='${JSON.stringify({employeeId:e.id})}'>表揚</button><button data-action="rest" data-payload='${JSON.stringify({employeeId:e.id})}'>休息</button></div>`;
 }
 function position(rows){anchors.clear();for(const node of nodes.values())node.hidden=true;for(const p of rows){anchors.set(p.id,p);const node=nodes.get(p.id);if(node){node.style.left=`${p.x}px`;node.style.top=`${p.y-5}px`;node.hidden=p.id===selected||p.x<-30||p.x>innerWidth+30||p.y<130||p.y>innerHeight-70;}}
  if(selected){const p=anchors.get(selected);if(!p||p.y<100||p.y>innerHeight-60){card.hidden=true;return;}card.hidden=false;const width=card.offsetWidth||232,view=document.documentElement.clientWidth;card.style.left=`${Math.max(width/2+7,Math.min(view-width/2-7,p.x))}px`;card.style.top=`${Math.max(90,p.y-8)}px`;card.style.maxHeight=`${Math.max(80,Math.min(250,p.y-20))}px`;}
 }
 function show(id){selected=id;card.hidden=false;card.dataset.employeeId=id;render();position([...anchors.values()]);}
 function close(){selected=null;card.hidden=true;delete card.dataset.employeeId;for(const node of nodes.values())node.hidden=false;}
 labels.addEventListener('click',e=>{const b=e.target.closest('[data-staff-id]');if(b)show(b.dataset.staffId);});card.addEventListener('click',e=>{if(e.target.closest('[data-close-staff]'))close();});
 return {show,close,render,position,get selected(){return selected;}};
}
