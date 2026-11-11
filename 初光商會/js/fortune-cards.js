/* 命運／機會卡：處理「顧客等太久、沒有收銀員」時，從三張蓋著的卡選一張，結果可能賺錢、賠錢或發生怪事。
 * 結果由 applyFortune 在存檔交易內套用；畫面只負責翻牌。 */
import {ENTRANCE} from './nav.js?v=20261111-ui-v23';

export const FORTUNE=[
 {id:'tip',deck:'機會',icon:'💰',title:'客人塞小費',text:'等到的客人心情大好，多給了小費。',gold:200,weight:5},
 {id:'wallet',deck:'機會',icon:'👛',title:'撿到錢包',text:'把客人掉的錢包還回去，收到一筆謝禮。',gold:500,weight:3},
 {id:'laugh',deck:'機會',icon:'😄',title:'排隊講笑話',text:'主角在隊伍旁講笑話，大家都笑了。滿意度 +2。',satisfaction:2,weight:4},
 {id:'zhaocai',deck:'機會',icon:'🐶',title:'招財來幫忙',text:'招財跑來收銀，排隊的客人都不用再等。',queue:'serve',weight:4},
 {id:'merchant',deck:'機會',icon:'🎁',title:'神秘商人',text:'路過的商人留下一箱貨，倉庫多了 5 件商品。',gift:5,weight:3},
 {id:'jam',deck:'命運',icon:'🧾',title:'收銀機卡紙',text:'收銀機卡住了，請人修理花了一筆錢。',gold:-150,weight:5},
 {id:'change',deck:'命運',icon:'🪙',title:'找錯錢',text:'手忙腳亂找錯錢，損失了一些營收。',gold:-300,weight:4},
 {id:'review',deck:'命運',icon:'😠',title:'留下負評',text:'等太久的客人在門口抱怨，滿意度 -2。',satisfaction:-2,weight:4},
 {id:'blackout',deck:'命運',icon:'⚡',title:'停電',text:'店裡突然停電，排隊的客人全都回家了。',queue:'leave',weight:2},
 {id:'typhoon',deck:'命運',icon:'🌀',title:'颱風來襲',text:'強風灌進店裡，所有貨架都壞了，要重新購買。上架的商品已搬回倉庫。',typhoon:true,weight:1}
];
const QUEUE=['Queue','Checkout','Cart'];
export function pickFortune(rand=Math.random){const total=FORTUNE.reduce((n,f)=>n+f.weight,0);let r=rand()*total;for(const f of FORTUNE){r-=f.weight;if(r<0)return f;}return FORTUNE[0];}
/* 只有排隊、收銀類的客訴才用抽卡處理 */
export function isQueueComplaint(c,reason=''){return !!c&&(/排隊|收銀|等太久|等得/.test(`${reason||''} ${c.angerReason||''}`)||QUEUE.includes(c.state)&&(c.wait||0)>=Math.max(2,(c.patience||30)*.5));}

export function applyFortune(g,s,p){
 const f=FORTUNE.find(x=>x.id===p.outcome);if(!f)throw Error('沒有這張卡');
 const c=s.customers.find(x=>x.id===p.customerId);if(c){if(c.fortuneDrawn)throw Error('這位顧客已經抽過卡了');c.fortuneDrawn=true;if(QUEUE.includes(c.state)){c.wait=0;c.emotion='happy';}}
 if(f.gold>0){s.gold+=f.gold;}else if(f.gold<0){const lost=Math.min(s.gold,-f.gold);s.gold-=lost;s.stats.expenses=(s.stats.expenses||0)+lost;}
 if(f.satisfaction)s.satisfaction=Math.max(0,Math.min(100,(s.satisfaction||0)+f.satisfaction));
 if(f.queue==='serve')for(const x of s.customers)if(QUEUE.includes(x.state)){x.wait=0;x.emotion='happy';}
 if(f.queue==='leave')for(const x of s.customers)if(QUEUE.includes(x.state)){x.basket=[];x.state='Leave';x.timer=0;x.path=[];x.emotion='sad';g.route?.(s,x,ENTRANCE);}
 if(f.gift){const pool=g.data.catalog.filter(i=>i.isSellable&&!i.isRestricted&&s.level>=i.unlockStoreLevel);const item=pool[Math.floor((p.roll??Math.random())*pool.length)]||pool[0];if(item)s.inventory[item.sku]=(s.inventory[item.sku]||0)+f.gift;}
 if(f.typhoon){for(const sh of s.shelves)s.inventory[sh.sku]=(s.inventory[sh.sku]||0)+(sh.stock||0);s.shelves=[];s.undo=null;for(const x of s.customers){x.basket=[];x.path=[];if(!['Leave','Paid'].includes(x.state)){x.state='Leave';x.timer=0;g.route?.(s,x,ENTRANCE);}}for(const x of s.employees){x.path=[];x.workTask=null;}}
 g.log?.(s,`${f.deck}卡「${f.title}」：${f.text}`);if(c)g.notice?.(s,c.id,`${f.icon} ${f.title}`,f.deck==='機會'?'good':'bad');
 return `${f.deck}卡：${f.title}`;
}

/* 翻牌畫面：三張蓋著的卡，點一張翻開；onPick 回傳結果才顯示 */
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
.fortune-ok[hidden]{display:none}`;document.head.appendChild(st);}
 const mask=document.createElement('div');mask.className='fortune-mask';mask.innerHTML=`<div class="fortune-box" role="dialog" aria-label="命運機會卡"><h3>命運／機會</h3><p>顧客等太久了！選一張卡，看看會發生什麼事。</p><div class="fortune-row"></div><button type="button" class="fortune-ok" hidden>好</button></div>`;
 const row=mask.querySelector('.fortune-row'),ok=mask.querySelector('.fortune-ok'),cards=[];
 const close=()=>{mask.remove();onClose();};ok.onclick=close;
 for(let i=0;i<3;i++){const b=document.createElement('button');b.type='button';b.className='fortune-card';const deck=i===1?'機會':'命運';b.innerHTML=`<span class="fortune-inner"><span class="fortune-face fortune-back ${deck==='機會'?'blue':''}"><i>${deck==='機會'?'？':'！'}</i><b>${deck}</b></span><span class="fortune-face fortune-front"></span></span>`;
  b.onclick=()=>{if(cards.some(c=>c.classList.contains('done')))return;const f=onPick();if(!f){close();return;}b.querySelector('.fortune-front').innerHTML=`<span class="tag ${f.deck==='命運'?'bad':''}">${f.deck}</span><i>${f.icon}</i><b>${f.title}</b><small>${f.text}</small>`;for(const c of cards){c.classList.add('done');if(c!==b)c.classList.add('dim');}b.classList.add('flip');setTimeout(()=>{ok.hidden=false;ok.focus();},650);};
  cards.push(b);row.appendChild(b);}
 document.body.appendChild(mask);return {close};
}
