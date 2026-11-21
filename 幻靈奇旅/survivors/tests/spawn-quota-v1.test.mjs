import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CaveWorld} from '../js/world.js';
import {createStore} from '../js/save-bridge.js';
import {MEADOW_QUOTA,MEADOW_CAP,MEADOW_TOTAL,caveQuota,caveBaseQuota,CAVE_CAP} from '../js/spawn-quota.js';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data={spirits:Object.fromEntries(read('../../data/spirits.json').map(s=>[s.id,s])),config:read('../data/config.json'),skills:read('../data/spirit-skills.json'),evolution:read('../data/evolution.json'),passives:read('../data/survival-passives.json')};
function setup(meadow){const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)},store=createStore(storage);store.transact('setup',s=>{s.owned=s.team=['bulbasaur','charmander','squirtle'];s.starterClaimed=true;});const w=new CaveWorld(store,data,{merchantMeadow:meadow});w.start();let k=1;w.random=()=>(k=(k*16807)%2147483647)/2147483647;return {w,store};}
/* 只模擬生成：每一步把普通怪全部清掉，量測各波實際生成數與同時存活上限 */
function runSpawns(meadow,seconds){const {w}=setup(meadow),r=w.run,peaks={};r.hero.hp=r.hero.maxHp=1e9;for(let t=0;t<seconds;t+=.1){r.time+=.1;const wave=w.waveNumber(r),before=r.enemies.length;w.update(0);const alive=r.enemies.filter(e=>e.hp>0&&e.kind==='normal').length;peaks[wave]=Math.max(peaks[wave]||0,alive);if(!meadow||t%1<.1)for(const e of r.enemies)if(e.kind==='normal'){e.hp=0;e.rewarded=true;}r.enemies=r.enemies.filter(e=>e.hp>0);r.pickups=[];r.projectiles=[];}return {r,peaks};}
test('meadow quota table: 10 waves, 404 normals, per-wave caps',()=>{assert.equal(MEADOW_TOTAL,404);assert.equal(MEADOW_QUOTA.length,10);assert.deepEqual(MEADOW_CAP,[6,7,8,9,10,11,12,14,16,18]);});
test('meadow spawns exactly the wave quotas when monsters are cleared quickly',()=>{const {r,peaks}=runSpawns(true,239.5);const by=r.spawnQuota.byWave;for(let w=1;w<=10;w++){assert.equal(by[w],MEADOW_QUOTA[w-1],'wave '+w);assert.ok(peaks[w]<=MEADOW_CAP[w-1],'cap wave '+w+' peak '+peaks[w]);}assert.equal(r.spawnQuota.total,404);});
test('cave normal quota is four times the previous 24-second cadence and never exceeds 36 alive',()=>{for(const w of [1,5,10,20])assert.equal(caveQuota(w),caveBaseQuota(w)*4);const {r,peaks}=runSpawns(false,48);for(const w of [1,2])assert.ok(peaks[w]<=CAVE_CAP);assert.ok(r.spawnQuota.wave===3||r.spawnQuota.wave===2);});
