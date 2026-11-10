/* Native HTML text stays sharp on high-DPI mobile screens (no low-res CanvasTextures). */
export const REACTIONS={
 question:['?','缺貨','question'],confused:['?','找不到','question'],
 impatient:['⌛','快沒耐心','warning'],angry:['💢','生氣了','angry'],
 happy:['♥','買到了','happy'],greet:['👋','歡迎光臨！','happy'],training:['✦','訓練中','training'],
 proud:['★','受到表揚','happy'],stressed:['!','忙不過來','angry'],
 bored:['Zzz','無聊','tired'],sleep:['☾','休息','tired'],
 work:['✓','努力工作','happy'],restock:['▣','補貨中','training'],
 tired:['💤','疲勞','tired'],event:['!','事件待處理','warning'],
 'event-cashier':['!','收銀事件','warning'],'event-stocker':['▣','補貨事件','warning'],
 'event-sales':['!','推銷事件','warning'],'event-smith':['⚒','鍛造事件','warning'],
 'event-warehouse':['▤','庫房事件','warning'],'event-security':['!','保全事件','warning'],
 'event-cleaner':['✧','清潔事件','warning'],'event-host':['♫','迎賓事件','warning'],
 silly:['😂','搞笑狀況','funny'],laugh:['😄','笑翻了','funny'],surprised:['!','嚇一跳','warning'],wake:['‼','驚醒了！','warning']
};
export function moodTone(kind){return REACTIONS[kind]?.[2]||'neutral';}
export function createActorVisuals(host,{onEventClick=()=>{},onComplaintClick=()=>{}}={}){
 const statuses=new Map(),popups=new Map(),seen=new Set();let initialized=false,vw=innerWidth,vh=innerHeight;globalThis.addEventListener?.('resize',()=>{vw=innerWidth;vh=innerHeight;});
 const make=(cls)=>{const el=document.createElement('div');el.className=cls;host.append(el);return el;};
 const visible=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&p.x>=-30&&p.x<=vw+30&&p.y>=0&&p.y<=vh+30&&p.inFront!==false;
 function render({actors=[],notices=[]}={}){
  const positions=new Map(actors.map(a=>[a.id,a]));
  for(const a of actors){if(!a.kind||!REACTIONS[a.kind]||!visible(a))continue;
   let node=statuses.get(a.id);if(!node){node=make('actor-reaction');const glyph=document.createElement('span'),caption=document.createElement('b');glyph.className='actor-reaction-icon';caption.className='actor-reaction-text';node.append(glyph,caption);
 node.addEventListener('click',()=>{if(node.dataset.complaintId)onComplaintClick(node.dataset.complaintId);else if(node.dataset.eventId)onEventClick(node.dataset.eventId);});
 node.addEventListener('keydown',e=>{if((node.dataset.complaintId||node.dataset.eventId)&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(node.dataset.complaintId)onComplaintClick(node.dataset.complaintId);else onEventClick(node.dataset.eventId);}});
 statuses.set(a.id,node);}
   const spec=REACTIONS[a.kind];if(node.dataset.kind!==a.kind){node.dataset.kind=a.kind;node.dataset.tone=spec[2];node.children[0].textContent=spec[0];node.children[1].textContent=spec[1];}node.children[0].textContent=a.chaseTarget?'🏃':spec[0];if(a.chaseTarget)node.dataset.chaseTarget='true';else delete node.dataset.chaseTarget;
   const eventId=a.eventId||'',complaintId=a.complaintId||'';
   if(complaintId||eventId){
    if(complaintId){node.dataset.complaintId=complaintId;delete node.dataset.eventId;}
    else{node.dataset.eventId=eventId;delete node.dataset.complaintId;}
    const title=complaintId?a.complaintTitle||spec[1]:a.eventTitle||spec[1];
    node.children[1].textContent=title;node.title='點擊查看並解決：'+title;
    node.setAttribute?.('role','button');node.setAttribute?.('tabindex','0');
    node.setAttribute?.('aria-label','查看並處理'+title);
   }else{
    if(node.dataset.eventId||node.dataset.complaintId)node.children[1].textContent=spec[1];
    delete node.dataset.eventId;delete node.dataset.complaintId;
    node.removeAttribute?.('role');node.removeAttribute?.('tabindex');node.removeAttribute?.('aria-label');node.removeAttribute?.('title');
   }
   node.style.left=a.x+'px';node.style.top=(a.y-6)+'px';node.hidden=false;
  }
  for(const [id,node]of statuses)if(!positions.has(id)||!positions.get(id).kind||!visible(positions.get(id)))node.hidden=true;
  const now=performance.now();
  if(!initialized){for(const n of notices)seen.add(n.id);initialized=true;}
  for(const n of notices){if(seen.has(n.id))continue;seen.add(n.id);const a=positions.get(n.targetId);if(!a||!visible(a))continue;const node=make('actor-floating-number');node.textContent=String(n.text).slice(0,30);node.dataset.tone=['bad','good','xp','level','funny'].includes(n.tone)?n.tone:'good';popups.set(n.id,{node,born:now,targetId:n.targetId});}
  if(seen.size>180){seen.clear();for(const n of notices)seen.add(n.id);}
  for(const [id,p]of popups){const age=(now-p.born)/1000,a=positions.get(p.targetId);
   if(age>=2.2||!a||!visible(a)){p.node.remove();popups.delete(id);continue;}
   p.node.style.left=a.x+'px';p.node.style.top=(a.y-28-Math.min(age,2)*40)+'px';p.node.style.opacity=String(age<1.5?1:Math.max(0,(2.2-age)/.7));}
 }
 function dispose(){for(const n of statuses.values())n.remove();for(const p of popups.values())p.node.remove();statuses.clear();popups.clear();seen.clear();}
 return {render,dispose};
}
