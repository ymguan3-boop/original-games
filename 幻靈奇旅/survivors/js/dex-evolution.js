// Read the same evolution rules used by the battle. Training levels are separate.
export const CARD_GROUPS=[{id:'yellow',name:'黃卡'},{id:'purple',name:'紫卡'},{id:'red',name:'紅卡'}];
const excluded=new Set(['caterpie','metapod','butterfree','weedle','kakuna','beedrill']);
export function dexSpecies(spirits,catalog){
 const order=new Map(catalog.entries.map((s,i)=>[s.id,i]));
 return Object.values(spirits).filter(s=>!excluded.has(s.id)&&!s.id.startsWith('tower')).sort((a,b)=>CARD_GROUPS.findIndex(c=>c.id===(a.cardFrame||'yellow'))-CARD_GROUPS.findIndex(c=>c.id===(b.cardFrame||'yellow'))||(order.get(a.id)??999)-(order.get(b.id)??999));
}
export function nextEvolutions(id,data){const rule=data.evolution[id];return (Array.isArray(rule?.next)?rule.next:rule?.next?[rule.next]:[]).filter(next=>data.spirits[next]);}
export function evolutionSummary(id,data){const next=nextEvolutions(id,data),rule=data.evolution[id];if(!next.length)return '最終型態 · 無後續進化';return '戰局 Lv.'+(rule.level||4)+' → '+(rule.branch==='random'?'隨機進化（各 '+ +(100/next.length).toFixed(2)+'%）':next.map(id=>data.spirits[id].name).join('／'));}
export function familyPaths(id,data){
 const parents=child=>Object.keys(data.evolution).filter(parent=>data.spirits[parent]&&nextEvolutions(parent,data).includes(child));
 const roots=new Set();function ascend(current,seen=new Set()){if(seen.has(current))return;const p=parents(current);if(!p.length){roots.add(current);return;}for(const parent of p)ascend(parent,new Set([...seen,current]));}ascend(id);
 const paths=[];function descend(current,path=[]){if(path.includes(current))return;const next=nextEvolutions(current,data),chain=[...path,current];if(!next.length)paths.push(chain);else for(const child of next)descend(child,chain);}for(const root of roots)descend(root);return paths;
}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function evolutionDetail(id,data){
 const paths=familyPaths(id,data),fish=paths.some(path=>path.includes('kyogre'))||id==='mewtwo';
 const chains=paths.map(path=>'<li>'+path.map((node,i)=>{const previous=path[i-1],rule=data.evolution[previous],join=i?'<span class="evolution-arrow">→ 戰局 Lv.'+(rule.level||4)+(rule.branch==='random'?' · '+ +(100/nextEvolutions(previous,data).length).toFixed(2)+'%':'')+' →</span>':'';return join+'<button type="button" data-evolution-id="'+escape(node)+'"'+(node===id?' aria-current="true"':'')+'>'+escape(data.spirits[node].name)+'</button>';}).join('')+'</li>').join('');
 return '<section class="evolution-detail"><h3>副本進化關係</h3><p>'+escape(evolutionSummary(id,data))+'</p><ul class="evolution-chains">'+chains+'</ul>'+(fish?'<p class="evolution-fish">小金魚在<strong>戰局 Lv.4</strong>進化：金魚國王、金魚皇后<strong>各 50%</strong>，每次獨立隨機，不能指定，也不保證輪流出現。國王與皇后均為此分支最終型態，沒有 Lv.8 再進化。<br><strong>水蛟龍王</strong>需在主遊戲用國王、皇后卡片<strong>各 3 張</strong>向釣魚郎換魚飼料，再到河邊召喚並捕獲；副本進化不產生主遊戲卡片或魚飼料。</p>':'')+'<p class="compact-note">門檻以寵物的戰局等級判定；圖鑑永久培育不會直接觸發進化。進化後立即換成新型態的普攻、大絕與被動。</p></section>';
}
export function evolutionMechanics(){return '<details class="evolution-guide"><summary>副本進化怎麼進行？</summary><ol><li><strong>累積戰局經驗：</strong>拾取經驗掉落物後，存活出戰寵物獲得完整經驗，備戰寵物獲得 60%；再套用被動及經驗雙倍晶。每級需目前戰局等級 ×25 XP，溢出經驗保留。</li><li><strong>達到卡片所列等級：</strong>一般三階系列為 Lv.4、Lv.8；特殊系列依各卡「進化關係」列出的門檻。最終型態不再進化。</li><li><strong>出戰自動、備戰手動：</strong>出戰寵物達標後，在戰鬥可操作時自動播放進化動畫；備戰寵物可點肖像的進化標示，或長按卡片選「手動進化」。倒下時須先復活。若已超過多階門檻，會依序逐階進化。</li><li><strong>進化不花點數、卡片或素材：</strong>保留目前戰局等級、剩餘經驗、生命比例、大絕剩餘冷卻與原有培育加成；基本能力、招式與被動改用新型態。進化動畫期間暫停戰鬥。</li><li><strong>兩種等級分開：</strong>圖鑑花點數提升的是永久培育（最高 Lv.50，每 10 級強化被動），不是戰局等級。進化不會自動解鎖收藏，也不會改動主遊戲的圖鑑卡片庫存。</li><li><strong>保存與重開：</strong>繼續同局會保留等級與進化型態；死亡結算或重新挑戰後，寵物由編組型態、戰局 Lv.1 重新開始，永久培育仍保留。金魚的隨機結果在進化時存檔，重新整理同局不會重抽。</li></ol></details>';}
