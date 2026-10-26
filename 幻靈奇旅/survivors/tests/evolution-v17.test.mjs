import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dexSpecies,familyPaths,evolutionSummary,evolutionDetail,evolutionMechanics} from '../js/dex-evolution.js';
import {evolvePet,evolutionOptions} from '../js/manual-evolution.js';
import {makePet} from '../js/pet-party.js';
import {createStore} from '../js/save-bridge.js';
import {passiveDefinition} from '../js/passive-rules.js';
import {passiveAt} from '../js/growth.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data={spirits:Object.fromEntries(read('../../data/spirits.json').map(s=>[s.id,s])),catalog:read('../../data/spirit-catalog.json'),evolution:read('../data/evolution.json'),passives:read('../data/survival-passives.json')};
function setup(id,level){const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},store=createStore(storage);store.transact('setup',s=>{s.owned=s.team=[id];s.starterClaimed=true;s.points=1000;const p=makePet(id,data.spirits);p.level=level;p.xp=17;p.hp=p.maxHp*.5;p.ultimateCd=13;p.cooldownVersion=7;s.run={id:'v17',status:'active',hero:{hp:200},activePet:0,pets:[p]};});return{store,storage};}
test('v17 egg branches are parallel and keep their distinct cumulative thresholds',()=>{
 assert.deepEqual(data.evolution.jigglypuff.next,['treecko','grovyle','sceptile']);assert.equal(data.evolution.jigglypuff.branch,'random');assert.equal(data.evolution.jigglypuff.level,4);
 for(const id of ['treecko','grovyle']){assert.deepEqual(data.evolution[id].next,[]);const {store}=setup(id,50);assert.deepEqual(evolutionOptions(store.state.run.pets[0],data.evolution,data.spirits),[]);}
 for(const [id,level] of [['sceptile',8]]){assert.deepEqual(data.evolution[id].next,['palkia']);assert.equal(data.evolution[id].level,level);const {store}=setup(id,level-1);assert.deepEqual(evolutionOptions(store.state.run.pets[0],data.evolution,data.spirits),[]);store.transact('level',s=>s.run.pets[0].level=level);assert.equal(evolvePet(store,0,data).value.after,'palkia');}
 assert.deepEqual(familyPaths('grovyle',data),[['jigglypuff','treecko'],['jigglypuff','grovyle'],['jigglypuff','sceptile','palkia']]);
});
test('v17 transaction owns equal three-way selection, checkpoints and refuses a caller override',()=>{
 for(const [roll,expected] of [[0,'treecko'],[1/3-1e-8,'treecko'],[1/3,'grovyle'],[2/3-1e-8,'grovyle'],[2/3,'sceptile'],[.999999,'sceptile']]){const {store,storage}=setup('jigglypuff',4);assert.equal(evolvePet(store,0,data,'palkia','evolve-egg',()=>roll).value.after,expected);const reloaded=createStore(storage),p=reloaded.state.run.pets[0];assert.equal(p.speciesId,expected);assert.equal(p.level,4);assert.equal(p.xp,17);assert.equal(p.ultimateCd,13);assert.ok(Math.abs(p.hp/p.maxHp-.5)<.01);assert.deepEqual(evolutionOptions(p,data.evolution,data.spirits),[]);assert.equal(reloaded.state.points,1000);}
});
test('v17 both fish branches evolve exactly at local level 8, without a town material fee',()=>{
 assert.deepEqual(familyPaths('mewtwo',data),[['kyogre','groudon','mewtwo'],['kyogre','rayquaza','mewtwo']]);
 for(const branch of ['groudon','rayquaza']){const {store}=setup(branch,7);assert.deepEqual(evolutionOptions(store.state.run.pets[0],data.evolution,data.spirits),[]);store.transact('level',s=>s.run.pets[0].level=8);assert.equal(evolvePet(store,0,data).value.after,'mewtwo');assert.equal(store.state.points,1000);assert.deepEqual(store.state.materials,{});assert.deepEqual(evolutionOptions(store.state.run.pets[0],data.evolution,data.spirits),[]);}
});
test('v17 egg preserves three slots, and combines duplicate defense without hidden hp/heal buffs',()=>{
 const expected=passiveDefinition(data.spirits.jigglypuff);assert.deepEqual(data.passives.jigglypuff,expected);assert.equal(expected.slotCount,3);assert.deepEqual(expected.effects.map(e=>e.effect),['regen','defense','defense']);const initial=passiveAt('jigglypuff',data.passives,1),trained=passiveAt('jigglypuff',data.passives,10);assert.deepEqual(initial.effects.map(e=>e.effect),['regen','defense']);assert.equal(initial.effects.find(e=>e.effect==='defense').value,.52);assert.equal(trained.effects.find(e=>e.effect==='defense').value,.572);assert.match(expected.description,/每秒恢復.*防禦力/);assert.doesNotMatch(expected.description,/生命上限|治療效果/);
});
test('v17 dex keeps colors while adjacent same-color forms follow actual graph order',()=>{
 const cards=dexSpecies(data.spirits,data.catalog,data),rank={yellow:0,purple:1,red:2},ids=cards.map(s=>s.id);for(let i=1;i<cards.length;i++)assert.ok(rank[cards[i-1].cardFrame||'yellow']<=rank[cards[i].cardFrame||'yellow']);for(const family of [['bulbasaur','ivysaur','venusaur'],['treecko','grovyle','sceptile','palkia'],['kyogre','groudon','rayquaza']]){const start=ids.indexOf(family[0]);assert.deepEqual(ids.slice(start,start+family.length),family);}assert.ok(!ids.includes('caterpie'));assert.equal(new Set(ids).size,ids.length);
});
test('v17 evolution detail shows cross-color links, all branch names and both separate fish mechanisms',()=>{
 const egg=evolutionDetail('jigglypuff',data);for(const text of ['小麻','咕咕','小鷹','大朋','1/3','33.33%','最終型態','Lv.8','平行分支','data-card-color="red"','data-card-color="purple"'])assert.ok(egg.includes(text),text);
 const fish=evolutionDetail('kyogre',data);for(const text of ['Lv.4','Lv.8','50%','金魚國王','金魚皇后','水蛟龍王','不需要魚飼料','主遊戲','各 3 張','副本進化不產生主遊戲卡片'])assert.ok(fish.includes(text),text);assert.doesNotMatch(fish,/國王與皇后均為此分支最終/);assert.match(evolutionSummary('groudon',data),/Lv\.8 → 水蛟龍王/);assert.match(evolutionSummary('mewtwo',data),/最終型態/);assert.match(evolutionMechanics(),/所有隨機進化結果立即存檔/);
});

