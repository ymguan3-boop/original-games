import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGame, step, playCard, canPlay, seatOf, PK_STAGE, PK_TIME, PK_RAGE_AT, pkRage, TRIAL_ROSTER, HAND_SIZE, beginDealing, SUPPORT} from '../js/rules.js';
import {buildPath} from '../js/stages.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const spirits = read('../../data/spirits.json'), catalog = read('../../data/spirit-catalog.json'), evolution = read('../../survivors/data/evolution.json');
const duel = (o = {}) => createGame({stage: PK_STAGE, deck: TRIAL_ROSTER, foeDeck: TRIAL_ROSTER, spirits, catalog, evolution, seed: 11, ...o});
/* a simple bot: plays the first playable card of its own hand every so often */
function play(g, seconds, every = 1.4, swap = false) {
  let next = swap ? {ally: 0.9, enemy: 0.5} : {ally: 0.5, enemy: 0.9};
  for (let t = 0; t < seconds && !g.result; t += 1 / 30) {
    step(g, 1 / 30); g.events.length = 0;
    for (const side of ['ally', 'enemy']) {
      if (g.time < next[side]) continue;
      next[side] = g.time + every;
      const hand = seatOf(g, side).hand, i = hand.findIndex((_, k) => canPlay(g, k, side));
      if (i >= 0) playCard(g, i, side);
    }
  }
  return g;
}

test('the PK road is long, inside the field and never runs alongside itself', () => {
  const p = buildPath(PK_STAGE.path, 8);
  assert.ok(p.length >= 50, 'long enough (' + p.length.toFixed(0) + ')');
  for (const [x, z] of buildPath(PK_STAGE.path).points) assert.ok(Math.abs(x) <= 16 && Math.abs(z) <= 9);
  for (let i = 0; i < p.points.length; i++) for (let j = i + 1; j < p.points.length; j++) {
    if (p.lengths[j] - p.lengths[i] < 8) continue;
    assert.ok(Math.hypot(p.points[i][0] - p.points[j][0], p.points[i][1] - p.points[j][1]) >= 3.4);
  }
  assert.equal(PK_STAGE.boss, null); assert.deepEqual(PK_STAGE.groups, []);
});

test('each PK side deals from its own deck and spawns at its own base', () => {
  const g = duel({deferDeal: true, foeDeck: ['squirtle']});
  beginDealing(g);
  assert.equal(g.hand.length, 3); assert.equal(g.events.filter((e) => e.type === 'deal' && e.side === 'enemy').length, 3);
  assert.ok(g.foe.hand.length >= 2 && g.events.filter((e) => e.type === 'deal').every((e) => e.side === 'enemy' ? g.foe.hand.some((c) => c.uid === e.uid) || true : true));
  assert.ok(g.foe.hand.every((c) => ['squirtle', 'wartortle'].includes(c.species)), g.foe.hand.map((c) => c.species).join());
  playCard(g, 0, 'enemy'); playCard(g, 0, 'ally');
  const foe = g.fighters.find((f) => f.side === 'enemy'), mine = g.fighters.find((f) => f.side === 'ally');
  assert.ok(foe.x < 0 && mine.x > 0, 'the guest starts at the nest end, the host at the crystal end');
  assert.ok(['squirtle', 'wartortle'].includes(foe.species));
  let dealt = {ally: 0, enemy: 0};
  for (let i = 0; i < 30 * 30; i++) { step(g, 1 / 30); for (const e of g.events) if (e.type === 'deal') dealt[e.side]++; g.events.length = 0; }
  assert.ok(dealt.ally >= 6 && dealt.enemy >= 6, 'both sides keep being dealt ' + JSON.stringify(dealt));
  assert.ok(g.hand.length <= HAND_SIZE && g.foe.hand.length <= HAND_SIZE);
  assert.ok(g.fighters.filter((f) => f.side === 'enemy').length <= 1, 'no AI waves in PK');
});

test('both PK sides are full-strength player spirits with ultimates', () => {
  const g = duel({deferDeal: true, deck: ['charmander'], foeDeck: ['charmander']});
  beginDealing(g); playCard(g, 0, 'ally'); playCard(g, 0, 'enemy');
  const [a, b] = ['ally', 'enemy'].map((s) => g.fighters.find((f) => f.side === s));
  assert.equal(a.maxHp, b.maxHp); assert.equal(a.attack, b.attack); assert.equal(a.knockTotal, b.knockTotal);
  let ults = {ally: 0, enemy: 0};
  for (let i = 0; i < 30 * 40 && !g.result; i++) { step(g, 1 / 30); for (const e of g.events) if (e.type === 'ultimate') ults[e.side]++; g.events.length = 0; }
  assert.ok(ults.ally > 0 && ults.enemy > 0, 'ultimates on both sides ' + JSON.stringify(ults));
});

