/* Gesture-gated combat cues. Local synthesis plus lazily loaded cave weapon samples. */
(()=>{'use strict';
const scriptUrl=globalThis.document?.currentScript?.src;const defaultAssetBase=scriptUrl?new URL('../assets/audio/weapons-v19/',scriptUrl).href:null;
function createCombatAudio({assetBase=defaultAssetBase,outputGain=.42,onPlayed=null,
  getPreferences = () => ({
    sfxMuted: globalThis.PhantomBgm?.sfxMuted ?? false,
    sfxVolume: globalThis.PhantomBgm?.sfxVolume ?? 55,
  }),
} = {}) {
  const mixGain=Number.isFinite(outputGain)?Math.max(0,Math.min(1.5,outputGain)):.42;
  let context = null, master = null, compressor = null, disposed = false, resume = null;
  const voices = new Set(), recent = [], last = new Map(),buffers=new Map();let samplePromise=null,currentPriority=false;
  const metrics = {
    unlocked: false, supported: true, played: 0, skippedLocked: 0,
    skippedMuted: 0, throttled: 0, errors: 0, activeVoices: 0,
    peakVoices: 0, lastKind: '', lastPhase: '', volume: 55, muted: false, stops: 0, outputGain:mixGain,masterGain:0,
    samplesReady:0,sampleErrors:0,weaponEvents:[],samplePlays:0,lastVariant:'',byPhase: { start: 0, release: 0, strike: 0, impact: 0 },
    byKind: { sword: 0, knife: 0, blades: 0, guns: 0, pet: 0 },
  };

  function preferences() {
    let value;
    try { value = getPreferences?.() || {}; } catch { value = {}; }
    const raw = Number(value.sfxVolume ?? value.volume ?? 55);
    const volume = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 55;
    metrics.volume = volume;
    metrics.muted = !!(value.sfxMuted ?? value.muted ?? false) || volume === 0;
    metrics.masterGain=metrics.muted?0:volume/100*mixGain;
    return { muted: metrics.muted, volume };
  }

  // Call in the pointer/key gesture handler; play() never creates or resumes audio.
  async function unlock() {
    if (disposed) return false;
    try {
      if (!context) {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) { metrics.supported = false; return false; }
        context = new AudioContext({ latencyHint: 'interactive' });
        master = context.createGain();
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -15;
        compressor.knee.value = 16;
        compressor.ratio.value = 5;
        compressor.attack.value = 0.004;
        compressor.release.value = 0.16;
        const prefs = preferences();
        master.gain.value = prefs.muted ? 0 : prefs.volume / 100 * mixGain;
        master.connect(compressor);
        compressor.connect(context.destination);
      }
      if (context.state === 'suspended') {
        if (!resume) resume = context.resume().finally(() => { resume = null; });
        await resume;
      }
      metrics.unlocked = !disposed && context.state === 'running';
      if(metrics.unlocked&&!preferences().muted)void loadSamples();return metrics.unlocked;
    } catch {
      metrics.errors++;
      metrics.unlocked = false;
      return false;
    }
  }

  function tone(frequency, endFrequency, at, duration, gain, type = 'sine') {
    if (voices.size >= 48 || disposed) return;
    const source = context.createOscillator(), envelope = context.createGain();
    const start = context.currentTime + at + 0.003;
    source.type = type;
    source.frequency.setValueAtTime(Math.max(20, frequency), start);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + Math.min(0.018, duration * 0.15));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(envelope);
    envelope.connect(master);
    const voice = { source, envelope,priority:currentPriority };
    voices.add(voice);
    metrics.activeVoices = voices.size;
    metrics.peakVoices = Math.max(metrics.peakVoices, voices.size);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect();
      envelope.disconnect();
      metrics.activeVoices = voices.size;
    };
    source.start(start);
    source.stop(start + duration + 0.025);
  }

  function loadSamples(){if(samplePromise)return samplePromise;if(!assetBase||!globalThis.fetch||!context?.decodeAudioData)return Promise.resolve();samplePromise=Promise.allSettled(['sword','knife','blades','guns'].flatMap(k=>['normal','combo','final'].map(v=>k+'-'+v)).map(async key=>{try{const response=await fetch(new URL(key+'.ogg',assetBase));if(!response.ok)throw Error('audio '+response.status);const data=await response.arrayBuffer(),buffer=await context.decodeAudioData(data);if(!disposed){buffers.set(key,buffer);metrics.samplesReady=buffers.size;}}catch{metrics.sampleErrors++;}}));return samplePromise;}
  function sample(key,rate=1,gain=1){const buffer=buffers.get(key);if(!buffer||voices.size>=48)return false;const source=context.createBufferSource(),envelope=context.createGain();source.buffer=buffer;source.playbackRate.value=rate;envelope.gain.value=gain;source.connect(envelope);envelope.connect(master);const voice={source,envelope,priority:currentPriority};voices.add(voice);metrics.activeVoices=voices.size;metrics.peakVoices=Math.max(metrics.peakVoices,voices.size);source.onended=()=>{voices.delete(voice);source.disconnect();envelope.disconnect();metrics.activeVoices=voices.size;};source.start(context.currentTime+.003);metrics.samplePlays++;return true;}
  function weaponCue(ev){if(ev.pet)return false;const phase=ev.phase,kind=ev.kind;if(phase==='start'){tone(kind==='sword'?100:kind==='guns'?550:900,kind==='sword'?420:1800,0,.2,ev.strong?.38:.18,'triangle');metal(kind==='sword'?260:780,.04,.24,.15);metrics.lastVariant='charge';return true;}const variant=phase==='strike'?(ev.final?'final':'combo'):phase==='impact'?'combo':'normal',key=kind+'-'+variant,rate=phase==='impact'?1.2:variant==='combo'?1+Math.min(10,ev.index||0)*.027:1,level=phase==='impact'?.22:variant==='final'?1.85:ev.strong?1.65:1.5;if(!sample(key,rate,level))return false;metrics.lastVariant=key;if(phase!=='impact'){metrics.weaponEvents.push({kind,phase,index:ev.index??null,final:!!ev.final,variant,at:context.currentTime});if(metrics.weaponEvents.length>100)metrics.weaponEvents.shift();}return true;}
  function metal(frequency, at, duration, level) {
    // Inharmonic sine partials give a polished metal ring without noisy grains.
    tone(frequency, frequency * 0.84, at, duration, level);
    tone(frequency * 2.76, frequency * 2.7, at, duration * 0.65, level * 0.27);
    tone(frequency * 4.11, frequency * 4.03, at, duration * 0.43, level * 0.12);
  }

  function impact(at, final = false) {
    tone(final ? 105 : 145, 31, at, final ? 0.8 : 0.34, final ? 0.8 : 0.42);
    tone(final ? 64 : 92, 25, at + 0.02, final ? 0.7 : 0.27, 0.23, 'triangle');
    metal(final ? 270 : 440, at, final ? 0.52 : 0.21, 0.18);
    if (final) tone(42, 28, at + 0.16, 0.7, 0.22);
  }

  function petCue(ev) {
    const element = String(ev.element || '').toLowerCase();
    const frequency = /water|ice|潮|水|冰/.test(element) ? 680
      : /fire|火|焰/.test(element) ? 280
        : /electric|lightning|雷|電/.test(element) ? 960
          : /dark|poison|暗|毒/.test(element) ? 210
            : /earth|rock|土|岩/.test(element) ? 340 : 520;
    const phase = ev.phase, strength = ev.strong ? 1.35 : 1;
    // Charge, release and actual contact remain distinguishable without samples.
    if (phase === 'start') {
      tone(frequency * 0.45, frequency * 1.25, 0, ev.strong ? 0.26 : 0.10, 0.08 * strength);
      if (ev.strong) metal(frequency * 1.4, 0.04, 0.28, 0.065);
    } else if (phase === 'impact') {
      const pitch = ev.critical ? 1.35 : 1;
      metal(frequency * pitch, 0, ev.strong ? 0.26 : 0.13, 0.14 * strength);
      tone(ev.strong ? 135 : 190, 45, 0, ev.strong ? 0.23 : 0.10, 0.15 * strength, 'triangle');
      if (ev.final) impact(0.015, true);
    } else {
      metal(frequency, 0, ev.strong ? 0.34 : 0.15, 0.13 * strength);
      tone(frequency * 0.5, frequency * 1.5, 0, ev.strong ? 0.24 : 0.10, 0.08 * strength);
      if (ev.strong) tone(frequency * 1.5, frequency * 0.45, 0.045, 0.22, 0.065);
    }
  }

  function synthesize(ev) {if(weaponCue(ev))return;
    if (ev.pet) { petCue(ev); return; }
    const strong = !!ev.strong;
    if (ev.phase === 'impact') { impact(0, !!ev.final); return; }
    if (ev.final) { impact(0, true); return; }
    if (ev.kind === 'sword') {
      tone(210, 780, 0, strong ? 0.3 : 0.16, 0.2, 'triangle');
      metal(strong ? 390 : 520, strong ? 0.11 : 0.025, strong ? 0.5 : 0.25, 0.26);
      if (strong && ev.phase !== 'start') impact(0.06);
    } else if (ev.kind === 'knife') {
      tone(1100, 260, 0, strong ? 0.18 : 0.1, 0.2, 'triangle');
      metal(strong ? 780 : 920, 0.025, strong ? 0.38 : 0.2, 0.23);
      if (strong && ev.phase !== 'start') impact(0.035);
    } else if (ev.kind === 'blades') {
      const count = strong ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const delay = i * (strong ? 0.085 : 0.065);
        tone(760 + i * 90, 230 + i * 30, delay, 0.14, 0.13, 'triangle');
        metal(640 + i * 140, delay + 0.02, 0.18, 0.11);
      }
    } else if (ev.kind === 'guns') {
      // Paired laser voices rather than a noisy gunshot, with a longer piercing tail.
      for (let i = 0; i < 2; i++) {
        const delay = i * 0.045;
        tone(strong ? 1480 : 1260, strong ? 130 : 330, delay, strong ? 0.36 : 0.16, 0.19);
        tone(strong ? 740 : 630, strong ? 260 : 420, delay, strong ? 0.32 : 0.13, 0.07, 'triangle');
      }
      if (strong) metal(1880, 0.025, 0.38, 0.08);
    }
  }

  function stop() {
    metrics.stops++;
    for (const voice of voices) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* Already ended. */ }
      try { voice.source.disconnect(); voice.envelope.disconnect(); } catch { /* Detached. */ }
    }
    voices.clear();
    metrics.activeVoices = 0;
    last.clear();
    recent.length = 0;
  }

  function applyPreferences() {
    const prefs = preferences();if(context&&!prefs.muted)void loadSamples();
    if (!master || disposed) return prefs;
    try {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      if (prefs.muted) {
        master.gain.setValueAtTime(0, now);
        stop();
      } else master.gain.setTargetAtTime(prefs.volume / 100 * mixGain, now, 0.01);
    } catch { metrics.errors++; }
    return prefs;
  }

  function play(event = {}) {
    if (disposed || !context || context.state !== 'running') {
      metrics.skippedLocked++;
      return false;
    }
    try {
      const prefs = applyPreferences();
      if (prefs.muted || globalThis.document?.hidden) { metrics.skippedMuted++; return false; }
      const phase = ['start','release','strike','impact'].includes(event.phase) ? event.phase : 'release';
      const ev = { ...event, phase };currentPriority=!ev.pet&&phase!=='impact';
      const kind = ev.pet ? 'pet' : ev.kind;
      if (!Object.hasOwn(metrics.byKind, kind)) return false;
      const now = context.currentTime;
      const source = String(ev.sourceActor?.id ?? ev.sourceActor ?? ev.speciesId ?? kind).slice(0, 80);
      const key = `${kind}:${source}:${ev.final ? 'final' : ev.strong ? 'strong' : 'normal'}:${phase}`;
      while (recent.length && recent[0] < now - 1) recent.shift();
      // Per actor/phase debounce preserves release + contact while bounding crowds.
      if(currentPriority&&voices.size>=44){for(const voice of voices){if(voice.priority)continue;voice.source.onended=null;try{voice.source.stop();voice.source.disconnect();voice.envelope.disconnect();}catch{}voices.delete(voice);if(voices.size<40)break;}metrics.activeVoices=voices.size;}
      const cooldown = ev.final ? 0.10 : phase === 'impact' ? 0.055 : ev.strong ? 0.08 : 0.075;
      if ((last.has(key) && now - last.get(key) < cooldown) || (!currentPriority&&recent.length >= (ev.final ? 32 : 28)) || voices.size >= (currentPriority?48:40)) {
        metrics.throttled++;
        return false;
      }
      last.set(key, now);
      if (last.size > 256) for (const [oldKey, at] of last) if (at < now - 2) last.delete(oldKey);
      recent.push(now);
      synthesize(ev);onPlayed?.(ev);
      metrics.played++;
      metrics.byKind[kind]++;
      metrics.byPhase[phase]++;
      metrics.lastKind = kind;
      metrics.lastPhase = ev.final ? 'final' : phase;
      return true;
    } catch {
      metrics.errors++;
      return false;
    }
  }

  const onSettings = () => applyPreferences();
  const onHidden = () => { if (globalThis.document?.hidden) stop(); };
  const onPageHide = () => stop();
  globalThis.addEventListener?.('phantom-audio-settings', onSettings);
  globalThis.addEventListener?.('pagehide', onPageHide);
  globalThis.document?.addEventListener?.('visibilitychange', onHidden);

  function dispose() {
    if (disposed) return;
    disposed = true;
    metrics.unlocked = false;
    globalThis.removeEventListener?.('phantom-audio-settings', onSettings);
    globalThis.removeEventListener?.('pagehide', onPageHide);
    globalThis.document?.removeEventListener?.('visibilitychange', onHidden);
    stop();
    try { master?.disconnect(); compressor?.disconnect(); } catch { /* Detached. */ }
    try { context?.close().catch(() => {}); } catch { /* Unsupported context. */ }
    last.clear();
    recent.length = 0;
  }

  return { unlock, play, stop, applyPreferences, dispose, metrics };
}

globalThis.PhantomCombatAudio = Object.freeze({ create: createCombatAudio });
})();
