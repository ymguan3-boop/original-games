import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {spinSkillCooldown} from '../js/spin-arena-paths.js?v=20261117-v67';
import {Game} from '../js/core.js';
import {spinState,spinStats,launchSpinRound,advanceSpinMatch} from '../js/spin-arena-core.js?v=20261117-v67';
import {gainSpinMastery,spinRoster} from '../js/spin-arena-progression.js?v=20261117-v67';
import {retireProducts} from '../js/retired-products.js?v=20261117-v67';
import {enemyAttackProfile,enemyCanHit} from '../../幻靈奇旅/survivors/js/enemy-rules.js?v=20261117-v67';
import {HERO_ATTACKS} from '../../幻靈奇旅/survivors/js/combat-profile.js?v=20261117-v67';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8'));
const data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
function setup(){const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},g=new Game({storage,data});g.transaction(null,s=>{s.level=3;s.gold=10000;});g.act('spinBuy',{topId:'flame'});return {g,storage};}
test('熟練跨級、溢出保留、最高20級與舊100%遷移只執行一次；類型成長不同',()=>{
 const o={level:1,mastery:90,parts:{}};assert.deepEqual(gainSpinMastery(o,25),{mastery:25,levels:1,level:2});assert.equal(o.mastery,15);
 o.level=19;o.mastery=99;gainSpinMastery(o,25);assert.equal(o.level,20);assert.equal(o.mastery,0);gainSpinMastery(o,1000);assert.equal(o.level,20);
 const s={day:1,spinArena:{owned:{flame:{level:5,mastery:100,parts:{}}},parts:{rim:0,axis:0,ring:0},serial:0}};spinState(s);spinState(s);assert.equal(s.spinArena.owned.flame.level,6);
 const f=spinStats('flame',{level:20,parts:{}}),w=spinStats('wind',{level:20,parts:{}});assert(f.attack/31>f.defense/19);assert(w.speed/33>w.attack/23);
});
test('勝敗熟練只結算一次、升級不收費；裝卸庫存守恆',()=>{
 const {g}=setup();g.transaction(null,s=>s.spinArena.owned.flame.mastery=90);g.act('spinStart',{opponentId:'rookie'});g.transaction(null,s=>{s.spinArena.match.phase='result';s.spinArena.match.won=true;s.spinArena.match.score=[2,0];});g.act('spinSettle');g.act('spinSettle');assert.equal(g.state.spinArena.owned.flame.level,2);assert.equal(g.state.spinArena.owned.flame.mastery,15);
 g.act('spinBuyPart',{slot:'rim'});assert(g.act('spinPart',{topId:'flame',slot:'rim',value:'attack'}).ok);const before=g.state.spinArena.parts.rim.normal;assert(g.act('spinUnequip',{topId:'flame',slot:'rim'}).ok);assert.equal(g.state.spinArena.parts.rim.normal,before+1);g.act('spinUnequip',{topId:'flame',slot:'rim'});assert.equal(g.state.spinArena.parts.rim.normal,before+1);
});
test('技能冷卻依「速」計算（速越高越短），碰撞不再額外集氣',()=>{
 const {g}=setup();g.act('spinStart',{opponentId:'rookie'});let m=g.state.spinArena.match;launchSpinRound(m,'balance');m.bodies[0].x=-1;m.bodies[1].x=1;const cd=spinSkillCooldown(m.bodies[0].stats.speed);advanceSpinMatch(m,1/60);assert(Math.abs(m.bodies[0].energy-(55+100/cd/60))<1e-9);
 launchSpinRound(m,'balance');m.bodies[0].x=-.3;m.bodies[1].x=.3;m.bodies.forEach(b=>b.z=0);advanceSpinMatch(m,1/60);assert(Math.abs(m.bodies[0].energy-(55+100/cd/60))<1e-9);
 assert(spinSkillCooldown(39)<spinSkillCooldown(19));assert.equal(spinSkillCooldown(5),14);assert.equal(spinSkillCooldown(200),4.5);
});
test('對手名單穩定存檔、每場換人換陀螺；商會Lv5比Lv3提高能力',()=>{
 const {g,storage}=setup();g.act('spinRoster');const before=structuredClone(g.state.spinArena.roster.entries);const re=new Game({storage,data});assert.deepEqual(re.state.spinArena.roster.entries,before);
 g.transaction(null,s=>spinRoster(g,s,true));const next=g.state.spinArena.roster.entries;next.forEach((o,i)=>{assert.notEqual(o.person,before[i].person);assert.notEqual(o.topId,before[i].topId);});
 const level3=next[0].scale;g.transaction(null,s=>{s.level=5;spinRoster(g,s);});assert(g.state.spinArena.roster.entries[0].scale>level3);
});
test('晶礦停售：不再生成商品；舊庫存與貨架退款一次、委託移除、主存檔保留',()=>{
 assert(!data.catalog.some(c=>c.sku==='shop-crystal'));
 const {g,storage}=setup();g.transaction(null,s=>{s.inventory['shop-crystal']=3;s.averageCosts['shop-crystal']=40;s.commissionBoard.entries=[{id:'old',sku:'shop-crystal'}];});
 // Inject legacy data at the storage boundary so current validation remains strict.
 const s=structuredClone(g.state);s.retiredProductsV62=false;s.inventory['shop-crystal']=3;s.averageCosts['shop-crystal']=40;s.commissionBoard.entries=[{id:'old',sku:'shop-crystal'}];const gold=s.gold;storage.setItem('firstlight_shop_v1',JSON.stringify(s));const re=new Game({storage,data});assert.equal(re.state.gold,gold+120);assert.equal(re.state.inventory['shop-crystal'],undefined);assert.equal(re.state.commissionBoard.entries.length,0);assert(re.state.spinArena.owned.flame);retireProducts(re.state);assert.equal(re.state.gold,gold+120);
});
test('所有一般小怪無長射程，多數需近身；少數等於雙刀，中途走開不能命中；魔王維持遠程',()=>{
 const spirits=JSON.parse(fs.readFileSync(new URL('../../幻靈奇旅/data/spirit-catalog.json',import.meta.url),'utf8'));const list=spirits.entries;let close=0,medium=0;
 for(const spec of list){const e={kind:'normal',speciesId:spec.id,x:0,z:0},p=enemyAttackProfile(e,spec,{});assert(p.range<=HERO_ATTACKS.blades.range);if(p.range===1.15)close++;else medium++;assert(!enemyCanHit(e,{x:p.range+.01,z:0},p));assert(enemyCanHit(e,{x:p.range-.01,z:0},p));}
 assert(close>medium&&medium>0);assert(enemyAttackProfile({kind:'boss',speciesId:'pikachu'},{id:'pikachu'},{}).range>HERO_ATTACKS.blades.range);
});
