import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore,SAVE_KEY} from '../js/save-bridge.js';
import {claimStarter,draw,rollCategory,eligiblePool,validatePool} from '../js/gacha.js';
import {useItem,addBuff,addTemporaryWeapon,weaponStats,buyWeapon,consumeBall} from '../js/inventory.js';
class MemoryStorage {
  data=new Map(); fail=false;
  getItem(key) {return this.data.get(key)??null;}
  setItem(key,value) {if(this.fail) throw new Error('quota');this.data.set(key,value);}
}
const pool={yellow:['a','b','c'],purple:['d'],red:['e']};
const newRun=()=>({id:'run-1',status:'active',time:0,depth:1,hero:{hp:200,maxHp:200,level:1,xp:0},pets:[{baseId:'a',speciesId:'a',hp:100,maxHp:100,level:1,xp:0,ultimateCd:0}],activePet:0,buffs:{},buffTimers:{},tempWeapons:[],fusions:{}});
function fixture() {const storage=new MemoryStorage(),store=createStore(storage);return {store,storage};}
test('first three are distinct, persist before animation, replay does not grant again',()=> {
  const {store,storage}=fixture();const r=claimStarter(store,pool,()=>0);
  assert.equal(r.value.length,3);assert.equal(new Set(store.state.owned).size,3);assert.equal(store.state.pity,0);
  const reload=createStore(storage);assert.equal(claimStarter(reload,pool,()=>0.9).replayed,true);
  assert.equal(reload.state.inventory['ball-basic'],20);
});
test('original unlock filtering does not change probability or block legal starter',()=> {
  const {store}=fixture();const p=eligiblePool({...pool,requiresOriginalUnlock:['d','e'],starter:['a','b','c']},{});
  assert.throws(()=>validatePool(p),/基礎池為空/);claimStarter(store,p,()=>0);
  assert.equal(store.state.owned.length,3);assert.throws(()=>draw(store,p),/基礎池為空/);
  assert.deepEqual(eligiblePool({...pool,requiresOriginalUnlock:['e']},{pokedexUnlocks:{e:true}}).red,['e']);
});
test('save corruption is preserved; write failure does not grant starter',()=> {
  const {store,storage}=fixture();storage.fail=true;assert.throws(()=>claimStarter(store,pool),/儲存失敗/);
  assert.equal(store.state.starterClaimed,false);storage.fail=false;storage.setItem(SAVE_KEY,'{broken');
  assert.throws(()=>createStore(storage));assert.equal(storage.getItem(SAVE_KEY),'{broken');
});
test('draw has exact boundaries, conditional pity and ten-pull sequential counter',()=> {
  const boundaries=[[0,'yellow'],[.059999,'yellow'],[.06,'purple'],[.09,'red'],[.1,'item'],[.35,'material'],[.6,'skill'],[.8,'ability']];
  for(const [x,expected] of boundaries) assert.equal(rollCategory(()=>x),expected);
  assert.equal(rollCategory(()=>.5999,99),'yellow');assert.equal(rollCategory(()=>.6,99),'purple');assert.equal(rollCategory(()=>.9,99),'red');
  const {store,storage}=fixture();store.transact('seed',s=>{s.points=1000;s.pity=95;});
  const result=draw(store,pool,10,()=>.99,'ten');
  assert.equal(result.value[4].kind,'spirit');assert.equal(result.value[4].guaranteed,true);assert.equal(result.value[4].color,'red');
  assert.equal(store.state.pity,5);assert.equal(store.state.points,0);
  assert.equal(draw(store,pool,10,()=>0,'ten').replayed,true);
  assert.equal(createStore(storage).state.pity,5);
});
test('ten million seeded non-pity rolls match 6/3/1/25/25/20/20',()=> {
  let seed=0x23c0ffee;const rng=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const n=10_000_000,counts={yellow:0,purple:0,red:0,item:0,material:0,skill:0,ability:0};
  for(let i=0;i<n;i++) counts[rollCategory(rng)]++;
  const rates={yellow:.06,purple:.03,red:.01,item:.25,material:.25,skill:.2,ability:.2};
  for(const key of Object.keys(rates)) assert.ok(Math.abs(counts[key]/n-rates[key])<.0005,`${key}: ${counts[key]/n}`);
  console.log('10M seed 0x23c0ffee:',JSON.stringify(counts));
});
test('gacha consumables only enter inventory; duplicates become materials',()=> {
  const {store}=fixture();store.transact('seed',s=>{s.points=300;s.owned=['e'];});
  draw(store,pool,1,()=>.99,'ability');assert.equal(store.state.inventory['buff-pickup'],1);assert.equal(store.state.run,null);
  draw(store,pool,1,()=>.095,'red');assert.equal(store.state.materials['bond:e'],1);assert.equal(store.state.owned.length,1);
  assert.throws(()=>draw(store,pool,10),/不足/);assert.equal(store.state.points,100);
});
test('item consumption and checkpoint are atomic, idempotent, capped and survive refresh',()=> {
  const {store,storage}=fixture();store.transact('seed',s=>{s.inventory['buff-range']=6;});
  assert.throws(()=>useItem(store,'buff-range','outside'),/戰局/);
  store.checkpoint(newRun());useItem(store,'buff-range','once');
  assert.equal(store.state.inventory['buff-range'],5);assert.equal(store.state.run.buffs.range,.1);
  assert.equal(useItem(store,'buff-range','once').replayed,true);
  storage.fail=true;assert.throws(()=>useItem(store,'buff-range','fail'),/儲存失敗/);
  assert.equal(store.state.inventory['buff-range'],5);assert.equal(store.state.run.buffs.range,.1);storage.fail=false;
  let restored=createStore(storage);assert.equal(restored.state.run.buffs.range,.1);
  useItem(restored,'buff-range','two');useItem(restored,'buff-range','three');useItem(restored,'buff-range','four');
  assert.throws(()=>useItem(restored,'buff-range','cap'),/上限/);assert.equal(restored.state.inventory['buff-range'],2);
  const oldRun=structuredClone(restored.state.run);restored.endRun('放棄');
  assert.equal(restored.state.run,null);assert.equal(restored.state.inventory['buff-range'],2);
  assert.throws(()=>restored.checkpoint(oldRun),/已結束/);
});
test('all buff sources share caps; dead/full/invalid targets do not consume',()=> {
  const {store}=fixture();const run=newRun();run.pets[0].hp=0;run.pets[0].level=8;run.pets[0].speciesId='evolved';
  store.transact('seed',s=>{s.inventory={revive:1,battery:1,potion:1,'ball-basic':1};});store.checkpoint(run);
  assert.throws(()=>useItem(store,'potion','full'),/生命已滿/);
  assert.throws(()=>useItem(store,'battery','dead',0),/存活/);
  useItem(store,'revive','revive',0);assert.equal(store.state.run.pets[0].hp,50);assert.equal(store.state.run.pets[0].level,8);
  store.transact('cooldown',s=>{s.run.pets[0].ultimateCd=20;});useItem(store,'battery','battery',0);
  assert.equal(store.state.run.pets[0].ultimateCd,0);
  store.transact('ball',s=>consumeBall(s,'ball-basic'));assert.equal(store.state.inventory['ball-basic'],undefined);
  const buffRun=newRun();addBuff(buffRun,'range',.35);addBuff(buffRun,'range',.1);assert.equal(buffRun.buffs.range,.4);assert.throws(()=>addBuff(buffRun,'range',.1));
});
test('fusion uses exact weaponId, caps at 3 and never edits permanent weapon stats',()=> {
  const run=newRun();addTemporaryWeapon(run,'sword-flame',['sword-starter']);assert.deepEqual(run.tempWeapons,['sword-flame']);assert.equal(run.fusions['sword-flame'],undefined);
  for(let i=0;i<5;i++) addTemporaryWeapon(run,'sword-starter',['sword-starter']);
  assert.equal(run.fusions['sword-starter'],3);assert.equal(weaponStats(run,'sword-starter').damage,24*1.45);
  assert.equal(weaponStats(newRun(),'sword-starter').damage,24);
  const {store}=fixture();store.transact('seed',s=>{s.points=1000;});buyWeapon(store,'sword-flame','buy');
  assert.throws(()=>buyWeapon(store,'sword-flame','duplicate'));assert.equal(store.state.points,400);
});
test('other game keys remain byte-for-byte unchanged',()=> {
  const {store,storage}=fixture();storage.setItem('phantom_journey_v1','original');storage.setItem('phantom-starspire-tower-v1','tower');
  claimStarter(store,pool);store.checkpoint(newRun());store.endRun('結算');
  assert.equal(storage.getItem('phantom_journey_v1'),'original');assert.equal(storage.getItem('phantom-starspire-tower-v1'),'tower');
});
