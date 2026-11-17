import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {Game} from '../js/core.js';import {spinState,spinStats,launchSpinRound,endSpinRound} from '../js/spin-arena-core.js?v=20261117-v66';import {SPIN_TOPS,SPIN_SKILLS} from '../js/spin-arena-config.js?v=20261117-v66';import {recoverResting} from '../js/workforce.js?v=20261117-v66';
const read=n=>JSON.parse(fs.readFileSync(new URL(`../data/${n}.json`,import.meta.url),'utf8')),data=Object.fromEntries(Object.entries({catalog:'shop-catalog',hirePool:'hire-pool',spirits:'spirits',evolution:'evolution',levels:'store-levels',config:'economy',management:'management'}).map(([k,v])=>[k,read(v)]));
function setup(){const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},g=new Game({storage,data});g.transaction(null,s=>{s.level=3;s.gold=50000;});return {g,storage};}
test('滿疲勞立即離店休息，所有手動自動派工均禁止；隔日扣50百分點且只一次',()=>{
 const {g,storage}=setup(),id=data.hirePool.find(h=>!h.recruitDisabled&&!h.evolutionOnly).id;g.transaction(null,s=>{const e=g.employee(id,'host');e.fatigue=100;s.employees=[e];});let e=g.state.employees[0];assert.equal(e.role,'standby');assert(e.offDuty);assert.equal(e.exhaustedUntilDay,g.state.day);
 g.transaction(null,s=>recoverResting(g,s,60));e=g.state.employees[0];assert.equal(e.fatigue,99);assert(!g.act('assign',{employeeId:e.id,role:'host'}).ok);g.act('autoAssign');assert.equal(g.state.employees[0].role,'standby');
 const re=new Game({storage,data});assert(re.state.employees[0].exhaustedUntilDay);g.transaction(null,s=>s.phase='report');assert(g.act('nextDay').ok);e=g.state.employees[0];assert.equal(e.fatigue,49);assert(!e.exhaustedUntilDay);assert(g.act('assign',{employeeId:e.id,role:'host'}).ok);assert(!g.act('nextDay').ok);assert.equal(g.state.employees[0].fatigue,49);
});
test('滿疲勞自動替班會挑選最低疲勞員工，休息鎖不受自動配置影響',()=>{
 const {g}=setup(),ids=data.hirePool.filter(h=>!h.recruitDisabled&&!h.evolutionOnly).slice(0,3).map(h=>h.id);g.transaction(null,s=>{s.autoRelief={enabled:true};s.employees=ids.map((id,i)=>({...g.employee(id,i?'standby':'host'),fatigue:[100,30,10][i]}));});assert.equal(g.state.employees[0].role,'standby');assert.equal(g.state.employees[2].role,'host');assert(g.state.employees[0].exhaustedUntilDay);
});
test('新增六款需更高聲望逐款解鎖，十二款均有技能、成長與圖片及GIF',()=>{
 assert.equal(SPIN_TOPS.length,12);assert.deepEqual(SPIN_TOPS.slice(6).map(t=>t.reputation),[55,75,100,130,165,205]);const {g}=setup();
 for(const t of SPIN_TOPS.slice(6)){g.transaction(null,s=>spinState(s).reputation=t.reputation-1);assert(!g.act('spinBuy',{topId:t.id}).ok);g.transaction(null,s=>spinState(s).reputation=t.reputation);assert(g.act('spinBuy',{topId:t.id}).ok);assert(SPIN_SKILLS[t.id]);assert(spinStats(t.id,{level:20,parts:{}}).attack>t.attack);for(const path of [`assets/spin-arena/cards-v63/${t.id}.webp`,`assets/spin-arena/skills/${t.id}.gif`,`assets/spin-arena/skills/${t.id}-sheet.webp`])assert(fs.statSync(new URL('../'+path,import.meta.url)).size>5000);}
});
test('連續兩場平局進入一勝決勝，任一方下一勝直接結算；平手不誤判勝負',()=>{
 for(const winner of [0,1]){const {g}=setup();g.act('spinBuy',{topId:'flame'});g.act('spinStart',{opponentId:'rookie'});const m=g.state.spinArena.match;launchSpinRound(m,'balance');endSpinRound(m,null,'平手');assert(!m.suddenDeath);launchSpinRound(m,'balance');endSpinRound(m,null,'平手');assert(m.suddenDeath);assert.equal(m.phase,'roundResult');launchSpinRound(m,'balance');endSpinRound(m,winner,'決勝');assert.equal(m.phase,'result');assert.equal(m.won,winner===0);assert.equal(m.score[winner],1);}
});
