// Retire the discontinued shop-only product without resetting any player's save.
export function retireProducts(s){
 if(s.retiredProductsV62)return;
 const sku='shop-crystal';let qty=Number(s.inventory?.[sku])||0;
 for(const sh of [...(s.shelves||[]),...(s.shelfStorage||[])]){
  if(sh.sku===sku){qty+=Number(sh.stock)||0;sh.stock=0;sh.sku='shop-iron';}
  qty+=Number(sh.stockBySku?.[sku])||0;if(sh.stockBySku)delete sh.stockBySku[sku];
  if(sh.offerSkus)sh.offerSkus=sh.offerSkus.filter(k=>k!==sku);
 }
 if(qty>0){const refund=Math.round(qty*(s.averageCosts?.[sku]??45));s.gold+=refund;s.stats.rewards=(s.stats.rewards||0)+refund;s.log.push({day:s.day,time:s.time,text:`停售商品已回收 ${qty} 件，退還原進貨款 ${refund} G。`});}
 for(const field of ['inventory','prices','averageCosts'])if(s[field])delete s[field][sku];
 if(s.commissionBoard)s.commissionBoard.entries=s.commissionBoard.entries.filter(q=>q.sku!==sku);
 for(const key of ['event','operationalEvent','rackReminder'])if(JSON.stringify(s[key]||'').includes(sku)||JSON.stringify(s[key]||'').includes('商會晶礦'))s[key]=null;
 for(const c of s.customers||[]){if(c.basket)c.basket=c.basket.filter(b=>b.sku!==sku);for(const key of ['wantedSku','targetSku','sku'])if(c[key]===sku)c[key]='shop-iron';}
 s.retiredProductsV62=true;
}
