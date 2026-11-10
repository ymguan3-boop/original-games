import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame, beginDealing, step, useBagItem, BAG_ITEMS, TRIAL_ROSTER,
  DEAL_EVERY, dealRateAt, PK_STAGE} from '../js/rules.js';
import {rollRewards, pickSupply, SUPPLY_IDS, SUPPLY_WEIGHTS, DEFENSE_RATES} from '../js/gacha.js';
import {snapshot, createMirror, applySnapshot} from '../js/pk-sync.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spirits = read('../../data/spirits.json');
const catalog = read('../../data/spirit-catalog.json');
const evolution = read('../../survivors/data/evolution.json');
const game = (extra = {}) => createGame({
  stageIndex: 0, deck: TRIAL_ROSTER, spirits, catalog, evolution, seed: 12, ...extra
});
const card = (uid, species, rank = 1) => ({uid, species, rank, boost:0});
const seq = (...xs) => {let i=0;return () => xs[i++ % xs.length];};

test('new consumables have names, descriptions, and weights in the existing defense gacha', () => {
  for(const id of ['card-organize','deal-boost','deal-jam']) {
    assert.ok(BAG_ITEMS[id], id);
    assert.ok(BAG_ITEMS[id].name && BAG_ITEMS[id].text && BAG_ITEMS[id].icon, id);
    assert.ok(SUPPLY_IDS.includes(id), 'gacha must include '+id);
    assert.ok(SUPPLY_WEIGHTS[id] >= 1);
  }
  assert.ok(Math.abs(Object.values(DEFENSE_RATES).reduce((a,b)=>a+b,0)-1)<1e-10);
  const pool={yellow:[],purple:[],red:[]};
  assert.equal(rollRewards(pool,[],1,seq(0.5,0.9,0.80))[0].id,'card-organize');
  assert.equal(rollRewards(pool,[],1,seq(0.5,0.9,0.91))[0].id,'deal-boost');
  assert.equal(rollRewards(pool,[],1,seq(0.5,0.9,0.99))[0].id,'deal-jam');
});

test('quick organizer groups identical rank cards and merges them without losing other cards', () => {
  const s=game();
  s.hand=[card(101,'charmander'),card(102,'squirtle'),card(103,'charmander')];
  const before=s.stats.merges;
  assert.equal(useBagItem(s,'card-organize'),true);
  assert.equal(s.stats.merges,before+1);
  assert.deepEqual(s.hand.map(c=>c.species),['charmeleon','squirtle']);
  s.hand=[];
  assert.equal(useBagItem(s,'card-organize'),false,'empty hand must not consume an item');
});

test('fast-dealing consumable doubles our draw rate for 12 seconds then resets', () => {
  const s=game({stage:{...game().stage,groups:[],boss:null}});
  assert.equal(s.dealAt,DEAL_EVERY);
  assert.equal(useBagItem(s,'deal-boost'),true);
  assert.equal(s.dealRate,2);
  assert.equal(s.dealAt,DEAL_EVERY/2);
  assert.equal(useBagItem(s,'deal-boost'),false,'no stacking while effect active');
  let dealt=0;
  for(let i=0;i<55;i++){step(s,1/30);dealt+=s.events.filter(e=>e.type==='deal').length;s.events.length=0;}
  assert.ok(dealt>=1,'a new card appears about 1.6s after activating');
  s.time=12.1; s.dealAt=14;
  step(s,1/30);
  assert.equal(s.dealRate,1,'normal speed resumes after timer expires');
  assert.equal(dealRateAt(s,s.time),1);
});

test('jam delays AI spawn in solo but slows the opposite deck in PK', () => {
  const s=game(),before=s.spawnAt.slice();
  assert.equal(useBagItem(s,'deal-jam'),true);
  assert.ok(s.spawnSlowUntil>s.time);
  assert.ok(s.spawnAt.every((t,i)=>t>=before[i]),'solo enemy spawn is delayed');
  assert.equal(useBagItem(s,'deal-jam'),false,'cannot stack the same slowdown');
  const p=game({stage:PK_STAGE,foeDeck:TRIAL_ROSTER});
  assert.equal(useBagItem(p,'deal-jam','ally'),true);
  assert.equal(p.dealRate,1,'the caster is not slowed');
  assert.equal(p.foe.dealRate,0.5,'the rival receives half speed');
  assert.equal(p.foe.dealAt,DEAL_EVERY*2,'opponent current draw delay doubles');
  assert.equal(useBagItem(p,'deal-jam','ally'),false);
});

test('guest can organize or boost their own cards through the host state and mirror receives the rate', () => {
  const p=game({stage:PK_STAGE,foeDeck:TRIAL_ROSTER});
  p.foe.hand=[card(21,'charmander'),card(22,'squirtle'),card(23,'charmander')];
  assert.equal(useBagItem(p,'card-organize','enemy'),true);
  assert.deepEqual(p.foe.hand.map(c=>c.species),['charmeleon','squirtle']);
  assert.equal(useBagItem(p,'deal-boost','enemy'),true);
  const m=createMirror(PK_STAGE);
  applySnapshot(m,snapshot(p,[]));
  assert.equal(m.dealRate,2);
  assert.equal(m.dealAt,p.foe.dealAt);
});

test('zero-stock filtering, new item metadata and host-authoritative PK actions are wired into UI', () => {
  const main=readFileSync(new URL('../js/main.js',import.meta.url),'utf8');
  const css=readFileSync(new URL('../css/defense.css',import.meta.url),'utf8');
  const lobby=readFileSync(new URL('../js/pk-lobby.js',import.meta.url),'utf8');
  assert.match(main,/\.filter\(\(u\) => u\.count > 0 &&/,'empty items never render');
  assert.match(main,/pk\.itemStock\[id\]--/,'the host debits guest tactical stock');
  assert.match(main,/pk\.send\(\{t:'itemUsed',id\}\)/,'guest is charged only after host approves');
  assert.match(lobby,/stock: connected\.me\.stock/,'guest inventory announced in room handshake');
  assert.doesNotMatch(css,/body\.pk-mode #items, body\.pk-mode #speed/,'PK item icon should not be hidden');
});
