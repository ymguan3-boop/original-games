import {test} from 'node:test';
import assert from 'node:assert/strict';
import {weaponStats} from '../js/inventory.js';
import {claimHalloweenWeapon} from '../js/halloween-event.js';
import {createStore} from '../js/save-bridge.js';
test('瞬燃雙刀依缺失血量提升攻擊且上限為 400%',()=>{for(const [hp,expected] of [[100,18],[75,54],[50,90],[1,90]])assert.equal(weaponStats({hero:{hp,maxHp:100}},'blades-blinkfire').damage,expected);assert.equal(weaponStats({hero:{hp:50,maxHp:100}},'guns-starter').damage,12)});
test('活動密碼正確時永久領取一次，錯誤密碼不變更存檔',()=>{const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)},store=createStore(storage);assert.throws(()=>claimHalloweenWeapon(store,'0'));assert.equal(claimHalloweenWeapon(store,'1151031').value.claimed,true);assert.equal(claimHalloweenWeapon(store,'1151031').value.claimed,false);assert.equal(store.state.weapons.filter(x=>x==='staff-pumpkin').length,1);assert.ok(createStore(storage).state.weapons.includes('staff-pumpkin'));});
import {readFileSync} from 'node:fs';
import {CaveWorld} from '../js/world.js';
import {WEAPONS,buyWeapon} from '../js/inventory.js';
import {shopWeaponEntries} from '../js/weapon-rules.js';
import {WEAPON_POOL} from '../js/gacha.js';
import {createPumpkinStaff} from '../js/pumpkin-staff.js';
import vm from 'node:vm';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const data={spirits:Object.fromEntries(read('../../data/spirits.json').map(s=>[s.id,s])),config:read('../data/config.json'),skills:read('../data/spirit-skills.json'),evolution:read('../data/evolution.json'),passives:read('../data/survival-passives.json')};
function setup(events={}){const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},store=createStore(storage);store.transact('setup',s=>{s.team=s.owned=['charmander','bulbasaur','squirtle'];s.starterClaimed=true;s.weapons.push('staff-pumpkin');s.equipped=['staff-pumpkin'];});const w=new CaveWorld(store,data,events);w.start();w.random=()=>.99;w.run.spawnAt=1e6;w.run.pets.forEach(p=>p.hp=0);return {w,store};}
function enemy(w,x,z){w.spawn();const e=w.run.enemies.at(-1);Object.assign(e,{x,z,hp:10000,maxHp:10000,nextAttack:1e6});return e;}
test('南瓜魔杖只能由活動取得，普攻為貫穿火球',()=>{const {w,store}=setup();assert.equal(WEAPONS['staff-pumpkin'].damage,28);assert.equal(WEAPONS['staff-pumpkin'].element,'森');assert.throws(()=>buyWeapon(store,'staff-pumpkin'));assert.ok(!WEAPON_POOL.includes('staff-pumpkin'));assert.ok(!shopWeaponEntries().some(([id])=>id==='staff-pumpkin'));enemy(w,0,3);enemy(w,0,6);w.run.hero.heading=0;w.strike(w.run.hero,'ranged',8,28,1,'森');const p=w.run.projectiles[0];assert.equal(p.fx,'pumpkin-fireball');assert.equal(p.piercing,true);for(let i=0;i<30;i++)w.update(.025);assert.ok(w.run.enemies.slice(0,2).every(e=>e.hp<10000));});
test('南瓜大絕無須目標且只在爆炸時一次傷害全場',()=>{const ev=[],{w}=setup({heroStart:e=>ev.push(['start',e]),heroStrike:e=>ev.push(['hit',e])});assert.equal(w.heroUltimate(),true);for(let i=0;i<30;i++)w.update(.05);assert.equal(ev[0][1].pumpkinStaff,true);assert.equal(ev.at(-1)[1].final,true);const q=setup(),a=enemy(q.w,30,30),b=enemy(q.w,-30,-30);assert.equal(q.w.heroUltimate(),true);for(let i=0;i<30;i++)q.w.update(.05);assert.ok(a.hp<10000&&b.hp<10000);assert.equal(q.w.run.projectiles.length,0);});
test('南瓜魔杖模型採輕量幾何與可辨識南瓜造型',()=>{const c=vm.createContext({console});vm.runInContext(readFileSync(new URL('../../vendor/three.min.js',import.meta.url),'utf8'),c);const root=createPumpkinStaff(c.THREE);assert.ok(root.userData.weaponBudget.triangles<3000);assert.equal(root.userData.weaponBudget.textures,0);assert.ok(root.userData.weaponBudget.meshes>=10);});
