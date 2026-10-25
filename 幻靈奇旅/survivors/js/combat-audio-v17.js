/* Gesture-gated combat cues. Synthesized locally; no network audio assets. */
export function createCombatAudio({
  getPreferences = () => ({
    muted: globalThis.PhantomBgm?.muted,
    volume: globalThis.PhantomBgm?.volume ?? 40,
  }),
} = {}) {
  let context = null, master = null, compressor = null, disposed = false, resume = null;
  const voices = new Set(), recent = [], last = new Map();
  const metrics = {
    unlocked: false, supported: true, played: 0, skippedLocked: 0,
    skippedMuted: 0, throttled: 0, errors: 0, activeVoices: 0,
    peakVoices: 0, lastKind: '', lastPhase: '', volume: 40,
    byKind: { sword: 0, knife: 0, blades: 0, guns: 0, pet: 0 },
  };

  function preferences() {
    let value;
    try { value = getPreferences?.() || {}; } catch { value = {}; }
    const raw = Number(value.volume ?? 40);
    const volume = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 40;
    metrics.volume = volume;
    return { muted: !!value.muted || volume === 0, volume };
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
        master.gain.value = prefs.muted ? 0 : prefs.volume / 100 * 0.42;
        master.connect(compressor);
        compressor.connect(context.destination);
      }
      if (context.state === 'suspended') {
        if (!resume) resume = context.resume().finally(() => { resume = null; });
        await resume;
      }
      metrics.unlocked = !disposed && context.state === 'running';
      return metrics.unlocked;
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
    const voice = { source, envelope };
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
        : /electric|雷|電/.test(element) ? 960
          : /dark|暗|毒/.test(element) ? 210 : 520;
    metal(frequency, 0, 0.38, 0.18);
    tone(frequency * 0.5, frequency * 1.5, 0, 0.27, 0.12);
    if (ev.final) impact(0.035, true);
  }

  function synthesize(ev) {
    if (ev.pet) { petCue(ev); return; }
    const strong = !!ev.strong;
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

  function play(ev = {}) {
    if (disposed || !context || context.state !== 'running') {
      metrics.skippedLocked++;
      return false;
    }
    try {
      const prefs = preferences();
      master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.volume / 100 * 0.42, context.currentTime, 0.012);
      if (prefs.muted || globalThis.document?.hidden) { metrics.skippedMuted++; return false; }
      const kind = ev.pet ? 'pet' : ev.kind;
      if (!Object.hasOwn(metrics.byKind, kind)) return false;
      const now = context.currentTime, key = `${kind}:${ev.final ? 'final' : ev.strong ? 'strong' : 'normal'}:${ev.phase || 'normal'}`;
      while (recent.length && recent[0] < now - 1) recent.shift();
      const cooldown = ev.final ? 0.11 : ev.strong ? 0.085 : ev.pet ? 0.18 : 0.075;
      if ((last.has(key) && now - last.get(key) < cooldown) || recent.length >= (ev.final ? 20 : ev.strong ? 17 : 13) || voices.size > (ev.final ? 40 : 34)) {
        metrics.throttled++;
        return false;
      }
      last.set(key, now);
      recent.push(now);
      synthesize(ev);
      metrics.played++;
      metrics.byKind[kind]++;
      metrics.lastKind = kind;
      metrics.lastPhase = ev.final ? 'final' : ev.phase || 'normal';
      return true;
    } catch {
      metrics.errors++;
      return false;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    metrics.unlocked = false;
    for (const { source, envelope } of voices) {
      try { source.stop(); } catch { /* Already ended. */ }
      try { source.disconnect(); envelope.disconnect(); } catch { /* Detached. */ }
    }
    voices.clear();
    metrics.activeVoices = 0;
    try { master?.disconnect(); compressor?.disconnect(); } catch { /* Detached. */ }
    try { context?.close().catch(() => {}); } catch { /* Unsupported context. */ }
    last.clear();
    recent.length = 0;
  }

  return { unlock, play, dispose, metrics };
}
