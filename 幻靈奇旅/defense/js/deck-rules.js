/* Guard Battle deployment rules shared by the editor and both PK peers. */
import {isBaseCard, isRedCard, isThreeColorEgg, baseSlotCost, fighterStats, SUPPORT} from './rules.js?v=20261107-fixes-r1';

export function validPkDeck(ids, evolution, spirit) {
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 6 || new Set(ids).size !== ids.length) return false;
  if (ids.some(id => typeof id !== 'string' || !spirit(id))) return false;
  const base = ids.filter(id => !isRedCard(id) && isBaseCard(evolution, id));
  const red = ids.filter(isRedCard);
  return base.reduce((n, id) => n + baseSlotCost(id), 0) === 4 && red.length <= 2 && base.length + red.length === ids.length;
}

/* 三色蛋固定排在前三格，第四格留給另一張基礎幻靈 */
export function settleEggSlots(slots, baseSize = 4) {
  const head = slots.slice(0, baseSize);
  if (!head.some(isThreeColorEgg)) return slots;
  const egg = head.find(isThreeColorEgg), others = head.filter((id) => id && !isThreeColorEgg(id));
  return [egg, egg, egg, others[0] || null, ...slots.slice(baseSize)];
}

export function combatPower(spec, entry) {
  if (!spec) return 0;
  const stats = fighterStats(spec, entry, 'ally');
  const support = SUPPORT[spec.id];
  // A 10-second encounter estimate: durability plus normal damage/healing.
  // Support duration is valued as team uptime; healing uses the same HP scale.
  if (support) return Math.round(stats.hp + (support.kind === 'heal' ? support.power[0] * 1800
    : (support.power?.[0] || 0) * (support.kind === 'volley' ? 6 : 4)) + (support.duration?.[0] || 0) * 180);
  return Math.round(stats.hp + stats.attack / stats.rate * 10);
}

export function autoDeck(owned, evolution, spirit, entry = () => null) {
  const ids = [...new Set(Array.isArray(owned) ? owned : [])].filter(id => spirit(id));
  const rank = (a, b) => combatPower(spirit(b), entry(b)) - combatPower(spirit(a), entry(a)) || a.localeCompare(b);
  /* 依強度填四個基礎格；三色蛋佔三格，剩不到三格時改選下一張 */
  const base = [];
  for (const id of ids.filter(id => !isRedCard(id) && isBaseCard(evolution, id)).sort(rank)) {
    const cost = baseSlotCost(id);
    if (base.length + cost <= 4) base.push(...Array(cost).fill(id));
    if (base.length === 4) break;
  }
  const red = ids.filter(isRedCard).sort(rank).slice(0, 2);
  return [...base, ...Array(4 - base.length).fill(null), ...red, ...Array(2 - red.length).fill(null)];
}
