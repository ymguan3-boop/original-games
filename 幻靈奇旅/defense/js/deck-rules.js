/* Guard Battle deployment rules shared by the editor and both PK peers. */
import {isBaseCard, isRedCard, fighterStats, SUPPORT} from './rules.js?v=20261107-b2';

export function validPkDeck(ids, evolution, spirit) {
  if (!Array.isArray(ids) || ids.length < 4 || ids.length > 6 || new Set(ids).size !== ids.length) return false;
  if (ids.some(id => typeof id !== 'string' || !spirit(id))) return false;
  const base = ids.filter(id => !isRedCard(id) && isBaseCard(evolution, id));
  const red = ids.filter(isRedCard);
  return base.length === 4 && red.length <= 2 && base.length + red.length === ids.length;
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
  const base = ids.filter(id => !isRedCard(id) && isBaseCard(evolution, id)).sort(rank).slice(0, 4);
  const red = ids.filter(isRedCard).sort(rank).slice(0, 2);
  return [...base, ...Array(4 - base.length).fill(null), ...red, ...Array(2 - red.length).fill(null)];
}
