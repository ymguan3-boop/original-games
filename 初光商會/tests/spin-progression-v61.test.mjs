import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Game} from '../js/core.js';
import {spinState,spinStats,advanceSpinMatch,effectiveSpinStats,launchSpinRound,endSpinRound} from '../js/spin-arena-core.js?v=20261117-v66';
import {tickSpinVisitors,awardSpinPart} from '../js/spin-arena-progression.js?v=20261117-v66';
import {SPIN_TOPS,SPIN_SKILLS,SPIN_RULES as R} from '../js/spin-arena-config.js?v=20261117-v66';
import {activeSpinSkills} from '../js/spin-arena-skills.js?v=20261117-v66';
import {SPIN_SOUND_PROFILES} from '../js/spin-arena-presentation.js?v=20261117-v66';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
function setup(){const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},g=new Game({storage,data});g.transaction(null,s=>{s.level=3;s.gold=20000;});return {g,storage};}
function start(g){g.act('spinBuy',{topId:'flame'});g.act('spinStart',{opponentId:'rookie'});g.act('spinLaunch',{strategy:'balance',round:1,expectedPhase:'strategy'});return g.state.spinArena.match;}
test('新玩家僅開放一款；十二款聲望門檻逐一開放，已收藏者不沒收',()=>{
 const {g}=setup();assert.equal(SPIN_TOPS.filter(t=>t.reputation===0).length,1);
 assert.deepEqual(SPIN_TOPS.map(t=>t.reputation),[0,4,10,18,28,40,55,75,100,130,165,205]);
 assert(!g.act('spinBuy',{topId:'wind'}).ok);
 for(const t of SPIN_TOPS){g.transaction(null,s=>spinState(s).reputation=t.reputation);assert(g.act('spinBuy',{topId:t.id}).ok);const next=SPIN_TOPS[SPIN_TOPS.indexOf(t)+1];if(next)assert(!g.act('spinBuy',{topId:next.id}).ok);}
 g.transaction(null,s=>s.spinArena.reputation=0);assert(g.act('spinEquip',{topId:'shadow'}).ok);assert(g.act('spinBuy',{topId:'shadow'}).ok);
});
test('舊零件數量與已安裝搭配無損升級為三級庫存，重跑遷移不倍增',()=>{
 const s={day:1,spinArena:{owned:{flame:{level:1,mastery:0,parts:{rim:'attack'}}},equipped:'flame',parts:{rim:2,axis:1,ring:3},reputation:9,history:[],serial:2}};
 const a=spinState(s);assert.deepEqual(a.parts.rim,{normal:2,advanced:0,high:0});assert.deepEqual(a.owned.flame.parts.rim,{value:'attack',grade:'normal'});const once=structuredClone(a);spinState(s);assert.deepEqual(a,once);assert.equal(a.reputation,9);
});
test('主副能力搭配實際影響四項數值；三級逐級提高、換裝歸還舊零件且可讀檔',()=>{
 const owned={level:1,mastery:0,parts:{rim:{value:'attack',grade:'high'},axis:{value:'speed',grade:'high'},ring:{value:'defense',grade:'high'}}},stats=spinStats('flame',owned);
 for(const [k,expected] of Object.entries({attack:31*1.22,defense:19*1.22,speed:23*1.28,stamina:22*1.12}))assert(Math.abs(stats[k]-expected)<1e-8,k);
 assert(spinStats('flame',{...owned,parts:{rim:{value:'attack',grade:'normal'}}}).attack<spinStats('flame',{...owned,parts:{rim:{value:'attack',grade:'advanced'}}}).attack);
 const {g,storage}=setup();g.act('spinBuy',{topId:'flame'});g.act('spinBuyPart',{slot:'rim'});g.act('spinPart',{topId:'flame',slot:'rim',value:'attack'});
 g.transaction(null,s=>spinState(s).parts.rim.high=1);assert(g.act('spinPart',{topId:'flame',slot:'rim',value:'defense',grade:'high'}).ok);
 assert.equal(g.state.spinArena.parts.rim.normal,1);assert.equal(g.state.spinArena.parts.rim.high,0);
 const before=structuredClone(g.state.spinArena.parts);g.act('spinPart',{topId:'flame',slot:'rim',value:'defense',grade:'high'});assert.deepEqual(g.state.spinArena.parts,before);
 assert(!g.act('spinBuyPart',{slot:'rim',grade:'high'}).ok);const re=new Game({storage,data});assert.equal(re.state.spinArena.owned.flame.parts.rim.grade,'high');
 start(g);assert(!g.act('spinPart',{topId:'flame',slot:'rim',value:'attack'}).ok);
});
test('外來高手只在 Lv3+ 營業時間出現，不覆蓋等待者，勝敗保底、勝利固定 1500 G 與聲望 +50，且只結算一次',()=>{
 for(const won of [false,true]){
  const {g,storage}=setup();g.act('spinBuy',{topId:'flame'});
  g.transaction(null,s=>{s.phase='closed';spinState(s).nextVisitorIn=.1;tickSpinVisitors(g,s,600);});assert(!g.state.spinArena.visitor);
  g.transaction(null,s=>{s.phase='open';s.level=2;tickSpinVisitors(g,s,600);});assert(!g.state.spinArena.visitor);
  g.transaction(null,s=>{s.level=3;tickSpinVisitors(g,s,1);});const id=g.state.spinArena.visitor.id;
  g.transaction(null,s=>tickSpinVisitors(g,s,600));assert.equal(g.state.spinArena.visitor.id,id);
  assert(g.act('spinStart',{opponentId:id}).ok);let m=g.state.spinArena.match;for(const k of Object.keys(m.playerStats))assert(m.opponentStats[k]>=m.playerStats[k]*1.12);
  const gold=g.state.gold,rep=g.state.spinArena.reputation;
  g.transaction(null,s=>{const a=spinState(s);a.daily.parts=R.partCap;a.match.phase='result';a.match.won=won;a.match.score=won?[2,0]:[0,2];});
  g.act('spinSettle');m=g.state.spinArena.match;assert(m.reward.part);assert(['advanced','high'].includes(m.reward.part.grade));assert.equal(m.reward.reputation,won?50:0);assert.equal(m.reward.coins,won?1500:0);assert.equal(g.state.gold,gold+(won?1500:0));assert.equal(g.state.spinArena.reputation,rep+(won?50:0));assert.equal(g.state.spinArena.daily.parts,R.partCap);assert.equal(g.state.spinArena.visitor,null);
  const inventory=structuredClone(g.state.spinArena.parts);g.act('spinSettle');assert.deepEqual(g.state.spinArena.parts,inventory);
  const re=new Game({storage,data});re.act('spinSettle');assert.deepEqual(re.state.spinArena.parts,inventory);assert(!re.act('spinStart',{opponentId:id}).ok);
 }
});
test('隨機輪盤／軸心／外環與普通／進階／高級均可入庫；外來保底不受日上限',()=>{
 for(const [i,slot] of ['rim','axis','ring'].entries())for(const [r,grade] of [[.01,'high'],[.1,'advanced'],[.9,'normal']]){
  const a=spinState({day:1}),values=[0,(i+.5)/3,r];const part=awardSpinPart(a,{won:true,difficulty:0},()=>values.shift());assert.deepEqual(part,{slot,grade});assert.equal(a.parts[slot][grade],1);
 }
});
test('十二款技能先轉場並暫停物理，再啟用專屬數值與場上 GIF；存讀檔保持順序',()=>{
 for(const t of SPIN_TOPS){
  const {g}=setup();let m=start(g);m.topId=t.id;m.playerStats=spinStats(t.id);launchSpinRound(m,'balance');m.bodies[0].energy=100;
  advanceSpinMatch(m,R.fixedStep);assert.equal(m.cutin.topId,t.id);assert.equal(activeSpinSkills(m).length,0);
  const before=structuredClone(m.bodies),time=m.time;advanceSpinMatch(m,.4);assert.equal(m.time,time);assert.deepEqual(m.bodies,before);assert.equal(activeSpinSkills(m).length,0);
  const saved=structuredClone(m);advanceSpinMatch(m,.4);advanceSpinMatch(saved,.4);assert.deepEqual(m,saved);assert.equal(m.cutin,null);assert.equal(activeSpinSkills(m)[0].topId,t.id);
  const boosted=effectiveSpinStats(m.bodies[0],m.time),base=m.bodies[0].stats;
  for(const k of Object.keys(base))assert(Math.abs(boosted[k]-base[k]*(1+(SPIN_SKILLS[t.id].bonuses[k]||0)))<1e-8);
  assert.deepEqual(effectiveSpinStats(m.bodies[0],m.bodies[0].buffUntil+.01),base);
  endSpinRound(m,0,'測試');launchSpinRound(m,'balance');assert.equal(m.cutin,null);assert.deepEqual(m.effects,[]);
 }
 assert.equal(new Set(Object.values(SPIN_SOUND_PROFILES).map(p=>JSON.stringify(p))).size,12);
});
test('AI 也必須先登場；雙方排隊施放不覆蓋、不提前傷害或重複消耗',()=>{
 const {g}=setup();let m=start(g);m.bodies[0].x=-.3;m.bodies[1].x=.3;m.bodies.forEach(b=>b.z=0);m.bodies[1].energy=100;m.bodies[0].energy=100;
 advanceSpinMatch(m,R.fixedStep);assert.equal(m.cutin.actor,0);assert.equal(m.skillQueue.length,1);assert.equal(m.skillQueue[0].actor,1);assert.equal(activeSpinSkills(m).length,0);
 const time=m.time,hp=m.bodies.map(b=>b.hp);advanceSpinMatch(m,.8);assert.equal(m.cutin.actor,1);assert.equal(m.effects.filter(e=>e.kind==='skill').length,1);
 advanceSpinMatch(m,.8);assert.equal(m.cutin,null);assert.equal(m.time,time);assert.deepEqual(m.bodies.map(b=>b.hp),hp);assert.equal(activeSpinSkills(m).length,2);assert.equal(m.bodies[0].skillId,'flame');assert.equal(m.bodies[1].skillId,m.opponentTopId);
});
test('一場實際強化外來對戰可由物理模擬完成三戰兩勝並取得保底零件',()=>{
 const {g}=setup();g.act('spinBuy',{topId:'flame'});g.transaction(null,s=>{s.phase='open';spinState(s).nextVisitorIn=0;tickSpinVisitors(g,s,1);});
 const id=g.state.spinArena.visitor.id;g.act('spinStart',{opponentId:id});let m=g.state.spinArena.match;launchSpinRound(m,'balance');
 let steps=0;while(m.phase!=='result'&&steps++<10000){if(m.phase==='roundResult')launchSpinRound(m,'balance');advanceSpinMatch(m,.25);}
 assert.equal(m.phase,'result');assert(m.score.some(n=>n===2));assert(m.rounds.every(r=>r.time<=45));assert(g.act('spinSettle').ok);assert(g.state.spinArena.match.reward.part);assert.equal(g.state.spinArena.visitor,null);
});