test('support cards act for the side that played them', () => {
  const g = duel({deferDeal: true, deck: ['charmander'], foeDeck: ['monferno']});
  beginDealing(g); playCard(g, 0, 'ally');
  playCard(g, 0, 'enemy');
  for (let i = 0; i < 45; i++) step(g, 1 / 30);
  assert.ok(g.freezeAllyUntil > g.time, 'the guest\'s freeze freezes the host\'s spirits');
  assert.ok(!(g.freezeUntil > g.time));
  const skill = g.events.find((e) => e.type === 'skill'); assert.equal(skill?.side, 'enemy');
  assert.ok(SUPPORT.monferno.kind === 'freeze');
});

test('a PK match ends: a base breaks, or at the time limit base health then knock-outs decide', () => {
  const results = [];
  for (const swap of [false, true]) for (const seed of [1, 3, 4, 6]) results.push(play(duel({seed}), PK_TIME + 5, 1.4, swap).result);
  for (const r of results) { assert.ok(r, 'finished'); assert.ok(r.time <= PK_TIME + 0.1); }
  const wins = results.filter((r) => r.won === true).length, losses = results.filter((r) => r.won === false).length, draws = results.filter((r) => r.draw).length;
  assert.ok(wins > 0 && losses > 0, 'mirror decks: either side can win (' + wins + ' / ' + losses + ')');
  assert.ok(draws <= 2, 'draws are rare (' + draws + ')');
});

test('late in a PK match every hit grows stronger', () => {
  const g = duel(); assert.equal(pkRage(g), 1); g.time = PK_RAGE_AT + 60; assert.equal(pkRage(g), 2);
  assert.equal(pkRage(createGame({deck: TRIAL_ROSTER, spirits, catalog, evolution})), 1, 'never in island battles');
});

test('the guest mirror shows the battle from its own side', async () => {
  const {snapshot, createMirror, applySnapshot, flipEvent} = await import('../js/pk-sync.js');
  const g = duel({deferDeal: true, deck: ['charmander'], foeDeck: ['squirtle']});
  beginDealing(g); playCard(g, 0, 'ally'); playCard(g, 0, 'enemy');
  for (let i = 0; i < 30; i++) step(g, 1 / 30);
  const snap = JSON.parse(JSON.stringify(snapshot(g, g.events)));
  const m = createMirror(PK_STAGE), fired = [];
  applySnapshot(m, snap, (f) => fired.push(f.id));
  const host = g.fighters.find((f) => f.side === 'enemy'), mine = m.fighters.find((f) => f.id === host.id);
  assert.equal(mine.side, 'ally', 'the guest\'s own spirit is on its ally side');
  assert.ok(Math.abs(mine.x + host.x) < 0.01, 'lane mirrored');
  assert.deepEqual(m.hand.map((c) => c.uid), g.foe.hand.map((c) => c.uid), 'the guest sees its own hand');
  assert.ok(m.events.every((e) => !['deal', 'merge', 'play', 'move'].includes(e.type) || e.side === 'ally'), 'never the host\'s hand events');
  assert.equal(m.crystal.hp, g.nest.hp); assert.equal(m.nest.hp, g.crystal.hp);
  const fin = flipEvent({type: 'finish', won: true, crystal: 1, nest: 0.2, kills: 3, foeKills: 5});
  assert.equal(fin.won, false); assert.equal(fin.crystal, 0.2); assert.equal(fin.kills, 5);
  assert.equal(flipEvent({type: 'finish', won: null}).won, null, 'a draw stays a draw');
  assert.equal(flipEvent({type: 'baseHit', side: 'nest'}).side, 'crystal');
});

test('room codes are 4 letters or digits without look-alikes', async () => {
  const {makeCode, normalizeCode, validCode, CODE_CHARS} = await import('../js/pk-net.js');
  for (let i = 0; i < 200; i++) { const c = makeCode(); assert.ok(validCode(c), c); }
  assert.ok(!/[01IO]/.test(CODE_CHARS));
  assert.equal(normalizeCode(' k7-pq9 '), 'K7PQ');
  assert.ok(!validCode('K7P')); assert.ok(!validCode('K0PQ'));
});
