import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {cardBase,CARD_TIERS,PASSIVE_UNITS} from '../js/card-balance.js';
import {basicStats,passiveAt} from '../js/growth.js';
import {makePet} from '../js/pet-party.js';
import {evolvePet} from '../js/manual-evolution.js';
import {initialState,createStore,SAVE_KEY} from '../js/save-bridge.js';
import {createRun,CaveWorld} from '../js/world.js';
import {groupRewards} from '../js/reward-groups.js';
import {summonDuration} from '../js/summon-view.js';
import {itemArtwork} from '../js/item-pictures.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const species=read('../../data/spirits.json'),defs=read('../data/survival-passives.json');
const data={spirits:Object.fromEntries(species.map(s=>[s.id,s])),config:read('../data/config.json'),skills:read('../data/spirit-skills.json'),evolution:read('../data/evolution.json'),passives:defs};
const storage=initial=>{const map=new Map(initial?[[SAVE_KEY,JSON.stringify(initial)]]:[]);return{getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
test('fresh and reset accounts own and equip dual guns; implicit run fallback agrees',()=>{
 const s=initialState();assert.deepEqual(s.weapons,['guns-starter']);assert.deepEqual(s.equipped,['guns-starter']);
 const store=createStore(storage());store.resetForTesting();assert.equal(store.state.points,1000);assert.deepEqual(store.state.owned,[]);assert.deepEqual(store.state.equipped,['guns-starter']);
 assert.equal(createRun({...s,equipped:[]},data).weaponId,'guns-starter');
});
test('old untouched sword accounts migrate to guns once; chosen equipment and active run persist',()=>{
 for(const chosen of[false,true])for(const running of[false,true]){
  const s=initialState();delete s.loadoutVersion;s.weapons=['sword-starter'];s.equipped=['sword-starter'];if(chosen){s.weapons.push('knife-starter');s.equipped=['knife-starter'];}if(running)s.run=createRun(s,data);
  const st=storage(s),store=createStore(st);assert.equal(store.state.loadoutVersion,9);assert.ok(store.state.weapons.includes('guns-starter'));
  assert.equal(store.state.equipped[0],chosen?'knife-starter':running?'sword-starter':'guns-starter');if(running)assert.equal(store.state.run.weaponId,s.run.weaponId);
  store.transact('persist',()=>{});const reload=createStore(st);assert.deepEqual(reload.state.weapons,store.state.weapons);assert.equal(reload.state.weapons.filter(x=>x==='guns-starter').length,1);
 }
});
test('all yellow stage 3 <= purple stage 2 <= every red in base stats and same-investment training',()=>{
 const yellow=species.filter(s=>(s.cardFrame||'yellow')==='yellow'&&s.stage===3),purple=species.filter(s=>s.cardFrame==='purple'&&s.stage===2),red=species.filter(s=>s.cardFrame==='red');assert.ok(yellow.length&&purple.length&&red.length);
 let comparisons=0;for(const level of[1,10,20,30,40,50])for(const rank of[0,10])for(const [left,right] of[[yellow,purple],[purple,red]])for(const a of left)for(const b of right){const state={training:{[a.id]:{hp:rank,attack:rank,defense:rank},[b.id]:{hp:rank,attack:rank,defense:rank}},growth:{[a.id]:{level},[b.id]:{level}}},A=basicStats(a,state),B=basicStats(b,state);for(const key of['hp','attack','defense'])assert.ok(A[key]<=B[key],`${a.id}/${b.id} ${key}`);comparisons++;}
 const rows=species.map(s=>({id:s.id,name:s.name,frame:s.cardFrame||'yellow',stage:s.stage,...cardBase(s),passive:defs[s.id]}));
 writeFileSync(new URL('../qa/v09-balance.json',import.meta.url),JSON.stringify({baseline:'Equal growth level, training, local level, element and combat buffs. Different passive categories compare via common rarity power and per-effect unit.',comparisons,tiers:CARD_TIERS,passiveUnits:PASSIVE_UNITS,rows},null,2));
});
test('all 64 passive definitions use the declared tier and effect units; milestone potency remains ordered',()=>{
 for(const [id,d]of Object.entries(defs)){assert.ok(d.tierPower);assert.equal(d.value,+((PASSIVE_UNITS[d.effect]*d.tierPower).toFixed(6)),id);}
 for(const level of[1,10,20,30,40,50])for(const [a,b]of[[1.6,2],[2,2.6]])for(const effect of Object.keys(PASSIVE_UNITS)){
  const temp={a:{effect,value:PASSIVE_UNITS[effect]*a,description:'a'},b:{effect,value:PASSIVE_UNITS[effect]*b,description:'b'}},A=passiveAt('a',temp,level).effects,B=passiveAt('b',temp,level).effects;
  const score=xs=>xs.reduce((s,e)=>s+e.value/PASSIVE_UNITS[e.effect],0);assert.ok(score(A)<=score(B));assert.ok(A[0].value<=B[0].value);
 }
 const groups=[species.filter(s=>(s.cardFrame||'yellow')==='yellow'&&s.stage===3),species.filter(s=>s.cardFrame==='purple'&&s.stage===2),species.filter(s=>s.cardFrame==='red')];
 for(const lv of[1,10,20,30,40,50])for(let i=0;i<2;i++)for(const a of groups[i])for(const b of groups[i+1]){const potency=s=>passiveAt(s.id,defs,lv).effects.reduce((n,e)=>n+e.value/PASSIVE_UNITS[e.effect],0);assert.ok(potency(a)<=potency(b)+1e-9,`${a.id}/${b.id} Lv${lv}`);}
});
test('display stats, created pets and real attack/defense use one cave balance table',()=>{
 for(const sp of species){const rank={hp:4,attack:3,defense:2},p=makePet(sp.id,data.spirits,rank,10),ui=basicStats(sp,{training:{[sp.id]:rank},growth:{[sp.id]:{level:10}}});assert.equal(p.maxHp,ui.hp);assert.equal(p.baseDefense,cardBase(sp).defense);const world=new CaveWorld(null,data);assert.equal(Math.round(world.petAttack(p)),ui.attack);}
 const s=initialState();s.team=s.owned=['torchic','squirtle','charmander'];s.starterClaimed=true;const store=createStore(storage(s)),w=new CaveWorld(store,data);w.start();w.run.pets[0].level=9;w.run.pets[0].hp=w.run.pets[0].maxHp/2;
 const next=data.evolution.torchic.next;const id=Array.isArray(next)?next[0]:next;evolvePet(store,0,data,id);const p=w.run.pets[0];assert.equal(p.maxHp,Math.round(cardBase(data.spirits[id]).hp*1.24));assert.ok(Math.abs(p.hp/p.maxHp-.5)<.01);assert.equal(w.petAttack(p),cardBase(data.spirits[id]).attack*1.32);
 const e={speciesId:'torchic',damageScale:1},before=p.hp;w.hurt(p,30,e);const damage=before-p.hp;assert.ok(damage>0&&damage<30);
});
test('reward grouping preserves quantities, rarity and duplicate status; all supplies have real artwork',()=>{
 const g=groupRewards([{kind:'item',id:'potion'},{kind:'item',id:'potion',quantity:2},{kind:'material',id:'ore'},{kind:'spirit',id:'torchic',color:'yellow'},{kind:'spirit',id:'torchic',color:'yellow',duplicate:true}]);assert.equal(g.length,4);assert.equal(g[0].quantity,3);assert.equal(g.reduce((n,r)=>n+r.quantity,0),6);
 for(const id of['potion','revive','battery','ball-basic','ball-great','ball-ultra','buff-attack','buff-skill','buff-range','buff-cooldown','buff-defense','buff-capture','buff-pickup','ore']){const art=itemArtwork(id);assert.ok(art);assert.ok(art.col<4&&art.row<art.rows);readFileSync(new URL('../'+art.src,import.meta.url));}
 assert.equal(summonDuration([]),2467);assert.equal(summonDuration(Array(10).fill({})),2467);
});
