import{SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_OPPONENTS,spinTop}from'./spin-arena-config.js?v=20261115-v59';
import{broadcast}from'./stock-flow.js?v=20261115-v59';
const check=(v,m)=>{if(!v)throw Error(m);},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function spinState(s){s.spinArena??={owned:{},equipped:null,parts:{rim:0,axis:0,ring:0},reputation:0,match:null,history:[],serial:0};const a=s.spinArena;if(a.daily?.day!==s.day)a.daily={day:s.day,coins:0,parts:0,traffic:0,firstWin:false};return a;}
export function spinStats(id,owned={level:1,parts:{},mastery:0}){const t=spinTop(id),stats={};for(const k of['attack','defense','speed','stamina']){const part=Object.values(owned.parts||{}).filter(p=>p===k).length*.08,bonus=Math.min(R.statBonusCap,((owned.level||1)-1)*R.upgradeStep+part+Math.min(100,owned.mastery||0)*.0005);stats[k]=t[k]*(1+bonus);}return stats;}
const random=m=>{m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;return m.seed/4294967296;};
const body=(stats,x,strategy,element)=>({x,z:0,vx:0,vz:0,spin:100,hp:100,energy:0,angle:0,stats,strategy,element,shield:0,skillUntil:0,hitCooldown:0});
export function launchSpinRound(m,strategy){check(['attack','defense','balance'].includes(strategy),'請選擇本局策略');m.strategy=strategy;m.time=0;m.accumulator=0;m.phase='battle';m.bodies=[body(m.playerStats,-.85,strategy,m.playerElement),body(m.opponentStats,.85,['attack','defense','balance'][(m.round+m.difficulty)%3],m.opponentElement)];for(const b of m.bodies){b.z=(random(m)-.5)*.25;b.phase=random(m)*Math.PI*2;}m.lastCollision=-10;m.roundResult=null;}
function attack(m,i){const b=m.bodies[i],v=m.bodies[1-i];if(b.energy<100)return false;b.energy=0;b.skillUntil=m.time+1.1;const dx=v.x-b.x,dz=v.z-b.z,d=Math.hypot(dx,dz)||1;b.vx+=dx/d*3;b.vz+=dz/d*3;b.shield=b.strategy==='defense'?m.time+2.5:0;m.effects.push({id:++m.fx,kind:'skill',actor:i,at:m.time});m.effects=m.effects.slice(-8);return true;}
const affinity=(a,b)=>({fire:'wind',wind:'earth',earth:'fire'}[a]===b?1.18:({fire:'wind',wind:'earth',earth:'fire'}[b]===a?.9:1));
export function endSpinRound(m,winner,reason){if(m.phase!=='battle')return;const tied=winner===null;if(!tied)m.score[winner]++;m.phase=m.score.some(n=>n>=R.roundsToWin)?'result':'roundResult';m.roundResult={winner,reason,tied,round:m.round};m.rounds.push({...m.roundResult,time:m.time,score:[...m.score]});if(!tied&&m.phase!=='result')m.round++;if(m.phase==='result')m.won=m.score[0]>=R.roundsToWin;}
function step(m,dt){
 m.time=Math.min(R.roundSeconds,m.time+dt);const bs=m.bodies;
 for(let i=0;i<2;i++){const b=bs[i],o=bs[1-i],d=Math.hypot(o.x-b.x,o.z-b.z)||1,near=Math.hypot(b.x,b.z),spd=.5+b.stats.speed/38,skill=b.skillUntil>m.time;
  // Pursuit, orbit and a center correction. AI evasion uses actual distance and energy.
  const evade=i===1&&m.difficulty>0&&o.skillUntil>m.time&&d<1.1?-.8:1,orbit=b.strategy==='defense'?.75:.35,tx=(o.x-b.x)/d*evade+(i?1:-1)*Math.sin(m.time*1.7+(b.phase||0))*orbit,tz=(o.z-b.z)/d*evade+Math.cos(m.time*1.5+(b.phase||0))*orbit;
  b.vx+=(tx*spd-b.vx)*dt*2;b.vz+=(tz*spd-b.vz)*dt*2;
  if(near>R.radius-.4){b.vx-=b.x*dt*1.8;b.vz-=b.z*dt*1.8;}
  b.x+=b.vx*dt;b.z+=b.vz*dt;b.angle+=dt*(10+b.spin*.25);b.spin=Math.max(0,b.spin-dt*(2.15*25/b.stats.stamina)*(b.strategy==='attack'?1.14:1));b.energy=Math.min(100,b.energy+dt*(4.5+(i?m.difficulty*.4:0)));b.hitCooldown=Math.max(0,b.hitCooldown-dt);
  if(i===1&&b.energy>=100&&d<(m.difficulty===2?1.6:1.0)&&o.skillUntil<=m.time)attack(m,1);
 }
 const dx=bs[1].x-bs[0].x,dz=bs[1].z-bs[0].z,dist=Math.hypot(dx,dz),contact=R.bodyRadius*2;
 if(dist<contact){const nx=dist?dx/dist:1,nz=dist?dz/dist:0,overlap=(contact-dist)/2;bs[0].x-=nx*overlap;bs[0].z-=nz*overlap;bs[1].x+=nx*overlap;bs[1].z+=nz*overlap;
  if(m.time-m.lastCollision>.48){m.lastCollision=m.time;for(let i=0;i<2;i++){const b=bs[i],v=bs[1-i],power=b.stats.attack*(b.strategy==='attack'?1.15:1)*(b.skillUntil>m.time?1.8:1)*affinity(b.element,v.element),guard=v.stats.defense*(v.strategy==='defense'?1.22:1),damage=clamp((power*.45-guard*.18)*(v.shield>m.time?.5:1),3,24);v.hp=Math.max(0,v.hp-damage);v.spin=Math.max(0,v.spin-damage*.32);b.energy=Math.min(100,b.energy+8);const sign=i===0?1:-1,impulse=1.4+(b.skillUntil>m.time?2.8:0);v.vx+=nx*sign*impulse;v.vz+=nz*sign*impulse;}
   m.effects.push({id:++m.fx,kind:'hit',at:m.time,x:(bs[0].x+bs[1].x)/2,z:(bs[0].z+bs[1].z)/2});m.effects=m.effects.slice(-8);
  }
 }
 const defeated=bs.map(b=>b.hp<=0||b.spin<=0||Math.hypot(b.x,b.z)>R.radius+R.bodyRadius),reason=i=>Math.hypot(bs[i].x,bs[i].z)>R.radius+R.bodyRadius?'出界':bs[i].hp<=0?'耐久歸零':'旋轉能量歸零';
 if(defeated.some(Boolean)){endSpinRound(m,defeated[0]&&defeated[1]?null:defeated[0]?1:0,defeated[0]&&defeated[1]?'同時出局，重賽':reason(defeated[0]?0:1));return;}
 if(m.time>=R.roundSeconds){const score=b=>Math.round((b.spin*.6+b.hp*.4)*1e6)/1e6,a=score(bs[0]),b=score(bs[1]);endSpinRound(m,a===b?null:a>b?0:1,a===b?'同分，重賽':'時間到：旋轉能量 60%＋耐久 40%');}
}
export function advanceSpinMatch(m,seconds){if(m?.phase!=='battle')return;m.accumulator=(m.accumulator||0)+Math.max(0,Math.min(2,seconds));while(m.accumulator+1e-9>=R.fixedStep&&m.phase==='battle'){m.accumulator-=R.fixedStep;step(m,R.fixedStep);}}
export function settleSpinMatch(g,s){const a=spinState(s),m=a.match;if(!m||m.phase!=='result'||m.settled)return;m.settled=true;const owned=a.owned[m.topId],d=a.daily;owned.mastery=Math.min(100,(owned.mastery||0)+(m.won?5:1));let coins=0,part=null,traffic=0;
 if(m.won){const opponent=SPIN_OPPONENTS.find(o=>o.id===m.opponentId);coins=Math.min(opponent.reward,R.coinCap-d.coins);d.coins+=coins;s.gold+=coins;s.stats.rewards=(s.stats.rewards||0)+coins;a.reputation+=opponent.rep;if(d.parts<R.partCap&&random(m)<.5){part=['rim','axis','ring'][Math.floor(random(m)*3)];a.parts[part]++;d.parts++;}if(!d.firstWin){d.firstWin=true;traffic=R.trafficMin+random(m)*(R.trafficMax-R.trafficMin);d.traffic=Math.min(R.trafficCap,traffic);}g.notice(s,'manager','陀螺大會獲勝！','good');broadcast(s,`戰鬥陀螺勝利！獎金 ${coins} G${traffic?`，今日來客 +${Math.round(traffic*100)}%`:''}`,'sale');}
 m.reward={coins,part,traffic,reputation:m.won?SPIN_OPPONENTS.find(o=>o.id===m.opponentId).rep:0};a.history.push({id:m.id,day:s.day,won:m.won,score:m.score,reward:m.reward});a.history=a.history.slice(-30);g.log(s,`廣場陀螺大會：${m.won?'勝利':'下次再挑戰'} ${m.score.join('：')}，獎金 ${coins} G。`);
}
export function spinAction(g,s,type,p){
 if(!type.startsWith('spin'))return null;check(s.level>=R.unlock,'戰鬥陀螺大會於商會 Lv.3 解鎖');const a=spinState(s),t=spinTop(p.topId),owned=a.owned[p.topId];
 if(type==='spinBuy'){check(t,'找不到這顆陀螺');check(a.reputation>=t.reputation,'競技聲望尚未達到解鎖門檻');if(owned)return '已收藏這顆陀螺，未重複扣款';g.pay(s,t.cost);s.stats.expenses+=t.cost;a.owned[t.id]={level:1,mastery:0,parts:{}};a.equipped??=t.id;return `已購入${t.name}`;}
 if(type==='spinEquip'){check(owned,'請先購買這顆陀螺');check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能更換陀螺');a.equipped=p.topId;return '已裝備';}
 if(type==='spinUpgrade'){check(owned,'尚未擁有');check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能強化');check(p.expectedLevel===owned.level,'強化等級已變更，未重複扣款');check(owned.level<R.maxUpgrade,'已達最高強化 Lv.5');const cost=[0,80,120,180,260][owned.level];g.pay(s,cost);s.stats.expenses+=cost;owned.level++;return `強化至 Lv.${owned.level}`;}
 if(type==='spinBuyPart'){check(SPIN_PARTS[p.slot],'零件類型無效');g.pay(s,100);s.stats.expenses+=100;a.parts[p.slot]++;return '已購買零件';}
 if(type==='spinPart'){check(owned&&SPIN_PARTS[p.slot]?.choices[p.value],'零件設定無效');check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能改裝');if(owned.parts[p.slot]===p.value)return '已安裝，未重複消耗';check(a.parts[p.slot]>0,'需要先取得這類零件');a.parts[p.slot]--;owned.parts[p.slot]=p.value;return '改裝完成';}
 if(type==='spinStart'){check(a.equipped&&a.owned[a.equipped],'請先購買並裝備至少一顆陀螺');if(a.match&&['battle','strategy','roundResult'].includes(a.match.phase))return '繼續尚未結束的比賽';const o=SPIN_OPPONENTS.find(o=>o.id===p.opponentId);check(o,'請選擇對手');const top=spinTop(a.equipped),other=spinTop(o.topId);a.match={id:`spin-${++a.serial}`,day:s.day,topId:top.id,opponentId:o.id,opponentTopId:o.topId,playerStats:spinStats(top.id,a.owned[top.id]),opponentStats:Object.fromEntries(Object.entries(spinStats(o.topId)).map(([k,v])=>[k,v*(1+o.difficulty*.07)])),playerElement:top.element,opponentElement:other.element,difficulty:o.difficulty,phase:'strategy',score:[0,0],round:1,rounds:[],seed:Math.floor(g.random(s)*4294967295),effects:[],fx:0};return '選擇本局策略';}
 const m=a.match;check(m,'目前沒有比賽');if(type==='spinLaunch'){check(['strategy','roundResult'].includes(m.phase),'目前不能開始新局');check(p.round===m.round&&p.expectedPhase===m.phase,'局數已變更');launchSpinRound(m,p.strategy);return '開始對戰';}
 if(type==='spinSkill'){check(m.phase==='battle','本局尚未開始');check(attack(m,0),'必殺技尚未充滿');return '必殺技！';}
 if(type==='spinAdvance'){advanceSpinMatch(m,p.seconds);settleSpinMatch(g,s);return '對戰進行中';}
 if(type==='spinSettle'){settleSpinMatch(g,s);return '已結算，不重複發獎';}
 if(type==='spinRetire'){check(m.phase!=='result','本場已結算');a.history.push({id:m.id,day:s.day,abandoned:true});a.match=null;return '已退出，不扣款、不降低來客率';}
 return null;
}
