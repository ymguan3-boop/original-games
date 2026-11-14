// A physical 2×1 rack has two independent, equally sized stock compartments.
// Views are ephemeral; setters always write back to the transactional state.
export const isMaterialTray=sh=>sh?.type==='materials';
export const isAssortedShelf=sh=>['apothecary','armory','limited-armory'].includes(sh?.type);
export function prepareShelfOffers(sh,catalog=[],inventory=null){
 if(!isAssortedShelf(sh)||sh.offerCompartment)return;
 const limited=c=>['elite','boss'].includes(c.merchantGrade)||/-merchant-(elite|boss)$/.test(c.sku);
 const skus=sh.type==='apothecary'?[sh.sku,'potion','revive']:catalog.filter(c=>c.category==='weapon'&&(sh.type==='limited-armory'?limited(c):!limited(c))).map(c=>c.sku);
 sh.offerSkus=[...new Set([sh.sku,...(sh.offerSkus||[]),...skus])];sh.stockBySku??={};if(inventory)sh.offerCount=sh.type==='apothecary'?sh.offerSkus.length:Math.max(1,sh.offerSkus.filter(sku=>(inventory[sku]||0)+(sku===sh.sku?sh.stock||0:sh.stockBySku[sku]||0)>0).length);
}
export function trayOffers(sh){
 if(sh?.offerCompartment)return [sh];
 if(isAssortedShelf(sh))return [...new Set([sh.sku,...(sh.offerSkus||[]),...(sh.type==='apothecary'?['potion','revive']:[])])].map(sku=>new Proxy(sh,{get(t,k){if(k==='offerCompartment')return sku;if(k==='sku')return sku;if(k==='stock')return Number(sku===t.sku?t.stock:t.stockBySku?.[sku])||0;if(k==='otherStock')return (Number(t.stock)||0)+Object.values(t.stockBySku||{}).reduce((a,b)=>a+(Number(b)||0),0)-(Number(sku===t.sku?t.stock:t.stockBySku?.[sku])||0);return Reflect.get(t,k);},set(t,k,v){if(k==='stock'){if(sku===t.sku)t.stock=v;else(t.stockBySku??={})[sku]=v;return true;}if(k==='sku')return v===sku;return Reflect.set(t,k,v);}}));
 if(!isMaterialTray(sh)||sh.materialCompartment)return [sh];
 const first=sh.sku==='shop-wood'?'shop-wood':'shop-iron',second=first==='shop-iron'?'shop-wood':'shop-iron';
 return [first,second].map((sku,index)=>new Proxy(sh,{get(target,key){if(key==='materialCompartment')return sku;if(key==='sku')return sku;if(key==='stock')return Number(target[index?'secondaryStock':'stock'])||0;return Reflect.get(target,key);},set(target,key,value){if(key==='stock'){target[index?'secondaryStock':'stock']=value;return true;}if(key==='sku')return value===sku;return Reflect.set(target,key,value);}}));
}
export const salesShelves=s=>(s.shelves||[]).flatMap(trayOffers);
export const saleShelf=(s,id,sku)=>salesShelves(s).find(sh=>sh.id===id&&(!sku||sh.sku===sku));
export function returnShelfStock(s,sh){const returned=[];for(const part of trayOffers(sh)){const qty=part.stock;returned.push({sku:part.sku,qty});s.inventory[part.sku]=(s.inventory[part.sku]||0)+qty;part.stock=0;}return returned;}
export function migrateMaterialTrays(s,capacity,catalog=[]){for(const sh of [...(s.shelves||[]),...(s.shelfStorage||[])]){prepareShelfOffers(sh,catalog);if(isMaterialTray(sh))sh.secondaryStock??=0;for(const part of trayOffers(sh)){const excess=Math.max(0,part.stock-capacity(part));if(excess){s.inventory[part.sku]=(s.inventory[part.sku]||0)+excess;part.stock-=excess;}}}}
