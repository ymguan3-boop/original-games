import{auctionState,auctionProducts,AUCTION_RULES}from'./plaza-auction.js?v=20261114-v57r2';
export function installPlazaAuction({game,toast,onOpen=()=>{}}){
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('../plaza-auction.css',import.meta.url).href;document.head.append(style);
 const dialog=document.createElement('dialog');dialog.className='plaza-auction';dialog.setAttribute('aria-label','廣場競價大戰');document.body.append(dialog);
 let draft=0,drag=null;
 const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function close(){dialog.close();game.auctionPaused=false;document.body.classList.remove('auction-open');}
 function act(type,p={}){const r=game.act(type,p);if(!r.ok)toast(r.message,true);render();return r;}
 function render(){
  const s=game.state,a=auctionState(s),q=a.session,result=a.played?a.result:null;
  const buttons=[];let body='';
  if(q){
   if(!Number.isFinite(draft)||draft<q.cost||draft>q.budget)draft=q.player;
   const icon=/^(sword|knife|blades|guns)-/.test(q.sku)?q.sku.split('-')[0]+'-starter':q.sku;
   body=`<p class="auction-rule">低價得標 · 同價由商販得標 · 最多 3 回合</p><h3><img class="auction-product" src="./assets/icons-v12/product-${esc(icon)}.webp" alt="">${esc(q.name)} × ${q.qty}</h3><div class="auction-prices"><div>你的報價<strong id="auction-price">${draft} G</strong></div><div>金幣商販<strong>${q.opponent} G</strong></div></div><p>第 ${q.round} / 3 回合 · 單件成本 ${q.cost} G<br>顧客預算上限 ${q.budget} G</p><label>調整單件報價<input id="auction-bid" aria-label="單件報價" type="range" min="${q.cost}" max="${q.budget}" step="1" value="${draft}"></label><p id="auction-profit">預估訂單毛利 ${(draft-q.cost)*q.qty} G</p><small>確認後本回合不可重選；訂單本身不享毛利加成。</small>`;
   const bid=final=>{const r=act('auctionBid',{sessionId:q.id,round:q.round,price:draft,final});if(r.ok&&game.state.plazaAuction.session)draft=game.state.plazaAuction.session.player;};
   buttons.push([q.round===3?'確認最終報價':'提交本回合',()=>bid(false)],...(q.round<3?[['直接決標',()=>bid(true)]]:[]),['暫存離開',close],['放棄本局',()=>{act('auctionAbandon');close();}]);
  }else if(result){
   body=`<div class="auction-result ${result.won?'won':'lost'}"><h3>${result.won?'競價成功！':'競價失敗！'}</h3><p>${esc(result.name)} × ${result.qty}<br>你 ${result.player} G ／商販 ${result.opponent} G</p><strong>今日此商品來客 ${result.traffic>0?'+':''}${Math.round(result.traffic*100)}%</strong><p>${result.won?`正毛利 +${Math.round(result.profit*100)}%<br>訂單收入 ${result.income} G（已入帳）`:'沒有扣款、沒有扣庫存。<br>下次商販更可能讓價。'}</p></div><small>當日效果在打烊日結後失效；明天可再次參加。</small>`;buttons.push(['返回商會',close]);
  }else{
   const n=auctionProducts(game,s).length;
   body=`<h3>金幣商販的挑戰</h3><p>對面地攤吸引了一些客人，來店率暫降 8%。你能用更漂亮的報價贏回生意嗎？</p><p>每日一次、最多三回合。訂單只從已解鎖且有庫存的商品抽選。開始後會列出數量、成本與預算，可先查看再決定。</p><p>勝：指定商品來客 +15～30%、正毛利 +10～30%，並交付額外訂單。<br>敗：指定商品來客 -15～30%，不扣款、不減售價。</p><small>連敗讓價傾向：+${Math.min(3,a.losses||0)*10} 個百分點；這不是保證勝率。可供貨商品 ${n} 種。</small>`;
   if(s.phase==='open'&&n)buttons.push(['查看今日訂單',()=>{draft=NaN;act('auctionStart');}]);else body+='<p class="auction-warning">請先開門營業並準備可販售的商品庫存。</p>';buttons.push(['稍後再來',close]);
  }
  dialog.innerHTML=`<header class="auction-drag"><span>廣場競價大戰</span><button aria-label="關閉競價視窗" data-close>×</button></header><div class="auction-content"><img class="auction-art" src="./assets/plaza-auction/stall.webp" alt="金幣商販的紅白棚攤位">${body}</div><footer>${buttons.map(([label],i)=>`<button data-choice="${i}">${esc(label)}</button>`).join('')}</footer>`;
  dialog.querySelector('[data-close]').onclick=close;dialog.querySelectorAll('[data-choice]').forEach(b=>b.onclick=buttons[+b.dataset.choice][1]);const slider=dialog.querySelector('input');if(slider)slider.oninput=()=>{draft=+slider.value;dialog.querySelector('#auction-price').textContent=draft+' G';dialog.querySelector('#auction-profit').textContent=`預估訂單毛利 ${(draft-q.cost)*q.qty} G`;};
 }
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('pointerdown',e=>{if(!e.target.closest('.auction-drag')||e.target.closest('button'))return;const r=dialog.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,l:r.left,t:r.top};dialog.setPointerCapture(e.pointerId);});
 dialog.addEventListener('pointermove',e=>{if(!drag)return;dialog.style.margin='0';dialog.style.left=Math.max(4,Math.min(innerWidth-dialog.offsetWidth-4,drag.l+e.clientX-drag.x))+'px';dialog.style.top=Math.max(4,Math.min(innerHeight-dialog.offsetHeight-4,drag.t+e.clientY-drag.y))+'px';});
 dialog.addEventListener('pointerup',()=>drag=null);
 return {open(){if(game.state.level<AUCTION_RULES.unlock){toast('廣場競價於 Lv.3 解鎖');return;}onOpen();game.auctionPaused=true;draft=game.state.plazaAuction?.session?.player??NaN;render();document.body.classList.add('auction-open');dialog.showModal();},close};
}

// Crisp DOM text, independent of 3D texture resolution; shared by both renderers.
export function showPasserReply(scene,id,converted){
 document.querySelector('.passer-reply')?.remove();const el=document.createElement('div');el.className='passer-reply';el.setAttribute('role','status');el.textContent=converted?'好啊，我進店看看！':'謝謝招呼！來店意願提高了。';document.body.append(el);
 const start=performance.now();let raf;
 const position=()=>{const actor=document.querySelector(`[data-passer-id="${id}"]`),r=actor?.getBoundingClientRect(),p=scene.metrics.passers?.find(p=>p.id===id),x=r?r.left+r.width/2:p?.screenX,y=r?r.top:p?.screenY-45;
  const w=el.offsetWidth,h=el.offsetHeight;el.style.left=Math.max(10,Math.min(innerWidth-w-10,(x||innerWidth/2)-w/2))+'px';el.style.top=Math.max(document.querySelector('.topbar')?.getBoundingClientRect().bottom||140,Math.min(innerHeight-h-90,(y||innerHeight/2)-h-8))+'px';
  if(performance.now()-start<4000&&el.isConnected)raf=requestAnimationFrame(position);else{cancelAnimationFrame(raf);el.remove();}};position();
}
