/* Shared engine also used by the main game's spirit arenas. */
import '../../js/combat-audio.js?v=20261025-v19';
export function createCombatAudio(options) {
  return globalThis.PhantomCombatAudio.create({assetBase:new URL('../../assets/audio/weapons-v19/',import.meta.url).href,...options});
}
