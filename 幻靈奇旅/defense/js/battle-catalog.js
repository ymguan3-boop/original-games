/* Opponents must be readable regardless of this device's collection unlocks.
   Loading definitions never grants ownership or adds locked cards to the pool. */
export function mergeBattleAddon(data, addon, unlockPool = false) {
  const known = new Set(data.spirits.map(s => s.id));
  data.spirits.push(...addon.spirits.filter(s => !known.has(s.id)));
  const entries = new Set(data.catalog.entries.map(e => e.id));
  data.catalog.entries.push(...addon.catalogEntries.filter(e => !entries.has(e.id)));
  Object.assign(data.evolution, addon.evolution);
  Object.assign(data.art.cards || data.art, addon.art);
  if (unlockPool) for (const [color, ids] of Object.entries(addon.pool || {})) {
    if (Array.isArray(data.pool[color]) && Array.isArray(ids)) data.pool[color] = [...new Set([...data.pool[color], ...ids])];
  }
}
