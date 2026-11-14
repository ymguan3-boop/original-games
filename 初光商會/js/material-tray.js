// A physical 2×1 rack has two independent, equally sized stock compartments.
// Views are ephemeral; setters always write back to the transactional state.
export const isMaterialTray=sh=>sh?.type==='materials';
export function trayOffers(sh){
 if(!isMaterialTray(sh)||sh.materialCompartment)return [sh];
 const first=sh.sku==='shop-wood'?'shop-wood':'shop-iron',second=first==='shop-iron'?'shop-wood':'shop-iron';
 return [first,second].map((sku,index)=>new Proxy(sh,{get(target,key){if(key==='materialCompartment')return sku;if(key==='sku')return sku;if(key==='stock')return Number(target[index?'secondaryStock':'stock'])||0;return Reflect.get(target,key);},set(target,key,value){if(key==='stock'){target[index?'secondaryStock':'stock']=value;return true;}if(key==='sku')return value===sku;return Reflect.set(target,key,value);}}));
}
export const salesShelves=s=>(s.shelves||[]).flatMap(trayOffers);
export const saleShelf=(s,id,sku)=>salesShelves(s).find(sh=>sh.id===id&&(!sku||sh.sku===sku));
export function returnShelfStock(s,sh){const returned=[];for(const part of trayOffers(sh)){const qty=part.stock;returned.push({sku:part.sku,qty});s.inventory[part.sku]=(s.inventory[part.sku]||0)+qty;part.stock=0;}return returned;}
export function migrateMaterialTrays(s,capacity){for(const sh of [...(s.shelves||[]),...(s.shelfStorage||[])])if(isMaterialTray(sh)){sh.secondaryStock??=0;for(const part of trayOffers(sh)){const excess=Math.max(0,part.stock-capacity(part));if(excess){s.inventory[part.sku]=(s.inventory[part.sku]||0)+excess;part.stock-=excess;}}}}
