/* 升級演出：彩帶與金幣動畫，列出這一級解鎖的內容與下一級條件。 */
import {shelfTypes} from './furniture.js?v=20261114-v49';
import {decorTypes} from './decorations.js?v=20261114-v49';
import {PROMOTERS} from './promoters.js?v=20261114-v49';
import {chapterObjectives} from './shop-chapters.js?v=20261114-v49';
export function showLevelUp(game,clear,esc){
 const s=game.state,d=game.data,lv=clear.level,prev=d.levels[lv-2],cur=d.levels[lv-1],name=id=>d.spirits.find(x=>x.id===id)?.name||id;
 const unlocked=[
  ...(cur&&prev&&cur.capacity>prev.capacity?[`在班人數上限 ${prev.capacity} → ${cur.capacity}`]:[]),
  ...shelfTypes.filter(t=>t.level===lv).map(t=>`新貨架：${t.name}`),
  ...decorTypes.filter(t=>t.level===lv).map(t=>`新裝潢：${t.name}`),
  ...d.catalog.filter(c=>c.unlockStoreLevel===lv&&c.isSellable).map(c=>`新商品：${c.displayName}`),
  ...PROMOTERS.filter(p=>p.level===lv).map(p=>`新宣傳員：${name(p.id)}`)
 ];
 const next=chapterObjectives(s,d.levels);
 const node=document.createElement('section');node.className='levelup';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','商會升級');
 node.innerHTML=`<div class="levelup-rays" aria-hidden="true"></div><div class="levelup-coins" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--x:${(i*53)%100}%;--d:${(i%6)*.12}s;--r:${(i*37)%360}deg"></i>`).join('')}</div>
 <div class="levelup-card"><small>商會升級</small><h2>Lv.${lv} ${esc(clear.title)}</h2>
 <h3>本級解鎖</h3><ul>${(unlocked.length?unlocked:['商會外觀與內裝升級']).map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
 <h3>${next.last?'已是最高等級':`升到 Lv.${lv+1} ${esc(d.levels[lv]?.name||'')} 需要`}</h3>${next.last?'':`<ul>${next.goals.map(g=>`<li>${esc(g.title)}：${Math.floor(Math.min(g.value,g.target))}/${g.target}</li>`).join('')}<li>施工費用 ${Number(next.cost).toLocaleString('zh-TW')} G</li></ul>`}
 <button type="button" class="levelup-ok">太好了！</button></div>`;
 document.body.append(node);const close=()=>node.remove();node.querySelector('.levelup-ok').onclick=close;node.addEventListener('click',e=>{if(e.target===node)close();});node.querySelector('.levelup-ok').focus({preventScroll:true});
 return close;
}
