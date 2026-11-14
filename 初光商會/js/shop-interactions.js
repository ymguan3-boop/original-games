import{trayOffers,salesShelves,saleShelf,returnShelfStock,migrateMaterialTrays,isMaterialTray}from'./material-tray.js?v=20261114-v48';
import {ENTRANCE} from './nav.js?v=20261114-v48';
import {shelfDefinition,shelfCapacity} from './furniture.js?v=20261114-v48';
import {CUSTOMER_TYPES,pickCustomerType,customerBudget} from './economy-v2.js?v=20261114-v48';
export function spawnShopper(g,s,{visitorId=null,arrived=false}={}){
 const shelves=salesShelves(s).filter(sh=>g.data.catalog.some(c=>c.sku===sh.sku&&c.isSellable&&c.unlockStoreLevel<=s.level));
 const unique=new Map();for(const sh of shelves)if(!unique.has(sh.id)||g.available(s,sh)>g.available(s,unique.get(sh.id)))unique.set(sh.id,sh);const targets=[...unique.values()].filter(sh=>g.available(s,sh)>0||g.data.catalog.find(c=>c.sku===sh.sku)?.lootOnly),index=s.rackDemandCursor||0,target=targets.length?targets[index%targets.length]:null;s.rackDemandCursor=index+1;
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
export function passerArrival(g,s,id){const visit=s.invitedVisitors?.find(v=>v.id===id);if(!visit)return '已完成進店';visit.ready=true;if(s.phase==='open'&&s.customers.length<g.data.config.maxCustomers&&g.clearOfActors(s,ENTRANCE)){spawnShopper(g,s,{visitorId:id,arrived:true});s.invitedVisitors=s.invitedVisitors.filter(v=>v!==visit);}return '已加入進店顧客';}
export function stockState(stock,capacity){return stock<=0?'sold-out':stock<=capacity/2?'half':'full';}
export function patrolDiscovery(g,s,dt){
 if(!g.managerActive)return;s.patrolWalking=(s.patrolWalking||0)+dt;
 const sh=s.shelves.filter(sh=>Math.hypot(sh.x-s.manager.x,sh.z-s.manager.z)<=1.5).sort((a,b)=>Math.hypot(a.x-s.manager.x,a.z-s.manager.z)-Math.hypot(b.x-s.manager.x,b.z-s.manager.z))[0];
 s.patrolShelf=sh?{id:sh.id,name:shelfDefinition(sh).name,stock:trayOffers(sh).reduce((n,p)=>n+Math.max(0,g.available(s,p)),0),capacity:shelfCapacity(sh),sku:sh.sku}:null;
 const moved=Math.hypot(s.manager.x-(s.patrolLastPosition?.x??s.manager.x),s.manager.z-(s.patrolLastPosition?.z??s.manager.z))>.02;s.patrolLastPosition={x:s.manager.x,z:s.manager.z};
 if(!moved||s.patrolWalking<(s.patrolFindAt||18))return;s.patrolFindAt=s.patrolWalking+20+g.random(s)*35;
 if(g.random(s)<.3){const gold=3+Math.floor(g.random(s)*(5+s.level*2));s.gold+=gold;s.stats.foundMoney=(s.stats.foundMoney||0)+gold;s.patrolFind={id:`floor-${++s.serial}`,gold,at:s.totalTime};g.notice(s,'manager',`撿到 ${gold} G！`,'good');g.log(s,`巡店時在地板撿到 ${gold} G。`);}
}
