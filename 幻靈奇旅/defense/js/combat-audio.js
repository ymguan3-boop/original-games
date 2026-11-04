/* Defense retains the player's full BGM level; cave's foreground mix is separate. */
import '../../js/combat-audio.js?v=20261030-reaper-v2';
export function createCombatAudio(options = {}) {
  globalThis.PhantomBgm?.setMix?.({gain: 1, ceiling: 1});
  return globalThis.PhantomCombatAudio.create({
    assetBase: new URL('../../assets/audio/weapons-v19/', import.meta.url).href,
    ...options,
    onPlayed(event) {
      globalThis.PhantomBgm?.duckFor?.(event.final ? .65 : .8, event.final ? 280 : 120);
      options.onPlayed?.(event);
    },
  });
}
