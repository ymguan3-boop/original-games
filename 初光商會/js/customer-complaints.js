/* Click-to-resolve customer problems. Uses normal shop transactions; never grants a free sale. */
import {shelfCapacity} from './furniture.js?v=20261111-portrait-v45';
import {ENTRANCE} from './nav.js?v=20261111-portrait-v45';
import {applyFreeEventFatigue} from './patrol-events.js?v=20261111-portrait-v45';
const clamp=n=>Math.max(0,Math.min(100,n));
const stockShelf=(g,s)=>s.shelves.find(sh=>{const product=g.data.catalog.find(p=>p.sku===sh.sku);return product&&product.unlockStoreLevel<=s.level&&sh.stock<shelfCapacity(sh);});
const availableShelf=(g,s)=>s.shelves.find(sh=>g.available(s,sh)>0);
export function complaintKind(s,c){
 if(!c||['Paid','Leave','Enter'].includes(c.state))return null;
 if(c.state==='OutOfStock')return 'stockout';
 if(c.state==='Angry')return 'angry';
 if(['UnhappyExit','AbandonCart'].includes(c.state))return 'disappointed';
 if(['Queue','Checkout','Cart'].includes(c.state)&&((c.wait||0)>=Math.max(2,(c.patience||30)*.5)))return 'queue';
 return null;
}
const formats={
 stockout:{title:'想買的商品缺貨',description:'顧客在貨架前找不到商品。請選擇補貨、推薦現貨，或誠懇道歉。',emoji:['🧺','❓','📦'],animation:'bounce',effectText:'補貨或推薦可挽回購物機會'},
 queue:{title:'排隊等太久',description:'顧客等候收銀已經不耐煩。主管可協助收銀、贈送補償，或安撫等待。',emoji:['🛒','⌛','💢'],animation:'wobble',effectText:'及時處理可避免顧客離場'},
 angry:{title:'顧客生氣了',description:'顧客因服務體驗不佳正準備離開，請立即決定如何挽回。',emoji:['😠','💬','💝'],animation:'jelly',effectText:'道歉或補償能挽回顧客'},
 disappointed:{title:'沒有買到想要的商品',description:'顧客對商品選擇不滿意。可以推薦其他現貨或提供協助。',emoji:['🤷','🛍️','✨'],animation:'pop',effectText:'推薦商品可挽回購物意願'}
};
export function getCustomerComplaint(s,c,g){
 const kind=complaintKind(s,c);if(!kind)return null;
 const config=formats[kind],id='customer:'+c.id;
 const shelf=g?stockShelf(g,s):null,available=g?availableShelf(g,s):null;
 const cashier=s.employees.some(e=>e.role==='cashier'&&e.fatigue<95);
 const product=shelf&&g.data.catalog.find(p=>p.sku===shelf.sku);
 const price=shelf&&(!s.inventory[shelf.sku]||s.inventory[shelf.sku]<=0)?product?.buyCost||0:0;
 const used=c.helpedChoices||[];
 let options;
 if(kind==='stockout'){
  options=[
   {id:'restock',label:price?'立即採購補貨':'立即補貨',detail:price?'進貨並陳列 1 件':'從倉庫上架 1 件',cost:price,disabled:!shelf||price>s.gold,reason:!shelf?'目前沒有可補貨貨架':price>s.gold?'金幣不足':''},
   {id:'alternate',label:'推薦現貨',detail:'引導顧客挑選現有商品',cost:0,disabled:!available,reason:!available?'目前沒有可出售的商品':''},
   {id:'apologize',label:'道歉安撫',detail:'友善送客，減少不滿',cost:0}
  ];
 }else if(kind==='queue'){
  options=[
   {id:'assist',label:'主管支援',detail:'加速收銀並重設等待',cost:0,disabled:!cashier,reason:'請先指派收銀員'},
   {id:'compensate',label:'補償小禮',detail:'增加耐心與滿意度',cost:25,disabled:s.gold<25,reason:'金幣不足'},
   {id:'reassure',label:'幽默安撫',detail:'免費安撫並延長耐心',cost:0}
  ];
 }else if(kind==='angry'){
  options=[
   {id:'retry',label:'誠懇道歉',detail:'邀請顧客重新挑選',cost:0},
   {id:'gift',label:'贈送小禮',detail:'35 G，安撫並重新挑選',cost:35,disabled:s.gold<35,reason:'金幣不足'},
   {id:'farewell',label:'禮貌送客',detail:'尊重決定，正常離店',cost:0}
  ];
 }else{
  options=[
   {id:'alternate',label:'推薦現貨',detail:'再次挑選架上商品',cost:0,disabled:!available,reason:'目前沒有現貨'},
   {id:'retry',label:'友善解說',detail:'提供第二次選購機會',cost:0},
   {id:'apologize',label:'道歉送客',detail:'保留友善印象',cost:0}
  ];
 }
 options=options.map(o=>({...o,disabled:!!o.disabled||used.includes(kind+':'+o.id),reason:used.includes(kind+':'+o.id)?'此方法已使用':o.reason||''}));
 return {...config,kind,id,customerId:c.id,customerName:c.name,role:'customer',title:config.title,options:[...options.filter(o=>!o.disabled&& !['apologize','farewell'].includes(o.id)).slice(0,1),{id:'farewell',label:'道歉並友善送客',detail:'結束這次客訴，不產生交易',cost:0}],funny:false};
}
export function resolveCustomerComplaint(g,s,p){
 p={...p,choice:p.choice??p.option};
 const c=s.customers.find(c=>c.id===p.customerId);if(!c)throw Error('顧客已離開商會');
 const info=getCustomerComplaint(s,c,g);
 if(!info)throw Error('這個顧客目前沒有待解決的問題');
 const option=info.options.find(o=>o.id===p.choice);
 if(!option||option.disabled)throw Error(option?.reason||'無效或無法使用的解決方法');
 const cost=option.cost||0;if(cost){g.pay(s,cost);s.stats.expenses=(s.stats.expenses||0)+cost;}
 else{
  const leadRole=info.kind==='stockout'?'stocker':'cashier';
  const lead=s.employees.find(e=>e.role===leadRole)||s.employees[0]||null;
  for(const change of applyFreeEventFatigue(s,lead,{direct:5,team:1})){
   const worker=s.employees.find(e=>e.id===change.id);
   if(worker&&typeof g.efficiency==='function')worker.efficiency=g.efficiency(worker);
   g.notice(s,change.id,'疲勞 +'+change.delta,'bad');
  }
 }
 const previous=s.satisfaction;
 const mood=(n)=>{s.satisfaction=clamp(s.satisfaction+n);const delta=Math.round((s.satisfaction-previous)*10)/10;if(delta>0)g.notice(s,c.id,'滿意 +'+delta,'good');};
 const retry=()=>{c.basket=[];c.state='Browse';c.timer=0;c.wait=0;c.angerReason=null;c.emotion='happy';c.visited=[];c.path=[];c.patience=Math.max(c.patience||30,35)+15;g.route(s,c,{x:c.x,z:c.z});};
 const goodbye=()=>{c.basket=[];c.state='Leave';c.timer=0;c.exitRerouteAt=2;c.path=[];c.emotion='happy';g.route(s,c,ENTRANCE);};
 if(p.choice==='farewell'){goodbye();if(info.kind!=='angry')s.stats.lost=(s.stats.lost||0)+1;mood(1);}
 else if(info.kind==='stockout'){
  if(p.choice==='restock'){const sh=stockShelf(g,s);if(!sh)throw Error('缺少可補貨貨架');const product=g.data.catalog.find(x=>x.sku===sh.sku);if((s.inventory[sh.sku]||0)>0)s.inventory[sh.sku]-=1;else{if(!cost||!product)throw Error('無法採購缺貨商品');s.stats.purchases=(s.stats.purchases||0)+cost;}sh.stock++;retry();mood(1);}
  else if(p.choice==='alternate'){retry();mood(1);}
  else {goodbye();s.stats.lost=(s.stats.lost||0)+1;mood(1);}
 }else if(info.kind==='queue'){
  if(p.choice==='assist'){s.buffs.checkout=s.totalTime+25;c.wait=0;c.patience=(c.patience||30)+15;mood(1);}
  if(p.choice==='compensate'){c.wait=0;c.patience=(c.patience||30)+30;mood(2);}
  if(p.choice==='reassure'){c.wait=0;c.patience=(c.patience||30)+15;mood(1);}
  c.timer=0;c.emotion='happy';
 }else if(info.kind==='angry'){
  if(p.choice==='farewell'){goodbye();mood(1);}
  else{retry();s.stats.lost=Math.max(0,(s.stats.lost||0)-1);mood(p.choice==='gift'?3:1);}
 }else{
  if(p.choice==='apologize'){goodbye();s.stats.lost=(s.stats.lost||0)+1;mood(1);}
  else{retry();mood(1);}
 }
 c.helpedChoices??=[];c.helpedChoices.push(info.kind+':'+p.choice);
 s.customerHelpHistory??=[];s.customerHelpHistory.push({id:c.id,day:s.day,kind:info.kind,choice:p.choice,cost});s.customerHelpHistory=s.customerHelpHistory.slice(-30);
 g.log(s,c.name+'：'+info.title+' → '+option.label+(cost?'（'+cost+' G）':''));
 return c.name+'：'+option.label+'，已完成處理';
}
