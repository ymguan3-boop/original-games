/* 命運／機會卡：主管收銀時可決定本次營業機會是否抽卡，結果在交易中鎖定。
 * 結果由 applyFortune 在存檔交易內套用；畫面只負責翻牌。 */
import {ENTRANCE} from './nav.js?v=20261113-v39';

export const FORTUNE=[
 {id:'tip',deck:'機會',icon:'💰',title:'客人塞小費',text:'等到的客人心情大好，多給了小費。',gold:200,weight:5},
 {id:'wallet',deck:'機會',icon:'👛',title:'撿到錢包',text:'把客人掉的錢包還回去，收到一筆謝禮。',gold:500,weight:3},
 {id:'laugh',deck:'機會',icon:'😄',title:'排隊講笑話',text:'主角在隊伍旁講笑話，大家都笑了。滿意度 +2。',satisfaction:2,weight:4},
 {id:'zhaocai',deck:'機會',icon:'🐶',title:'招財來幫忙',text:'招財協助櫃台，收銀加速 25 秒，排隊顧客重新安心等待。',queue:'serve',checkout:25,weight:4},
 {id:'calm',deck:'機會',icon:'🎀',title:'付費安撫服務',text:'花費 25 G 準備小禮物，暫時清除排隊顧客的不耐。資金不足則無法發送，本次機會仍會結束。',cost:25,queue:'serve',weight:3},
 {id:'merchant',deck:'機會',icon:'🎁',title:'神秘商人',text:'路過的商人留下一箱貨，倉庫多了 5 件商品。',gift:5,weight:3},
 {id:'jam',deck:'命運',icon:'🧾',title:'收銀機卡紙',text:'收銀機卡住了，請人修理花了一筆錢。',gold:-150,weight:5},
 {id:'change',deck:'命運',icon:'🪙',title:'找錯錢',text:'手忙腳亂找錯錢，損失了一些營收。',gold:-300,weight:4},
 {id:'review',deck:'命運',icon:'😠',title:'留下負評',text:'等太久的客人在門口抱怨，滿意度 -2。',satisfaction:-2,weight:4},
 {id:'blackout',deck:'命運',icon:'⚡',title:'停電',text:'店裡突然停電，所有顧客立刻回家，員工留店繼續工作。',queue:'leave',weight:2},
 {id:'typhoon',deck:'命運',icon:'🌀',title:'颱風來襲',text:'強風灌進店裡，所有貨架都壞了，要重新購買。上架的商品已搬回倉庫。',typhoon:true,weight:1}
];
const QUEUE=['Queue','Checkout','Cart'];
export function pickFortune(rand=Math.random){const total=FORTUNE.reduce((n,f)=>n+f.weight,0);let r=rand()*total;for(const f of FORTUNE){r-=f.weight;if(r<0)return f;}return FORTUNE[0];}
/* 辨識排隊、收銀類客訴；安撫與主管抽卡各自處理。 */
export function isQueueComplaint(c,reason=''){return !!c&&(/排隊|收銀|等太久|等得/.test(`${reason||''} ${c.angerReason||''}`)||QUEUE.includes(c.state)&&(c.wait||0)>=Math.max(2,(c.patience||30)*.5));}

