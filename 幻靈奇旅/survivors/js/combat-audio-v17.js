/* Cave-only foreground mix. Shared sliders and mute remain authoritative. */
import '../../js/combat-audio.js?v=20261027-caveaudio2';
export function createCombatAudio(options={}) {
  const sync=()=>{const bgm=globalThis.PhantomBgm;if(!bgm)return;const active=!bgm.sfxMuted&&bgm.sfxVolume>0;bgm.setMix?.({gain:.55,ceiling:active?bgm.sfxVolume/100*.1:1});};
  sync();globalThis.addEventListener?.('phantom-audio-settings',sync);
  const engine=globalThis.PhantomCombatAudio.create({assetBase:new URL('../../assets/audio/weapons-v19/',import.meta.url).href,...options,outputGain:.95,onPlayed:ev=>{globalThis.PhantomBgm?.duckFor?.(ev.pet?.25:.12,ev.final?900:500);options.onPlayed?.(ev);}}),dispose=engine.dispose;
  return{...engine,dispose(){globalThis.removeEventListener?.('phantom-audio-settings',sync);globalThis.PhantomBgm?.setMix?.();dispose();}};
}
