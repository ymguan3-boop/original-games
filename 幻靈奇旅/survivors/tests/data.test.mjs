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
test('cave goldfish and avian branches use v17 progression and remain acyclic',()=>{
 assert.deepEqual(new Set(ev.kyogre.next),new Set(['groudon','rayquaza']));
 assert.equal(ev.kyogre.branch,'random');assert.equal(ev.kyogre.level,4);
 for(const id of ['groudon','rayquaza']){assert.deepEqual(ev[id].next,['mewtwo']);assert.equal(ev[id].level,8);}
 assert.deepEqual(ev.mewtwo.next,[]);
 assert.deepEqual(ev.jigglypuff.next,['treecko','grovyle','sceptile']);assert.equal(ev.jigglypuff.branch,'random');assert.equal(ev.jigglypuff.level,4);
 for(const id of ['treecko','grovyle'])assert.deepEqual(ev[id].next,[]);for(const [id,level] of [['sceptile',8]]){assert.deepEqual(ev[id].next,['palkia']);assert.equal(ev[id].level,level);}
 assert.deepEqual(ev.palkia.next,[]);
 const visit=(id,path=new Set())=>{assert.ok(!path.has(id),'進化鏈循環：'+[...path,id].join(' → '));for(const next of ev[id].next)visit(next,new Set([...path,id]));};
 for(const s of all)visit(s.id);
});
test('integrated cave has an explicit town return and shared-resource bridge',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(html.includes('returnTown'));
 assert.ok(html.includes('../js/cave-economy.js'));
 assert.ok(html.includes('tutorialReplay'));
});
