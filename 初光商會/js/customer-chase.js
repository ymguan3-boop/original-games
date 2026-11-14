import {dimensions} from './nav.js?v=20261114-v45';
/* Optional live 3D customer chase mini-game.
 * Never creates free stock or a fake sale: catches route through the existing
 * complaint resolution transaction, with its real staff fatigue and satisfaction effects. */
import {getCustomerComplaint,resolveCustomerComplaint} from './customer-complaints.js?v=20261114-v45';
import {ENTRANCE} from './nav.js?v=20261114-v45';
const radius=1.4;
const waypoints=[{x:3,z:8},{x:7,z:7},{x:11,z:8},{x:6,z:4},{x:4,z:5},{x:9,z:5}];
const stockoutReason=reason=>/缺貨|找不到商品/.test(reason||'');
export function chaseableCustomer(c){
 return !!c&&(c.state==='OutOfStock'||c.state==='Angry'&&stockoutReason(c.angerReason)||c.state==='UnhappyExit');
}
export function customerNeedingHelp(s){
 const choices=(s.customers||[]).filter(chaseableCustomer);
 choices.sort((a,b)=>(a.state==='OutOfStock'?0:1)-(b.state==='OutOfStock'?0:1)||a.timer-b.timer);
 return choices[0]||null;
}
export function startCustomerChase(g,s,customerId){
 if(s.phase!=='open')throw Error('請先開門營業');
 if(s.paused)throw Error('請先恢復營業，才能開始追客');
 if(!g.managerActive)throw Error('請先進入主管巡店視角');
 if(s.customerChase)throw Error('目前已在追逐顧客');
 const c=s.customers.find(x=>x.id===customerId);
 if(!chaseableCustomer(c))throw Error('這位顧客已離開或不需要追逐，請查看其他顧客的提示');
 const id='customer-chase-'+(++s.serial);
 s.customerChase={id,customerId:c.id,name:c.name,remaining:45,nextMoveAt:s.totalTime+2.5,step:0,startedAt:s.totalTime};
 c.timer=0;c.wait=0;c.chaseProtected=true;c.path=[];
 g.log(s,`追客小挑戰開始：主管需在 45 個遊戲秒內靠近 ${c.name}。`);
 return `追客挑戰開始！移動左下搖桿，追上頭頂「🏃 追上我」標記的 ${c.name}。`;
}
function endChase(g,s,result,reason){
 const mission=s.customerChase;if(!mission)return;
 const c=s.customers.find(x=>x.id===mission.customerId);
 if(c)c.chaseProtected=false;
 s.customerChase=null;
 s.customerChaseResult={id:mission.id,customerId:mission.customerId,name:mission.name,success:result,reason,day:s.day,at:s.totalTime};
 g.log(s,`追客小挑戰${result?'成功':'結束'}：${reason}`);
}
function nextCustomerMove(g,s,c,mission){
 if(c.path?.length)return;
 const start=mission.step;
 for(let i=0;i<waypoints.length;i++){
  const idx=(start+i)%waypoints.length,p={x:Math.min(waypoints[idx].x,Math.floor(dimensions(s.level).width)-2),z:Math.min(waypoints[idx].z,Math.floor(dimensions(s.level).height)-2)};
  if(Math.hypot(c.x-p.x,c.z-p.z)<2.1)continue;
  if(g.route(s,c,p)){mission.step=idx+1;return;}
 }
 // An obstructed route is not a failed mission: stay still until the manager reaches the customer.
 c.path=[];
}
export function tickCustomerChase(g,s,dt){
 const mission=s.customerChase;if(!mission)return false;
 const c=s.customers.find(x=>x.id===mission.customerId);
 if(!c||!chaseableCustomer(c)){
  endChase(g,s,false,'顧客已不在可追逐狀態，請查看下一位客人');
  return true;
 }
 if(!g.managerActive){endChase(g,s,false,'已退出主管巡店，追客挑戰取消');return true;}
 if(Math.hypot(s.manager.x-c.x,s.manager.z-c.z)<=radius){
  const complaint=getCustomerComplaint(s,c,g);
  const viable=complaint?.options.filter(o=>!o.disabled)||[];
  const preferred=c.state==='OutOfStock'?['alternate','apologize','farewell']:['retry','farewell','apologize'];
  const choice=preferred.find(id=>viable.some(o=>o.id===id));
  if(!choice){endChase(g,s,false,'請手動處理顧客問題，避免漏掉必要的補貨步驟');return true;}
  const name=c.name;
  // The established resolution path charges fatigue for a no-gold choice,
  // and only redirects a shopper when real purchasable stock exists.
  const message=resolveCustomerComplaint(g,s,{customerId:c.id,choice});
  // Resolve the customer-service incident associated with this shopper, not
  // the physical stock shortage. Any missing inventory still must be purchased.
  if(s.event?.id==='stockout'&&s.event.description?.includes(name)){
   const incident=s.event;
   s.incidentHistory??=[];s.incidentHistory.push({id:incident.instanceId||incident.id,title:incident.title,choice:'主管追客協助顧客（缺貨仍需進貨）',day:s.day,at:s.totalTime,method:'customer-chase'});
   s.incidentHistory=s.incidentHistory.slice(-30);
   s.cooldowns??={};s.cooldowns[incident.id]=s.totalTime+(incident.cooldown||45);
   s.event=s.incidents?.shift()||null;
   g.log(s,'顧客抱怨已透過追客處理；貨架庫存仍須另外補充。');
  }
  endChase(g,s,true,`${name} 已被主管追上：${message}。${choice==='apologize'||choice==='farewell'?'貨架仍缺貨，請至商品採購補足。':'可繼續引導挑選現貨。'}`);
  return true;
 }
 mission.remaining=Math.max(0,mission.remaining-dt);
 if(mission.remaining<=0){
  endChase(g,s,false,'時間到，沒有追上顧客。請補貨或在下次缺貨時再挑戰。');
  return true;
 }
 if(s.totalTime>=mission.nextMoveAt){
  mission.nextMoveAt=s.totalTime+2.6;
  nextCustomerMove(g,s,c,mission);
 }
 return false;
}
export function cancelCustomerChase(g,s){
 if(!s.customerChase)return '目前沒有進行中的追客挑戰';
 endChase(g,s,false,'已取消追逐；仍可點顧客頭上的抱怨標籤處理');
 return '已取消追客小挑戰';
}
export function chaseDistance(s){
 const mission=s.customerChase,c=s.customers.find(c=>c.id===mission?.customerId);
 return mission&&c?Math.hypot(s.manager.x-c.x,s.manager.z-c.z):null;
}
