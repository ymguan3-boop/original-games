/* 幻靈守護戰 summons. The base spirits are defined exactly as in the endless cave summon pool
   (survivors/data/gacha-pool.json through the cave's eligiblePool: chest/book families and 水蛟龍王 excluded,
   purple/red cards only after the original game unlocks them). Points come from the shared cave wallet, so
   spending here spends cave points; items land in the shared cave bag. Spirits drawn here join the
   defense collection (record.owned), which is what the deck is built from. */
import {eligiblePool, DRAW_COST, DUPLICATE_POINTS} from '../../survivors/js/gacha.js';
import {SUPPORT, TRAP_CARDS, BAG_ITEMS} from './rules.js?v=20261103-goldfish-egg-v1';

export {DRAW_COST, DUPLICATE_POINTS};
/* 10% spirits (yellow 6%, purple 3%, red 1%); the other 90% are this mode's own items: supplies and trap cards (kept in the island record). */
export const DEFENSE_RATES = {yellow: 0.06, purple: 0.03, red: 0.01, item: 0.9};
export const STARTER_COUNT = 4;
const COLORS = ['yellow', 'purple', 'red'];
/* Items: 40% are trap cards (laid on the road in the island fight), 60% supplies (potion, battery, buffs). Both live in the defense record. */
export const TRAP_SHARE = 0.4, TRAP_IDS = Object.keys(TRAP_CARDS), SUPPLY_IDS = Object.keys(BAG_ITEMS);
/* New tactical consumables are rarer than routine healing supplies.
   Total odds stay at spirits 10% / items 90%; traps 40% / supplies 60% of items. */
export const SUPPLY_WEIGHTS = Object.freeze({
  potion: 3, revive: 2, battery: 2, 'buff-attack': 2, 'buff-defense': 2,
  'card-organize': 2, 'deal-boost': 1, 'deal-jam': 1,
});
export function pickSupply(rng = Math.random) {
  const total = SUPPLY_IDS.reduce((sum, id) => sum + (SUPPLY_WEIGHTS[id] || 1), 0);
  let p = Math.min(0.999999999999, Math.max(0, rng())) * total;
  for (const id of SUPPLY_IDS) { p -= SUPPLY_WEIGHTS[id] || 1; if (p < 0) return id; }
  return SUPPLY_IDS[SUPPLY_IDS.length - 1];
}
export const isTrapCard = (id) => id in TRAP_CARDS, isDefenseItem = (id) => id in TRAP_CARDS || id in BAG_ITEMS;

/* Red cards that can be played here are the support legends; 三色蛋 (jigglypuff) is red but counts as a base card. */
export function defensePool(pool, journey = {}, spiritIds = null) {
  const p = eligiblePool(pool, journey), known = (id) => !spiritIds || spiritIds.has(id);
  return {
    yellow: p.yellow.filter(known),
    purple: p.purple.filter(known),
    red: p.red.filter((id) => known(id) && (SUPPORT[id] || id === 'jigglypuff')),
  };
}

export function rollKind(rng = Math.random) {
  let x = rng(), acc = 0;
  for (const [kind, rate] of Object.entries(DEFENSE_RATES)) { acc += rate; if (x < acc) return kind; }
  return 'item';
}

const pick = (list, rng) => list[Math.floor(rng() * list.length)];

/* A spirit colour with nothing unlocked falls back to the next lower colour (red -> purple -> yellow). */
function spiritFrom(pool, color, rng) {
  for (let i = COLORS.indexOf(color); i >= 0; i--) if (pool[COLORS[i]].length) return {color: COLORS[i], id: pick(pool[COLORS[i]], rng)};
  return null;
}

/* Pure: the rewards of `count` draws given what the player already owns (duplicates refund cave points). */
export function rollRewards(pool, owned, count = 1, rng = Math.random) {
  const have = new Set(owned), out = [];
  for (let i = 0; i < count; i++) {
    const kind = rollKind(rng);
    if (COLORS.includes(kind)) {
      const s = spiritFrom(pool, kind, rng);
      if (s) {
        const duplicate = have.has(s.id); have.add(s.id);
        out.push({kind: 'spirit', color: s.color, id: s.id, duplicate, refund: duplicate ? DUPLICATE_POINTS[s.color] : 0});
        continue;
      }
    }
    if (rng() < TRAP_SHARE) out.push({kind: 'item', category: 'trap', id: pick(TRAP_IDS, rng), quantity: 1, trap: true});
    else out.push({kind: 'item', category: 'supply', id: pickSupply(rng), quantity: 1});
  }
  return out;
}

/* The first summon is free and always gives STARTER_COUNT different yellow base spirits. */
export function starterRewards(pool, rng = Math.random) {
  const list = [...pool.yellow], out = [];
  while (out.length < STARTER_COUNT && list.length) out.push({kind: 'spirit', color: 'yellow', id: list.splice(Math.floor(rng() * list.length), 1)[0], duplicate: false, refund: 0, starter: true});
  return out;
}

/* Spend shared cave points in one cave-store transaction (points, refunds and bag items written together). */
export function drawWithStore(store, pool, owned, count = 1, rng = Math.random, txId = store.newId('defense-gacha')) {
  if (![1, 10].includes(count)) throw new Error('抽數設定無效。');
  return store.transact(txId, (s) => {
    const cost = count * DRAW_COST;
    if (s.points < cost) throw new Error(`轉蛋點數不足（需要 ${cost} 點，目前 ${s.points} 點）。`);
    const rewards = rollRewards(pool, owned, count, rng);
    s.points -= cost;
    for (const r of rewards) {
      if (r.kind === 'spirit') s.points += r.refund;
      /* items are not written to the cave bag: the island fight keeps its own stock (record.bag) */
    }
    s.history.unshift(...rewards.filter((r) => r.kind === 'spirit').map((r) => ({...r, source: 'defense'}))); s.history = s.history.slice(0, 100);
    return rewards;
  });
}
