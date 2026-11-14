import{salesShelves}from'./material-tray.js?v=20261114-v57';
import{broadcast}from'./stock-flow.js?v=20261114-v57';

// Shared by both views. All amounts are G; owned goods have already been paid for.
export const AUCTION_RULES=Object.freeze({unlock:3,rounds:3,rivalTraffic:.92,trafficMin:.15,trafficMax:.30,profitMin:.10,profitMax:.30,pityStep:.10,pityCap:3,maxQty:4});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const check=(v,m)=>{if(!v)throw Error(m);};
export function auctionState(s){
 s.plazaAuction??={day:s.day,losses:0,session:null,effect:null,played:false};
 const a=s.plazaAuction;if(a.day!==s.day){a.day=s.day;a.session=null;a.offer=null;a.effect=null;a.result=null;a.played=false;}return a;
}
const current=s=>s.plazaAuction?.day===s.day?s.plazaAuction:null;
export function auctionSupply(g,s,sku){return Math.max(0,s.inventory[sku]||0)+salesShelves(s).filter(p=>p.sku===sku).reduce((n,p)=>n+Math.max(0,g.available(s,p)),0);}
export function auctionProducts(g,s){return g.data.catalog.filter(c=>c.isSellable&&!c.isRestricted&&c.unlockStoreLevel<=s.level&&auctionSupply(g,s,c.sku)>0);}
export function auctionTraffic(s){
 if(s.level<AUCTION_RULES.unlock)return 1;
 const e=current(s)?.effect;
 // Item demand changes are weighted below. Apply the average exposure once to total traffic.
 return clamp(AUCTION_RULES.rivalTraffic*(1+(e?.traffic||0)/Math.max(1,e?.productCount||1)),.65,1.25);
}
export function auctionDemand(s,sku){const e=current(s)?.effect;return e?.sku===sku?1+e.traffic:1;}
export function auctionSaleBonus(s,basket){
 const e=current(s)?.effect;if(!e||e.profit<=0||s.phase!=='open')return 0;
 return Math.floor(basket.filter(b=>b.sku===e.sku).reduce((n,b)=>n+Math.max(0,b.price-b.cost)*b.qty,0)*e.profit);
}
export function opponentBid({cost,budget,player,level,losses},random=Math.random){
 // Pity adds 10 percentage points per loss to the chance of a less aggressive strategy.
 const soft=random()<clamp(.32+(losses||0)*AUCTION_RULES.pityStep,0,.62),span=budget-cost;
 const aggressive=cost+Math.round(span*(.26+random()*.30-(level-3)*.025));
 const accommodating=Math.max(player+1,cost+Math.round(span*(.63+random()*.28)));
 return clamp(soft?accommodating:aggressive,cost,budget);
}
export function auctionAction(g,s,type,p){
 if(!['auctionStart','auctionBid','auctionAbandon'].includes(type))return null;
 check(s.level>=AUCTION_RULES.unlock,'廣場競價於 Lv.3 解鎖');check(s.phase==='open','營業時間才能參加競價');
 const a=auctionState(s);
 if(type==='auctionStart'){
  check(!a.played,'今天已參加競價，明天再來');if(a.session)return '繼續尚未完成的競價';
  if(a.offer){check(auctionSupply(g,s,a.offer.sku)>=a.offer.qty,'請先補齊今日訂單所需的商品');a.session=structuredClone(a.offer);return '繼續今日同一筆訂單，不能藉由離開重抽商品';}
  const pool=auctionProducts(g,s);check(pool.length,'需要先準備至少一件可販售的庫存');
  const item=pool[Math.floor(g.random(s)*pool.length)],cost=Math.max(1,Math.ceil(s.averageCosts?.[item.sku]??item.buyCost)),qty=Math.min(AUCTION_RULES.maxQty,auctionSupply(g,s,item.sku),1+Math.floor(g.random(s)*AUCTION_RULES.maxQty)),budget=Math.max(cost+4,Math.round(Math.max(item.suggestedRetail,cost*1.65)*(1.10+(s.level-3)*.08)));
  a.session={id:`auction-${s.day}-${++s.serial}`,day:s.day,sku:item.sku,name:item.displayName,cost,qty,budget,round:1,player:clamp(s.prices[item.sku]||item.suggestedRetail,cost,budget),opponent:budget,history:[]};
  a.session.unitCost=Math.max(0,s.averageCosts?.[item.sku]??item.buyCost);a.offer=structuredClone(a.session);
  g.log(s,`金幣商販發起「${item.displayName}」競價訂單 ${qty} 件。`);return '競價開始；同價由金幣商販得標';
 }
 const q=a.session;check(q&&!a.played,'目前沒有進行中的競價');
 if(type==='auctionAbandon'){a.offer=structuredClone(q);a.session=null;return '已離開競價；保留今日訂單與報價回合，保底紀錄不變';}
 check(p.sessionId===q.id&&p.round===q.round,'報價回合已更新，請查看最新價格');
 check(Number.isSafeInteger(p.price)&&p.price>=q.cost&&p.price<=q.budget,'報價必須介於成本與顧客預算之間');
 const final=p.final===true||q.round===AUCTION_RULES.rounds;
 if(final)check(auctionSupply(g,s,q.sku)>=q.qty,'可交貨庫存不足，請先補貨再確認');
 q.player=p.price;q.opponent=opponentBid({...q,level:s.level,losses:a.losses},()=>g.random(s));q.history.push({round:q.round,player:q.player,opponent:q.opponent});
 if(!final){q.round++;return `第 ${q.round} 回合：金幣商販報價 ${q.opponent} G`;}
 const won=q.player<q.opponent,traffic=AUCTION_RULES.trafficMin+g.random(s)*(AUCTION_RULES.trafficMax-AUCTION_RULES.trafficMin),profit=won?AUCTION_RULES.profitMin+g.random(s)*(AUCTION_RULES.profitMax-AUCTION_RULES.profitMin):0;
 let income=0;if(won){
  let need=q.qty;const inv=Math.min(need,s.inventory[q.sku]||0);s.inventory[q.sku]-=inv;need-=inv;
  for(const sh of salesShelves(s).filter(p=>p.sku===q.sku)){const n=Math.min(need,Math.max(0,g.available(s,sh)));sh.stock-=n;need-=n;if(!need)break;}
  check(need===0,'庫存已變動，訂單尚未交付');income=q.player*q.qty;const cogs=Math.round((q.unitCost??q.cost)*q.qty*100)/100;
  check(!s.ledger.some(x=>x.id===q.id),'訂單已交付');s.gold+=income;s.stats.revenue+=income;s.stats.cogs+=cogs;s.stats.units=(s.stats.units||0)+q.qty;s.stats.sales++;s.totals.revenue+=income;s.totals.sales++;
  s.ledger.push({id:q.id,day:s.day,kind:'auction-order',revenue:income,cogs,items:[{sku:q.sku,qty:q.qty,price:q.player,cost:q.unitCost??q.cost}],auctionBonus:0});s.ledger=s.ledger.slice(-200);a.losses=0;
 }else a.losses=Math.min(AUCTION_RULES.pityCap,(a.losses||0)+1);
 a.played=true;a.effect={sku:q.sku,traffic:won?traffic:-traffic,profit,productCount:Math.max(1,auctionProducts(g,s).length)};
 a.result={...q,won,income,profit,traffic:a.effect.traffic,losses:a.losses,at:s.totalTime};a.session=null;
 const message=won?`競價成功！訂單收入 ${income} G；${q.name} 今日來客 +${Math.round(traffic*100)}%、正毛利 +${Math.round(profit*100)}%。`:`競價失敗！${q.name} 今日來客 -${Math.round(traffic*100)}%，沒有扣款；下次商販更可能讓價。`;
 g.notice(s,'manager',won?'競價成功！':'下回再挑戰',won?'good':'bad');broadcast(s,message,won?'sale':'auction');g.log(s,message);return message;
}
