import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dexSpecies,familyPaths,evolutionSummary,evolutionDetail} from '../js/dex-evolution.js';
import {createStore} from '../js/save-bridge.js';
import {CaveWorld} from '../js/world.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data={spirits:Object.fromEntries(read('../../data/spirits.json').map(s=>[s.id,s])),catalog:read('../../data/spirit-catalog.json'),evolution:read('../data/evolution.json'),config:read('../data/config.json'),skills:read('../data/spirit-skills.json'),passives:read('../data/survival-passives.json')};
test('dex sorts full color groups and uses actual linear/special evolution edges',()=>{
 const cards=dexSpecies(data.spirits,data.catalog,data),rank={yellow:0,purple:1,red:2};
 for(let i=1;i<cards.length;i++)assert.ok(rank[cards[i-1].cardFrame||'yellow']<=rank[cards[i].cardFrame||'yellow']);
 assert.equal(cards.filter(s=>['caterpie','weedle'].includes(s.id)).length,0);
 assert.deepEqual(familyPaths('ivysaur',data),[['bulbasaur','ivysaur','venusaur']]);
 assert.deepEqual(familyPaths('grovyle',data),[['jigglypuff','treecko'],['jigglypuff','grovyle'],['jigglypuff','sceptile','palkia']]);
 assert.match(evolutionDetail('grovyle',data),/Lv\.16/);
 assert.match(evolutionSummary('venusaur',data),/最終型態/);
 assert.doesNotMatch(evolutionSummary('groudon',data),/Lv\.8/);
 assert.match(evolutionSummary('groudon',data),/Lv\.15 → 水蛟龍王/);
});
test('goldfish guide covers both equiprobable branches and separates the town dragon quest',()=>{
 assert.deepEqual(familyPaths('rayquaza',data),[['kyogre','groudon','mewtwo'],['kyogre','rayquaza','mewtwo']]);
 const guide=evolutionDetail('kyogre',data);for(const text of ['金魚國王','金魚皇后','50%','Lv.4','Lv.15','副本內不需要魚飼料','各 3 張','副本進化不產生主遊戲卡片'])assert.ok(guide.includes(text),text);
 assert.match(evolutionDetail('mewtwo',data),/無後續進化/);
});
test('random evolution is resolved and saved inside the transaction; both halves work and reload cannot reroll',()=>{
 for(const [roll,expected] of [[0,'groudon'],[.4999,'groudon'],[.5,'rayquaza'],[.9999,'rayquaza']]){
  const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},store=createStore(storage);
  store.transact('setup',s=>{s.owned=s.team=['kyogre','bulbasaur','charmander'];s.starterClaimed=true;s.points=1000;});
  const w=new CaveWorld(store,data);w.start();const p=w.run.pets[0];p.level=4;p.xp=17;p.hp=p.maxHp*.5;p.ultimateCd=13;w.random=()=>roll;
  // A caller cannot select the other random branch.
  const result=w.evolve(0,expected==='groudon'?'rayquaza':'groudon');assert.equal(result.after,expected);
  const evolved=w.run.pets[0];assert.equal(evolved.level,4);assert.equal(evolved.xp,17);assert.equal(evolved.ultimateCd,13);assert.ok(Math.abs(evolved.hp/evolved.maxHp-.5)<.01);assert.equal(store.state.points,1000);
  const reloaded=createStore(storage);assert.equal(reloaded.state.run.pets[0].speciesId,expected);assert.deepEqual(new CaveWorld(reloaded,data).evolutionOptions(0),[]);
 }
});
