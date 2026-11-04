import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require = createRequire(import.meta.url);
const B = require('../js/fx/boomerang-chain.js');
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const foe = (id, x, hp = 100) => ({id, x, y: 1, z: 0, hp});
const run = (targets, {step = 1 / 60, kill} = {}) => {
  const hits = [], caught = []; let t = 0, frames = 0;
  const c = B.create({attackId: 'a1', targets, hand: () => ({x: 0, y: 1, z: 0}), targetPoint: (o) => o, isValid: (o) => o.hp > 0, onHit: (h) => { hits.push(h); kill?.(h); }, onCatch: (e) => caught.push(e), onFrame: () => frames++});
  while (!c.finished && t < 3) { t += step; c.update(t); }
  return {hits, caught, c, frames, t};
};

test('release to catch is under 1000 ms for 1, 2 and 3 targets, at 60 fps and on a 6 fps phone', () => {
  assert.ok(B.DURATION <= 1 && B.DURATION >= .9);
  for (const step of [1 / 60, 1 / 6]) for (const n of [1, 2, 3]) {
    const {caught, hits} = run([foe('a', 4), foe('b', 6), foe('c', 8)].slice(0, n), {step});
    assert.equal(caught.length, 1); assert.ok(caught[0].elapsedMs <= 1000); assert.equal(hits.length, n); assert.equal(caught[0].reclaimed, true);
  }
});

test('hits follow the schedule in order, one per target, and damage multipliers are 100/70/50', () => {
  const {hits} = run([foe('a', 4), foe('b', 6), foe('c', 8)]);
  assert.deepEqual(hits.map((h) => h.targetId), ['a', 'b', 'c']); assert.deepEqual(hits.map((h) => h.chainIndex), [0, 1, 2]); assert.deepEqual(hits.map((h) => h.timeMs), [270, 450, 620]);
  assert.deepEqual(B.CHAIN_DAMAGE, [1, .7, .5]); assert.equal(B.MAX_TARGETS, 3);
});

test('selection: primary first, nearest next, no duplicates, no fallen, no more than three', () => {
  const a = foe('a', 0), b = foe('b', 9), c = foe('c', 2), d = foe('d', 1, 0), e = foe('e', 3);
  const list = B.selectTargets({primary: a, candidates: [a, b, c, d, e, a], distance: (p, q) => Math.abs(p.x - q.x), valid: (o) => o.hp > 0});
  assert.deepEqual(list.map((o) => o.id), ['a', 'c', 'e']);
});

test('a duplicate target cannot be hit twice in one throw', () => {
  const t = foe('a', 4), {hits} = run([t, t, t]);
  assert.equal(hits.length, 1);
});

test('a target that dies mid-flight is skipped and the boomerang still comes home', () => {
  const b = foe('b', 6), c = foe('c', 8);
  const {hits, caught} = run([foe('a', 4), b, c], {kill: (h) => { if (h.targetId === 'a') b.hp = 0; }});
  assert.deepEqual(hits.map((h) => h.targetId), ['a', 'c']); assert.equal(caught.length, 1);
  const r = run([foe('a', 4, 0)]); assert.equal(r.hits.length, 0); assert.equal(r.caught.length, 1);
});

test('cancel stops the flight once and leaves no further hits', () => {
  let cancels = 0, hits = 0;
  const c = B.create({attackId: 'x', targets: [foe('a', 4), foe('b', 6)], hand: () => ({x: 0, y: 1, z: 0}), targetPoint: (o) => o, onHit: () => hits++, onCancel: () => cancels++});
  c.update(.3); c.cancel(); c.cancel(); assert.equal(c.update(.9), null);
  assert.equal(cancels, 1); assert.equal(hits, 1); assert.equal(c.cancelled, true);
});

test('the native pose is remapped so the 2.38 release and 5.55 catch keyframes meet the real flight', () => {
  assert.ok(Math.abs(B.nativeTime(B.WINDUP) - 2.38) < 1e-9);
  assert.ok(Math.abs(B.nativeTime(B.WINDUP + B.DURATION) - 5.55) < 1e-9);
  assert.ok(B.nativeTime(0) > 1 && B.nativeTime(9) <= 6.6);
});

test('the model keeps one boomerang; the arena uses real roster entries and the shared formula', () => {
  const frog = src('models/native/leaf-frogs.js'), game = src('js/game.js');
  assert.match(frog, /boomerangRig=stage===2/); assert.equal((frog.match(/boomerang\(fx,/g) || []).length, 1, 'one flying mesh');
  assert.ok(!game.includes('adventureFrogArenaFx'));
  assert.match(game, /candidates:side\.filter\(e=>e!==defender\),valid:e=>e\.hp>0/);
  assert.match(game, /if\(run\.damaged\.has\(target\.id\)\)return;run\.damaged\.add\(target\.id\)/);
  assert.match(game, /arenaDamage\(attacker,entry,skill,BoomerangChain\.CHAIN_DAMAGE\[chainIndex\]\)/);
  assert.match(game, /if\(boomerangRoster\)return finishBoomerang/, 'the single-target tail is skipped, so nothing is charged twice');
});
