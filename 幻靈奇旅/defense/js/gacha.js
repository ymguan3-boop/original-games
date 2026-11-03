/* 幻靈守護戰 summons. The base spirits are defined exactly as in the endless cave summon pool
   (survivors/data/gacha-pool.json through the cave's eligiblePool: chest/book families and 水蛟龍王 excluded,
   purple/red cards only after the original game unlocks them). Points come from the shared cave wallet, so
   spending here spends cave points; items land in the shared cave bag. Spirits drawn here join the
   defense collection (record.owned), which is what the deck is built from. */
import {eligiblePool, DRAW_COST, DUPLICATE_POINTS, REWARD_ITEMS} from '../../survivors/js/gacha.js';
import {addInventory} from '../../survivors/js/inventory.js';
import {SUPPORT, TRAP_CARDS} from './rules.js';

export {DRAW_COST, DUPLICATE_POINTS};
/* 10% spirits (yellow 6%, purple 3%, red 1%); the rest are cave items, skills and ability buffs. */
export const DEFENSE_RATES = {yellow: 0.06, purple: 0.03, red: 0.01, item: 0.45, skill: 0.225, ability: 0.225};
export const STARTER_COUNT = 4;
const COLORS = ['yellow', 'purple', 'red'];
/* A third of the supply draws are trap cards (laid on the road in the island fight). They are kept in the defense record, not in the cave bag. */
export const TRAP_SHARE = 1 / 3, TRAP_IDS = Object.keys(TRAP_CARDS), isTrapCard = (id) => id in TRAP_CARDS;

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
    const category = COLORS.includes(kind) ? 'item' : kind;
    if (category === 'item' && rng() < TRAP_SHARE) { out.push({kind: 'item', category: 'item', id: pick(TRAP_IDS, rng), quantity: 1, trap: true}); continue; }
    out.push({kind: 'item', category, id: pick(REWARD_ITEMS[category], rng), quantity: 1});
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
      else if (!isTrapCard(r.id)) addInventory(s, r.id, r.quantity);
    }
    s.history.unshift(...rewards.map((r) => ({...r, source: 'defense'}))); s.history = s.history.slice(0, 100);
    return rewards;
  });
}
