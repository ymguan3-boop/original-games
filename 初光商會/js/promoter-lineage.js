import {PROMOTERS} from './promoters.js?v=20261111-portrait-v24';
/* 從角色 previous 與商會進化資料共同建立後代鏈，王族分支可進化為水蛟龍王。 */
export function isPromoterLineage(data,id){
 const edges=new Map(),add=(a,b)=>{if(!a||!b)return;if(!edges.has(a))edges.set(a,new Set());edges.get(a).add(b);};
 for(const sp of data.spirits||[]){const prev=Array.isArray(sp.previous)?sp.previous:[sp.previous];for(const p of prev)add(p,sp.id);for(const n of [sp.next,sp.evolvesTo].flat())if(typeof n==='string')add(sp.id,n);}
 for(const [from,rule] of Object.entries(data.evolution||{}))for(const to of rule.next||[])add(from,to);
 add('groudon','mewtwo');add('rayquaza','mewtwo');
 const targets=new Set(PROMOTERS.map(p=>p.id)),seen=new Set(),walk=x=>{if(seen.has(x))return false;seen.add(x);return targets.has(x)||[...(edges.get(x)||[])].some(walk);};
 return walk(id);
}