// A customer gets one opportunity per visit, with no reroll after drawing.
export function impatientQueue(s){return (s.customers||[]).filter(c=>['Queue','Checkout'].includes(c.state)&&!(c.calmUntil>s.totalTime)&&(c.wait||0)>=Math.max(2,(c.patience||30)*.5));}
export function fortuneAvailable(g,s){const op=s.fortuneOpportunity;return s.phase==='open'&&s.managerDuty==='cashier'&&!g.managerActive&&op?.source==='queue'&&op.day===s.day&&op.status==='pending'&&impatientQueue(s).some(c=>c.id===op.customerId);}
export function syncQueueFortune(g,s){
 const old=s.fortuneOpportunity;
 if(old?.status==='pending'&&!fortuneAvailable(g,s))old.status='expired';
 if(s.phase!=='open'||s.managerDuty!=='cashier'||g.managerActive||fortuneAvailable(g,s))return;
 const c=impatientQueue(s).find(c=>!c.fortuneOpportunityId);if(!c)return;
 const id=`queue-${s.day}-${c.id}`;c.fortuneOpportunityId=id;s.fortuneOpportunity={id,source:'queue',customerId:c.id,day:s.day,status:'pending'};
}
export function applyFortune(g,s,p){
 const opportunity=s.fortuneOpportunity;
 if(s.phase!=='open'||s.managerDuty!=='cashier'||g.managerActive)throw Error('只有主管正在櫃台收銀時可決定抽卡');
 if(!fortuneAvailable(g,s)||opportunity.id!==p.opportunityId)throw Error('這次機會已決定或已過期，不能重新選擇');
 if(p.decision!=='draw')throw Error('請選擇一張命運／機會卡');
 const f=pickFortune(()=>g.random(s));opportunity.status='drawn';opportunity.outcome=f.id;opportunity.result={...f};
 if(f.checkout)s.buffs.checkout=s.totalTime+f.checkout;
 const c=s.customers.find(x=>x.id===opportunity.customerId);if(c){c.fortuneDrawCount=(c.fortuneDrawCount||0)+1;delete c.fortuneDrawn;if(QUEUE.includes(c.state)){c.wait=0;c.emotion='happy';}}
 if(f.cost){if(s.gold<f.cost){opportunity.result.text='資金不足，無法準備安撫禮物；本次機會已結束。';return opportunity.result.text;}g.pay(s,f.cost);s.stats.expenses=(s.stats.expenses||0)+f.cost;}
 if(f.gold>0){s.gold+=f.gold;}else if(f.gold<0){const lost=Math.min(s.gold,-f.gold);s.gold-=lost;s.stats.expenses=(s.stats.expenses||0)+lost;}
 if(f.satisfaction)s.satisfaction=Math.max(0,Math.min(100,(s.satisfaction||0)+f.satisfaction));
 if(f.queue==='serve')for(const x of s.customers)if(QUEUE.includes(x.state)){x.wait=0;x.emotion='happy';x.calmUntil=Math.max(x.calmUntil||0,s.totalTime+20);}
 if(f.queue==='leave'){s.customers=[];s.spawnTimer=0;s.customerChase=null;s.incidents=(s.incidents||[]).filter(e=>e.role!=='customer'&&!e.customerId);if(s.event?.role==='customer'||s.event?.customerId)s.event=null;}
 if(f.gift){const pool=g.data.catalog.filter(i=>i.isSellable&&!i.isRestricted&&!i.lootOnly&&s.level>=i.unlockStoreLevel);const item=pool[Math.floor(g.random(s)*pool.length)]||pool[0];if(item)s.inventory[item.sku]=(s.inventory[item.sku]||0)+f.gift;}
 if(f.typhoon){for(const sh of s.shelves)s.inventory[sh.sku]=(s.inventory[sh.sku]||0)+(sh.stock||0);s.shelves=[];s.undo=null;for(const x of s.customers){x.basket=[];x.path=[];if(!['Leave','Paid'].includes(x.state)){x.state='Leave';x.timer=0;g.route?.(s,x,ENTRANCE);}}for(const x of s.employees){x.path=[];x.workTask=null;}}
 g.log?.(s,`${f.deck}卡「${f.title}」：${f.text}`);if(c)g.notice?.(s,c.id,`${f.icon} ${f.title}`,f.deck==='機會'?'good':'bad');
 return `${f.deck}卡：${f.title}`;
}

