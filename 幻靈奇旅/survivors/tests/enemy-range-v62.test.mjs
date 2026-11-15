import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {CaveWorld} from '../js/world.js';import {createStore} from '../js/save-bridge.js';import {enemyAttackProfile} from '../js/enemy-rules.js?v=20261115-v62';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8')),data={spirits:Object.fromEntries(read('../../data/spirits.json').map(s=>[s.id,s])),config:read('../data/config.json'),skills:read('../data/spirit-skills.json'),evolution:read('../data/evolution.json'),passives:read('../data/survival-passives.json')};
test('洞穴與草原實際模擬：普通怪遠處不出手、能走近、走出射程躲過已起手攻擊',()=>{
 for(const meadow of [false,true]){
  const memory=new Map(),store=createStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)});store.transact('init',s=>{s.owned=s.team=['bulbasaur'];s.starterClaimed=true;});const w=new CaveWorld(store,data,{merchantMeadow:meadow});w.start();const r=w.run;r.spawnAt=1e9;r.hero.attackCd=1e9;r.pets.forEach(p=>p.hp=0);w.spawn('normal',1);const e=r.enemies[0];e.x=4;e.z=0;e.nextAttack=0;e.actionUntil=0;r.hero.x=0;r.hero.z=0;
  w.update(.02);assert(!e.pendingMelee&&!e.pendingShot);assert(e.x<4,'approaches target');
  const profile=enemyAttackProfile(e,data.spirits[e.speciesId],data.skills[e.speciesId]);e.x=profile.range*.8;e.z=0;e.nextAttack=0;e.actionUntil=0;w.update(.02);assert(e.pendingMelee);assert.equal(e.pendingMelee.range,profile.range);
  const hp=r.hero.hp;r.hero.x=-10;r.time=e.pendingMelee.at;w.update(.02);assert.equal(r.hero.hp,hp);assert(!e.pendingMelee);assert(!e.pendingShot);assert(!r.projectiles.some(p=>p.context?.source==='enemy'));
 }
});
