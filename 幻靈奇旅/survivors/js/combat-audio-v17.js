/* Shared engine also used by the main game's spirit arenas. */
import '../../js/combat-audio.js?v=20261025-v18';
export function createCombatAudio(options) {
  return globalThis.PhantomCombatAudio.create(options);
}
