import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BAG_ITEMS} from '../js/rules.js';
import {DEFENSE_RATES, STARTER_COUNT, DRAW_COST, defensePool, poolPreview, rollKind, rollRewards, starterRewards, drawWithStore} from '../js/gacha.js';
import {createStore, SAVE_KEY} from '../../survivors/js/save-bridge.js';
import {killPoints, SUPPORT} from '../js/rules.js';

const pool = JSON.parse(readFileSync(new URL('../../survivors/data/gacha-pool.json', import.meta.url), 'utf8'));
const memory = (init) => { const m = new Map(init ? [[SAVE_KEY, JSON.stringify(init)]] : []); return {getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v))}; };
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const unlocked = {pokedexUnlocks: Object.fromEntries([...pool.purple, ...pool.red, ...pool.yellow].map((id) => [id, true]))};

test('spirits are 10% of summons (yellow 6, purple 3, red 1); rates sum to 1', () => {
  const sum = Object.values(DEFENSE_RATES).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
  assert.ok(Math.abs(DEFENSE_RATES.yellow + DEFENSE_RATES.purple + DEFENSE_RATES.red - 0.1) < 1e-9);
  assert.equal(rollKind(() => 0.05), 'yellow'); assert.equal(rollKind(() => 0.095), 'red'); assert.equal(rollKind(() => 0.5), 'item');
});

test('base spirits follow the cave summon pool: locked colours wait for the original unlocks, 水蛟龍王 never appears', () => {
  const fresh = defensePool(pool, {});
  assert.ok(fresh.yellow.length >= STARTER_COUNT);
  assert.deepEqual([fresh.purple, fresh.red], [['giratina'], ['jigglypuff']], '小黃 and 三色蛋 are free as in the cave; the rest need the original game');
  const open = defensePool(pool, unlocked);
  assert.ok(open.purple.length && open.red.length);
  assert.ok(![...open.yellow, ...open.purple, ...open.red].includes('mewtwo'));
  assert.ok(open.red.every((id) => SUPPORT[id] || id === 'jigglypuff'), 'red cards are support legends or 三色蛋');
});

test('the first summon gives four different yellow base spirits', () => {
  const r = starterRewards(defensePool(pool, {}), seq(0.1, 0.5, 0.9, 0.3));
  assert.equal(r.length, STARTER_COUNT); assert.equal(new Set(r.map((x) => x.id)).size, STARTER_COUNT);
  assert.ok(r.every((x) => pool.yellow.includes(x.id)));
});

test('a locked colour falls back to a lower one instead of failing', () => {
  const [r] = rollRewards({...defensePool(pool, {}), purple: [], red: []}, [], 1, seq(0.095, 0.2));
  assert.equal(r.kind, 'spirit'); assert.equal(r.color, 'yellow');
});

test('summons spend the shared cave points, refund duplicates and put items in the cave bag', () => {
  const store = createStore(memory({...JSON.parse(JSON.stringify(createStore(memory()).state)), points: 250}));
  const p = defensePool(pool, {});
  const res = drawWithStore(store, p, [p.yellow[0]], 1, seq(0.0, 0.0));
  assert.equal(res.value[0].id, p.yellow[0]); assert.ok(res.value[0].duplicate);
  assert.equal(store.state.points, 250 - DRAW_COST + 50, 'yellow duplicate refunds 50 like the cave');
  const item = drawWithStore(store, p, [], 1, seq(0.5, 0.9, 0.0)).value[0];
  assert.equal(item.kind, 'item'); assert.ok(item.id in BAG_ITEMS, 'supplies are this mode own items');
  assert.ok(!(item.id in store.state.inventory), 'items are not written to the cave bag');
  const trap = drawWithStore(store, p, [], 1, seq(0.5, 0.0, 0.0)).value[0];
  assert.ok(trap.trap && /^trap-/.test(trap.id) && !(trap.id in store.state.inventory), 'trap cards stay out of the cave bag');
  assert.ok(store.state.history.every((h) => h.kind === 'spirit' || h.source !== 'defense'), 'only spirits go to the shared history');
  assert.throws(() => drawWithStore(store, p, [], 10), /點數不足/);
});

test('kill points use the cave drop scale', () => {
  assert.deepEqual([killPoints(0), killPoints(4), killPoints(9)], [3, 8, 15]);
  assert.deepEqual([killPoints(2, true), killPoints(7, true)], [200, 300]);
});

test('tower bosses join the red pool only after the main game; zhaocai only joins through the add-on', () => {
  const closed = defensePool(pool, unlocked);
  assert.ok(!closed.red.includes('chimchar'));
  assert.ok(defensePool(pool, {captureCounts: {chimchar: 1}}).red.includes('chimchar'));
  const {all, open} = poolPreview(pool, {}, null);
  for (const id of ['chimchar', 'monferno', 'infernape', 'dialga', 'pikachu', 'mew', 'wigglytuff', 'blissey', 'jigglypuff']) assert.ok(all.red.includes(id), id);
  assert.deepEqual(open.red, ['jigglypuff']);
  assert.ok(![...pool.yellow, ...pool.purple, ...pool.red].some((id) => id.startsWith('zhaocai')), 'the base pool never holds the zhaocai family');
});
