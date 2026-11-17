import{SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_GRADES,SPIN_SKILLS,SPIN_OPPONENTS,SPIN_VISITOR_REWARD,spinLevelBonus,spinTop}from'./spin-arena-config.js?v=20261117-v66';
import {spinState,spinStats,awardSpinPart,consumeSpinVisitor,gainSpinMastery,spinRoster} from './spin-arena-progression.js?v=20261117-v66';
export {spinState,spinStats} from './spin-arena-progression.js?v=20261117-v66';
import{broadcast}from'./stock-flow.js?v=20261117-v66';
import{archetypeOf,steer,classifyHit,spinSkillCooldown}from'./spin-arena-paths.js?v=20261117-v66';
/* 安全上限：一局一般會在旋轉能量耗盡前分出勝負；萬一沒有，240 秒後才用比分判定 */
export const SPIN_SAFETY_SECONDS=240;
const check=(v,m)=>{if(!v)throw Error(m);},clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const random=m=>{m.seed=(Math.imul(m.seed,1664525)+1013904223)>>>0;return m.seed/4294967296;};
const body=(stats,x,strategy,element,topId)=>({x,z:0,vx:0,vz:0,spin:100,hp:100,energy:55,angle:0,stats,strategy,element,topId,archetype:archetypeOf(topId),shield:0,skillUntil:0,hitCooldown:0,dodgeUntil:0,dodgeCd:0,counterUntil:0});
export function launchSpinRound(m,strategy){check(['attack','defense','balance'].includes(strategy),'請選擇本局策略');m.strategy=strategy;m.time=0;m.accumulator=0;m.effects=[];m.cutin=null;m.skillQueue=[];m.phase='battle';m.bodies=[body(m.playerStats,-.85,strategy,m.playerElement,m.topId),body(m.opponentStats,.85,['attack','defense','balance'][(m.round+m.difficulty)%3],m.opponentElement,m.opponentTopId)];m.lastHitAt=[-10,-10];m.fastForward=false;for(const b of m.bodies){b.z=(random(m)-.5)*.25;b.phase=random(m)*Math.PI*2;}m.lastCollision=-10;m.roundResult=null;}
export function effectiveSpinStats(body,time){const skill=body.buffUntil>time?SPIN_SKILLS[body.skillId]:null;return Object.fromEntries(Object.entries(body.stats).map(([k,v])=>[k,v*(1+(skill?.bonuses[k]||0))]));}
function attack(m,i){
 const b=m.bodies[i];if(b.energy<100)return false;b.energy=0;
 const cue={id:++m.fx,actor:i,topId:i?m.opponentTopId:m.topId,elapsed:0,duration:R.cutinSeconds};
 if(m.cutin)(m.skillQueue??=[]).push(cue);else m.cutin=cue;return true;
}
function finishCutin(m){
 const cue=m.cutin,b=m.bodies[cue.actor],v=m.bodies[1-cue.actor],skill=SPIN_SKILLS[cue.topId];
 b.skillId=cue.topId;b.buffUntil=m.time+(skill?.seconds||4);b.skillUntil=m.time+1.1;
 const dx=v.x-b.x,dz=v.z-b.z,d=Math.hypot(dx,dz)||1;b.vx+=dx/d*3;b.vz+=dz/d*3;b.shield=b.strategy==='defense'?m.time+2.5:0;
 m.effects.push({id:cue.id,kind:'skill',actor:cue.actor,at:m.time,archetype:b.archetype});m.effects=m.effects.slice(-16);
 m.cutin=m.skillQueue?.shift()||null;
}
const affinity=(a,b)=>({fire:'wind',wind:'earth',earth:'fire'}[a]===b?1.18:({fire:'wind',wind:'earth',earth:'fire'}[b]===a?.9:1));
export function endSpinRound(m,winner,reason){
 if(m.phase!=='battle')return;const tied=winner===null;
 m.drawStreak=tied?(m.drawStreak||0)+1:0;
 if(m.drawStreak>=2)m.suddenDeath=true;
 if(!tied)m.score[winner]++;
 m.phase=!tied&&(m.suddenDeath||m.score[winner]>=R.roundsToWin)?'result':'roundResult';
 const loser=tied?null:1-winner,lb=loser===null?null:m.bodies?.[loser],cause=tied?'tie':/出界/.test(reason)?'out':/耐久/.test(reason)?'durability':/旋轉/.test(reason)?'spin':'time';
 m.roundResult={winner,reason,tied,round:m.round,suddenDeath:!!m.suddenDeath,loser,cause,endAt:m.time,loserVelocity:lb?{x:lb.vx,z:lb.vz}:null};m.rounds.push({...m.roundResult,time:m.time,score:[...m.score]});
 if(!tied&&m.phase!=='result')m.round++;if(m.phase==='result')m.won=winner===0;
}

