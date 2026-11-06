/* Mission guidance is derived from today's live commissions only.
 * It never creates stock, awards gold, or bypasses the normal claim transaction. */
import {activeCommissions,commissionProgress} from './commissions.js?v=20261106-fx9';
export function commissionOverview(s){
 const b=s.commissionBoard||{clock:0,unread:false};
 const active=activeCommissions(s).slice().sort((a,z)=>{
  const aReady=commissionProgress(s,a)>=a.qty,zReady=commissionProgress(s,z)>=z.qty;
  return Number(zReady)-Number(aReady)||a.expiresAt-z.expiresAt;
 });
 const ready=active.filter(q=>commissionProgress(s,q)>=q.qty);
 return {active,ready,count:active.length,hasNotice:active.length>0,unread:!!b.unread&&active.length>0};
}
export function commissionInstruction(s,q){
 if(!q||q.status!=='active'||q.createdDay!==undefined&&q.createdDay!==s.day)return null;
 const progress=commissionProgress(s,q),ready=progress>=q.qty;
 const seconds=Math.max(0,Math.ceil(q.expiresAt-(s.commissionBoard?.clock||0)));
 if(seconds<=0)return null;
 if(ready)return {id:q.id,kind:'ready',title:'✅ 委託已達標，等待交付',body:`${q.client} 的委託進度 ${q.qty}/${q.qty}。請開啟「商會委託 → 訊息」，按「${q.kind==='delivery'?'交付商品並收款':'領取酬勞'}」完成結案。`,primary:'前往委託完成頁',action:'commission',sku:q.sku||null};
 if(q.kind==='delivery')return {id:q.id,kind:'purchase',title:'📦 商會限時交貨任務',body:`${q.client} 需要 ${q.name} ${q.qty} 件，目前庫房 ${progress}/${q.qty}。先到商品採購補足，再回訊息頁交貨。`,primary:'採購委託商品',action:'commission-buy',sku:q.sku};
 return {id:q.id,kind:'sales',title:'🛒 商會限時成交任務',body:`${q.client} 的委託需要成交 ${q.qty} 筆，目前 ${progress}/${q.qty}。請保持營業並接待顧客，達標後自動顯示領獎頁。`,primary:'查看委託進度',action:'commission',sku:null};
}