/* 翻牌畫面：兩張蓋著的卡，點一張翻開；onPick 回傳結果才顯示 */
export function showFortune({onPick,onClose=()=>{}}){
 if(!document.getElementById('fortune-style')){const st=document.createElement('style');st.id='fortune-style';st.textContent=`
.fortune-mask{position:fixed;inset:0;z-index:80;display:grid;place-items:center;background:rgba(40,24,12,.55);font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif}
.fortune-box{width:min(560px,calc(100vw - 32px));background:#fff8ea;border:4px solid #4a2e1c;border-radius:22px;box-shadow:0 6px 0 #4a2e1c;padding:18px 16px 16px;text-align:center;color:#4a2e1c}
.fortune-box h3{margin:0 0 4px;font-size:22px}.fortune-box p{margin:0 0 14px;font-size:14px}
.fortune-row{display:flex;gap:12px;justify-content:center;perspective:900px}
.fortune-card{width:min(140px,27vw);aspect-ratio:3/4.2;position:relative;border:0;padding:0;background:none;cursor:pointer;perspective:900px;transition:transform .2s}.fortune-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.3,1.4,.5,1)}
.fortune-card:hover:not(.done){transform:translateY(-6px) rotate(-2deg)}
.fortune-card.flip .fortune-inner{transform:rotateY(180deg)}.fortune-card{color:#4a2e1c}.fortune-card.done{pointer-events:none}.fortune-card.dim{opacity:.4;filter:grayscale(.5)}
.fortune-face{position:absolute;inset:0;border:3px solid #4a2e1c;border-radius:14px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 0 #4a2e1c}
.fortune-back{background:repeating-linear-gradient(45deg,#d9402f 0 10px,#e8603f 10px 20px);color:#fff}
.fortune-back.blue{background:repeating-linear-gradient(45deg,#3f6fb8 0 10px,#5a8fd0 10px 20px)}
.fortune-back b{font-size:clamp(20px,6vw,30px);text-shadow:0 2px 0 #4a2e1c}.fortune-back i{font-style:normal;font-size:clamp(30px,9vw,44px)}
.fortune-front{background:#fffdf5;transform:rotateY(180deg);padding:8px}.fortune-front i{font-style:normal;font-size:clamp(30px,9vw,46px)}
.fortune-front b{font-size:15px}.fortune-front small{font-size:12px;line-height:1.35}
.fortune-front .tag{font-size:12px;padding:1px 8px;border-radius:9px;color:#fff;background:#3f6fb8}.fortune-front .tag.bad{background:#d9402f}
.fortune-ok{margin-top:14px;font:inherit;font-weight:800;font-size:16px;color:#fff;background:#6a9a3e;border:3px solid #4a2e1c;border-radius:14px;padding:8px 28px;cursor:pointer;box-shadow:0 3px 0 #4a2e1c}
.fortune-ok[hidden]{display:none}
.fortune-mask,.fortune-mask *{box-sizing:border-box}
.fortune-box{max-width:calc(100vw - 24px);max-height:calc(100dvh - 28px);overflow:auto;padding:16px 12px}
.fortune-box p{overflow-wrap:anywhere;line-height:1.5}.fortune-row{gap:8px;min-width:0}
.fortune-mask .fortune-card{min-width:0;min-height:0;width:calc((100% - 8px)/2);height:145px;aspect-ratio:auto;flex:1}
.fortune-row.revealed .fortune-card.dim{display:none}
.fortune-row.revealed .fortune-card.flip{flex:none;width:min(100%,290px);height:290px}
.fortune-front{padding:14px;gap:8px;overflow:auto}
.fortune-front b,.fortune-front small{display:block;max-width:100%;width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.5;flex-shrink:0}
.fortune-front b{font-size:17px}.fortune-front small{font-size:14px}
.fortune-buttons{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.fortune-buttons .fortune-ok{padding:8px 16px;font-size:14px;min-width:0}
`;document.head.appendChild(st);}
 const mask=document.createElement('div');mask.className='fortune-mask';mask.innerHTML=`<div class="fortune-box" role="dialog" aria-label="命運機會卡"><h3>命運／機會</h3><p>顧客排隊等得不耐煩了。二選一，選一張卡處理這次狀況，翻牌後不能重選。</p><div class="fortune-row"></div><div class="fortune-buttons"><button type="button" class="fortune-ok fortune-close" hidden>完成</button></div></div>`;
 const row=mask.querySelector('.fortune-row'),ok=mask.querySelector('.fortune-close'),cards=[];let revealTimer;
 const close=()=>{clearTimeout(revealTimer);mask.remove();onClose();};ok.onclick=close;

 for(let i=0;i<2;i++){const b=document.createElement('button');b.type='button';b.className='fortune-card';const deck=i===1?'機會':'命運';b.innerHTML=`<span class="fortune-inner"><span class="fortune-face fortune-back ${deck==='機會'?'blue':''}"><i>${deck==='機會'?'？':'！'}</i><b>${deck}</b></span><span class="fortune-face fortune-front"></span></span>`;
  b.onclick=()=>{if(cards.some(c=>c.classList.contains('done')))return;const f=onPick();if(!f){close();return;}b.querySelector('.fortune-front').innerHTML=`<span class="tag ${f.deck==='命運'?'bad':''}">${f.deck}</span><i>${f.icon}</i><b>${f.title}</b><small>${f.text}</small>`;for(const c of cards){c.classList.add('done');if(c!==b)c.classList.add('dim');}row.classList.add('revealed');b.classList.add('flip');revealTimer=setTimeout(()=>{ok.hidden=false;ok.focus();},650);};
  cards.push(b);row.appendChild(b);}
 document.body.appendChild(mask);return {close};
}
