/* Count only supplied foreground business time. No Date.now/offline catch-up or speed multiplier. */
import {comicEventEligible} from './funny-events.js?v=20261114-v57r2';
export const BUSINESS_EVENT_SECONDS=180;
export function realBusinessClock(s){if(!s.realEventClock||s.realEventClock.day!==s.day){s.realEventClock={day:s.day,elapsed:s.realEventClock?.elapsed||0,serial:s.realEventClock?.serial||0};if(s.fortuneOpportunity?.status==='pending')s.fortuneOpportunity.status='expired';}return s.realEventClock;}
export function tickRealEvents(g,s,seconds,closing=false){
 const clock=realBusinessClock(s);if(s.phase!=='open'||s.paused||s.layoutPause||!Number.isFinite(seconds)||seconds<=0)return;
 clock.elapsed=Math.min(BUSINESS_EVENT_SECONDS,clock.elapsed+seconds);
 if(clock.elapsed<BUSINESS_EVENT_SECONDS||closing||s.event||s.incidents?.length||s.patrolFocus||g.uiBusy)return;
 clock.elapsed=0;const id=`business-${s.day}-${++clock.serial}`;
 s.event={id:'business-check',instanceId:id,title:`Lv.${s.level} 營業三分鐘・服務小插曲`,description:'店內忙了一陣子，請選擇付費整理服務，或安排在班夥伴協助。',remoteResolution:true,cooldown:0,effect:'checkout',effectValue:25,choices:[{id:'paid',label:'付費整理服務',cost:30+s.level*10,satisfaction:1,mood:2,xp:1},...(s.employees.some(e=>e.role!=='standby'&&e.fatigue<95)?[{id:'team',label:'安排在班員工協助（增加疲勞）',cost:0,satisfaction:1,mood:1,xp:1}]:[])]};
 s.event.employeeId=s.employees.find(e=>e.role!=='standby'&&e.fatigue<95)?.id;
 const eligible=(g.data.events||[]).filter(ev=>g.role(s,ev.role)&&comicEventEligible(s,ev)&&(s.cooldowns[ev.id]||0)<=s.totalTime);
 if(eligible.length){const ev=eligible[Math.floor(g.random(s)*eligible.length)];s.event={...ev,employeeId:g.role(s,ev.role)?.id,instanceId:id};}
 g.log(s,'營業已滿真實三分鐘：新增服務事件。');
}