test('v17 four named final forms evolve from their existing predecessor exactly at level 8',()=>{
 for(const [before,after] of [['raikou','zapdos'],['entei','suicune'],['articuno','moltres'],['giratina','raichu']]){
  assert.deepEqual(data.evolution[before].next,[after]);assert.equal(data.evolution[before].level,8);
  const {store}=setup(before,7);assert.deepEqual(evolutionOptions(store.state.run.pets[0],data.evolution,data.spirits),[]);
  store.transact('reach-eight',s=>s.run.pets[0].level=8);assert.equal(evolvePet(store,0,data).value.after,after);
  assert.match(evolutionSummary(before,data),/Lv\.8/);assert.ok(evolutionDetail(after,data).includes('戰局 Lv.8'));
 }
 for(const text of ['C老猴','水仙子','冒險蛙','龐克兔','Lv.8'])assert.ok(evolutionMechanics().includes(text),text);
});
test('v17 egg descendants retain two inherited passive types plus a separate timed ultimate trigger',()=>{
 for(const id of ['treecko','grovyle','sceptile','palkia']){
  const d=passiveDefinition(data.spirits[id]);assert.deepEqual(d,data.passives[id]);assert.equal(d.slotCount,2);
  assert.deepEqual(d.effects.map(e=>e.effect),['regen','defense']);assert.equal(d.inheritedFrom,'jigglypuff');
  assert.equal(d.onUltimate.heroCritMultiplier,2);assert.equal(d.onUltimate.duration,20);
  assert.match(d.description,/暴擊率 ×2.*20 秒/);assert.match(d.description,/不疊加倍率/);
  const p=passiveAt(id,data.passives,20);assert.deepEqual(p.onUltimate,d.onUltimate);assert.equal(p.slots.length,2);
  assert.ok(p.effects.find(e=>e.effect==='regen').value>d.effects[0].value);
  assert.ok(p.effects.find(e=>e.effect==='defense').value>d.effects[1].value);
 }
 const detail=evolutionDetail('palkia',data);for(const text of ['繼承回血與防禦','暴擊率變為 2 倍','20 秒','不重複疊加倍率'])assert.ok(detail.includes(text),text);
 assert.equal(data.passives.jigglypuff.onUltimate,undefined);
});
