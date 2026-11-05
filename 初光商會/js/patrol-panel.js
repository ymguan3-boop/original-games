/* Manager incident board: each role has a lightweight animated scene and recent actions. */
const ICONS={cashier:'🧾',stocker:'📦',sales:'💬',smith:'⚒',warehouse:'📋',security:'⚠',cleaner:'✨',host:'♫'};
const IMAGE={cashier:'queue',stocker:'boxes',sales:'praise',smith:'magic',warehouse:'boxes',security:'shoplift',cleaner:'cleaning',host:'praise'};
export function patrolPanel(game,esc,btn){
 const s=game.state,ev=s.event,roles={cashier:'收銀員',stocker:'補貨員',sales:'銷售員',smith:'鍛造師',warehouse:'倉管員',security:'保全員',cleaner:'清潔員',host:'迎賓員'};
 const icons={flow:'event-boxes.webp',show:'',forge:'event-magic.webp',shine:'event-cleaning.webp'};
 const active=ev?`<article class="patrol-event">
  <div class="event-illustration event-illustration-${esc(ev.role)}" role="img" aria-label="${esc(ev.title)}動畫示意">
   <img src="./assets/ui-generated/event-${IMAGE[ev.role]||'boxes'}.webp" alt="商會事件">
   <span class="event-illustration-mark">${ICONS[ev.role]||'!'}</span>
   <span class="event-illustration-spark">✦</span>
  </div><div><span class="badge">待處理事件</span><strong>${esc(ev.title||ev.id)}</strong><p>${esc(ev.dialogue||ev.description||'請選擇處理方式。')}</p></div>
  <div class="actions">${(ev.choices||[]).map(c=>btn(esc(c.label),'resolveEvent',{choice:c.id},'primary')).join('')}</div></article>`:'<div class="note">目前沒有待處理事件。</div>';
 const history=(s.incidentHistory||[]).slice(-8).reverse().map(i=>`<li><b>${esc(i.title)}</b><span>第 ${i.day} 天 · ${esc(i.choice)}</span></li>`).join('');
 return `<div class="patrol-start"><img src="./assets/art-v5/quest-patrol.webp" alt="巡店羅盤"><div><strong>走訪商會，照顧夥伴</strong><small>點員工查看狀態；WASD／手機搖桿移動</small></div><button id="walk-mode" class="primary">巡店 →</button></div>
 ${active}
 <h3>搭檔合作</h3><div class="cooperation-list">${game.data.combos.map(c=>{const ready=c.roles.every(r=>game.role(s,r)),cooldown=Math.max(0,Math.ceil((s.cooldowns[c.id]||s.cooldowns['combo-'+c.id]||0)-s.totalTime));return `<article class="cooperation-row"><img src="${c.id==='show'?'./assets/art-v6/welcome-bell.webp':'./assets/ui-generated/'+icons[c.id]}" alt="${esc(c.name)}"><div><strong>${esc(c.name)}</strong><small>${c.roles.map(r=>roles[r]).join('＋')}</small><span>${esc(c.description)}</span></div>${btn(!ready?'缺少職務':cooldown?`${cooldown}秒`:'發動','combo',{id:c.id},'primary',!ready||!!cooldown)}</article>`;}).join('')}</div>
 <details class="incident-history"><summary>最近處理紀錄（${(s.incidentHistory||[]).length}）</summary><ol>${history||'<li>尚無完成紀錄。</li>'}</ol></details>`;
}