function step(m,dt){
 m.time+=dt;const bs=m.bodies;
 for(let i=0;i<2;i++){const b=bs[i],o=bs[1-i],stats=effectiveSpinStats(b,m.time),d=Math.hypot(o.x-b.x,o.z-b.z)||1,near=Math.hypot(b.x,b.z),spd=.5+stats.speed/38;
  b.archetype??=archetypeOf(i?m.opponentTopId:m.topId);
  // 閃避：對手技能衝刺逼近時，以速度差判定；成功才演出、才免傷
  if(o.skillUntil>m.time&&d<1.35&&b.dodgeCd<=m.time&&b.dodgeUntil<=m.time){const os=effectiveSpinStats(o,m.time).speed,chance=clamp(.12+(stats.speed-os)/70+(['counter','speed'].includes(b.archetype)?.22:0)+(i?m.difficulty*.04:0),.05,.65);if(random(m)<chance){const sx=-(o.z-b.z)/d,sz=(o.x-b.x)/d,side=random(m)<.5?1:-1,style=b.archetype==='counter'?'behind':b.archetype==='speed'?'slide':stats.speed>os?'feint':'brake';b.vx+=sx*side*2.6;b.vz+=sz*side*2.6;b.dodgeUntil=m.time+.42;b.dodgeCd=m.time+2.6;if(b.archetype==='counter')b.counterUntil=m.time+.9;m.effects.push({id:++m.fx,kind:'dodge',actor:i,style,at:m.time,x:b.x,z:b.z});m.effects=m.effects.slice(-16);}else b.dodgeCd=m.time+1;}
  const plan=steer(b.archetype,b,o,m.time,i,b.skillUntil>m.time),dl=Math.hypot(plan.dir[0],plan.dir[1])||1,tx=plan.dir[0]/dl,tz=plan.dir[1]/dl,mult=plan.speed*(b.counterUntil>m.time?1.25:1);
  b.vx+=(tx*spd*mult-b.vx)*dt*2;b.vz+=(tz*spd*mult-b.vz)*dt*2;
  if(near>R.radius-.4){b.vx-=b.x*dt*1.8;b.vz-=b.z*dt*1.8;}
  b.x+=b.vx*dt;b.z+=b.vz*dt;b.angle+=dt*(10+b.spin*.25);b.spin=Math.max(0,b.spin-dt*(2.15*25/stats.stamina)*(b.strategy==='attack'?1.14:1));b.hitCooldown=Math.max(0,b.hitCooldown-dt);
  // 技能冷卻：每顆陀螺依「速」計算自己的冷卻，充滿就自動施放
  b.energy=Math.min(100,b.energy+dt*100/spinSkillCooldown(stats.speed));
  if(b.energy>=100&&b.skillUntil<=m.time&&!(m.skillQueue||[]).some(c=>c.actor===i)&&m.cutin?.actor!==i)attack(m,i);
 }
 if(m.cutin)return;
 const dx=bs[1].x-bs[0].x,dz=bs[1].z-bs[0].z,dist=Math.hypot(dx,dz),contact=R.bodyRadius*2;
 if(dist<contact){const nx=dist?dx/dist:1,nz=dist?dz/dist:0,overlap=(contact-dist)/2;bs[0].x-=nx*overlap;bs[0].z-=nz*overlap;bs[1].x+=nx*overlap;bs[1].z+=nz*overlap;
  if(m.time-m.lastCollision>.48){m.hitChain=m.time-m.lastCollision<1.2?(m.hitChain||0)+1:0;const recent=m.hitChain>=2;m.lastCollision=m.time;const shielded=bs.some(b=>b.shield>m.time),kind=classifyHit(bs[0],bs[1],nx,nz,recent,shielded),dodged=bs.map(b=>b.dodgeUntil>m.time);let total=0;
   for(let i=0;i<2;i++){const b=bs[i],v=bs[1-i],power=effectiveSpinStats(b,m.time).attack*(b.strategy==='attack'?1.15:1)*affinity(b.element,v.element)*(b.counterUntil>m.time?1.2:1),guard=effectiveSpinStats(v,m.time).defense*(v.strategy==='defense'?1.22:1),damage=dodged[1-i]?0:clamp((power*.45-guard*.18)*(v.shield>m.time?.5:1),3,24);v.hp=Math.max(0,v.hp-damage);v.spin=Math.max(0,v.spin-damage*.32);total+=damage;const sign=i===0?1:-1,impulse=1.4+(b.skillUntil>m.time?2.8:0);v.vx+=nx*sign*impulse;v.vz+=nz*sign*impulse;}
   const strong=bs.some(b=>b.skillUntil>m.time)||total>=30;
   m.effects.push({id:++m.fx,kind:'hit',type:dodged.some(Boolean)?'graze':kind.type,power:kind.power,strong,damage:Math.round(total),at:m.time,x:(bs[0].x+bs[1].x)/2,z:(bs[0].z+bs[1].z)/2,nx,nz});m.effects=m.effects.slice(-16);
  }
 }
 const defeated=bs.map(b=>b.hp<=0||b.spin<=0||Math.hypot(b.x,b.z)>R.radius+R.bodyRadius),reason=i=>Math.hypot(bs[i].x,bs[i].z)>R.radius+R.bodyRadius?'出界':bs[i].hp<=0?'耐久歸零':'旋轉能量歸零';
 if(defeated.some(Boolean)){endSpinRound(m,defeated[0]&&defeated[1]?null:defeated[0]?1:0,defeated[0]&&defeated[1]?'同時出局，重賽':reason(defeated[0]?0:1));return;}
 if(m.time>=SPIN_SAFETY_SECONDS){const score=b=>Math.round((b.spin*.6+b.hp*.4)*1e6)/1e6,a=score(bs[0]),b=score(bs[1]);endSpinRound(m,a===b?null:a>b?0:1,a===b?'同分，重賽':'久戰判定：旋轉能量 60%＋耐久 40%');}
}
export function advanceSpinMatch(m,seconds){if(m?.phase!=='battle')return;m.accumulator=(m.accumulator||0)+Math.max(0,Math.min(2,seconds));while(m.accumulator+1e-9>=R.fixedStep&&m.phase==='battle'){m.accumulator-=R.fixedStep;if(m.cutin){m.cutin.elapsed+=R.fixedStep;if(m.cutin.elapsed+1e-9>=m.cutin.duration)finishCutin(m);}else step(m,R.fixedStep);}}
export function fastForwardSpinRound(m){if(m?.phase!=='battle')return false;m.fastForward=true;let guard=0;while(m.phase==='battle'&&guard++<400)advanceSpinMatch(m,2);return true;}
export function settleSpinMatch(g,s){
 const a=spinState(s),m=a.match;if(!m||m.phase!=='result'||m.settled)return;m.settled=true;
 const owned=a.owned[m.topId],d=a.daily,opponent=m.opponent||SPIN_OPPONENTS.find(o=>o.id===m.opponentId);
 const progress=gainSpinMastery(owned,m.won?25:10);let coins=0,traffic=0,reputation=0;
 if(m.won&&m.visitorId){coins=SPIN_VISITOR_REWARD.coins;reputation=SPIN_VISITOR_REWARD.rep;s.gold+=coins;s.stats.rewards=(s.stats.rewards||0)+coins;a.reputation+=reputation;}
 if(m.won&&!m.visitorId){
  const bonus=spinLevelBonus(m.shopLevel??s.level);coins=Math.max(0,Math.min(opponent.reward,R.coinCap-d.coins));d.coins+=coins;coins+=bonus;s.gold+=coins;s.stats.rewards=(s.stats.rewards||0)+coins;
  reputation=opponent.rep;a.reputation+=reputation;
  if(!d.firstWin){d.firstWin=true;traffic=R.trafficMin+random(m)*(R.trafficMax-R.trafficMin);d.traffic=Math.min(R.trafficCap,traffic);}
 }
 const part=awardSpinPart(a,m,()=>random(m));consumeSpinVisitor(a,m,()=>random(m));
 if(m.won){g.notice(s,'manager','陀螺大會獲勝！','good');broadcast(s,`戰鬥陀螺勝利！${m.visitorId?`擊敗外來高手！獎金 ${coins} G、聲望 +${reputation}，零件已入庫`:`獎金 ${coins} G${traffic?`，今日來客 +${Math.round(traffic*100)}%`:''}`}`,'sale');}
 spinRoster(g,s,true);m.reward={coins,part,traffic,reputation,...progress};a.history.push({id:m.id,day:s.day,won:m.won,score:m.score,reward:m.reward,visitor:!!m.visitorId});a.history=a.history.slice(-30);
 g.log(s,`廣場陀螺大會：${m.won?'勝利':'下次再挑戰'} ${m.score.join('：')}，獎金 ${coins} G${part?`，獲得${SPIN_GRADES[part.grade].name}${SPIN_PARTS[part.slot].name}`:''}。`);
}
export function spinAction(g,s,type,p){
 if(!type.startsWith('spin'))return null;check(s.level>=R.unlock,'戰鬥陀螺大會於商會 Lv.3 解鎖');const a=spinState(s),t=spinTop(p.topId),owned=a.owned[p.topId];
 if(type==='spinBuy'){check(t,'找不到這顆陀螺');if(owned)return '已收藏這顆陀螺，未重複扣款';check(a.reputation>=t.reputation,`競技聲望 ${t.reputation} 解鎖${t.name}`);g.pay(s,t.cost);s.stats.expenses+=t.cost;a.owned[t.id]={level:1,mastery:0,parts:{}};a.equipped??=t.id;return `已購入${t.name}`;}
 if(type==='spinEquip'){check(owned,'請先購買這顆陀螺');check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能更換陀螺');a.equipped=p.topId;return '已裝備';}
 if(type==='spinRoster'){spinRoster(g,s);return '對手名單已更新';}
 if(type==='spinUpgrade')return '強化已改為對戰熟練度升級，無須付費';
 if(type==='spinUnequip'){check(owned&&SPIN_PARTS[p.slot],'零件設定無效');check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能改裝');const part=owned.parts[p.slot];if(part){a.parts[p.slot][part.grade]++;delete owned.parts[p.slot];}return '已卸下零件並歸還背包';}
 if(type==='spinBuyPart'){check(SPIN_PARTS[p.slot]&&(!p.grade||p.grade==='normal'),'商店僅販售普通零件，進階與高級須挑戰取得');g.pay(s,100);s.stats.expenses+=100;a.parts[p.slot].normal++;return '已購買普通零件';}
 if(type==='spinPart'){
  const grade=p.grade||'normal';check(owned&&SPIN_PARTS[p.slot]?.choices[p.value]&&SPIN_GRADES[grade],'零件設定無效');
  check(!a.match||!['battle','strategy','roundResult'].includes(a.match.phase),'比賽途中不能改裝');
  const old=owned.parts[p.slot];if(old?.value===p.value&&old.grade===grade)return '已安裝，未重複消耗';
  check(a.parts[p.slot][grade]>0,'沒有這種等級的零件，請先挑戰取得');a.parts[p.slot][grade]--;
  if(old&&SPIN_GRADES[old.grade])a.parts[p.slot][old.grade]++;
  owned.parts[p.slot]={value:p.value,grade};return '改裝完成，原零件已歸還';
 }
 if(type==='spinSound'){a.soundMuted=!!p.muted;return a.soundMuted?'已關閉陀螺音效':'已開啟陀螺音效';}
 if(type==='spinStart'){
  check(a.equipped&&a.owned[a.equipped],'請先購買並裝備至少一顆陀螺');if(a.match&&['battle','strategy','roundResult'].includes(a.match.phase))return '繼續尚未結束的比賽';
  const o=spinRoster(g,s).find(o=>o.id===p.opponentId)||(a.visitor?.id===p.opponentId&&a.visitor.status==='waiting'?a.visitor:null);check(o,'這位對手已離開，請選擇目前的對手');
  const top=spinTop(a.equipped),other=spinTop(o.topId),playerStats=spinStats(top.id,a.owned[top.id]);
  const opponentStats=Object.fromEntries(Object.entries(spinStats(o.topId)).map(([k,v])=>[k,o.visitor?Math.max(v*1.35*(1+(s.level-3)*.2),playerStats[k]*1.12):v*o.scale*(o.variation?.[k]||1)]));
  a.match={id:`spin-${++a.serial}`,day:s.day,shopLevel:s.level,topId:top.id,opponentId:o.id,opponentTopId:o.topId,opponent:{...o},visitorId:o.visitor?o.id:null,playerStats,opponentStats,playerElement:top.element,opponentElement:other.element,difficulty:o.difficulty,phase:'strategy',score:[0,0],round:1,rounds:[],seed:Math.floor(g.random(s)*4294967295),effects:[],fx:0};
  if(o.visitor)a.visitor.status='engaged';return '選擇本局策略';
 }
 const m=a.match;check(m,'目前沒有比賽');if(type==='spinLaunch'){check(['strategy','roundResult'].includes(m.phase),'目前不能開始新局');check(p.round===m.round&&p.expectedPhase===m.phase,'局數已變更');launchSpinRound(m,p.strategy);return '開始對戰';}
 if(type==='spinSkill'||type==='spinFastForward'){check(m.phase==='battle','本局尚未開始');fastForwardSpinRound(m);settleSpinMatch(g,s);return '快轉：本局結果出爐';}
 if(type==='spinAdvance'){advanceSpinMatch(m,p.seconds);settleSpinMatch(g,s);return '對戰進行中';}
 if(type==='spinSettle'){settleSpinMatch(g,s);return '已結算，不重複發獎';}
 if(type==='spinRetire'){check(m.phase!=='result','本場已結算');consumeSpinVisitor(a,m,()=>random(m));a.history.push({id:m.id,day:s.day,abandoned:true});a.match=null;return '已退出，不扣款、不降低來客率；棄賽不發零件';}
 return null;
}
