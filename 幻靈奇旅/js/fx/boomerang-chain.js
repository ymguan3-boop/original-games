/* 冒險蛙 1 秒連鎖迴旋鏢：路徑與命中排程。不綁定任何模式，擂台／洞穴／守護戰／模型室共用。
   位置一律透過 getter 每幀重算，目標移動與右手擺動都會被追上；傷害由 onHit 回呼交給各模式原規則，
   同一 attackId＋targetId 只回呼一次。update(t) 吃累計秒數，慢手機掉幀也會補完命中並準時接回。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.BoomerangChain=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){'use strict';
const MAX_TARGETS=3,DURATION=.95,CHAIN_DAMAGE=[1,.7,.5],HIT_TIMES=[.27,.45,.62],SPIN=46;
const WINDUP=.34,FOLLOW=.2;   // 擂台整招：蓄力 → 950ms 飛行 → 收勢
/* 主目標在前，其餘依「離上一個目標最近」接續；不重複、不含友軍與倒下者。 */
function selectTargets({primary,candidates=[],max=MAX_TARGETS,distance,valid=()=>true,idOf=t=>t.id}){
 const chosen=[],seen=new Set(),add=t=>{if(!t||seen.has(idOf(t))||!valid(t))return false;seen.add(idOf(t));chosen.push(t);return true;};add(primary);
 const rest=candidates.filter(t=>!seen.has(idOf(t))&&valid(t));while(chosen.length<max&&rest.length){const last=chosen[chosen.length-1];let best=0;if(last&&distance){let d=Infinity;rest.forEach((t,i)=>{const v=distance(last,t);if(v<d){d=v;best=i;}});}add(rest.splice(best,1)[0]);}
 return chosen;
}
function schedule(count){const n=Math.max(1,Math.min(MAX_TARGETS,count));return{hits:HIT_TIMES.slice(0,n),leaveAt:HIT_TIMES[n-1],catchAt:DURATION};}
const lerp=(a,b,k)=>a+(b-a)*k,ease=k=>k*k*(3-2*k);
/* 把原生 6.6 秒 Boomerang 姿勢重映射到新節奏：出手 2.38、接回 5.55 兩個關鍵影格對齊真正的飛鏢時間。 */
function nativeTime(sec,windup=WINDUP,flight=DURATION,follow=FOLLOW){if(sec<windup)return lerp(1.6,2.38,Math.max(0,sec)/windup);if(sec<windup+flight)return lerp(2.38,5.55,(sec-windup)/flight);return Math.min(6.6,lerp(5.55,6.6,(sec-windup-flight)/follow));}
function create({attackId,targets,hand,targetPoint,isValid=()=>true,idOf=t=>t.id,onHit,onCatch,onCancel,onFrame,bulge=.9}){
 const plan=schedule(targets.length),stops=targets.slice(0,plan.hits.length).map((t,i)=>({at:plan.hits[i],target:t})),seen=new Set(),out={x:0,y:0,z:0};
 let index=0,prevAt=0,lastPos=null,angle=0,finished=false,cancelled=false,hitCount=0,lastT=0;
 const first=hand();let prev={x:first.x,y:first.y,z:first.z};
 function curve(a,b,k,side){const u=ease(k),s=Math.sin(Math.PI*k)*bulge*side,dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;out.x=lerp(a.x,b.x,u)+(-dz/l)*s;out.y=lerp(a.y,b.y,u)+Math.sin(Math.PI*k)*.28;out.z=lerp(a.z,b.z,u)+(dx/l)*s;return out;}
 function strikeStop(stop){index++;const t=stop.target,id=idOf(t);if(!isValid(t)||seen.has(id))return;seen.add(id);hitCount++;const p=targetPoint(t);prev={x:p.x,y:p.y,z:p.z};prevAt=stop.at;onHit?.({attackId,targetId:id,target:t,chainIndex:hitCount-1,hitPoint:p,timeMs:Math.round(stop.at*1000)});}
 function update(t){if(finished||cancelled)return null;t=Math.max(lastT,t);angle+=(t-lastT)*SPIN;lastT=t;while(index<stops.length&&t>=stops[index].at)strikeStop(stops[index]);
  if(t>=plan.catchAt){finished=true;onCatch?.({attackId,elapsedMs:Math.round(plan.catchAt*1000),rightHandWorldPoint:hand(),reclaimed:true,hits:hitCount});return null;}
  let next=stops[index];while(next&&!isValid(next.target))next=stops[++index];
  const dest=next?targetPoint(next.target):hand(),end=next?next.at:plan.catchAt,p=curve(prev,dest,Math.max(0,Math.min(1,(t-prevAt)/Math.max(.01,end-prevAt))),index%2?-1:1);
  lastPos=p;onFrame?.({position:p,angle,chainIndex:index});return p;}
 function cancel(){if(finished||cancelled)return;cancelled=true;onCancel?.({attackId,hits:hitCount});}
 return{update,cancel,plan,get finished(){return finished;},get cancelled(){return cancelled;},get hits(){return hitCount;},get position(){return lastPos;},get angle(){return angle;}};
}
return{create,selectTargets,schedule,nativeTime,MAX_TARGETS,DURATION,CHAIN_DAMAGE,HIT_TIMES,WINDUP,FOLLOW,SPIN};
});
