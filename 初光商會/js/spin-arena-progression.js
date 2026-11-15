import {SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_GRADES,spinTop,spinPartBonus} from './spin-arena-config.js?v=20261115-v61';
export function spinState(s){
 s.spinArena??={owned:{},equipped:null,parts:{rim:0,axis:0,ring:0},reputation:0,match:null,history:[],serial:0};
 const a=s.spinArena;
 if(a.partSchema!==2){
  a.parts??={};
  for(const slot of Object.keys(SPIN_PARTS)){
   const old=a.parts[slot];a.parts[slot]=Object.fromEntries(Object.keys(SPIN_GRADES).map(grade=>[grade,Math.max(0,Math.floor(Number(typeof old==='number'?(grade==='normal'?old:0):old?.[grade])||0))]));
  }
  for(const owned of Object.values(a.owned))for(const [slot,part] of Object.entries(owned.parts||{}))if(typeof part==='string')owned.parts[slot]={value:part,grade:'normal'};
  a.partSchema=2;
 }
 if(a.daily?.day!==s.day)a.daily={day:s.day,coins:0,parts:0,traffic:0,firstWin:false};
 return a;
}
export function spinStats(id,owned={level:1,parts:{},mastery:0}){
 const t=spinTop(id),stats={};
 for(const k of ['attack','defense','speed','stamina']){
  let partBonus=0;
  for(const [slot,item] of Object.entries(owned.parts||{})){
   const part=typeof item==='string'?{value:item,grade:'normal'}:item;
   partBonus+=spinPartBonus(slot,part?.value,part?.grade)[k]||0;
  }
  const bonus=Math.min(R.statBonusCap,((owned.level||1)-1)*R.upgradeStep+partBonus+Math.min(100,owned.mastery||0)*.0005);
  stats[k]=t[k]*(1+bonus);
 }
 return stats;
}
export function tickSpinVisitors(g,s,realSeconds){
 if(s.level<R.unlock||s.phase!=='open'||!Number.isFinite(realSeconds)||realSeconds<=0)return;
 const a=spinState(s);
 if(!a.equipped||a.visitor||a.match&&['battle','strategy','roundResult'].includes(a.match.phase))return;
 a.nextVisitorIn??=R.visitorMin+g.random(s)*(R.visitorMax-R.visitorMin);
 a.nextVisitorIn-=Math.min(600,realSeconds);
 if(a.nextVisitorIn>0)return;
 const top=SPIN_TOPS[Math.min(5,Math.floor(g.random(s)*6))];
 const names=['巡迴陀螺師','遠行挑戰者','異鄉技師','流浪冠軍'];
 a.visitor={id:`visitor-${++a.serial}`,name:names[Math.min(3,Math.floor(g.random(s)*4))],topId:top.id,difficulty:3,reward:0,rep:0,visitor:true,status:'waiting'};
 g.notice(s,'manager','外來高手抵達！陀螺 → 選擇對手','good');
 g.log(s,'外來陀螺挑戰者抵達廣場，勝敗都保證獲得零件，不增加聲望。');
}
export function awardSpinPart(a,m,random){
 const guaranteed=!!m.visitorId,d=a.daily;
 if(!guaranteed&&(d.parts>=R.partCap||random()>=(m.won?.65:.25)))return null;
 const slot=Object.keys(SPIN_PARTS)[Math.min(2,Math.floor(random()*3))],r=random();
 const [high,advanced]=guaranteed?[.45,.55]:m.difficulty>=2?[.25,.5]:m.difficulty===1?[.1,.35]:[.02,.18];
 const grade=r<high?'high':r<high+advanced?'advanced':'normal';
 a.parts[slot][grade]++;
 if(guaranteed)d.visitorParts=(d.visitorParts||0)+1;else d.parts++;
 return {slot,grade};
}
export function consumeSpinVisitor(a,m,random){
 if(!m.visitorId)return;
 if(a.visitor?.id===m.visitorId)a.visitor=null;
 a.nextVisitorIn=R.visitorMin+random()*(R.visitorMax-R.visitorMin);
}
