import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=n=>JSON.parse(readFileSync(new URL(n,import.meta.url),'utf8'));
const species=read('../../data/spirits.json'), monsters=read('../../data/tower-monsters.json').monsters;
const all=[...new Map([...species,...monsters].map(s=>[s.id,s])).values()];
const byId=Object.fromEntries(all.map(s=>[s.id,s]));
const pool=read('../data/gacha-pool.json'), skills=read('../data/spirit-skills.json'), ev=read('../data/evolution.json'), passives=read('../data/survival-passives.json');
test('current 64 catalog identifiers have usable skills/evolution/passives',()=>{
 assert.equal(all.length,64);
 for(const s of all){
  assert.ok(skills[s.id]);assert.ok(ev[s.id]);assert.ok(passives[s.id]);
  assert.equal(skills[s.id].element,s.type||s.element);
  assert.ok(['melee','ranged','tracking','cone','area'].includes(skills[s.id].normalType));
  assert.ok(skills[s.id].normalAnimation&&skills[s.id].ultimateAnimation);
  assert.ok(Number.isFinite(passives[s.id].value));
  for(const next of ev[s.id].next)assert.ok(byId[next]);
 }
});
test('gacha explicitly matches card frames, excludes advanced/tower IDs and guards events',()=>{
 for(const color of ['yellow','purple','red']){
  assert.ok(pool[color].length);
  for(const id of pool[color]){
   const s=byId[id];assert.ok(s);assert.equal(s.cardFrame||'yellow',color);
   assert.ok(!s.previous);assert.notEqual(s.category,'tower');
   if(color!=='yellow')assert.ok(pool.requiresOriginalUnlock.includes(id));
  }
 }
 assert.equal(new Set([...pool.yellow,...pool.purple,...pool.red]).size,pool.yellow.length+pool.purple.length+pool.red.length);
 // v07: the free three are sampled from every eligible common basic starter.
 assert.deepEqual(pool.starter,species.filter(s=>s.role==='starter'&&s.stage===1&&!s.previous).map(s=>s.id));
});
test('goldfish branches and five-form avian chain retain actual species links',()=>{
 assert.deepEqual(new Set(ev.kyogre.next),new Set(['groudon','rayquaza']));
 const chain=['jigglypuff','treecko','grovyle','sceptile','palkia'];
 for(let i=0;i<chain.length-1;i++){assert.deepEqual(ev[chain[i]].next,[chain[i+1]]);assert.equal(ev[chain[i]].level,(i+1)*4);}
 assert.deepEqual(ev.palkia.next,[]);
 for(const s of all){const seen=new Set();let id=s.id;while(ev[id].next.length){assert.ok(!seen.has(id));seen.add(id);id=ev[id].next[0];}}
});
test('integrated cave has an explicit town return and shared-resource bridge',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('returnTown'));
 assert.ok(html.includes('../js/cave-economy.js'));
 assert.ok(html.includes('tutorialReplay'));
});
