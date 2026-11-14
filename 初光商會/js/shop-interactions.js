import{auctionDemand}from'./plaza-auction.js?v=20261114-v57r2';
import{trayOffers,salesShelves,saleShelf,returnShelfStock,migrateMaterialTrays,isMaterialTray}from'./material-tray.js?v=20261114-v57r2';
import {ENTRANCE,walkable,findPath} from './nav.js?v=20261114-v57r2';
import {obstacles} from './decorations.js?v=20261114-v57r2';
import {shelfDefinition,shelfCapacity} from './furniture.js?v=20261114-v57r2';
import {CUSTOMER_TYPES,pickCustomerType,customerBudget} from './economy-v2.js?v=20261114-v57r2';
export function spawnShopper(g,s,{visitorId=null,arrived=false}={}){
 const shelves=salesShelves(s).filter(sh=>g.data.catalog.some(c=>c.sku===sh.sku&&c.isSellable&&c.unlockStoreLevel<=s.level));
 const unique=new Map();for(const sh of shelves)if(!unique.has(sh.id)||g.available(s,sh)>g.available(s,unique.get(sh.id)))unique.set(sh.id,sh);const targets=[...unique.values()].filter(sh=>g.available(s,sh)>0||g.data.catalog.find(c=>c.sku===sh.sku)?.lootOnly),index=s.rackDemandCursor||0;let target=targets.length?targets[index%targets.length]:null;if(s.plazaAuction?.day===s.day&&s.plazaAuction.effect&&targets.length){const offers=shelves.filter(p=>g.available(s,p)>0||g.data.catalog.find(c=>c.sku===p.sku)?.lootOnly),counts=new Map();for(const p of offers)counts.set(p.id,(counts.get(p.id)||0)+1);const weight=p=>auctionDemand(s,p.sku)/counts.get(p.id),sum=offers.reduce((n,p)=>n+weight(p),0);let roll=g.random(s)*sum;target=offers.find(p=>(roll-=weight(p))<0)||targets.at(-1);}s.rackDemandCursor=index+1;
 const product=g.data.catalog.find(c=>c.sku===target?.sku),ctype=product?.category==='weapon'?'adventurer':pickCustomerType(g,s),cb=customerBudget(g,ctype),personality=['commoner','adventurer','mage','rich'].indexOf(ctype)*2+(g.random(s)<.5?0:1),pool=g.data.hirePool.filter(h=>!h.recruitOnly),sp=pool[Math.floor(g.random(s)*pool.length)];
 const price=target?Math.round(s.prices[target.sku]*shelfDefinition(target).premium):0;
 const c={id:`c-${++s.serial}`,name:CUSTOMER_TYPES[ctype].name,customerType:ctype,visitorId,variant:g.random(s)<.5?'m':'f',personality,spiritId:sp?.spiritId||sp?.id,...ENTRANCE,arrivalRemaining:arrived?0:5,state:'Enter',path:[],basket:[],budget:Math.max(cb.min+Math.floor(g.random(s)*(cb.max-cb.min)),Math.ceil(price*1.25)),patience:45,timer:0,wait:0,visited:[],memory:s.memories[personality]||null,plannedShelfId:target?.id,wantedSku:product?.sku,wantedCategory:product?.category};
 s.customers.push(c);s.stats.visitors=(s.stats.visitors||0)+1;s.stats['visitors_'+ctype]=(s.stats['visitors_'+ctype]||0)+1;return c;
}
export function passerAction(g,s,p){
 if(s.phase!=='open')throw Error('目前尚未營業，開門後再招呼路人。');
 if(typeof p.visitorId!=='string'||!/^passer-[a-z0-9-]{1,40}$/.test(p.visitorId))throw Error('路人識別無效');
 s.passerInterest??={};const old=s.passerInterest[p.visitorId];if(old?.converted)return '這位路人已答應來店看看！';
 if(old&&s.totalTime-old.at<1.5)return '路人正在回應你的招呼。';
 const desire=Math.min(1,(old?.desire||0)+.35),converted=g.random(s)<desire;
 s.passerInterest[p.visitorId]={desire,converted,at:s.totalTime};if(converted){s.invitedVisitors??=[];s.invitedVisitors.push({id:p.visitorId,ready:false});g.log(s,'路人受到招呼，想進店逛逛！');}
 const keys=Object.keys(s.passerInterest);if(keys.length>120)for(const key of keys.slice(0,keys.length-100))delete s.passerInterest[key];
 return converted?'路人：好啊，我進店看看！':`路人來店意願提升至 ${Math.round(desire*100)}%`;
}
export function entryLanding(g,s){
 const candidates=[{...ENTRANCE},...[[0,-1],[-1,-1],[1,-1],[0,-2],[-2,-1],[2,-1]].map(([dx,dz])=>({x:ENTRANCE.x+dx,z:ENTRANCE.z+dz}))],items=obstacles(s);
 return candidates.find(p=>walkable(p,items,s.level)&&g.clearOfActors(s,p)&&!s.customers.some(c=>c.arrivalRemaining>0&&Math.hypot(p.x-c.x,p.z-c.z)<.82)&&findPath(ENTRANCE,p,items,s.level)!==null)||null;
}
export function admitInvited(g,s,visit){
 const id=typeof visit==='string'?visit:visit?.id;if(!id||s.phase!=='open')return null;
 const existing=s.customers.find(c=>c.visitorId===id);if(existing){s.invitedVisitors=s.invitedVisitors.filter(v=>(typeof v==='string'?v:v.id)!==id);return existing;}
 if(s.customers.length>=g.data.config.maxCustomers)return null;const landing=entryLanding(g,s);if(!landing)return null;
 const c=spawnShopper(g,s,{visitorId:id,arrived:true});Object.assign(c,landing);s.invitedVisitors=s.invitedVisitors.filter(v=>(typeof v==='string'?v:v.id)!==id);return c;
}
// Outdoor actors are transient. A saved accepted invitation must survive reload
// as an entry ticket instead of waiting forever for an actor that no longer exists.
export function restoreInvitations(s){const ids=new Set();s.invitedVisitors=(s.invitedVisitors||[]).map(v=>typeof v==='string'?{id:v}:v).filter(v=>v?.id&&!ids.has(v.id)&&!s.customers.some(c=>c.visitorId===v.id)&&(ids.add(v.id),true)).map(v=>({...v,ready:true}));}
export function passerArrival(g,s,id){const visit=s.invitedVisitors?.find(v=>(typeof v==='string'?v:v.id)===id);if(!visit)return '已完成進店';if(typeof visit!=='string')visit.ready=true;return admitInvited(g,s,visit)?'已加入進店顧客':'店內忙碌，正在等候安全進店位置';}
export function stockState(stock,capacity){return stock<=0?'sold-out':stock<=capacity/2?'half':'full';}
export function patrolDiscovery(g,s,dt){
 if(!g.managerActive)return;s.patrolWalking=(s.patrolWalking||0)+dt;
 const sh=s.shelves.filter(sh=>Math.hypot(sh.x-s.manager.x,sh.z-s.manager.z)<=1.5).sort((a,b)=>Math.hypot(a.x-s.manager.x,a.z-s.manager.z)-Math.hypot(b.x-s.manager.x,b.z-s.manager.z))[0];
 s.patrolShelf=sh?{id:sh.id,name:shelfDefinition(sh).name,stock:trayOffers(sh).reduce((n,p)=>n+Math.max(0,g.available(s,p)),0),capacity:shelfCapacity(sh),sku:sh.sku}:null;
 const moved=Math.hypot(s.manager.x-(s.patrolLastPosition?.x??s.manager.x),s.manager.z-(s.patrolLastPosition?.z??s.manager.z))>.02;s.patrolLastPosition={x:s.manager.x,z:s.manager.z};
 if(!moved||s.patrolWalking<(s.patrolFindAt||18))return;s.patrolFindAt=s.patrolWalking+20+g.random(s)*35;
 if(g.random(s)<.3){const gold=3+Math.floor(g.random(s)*(5+s.level*2));s.gold+=gold;s.stats.foundMoney=(s.stats.foundMoney||0)+gold;s.patrolFind={id:`floor-${++s.serial}`,gold,at:s.totalTime};g.notice(s,'manager',`撿到 ${gold} G！`,'good');g.log(s,`巡店時在地板撿到 ${gold} G。`);}
}
