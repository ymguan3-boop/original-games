import{trayOffers,prepareShelfOffers,salesShelves}from'./material-tray.js?v=20261114-v50';
import{shelfCapacity}from'./furniture.js?v=20261114-v50';
export function broadcast(s,text,kind='stock'){
 s.announcements??=[];s.announcements.push({id:`announcement-${++s.serial}`,text,kind});s.announcements=s.announcements.slice(-20);
}
export function stockTarget(sh){
 const capacity=shelfCapacity(sh);if(!sh.offerCompartment)return capacity;
 return Math.min(capacity,Math.ceil(shelfCapacity({...sh,offerCompartment:null})/Math.max(1,sh.offerCount||trayOffers({...sh,offerCompartment:null}).length)));
}
export function recordStock(s,sku,qty,cost=0){if(!qty&&!cost)return;const b=s.restockBatch??={items:{},cost:0};b.cost+=cost;if(qty)b.items[sku]=(b.items[sku]||0)+qty;}
export function fillShelf(g,s,physical){prepareShelfOffers(physical,g.data.catalog,s.inventory);let count=0;for(const part of trayOffers(physical)){const n=Math.max(0,Math.min(s.inventory[part.sku]||0,stockTarget(part)-part.stock));if(n){s.inventory[part.sku]-=n;part.stock+=n;count+=n;recordStock(s,part.sku,n);}}return count;}
export function finishStockBatch(g,s){const b=s.restockBatch;if(!b||!Object.keys(b.items).length)return;if(s.employees.some(e=>e.workTask)||salesShelves(s).some(p=>p.autoRestock!==false&&p.stock<stockTarget(p)&&(s.inventory[p.sku]||0)>0))return;const grouped=new Map();for(const[sku,n]of Object.entries(b.items)){const name=g.data.catalog.find(c=>c.sku===sku)?.displayName||sku;grouped.set(name,(grouped.get(name)||0)+n);}const items=[...grouped].map(([name,n])=>`${name} ×${n}`),partial=s.shelves.filter(sh=>sh.autoRestock!==false&&trayOffers(sh).reduce((n,p)=>n+p.stock,0)<shelfCapacity(sh)).length;broadcast(s,`${partial?'本輪補貨完成':'補貨完成'}｜本次進貨花費 ${b.cost} G｜${items.join('、')}${partial?`｜尚有 ${partial} 架未滿，待資金或採集庫存補足`:''}`);delete s.restockBatch;}
