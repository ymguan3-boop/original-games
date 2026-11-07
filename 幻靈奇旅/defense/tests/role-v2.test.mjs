import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROLE_META, ROLE_SKILLS, roleFor, ultimateFor, ULTIMATE_SPACING} from '../js/role-skills.js';
import {stageWeather, STAGE_WEATHER} from '../js/seascape.js';
import {STAGES} from '../js/stages.js';
import {createGame, playCard, step, elementMultiplier, profileFor} from '../js/rules.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spirits = read('../../data/spirits.json'), catalog = read('../../data/spirit-catalog.json');
const evolution = read('../../survivors/data/evolution.json');
const species = Object.fromEntries(spirits.map((s) => [s.id,s]));
const newGame = (deck = ['squirtle','charmander','cyndaquil']) =>
  createGame({deck,spirits,catalog,evolution,stageIndex:0,seed:71});

test('all collectible/model records have an authored role and unique named ultimate', () => {
  assert.equal(spirits.length,61);
  assert.equal(Object.keys(ROLE_SKILLS).length,spirits.length+5,'招財與第三階鳥族由附加資料併入');
  assert.deepEqual(Object.fromEntries(Object.keys(ROLE_META).map((r) =>
    [r,Object.values(ROLE_SKILLS).filter((s) => s.role === r).length])),
  {warrior:25,archer:11,mage:15,priest:7,support:8});
  for(const s of spirits) {
    const job=ROLE_SKILLS[s.id];
    assert.ok(job,s.name);
    assert.ok(ROLE_META[job.role],s.name);
    assert.equal(ultimateFor(s.id).name,s.skills?.[1]?.name,s.name);
    assert.ok(job.ultimate.description.length>=5,s.name);
    assert.ok(job.ultimate.cooldown>=15,s.name);
  }
});

test('new basic attack ranges are exact 1:3:5 with no elemental damage multiplier', () => {
  const reach=(id)=>profileFor(species[id],{},false).reach;
  assert.equal(reach('bulbasaur'),1.7);
  assert.equal(reach('charmander'),5.1);
  assert.equal(reach('cyndaquil'),8.5);
  assert.equal(reach('squirtle'),8.5);
  for(const x of ['森','焰','念','雷','潮','光']) for(const y of ['森','焰','念','雷','潮','光'])
    assert.equal(elementMultiplier(x,y),1);
});

test('priest healing targets the most damaged friend by remaining HP ratio', () => {
  const s=newGame(['squirtle','bulbasaur','charmander']);
  s.hand=[{uid:1,species:'squirtle',rank:1,boost:0},{uid:2,species:'bulbasaur',rank:1,boost:0},{uid:3,species:'charmander',rank:1,boost:0}];
  playCard(s,0);playCard(s,0);playCard(s,0);
  const p=s.fighters.find((f)=>f.species==='squirtle');
  const tank=s.fighters.find((f)=>f.species==='bulbasaur');
  const archer=s.fighters.find((f)=>f.species==='charmander');
  p.speed=tank.speed=archer.speed=0;
  tank.hp=tank.maxHp*.35; archer.hp=archer.maxHp*.6;
  p.cooldown=0;p.ultAt=100;
  step(s,.05);
  assert.ok(tank.hp>tank.maxHp*.35,'lowest remaining HP-ratio must be healed');
  assert.equal(archer.hp,archer.maxHp*.6,'higher HP-ratio teammate should not be healed first');
});

test('heavy ultimates are spaced even when many allies fill their gauges simultaneously', () => {
  const s=newGame(['bulbasaur','charmander']);
  s.hand=[{uid:1,species:'bulbasaur',rank:1,boost:0},{uid:2,species:'charmander',rank:1,boost:0}];
  playCard(s,0);playCard(s,0);
  const allies=s.fighters.filter((f)=>f.side==='ally');
  const enemy={...allies[0],id:999,side:'enemy',species:'bulbasaur',
    x:s.right-2.1,hp:100000,maxHp:100000,attack:0,cooldown:9999,
    ultAt:99999,speed:0,procs:[],statuses:{},barrierHp:0};
  s.fighters.push(enemy);
  for(const a of allies){a.x=s.right-1.5;a.speed=0;a.ultAt=0;a.cooldown=0;}
  let times=[];
  for(let i=0;i<240;i++){step(s,1/60);
    times.push(...s.events.filter((e)=>e.type==='ultimate').map(()=>s.time));
    s.events.length=0;
  }
  assert.ok(times.length>=2,'both allies should eventually cast');
  for(let i=1;i<times.length;i++) assert.ok(times[i]-times[i-1]>=ULTIMATE_SPACING-.05,
    'heavy ultimate presentations overlapped');
});

test('all ten stages have fixed named weather, and stage 1 is always sunny with clouds', () => {
  assert.equal(STAGES.length,10);
  assert.equal(Object.keys(STAGE_WEATHER).length,10);
  for(const s of STAGES) {const w=stageWeather(s.scene);
    assert.equal(w.fixed,true,s.name);
    assert.ok(w.name.length>1,s.name);
  }
  assert.equal(stageWeather(STAGES[0].scene).name,'晴天白雲');
  assert.equal(stageWeather(STAGES[9].scene).name,'深淵暴雨');
});

test('visual budget and sky protections are present in render sources', () => {
  const fx=readFileSync(new URL('../js/fx.js',import.meta.url),'utf8');
  const view=readFileSync(new URL('../js/view.js',import.meta.url),'utf8');
  assert.match(fx,/MAX_JOBS\s*=\s*MOBILE_FX\s*\?\s*76\s*:\s*140/);
  assert.match(fx,/MAX_PARTICLES\s*=\s*MOBILE_FX\s*\?\s*24\s*:\s*52/);
  assert.ok(!view.includes('if (![\'volley\', \'beam\'].includes(ev.kind)) fieldWash(color)'));
  assert.ok(!view.includes('    fieldWash(color);'));
});
