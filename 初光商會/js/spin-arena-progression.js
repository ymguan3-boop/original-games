import {SPIN_RULES as R,SPIN_TOPS,SPIN_PARTS,SPIN_GRADES,SPIN_OPPONENTS,spinTop,spinPartBonus} from './spin-arena-config.js?v=20261115-v62';
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
 for(const owned of Object.values(a.owned)){
  owned.level=Math.max(1,Math.min(R.maxUpgrade,Math.floor(Number(owned.level)||1)));
  owned.mastery=Math.max(0,Number(owned.mastery)||0);
  while(owned.mastery>=100&&owned.level<R.maxUpgrade){owned.mastery-=100;owned.level++;}
  if(owned.level===R.maxUpgrade)owned.mastery=0;
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
  const growth=SPIN_GROWTH[id]?.[k]||.03;const bonus=(Math.min(20,owned.level||1)-1)*growth;
  stats[k]=t[k]*(1+bonus)*(1+Math.min(R.statBonusCap,partBonus));
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

// Permanent level growth is independent of equipment and temporary skills.
export const SPIN_GROWTH={flame:{attack:.055,defense:.025,speed:.035,stamina:.03},wind:{attack:.03,defense:.025,speed:.06,stamina:.03},crystal:{attack:.025,defense:.06,speed:.025,stamina:.04},thunder:{attack:.05,defense:.02,speed:.05,stamina:.025},shield:{attack:.025,defense:.04,speed:.025,stamina:.06},shadow:{attack:.04,defense:.04,speed:.04,stamina:.04}};
export function gainSpinMastery(owned,amount){
 const before=owned.level;amount=Math.max(0,Math.floor(amount));
 if(owned.level>=R.maxUpgrade)return {mastery:0,levels:0,level:R.maxUpgrade};
 owned.mastery=(owned.mastery||0)+amount;
 while(owned.mastery>=100&&owned.level<R.maxUpgrade){owned.mastery-=100;owned.level++;}
 if(owned.level>=R.maxUpgrade)owned.mastery=0;
 return {mastery:amount,levels:owned.level-before,level:owned.level};
}
export function spinRoster(g,s,refresh=false){
 const a=spinState(s),level=Math.max(3,Math.min(5,s.level));
 if(!refresh&&a.roster?.level===level)return a.roster.entries;
 const names=['風鈴','阿岳','星野','米露','嵐風','小葵','銀砂','夏木','霜葉','青禾','赤石','雨音'];
 const used=new Set(),old=a.roster?.entries||[];
 const entries=SPIN_OPPONENTS.map((template,i)=>{
  let index=Math.min(names.length-1,Math.floor(g.random(s)*names.length));while(used.has(index)||names[index]===old[i]?.person)index=(index+1)%names.length;used.add(index);
  let topIndex=Math.min(5,Math.floor(g.random(s)*6));if(SPIN_TOPS[topIndex].id===old[i]?.topId)topIndex=(topIndex+1)%6;
  return {...template,name:names[index]+' · '+['新秀','技師','高手'][i],person:names[index],topId:SPIN_TOPS[topIndex].id,shopLevel:level,scale:(1+(level-3)*.2)*(1+i*.07),variation:Object.fromEntries(['attack','defense','speed','stamina'].map(k=>[k,.95+g.random(s)*.1]))};
 });
 a.roster={level,entries};return entries;
}
