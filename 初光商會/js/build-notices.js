import {shelfTypes,accepts} from './furniture.js?v=20261114-v46';
import {decorTypes} from './decorations.js?v=20261114-v46';
/* Only actionable work or unseen unlocks light the build shortcut. Stored furniture is intentional. */
export function buildNotice(g,s,seen=[]){
 if(s.layoutPause)return {kind:'resume',page:'build',message:'布置已暫停營業：完成後按「恢復營業」。'};
 const category=s.rackReminder?.category,items=g.data.catalog.filter(c=>c.category===category&&c.unlockStoreLevel<=s.level&&c.isSellable&&!c.isRestricted);
 const missing=items.length&&!s.shelves.some(sh=>items.some(c=>accepts(sh,c)));
 if(missing){const name={item:'補給商品',weapon:'武器商品',material:'素材商品'}[category]||'商品';return {kind:'rack',page:'racks',message:`顧客想買${name}：打烊後到「布置 → 貨架」購買並擺放適用貨架。`};}
 const known=new Set(Array.isArray(seen)?seen:[]),fresh=[...shelfTypes,...decorTypes].filter(t=>(t.level||1)<=s.level&&!known.has(t.id));
 if(fresh.length){const names=fresh.slice(0,2).map(t=>t.name).join('、');return {kind:'unlock',page:'build',message:`新解鎖：${names}${fresh.length>2?`等 ${fresh.length} 款`:''}。到「布置 → 貨架／家具／裝飾」查看。`,ids:fresh.map(t=>t.id)};}
 return null;
}
