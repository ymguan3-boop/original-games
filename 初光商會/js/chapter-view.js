import {chapterObjectives} from './shop-chapters.js';
export function chapterMissionPanel(game,esc,money,btn,{compact=false}={}){
 const s=game.state,info=chapterObjectives(s,game.data.levels),finished=info.goals.filter(g=>g.done).length;
 const next=game.data.levels[s.level],heading=info.last?'最終傳奇挑戰':`通往 Lv.${s.level+1} ${esc(next.name)}`;
 const main=info.goals.map(goal=>`<div class="chapter-goal ${goal.done?'done':''}">
 <span>${goal.done?'✓':'◻'} ${esc(goal.title)}</span><strong>${Math.floor(Math.min(goal.value,goal.target)).toLocaleString()}/${goal.target.toLocaleString()}</strong>
 <progress value="${Math.min(goal.value,goal.target)}" max="${goal.target}" aria-label="${esc(goal.title)}"></progress></div>`).join('');
 const side=info.side.map(q=>`<article class="chapter-side ${q.claimed?'claimed':q.done?'ready':''}"><div><strong>${q.claimed?'✓':q.done?'★':'◇'} ${esc(q.title)}</strong><small>${Math.min(q.value,q.target)}/${q.target} · 獎勵 ${money(q.reward)}</small></div>${btn(q.claimed?'已領取':q.done?'領取獎勵':'未完成','claimChapterSide',{id:q.id},'primary',q.claimed||!q.done)}</article>`).join('');
 return `<section class="chapter-missions ${compact?'chapter-compact':''}">
 <div class="chapter-header"><span class="chapter-number">第 ${s.level} 章</span><div><h3>${esc(info.title)}</h3><p>${esc(info.story)}</p></div></div>
 <div class="chapter-main-head"><b>主線營業目標 · ${finished}/${info.goals.length}</b><small>${heading}</small></div>
 <div class="chapter-goals">${main}</div>
 <div class="chapter-readiness ${info.ready?'ready':''}">${info.last?(info.ready?'最終傳奇挑戰達成！':'累積交易、營業額與日結，迎接最終傳奇。'):info.construction?'升級施工中，完成後自動播放過關動畫':info.ready?s.gold>=info.cost?'主線完成，打烊後自動扣除升級費並開始施工':`主線已完成，尚需 ${money(Math.max(0,info.cost-s.gold))} 升級資金`:`完成所有主線後，可支付 ${money(info.cost)} 自動升級（施工中可正常查看進度）`}</div>
 ${compact?'':`<h3 class="chapter-side-head">支線挑戰 · 自由完成、不阻擋主線</h3><div class="chapter-sides">${side}</div>`}
 </section>`;
}
