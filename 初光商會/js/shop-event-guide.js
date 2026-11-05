/* Short, actionable directions in both shop and walk-through views.
 * The customer mini-game is entirely optional; the normal remedies remain available. */
import {customerNeedingHelp,chaseDistance} from './customer-chase.js';
import {requiresManagerPatrol,patrolEventInstructions} from './event-routing.js';
import {commissionOverview,commissionInstruction} from './commission-guidance.js';
const eventKey=e=>e?.instanceId||e?.id||'';
export function describeShopIssue(s,{patrol=false}={}){
 const mission=s.customerChase;
 if(mission){
  const d=chaseDistance(s),seconds=Math.ceil(mission.remaining);
  return {id:mission.id,kind:'chase',title:'🏃 追客小挑戰 · '+seconds+' 秒',
   message:`請用左下搖桿移動主管，追上頭頂有「🏃 追上我」的 ${mission.name}。${d!==null?'目前距離 '+d.toFixed(1)+' 格。':''} 追到約 1.4 格內會自動對話並處理顧客問題。`,
   primary:'取消追逐',primaryAction:'cancel-chase',secondary:'手動處理',secondaryAction:'complaint',targetId:mission.customerId};
 }
 if(s.phase!=='open')return null;
 const c=customerNeedingHelp(s);
 if(c){
  return {id:'customer-help-'+c.id,kind:'customer',title:'❓ '+c.name+' 找不到商品',
   message:patrol
    ?'你已在主管巡店視角：點顧客頭頂「缺貨」可直接選擇補貨／推薦／安撫；也可開始追客，用左下搖桿追到顧客身旁。'
    :'目前是店鋪總覽：點顧客頭頂「缺貨」直接選擇補貨／安撫；或按「進入巡店追客」，讓主角在店內追上顧客。',
   primary:'選擇解決方法',primaryAction:'complaint',secondary:patrol?'開始追客':'進入巡店追客',secondaryAction:'start-chase',targetId:c.id};
 }
 const activeOrders=commissionOverview(s);
 if(activeOrders.count&&(activeOrders.unread||!s.event)){
  const instruction=commissionInstruction(s,activeOrders.active[0]);
  if(instruction)return {
   id:'commission-'+instruction.id+'-'+instruction.kind,
   kind:'commission',
   title:instruction.title,
   message:instruction.body,
   primary:instruction.primary,
   primaryAction:instruction.action,
   secondary:instruction.kind==='purchase'?'查看委託訊息':null,
   secondaryAction:instruction.kind==='purchase'?'commission':null,
   targetId:instruction.id,
   sku:instruction.sku
  };
 }
 if(s.event){
  if(requiresManagerPatrol(s.event))return {
   id:'patrol-required-'+eventKey(s.event),kind:'patrol-only',title:'⚠ '+s.event.title,
   message:patrolEventInstructions(s.event,{patrol}),
   primary:'主管巡店',primaryAction:'patrol',secondary:null,secondaryAction:null,targetId:null
  };
  const stockout=s.event.id==='stockout',message=stockout
   ?'缺貨顧客可能已離開。請先進入商品採購補充庫存，避免下一位客人遇到相同問題；亦可查看事件處理方式。'
   :patrol
    ?'你已在主管巡店中：可走近事件員工讓主管親自處理，或直接點角色頭上的事件名稱選擇解法。'
    :'你可直接點事件員工頭上的提示，或打開「主管巡查」查看選項；也可切換至主管巡店，靠近員工處理。';
  return {id:'event-help-'+eventKey(s.event),kind:'event',title:'⚠ '+s.event.title,message,
    primary:stockout?'商品採購':'事件處理',primaryAction:stockout?'goods':'event',
    secondary:stockout?'事件選項':patrol?'查看事件':'進入主管巡店',
    secondaryAction:stockout?'event':patrol?'event':'patrol',targetId:null};
 }
 return null;
}
