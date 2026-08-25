"use client";

export type SoundEffect =
  | "click"
  | "attack"
  | "enemyAttack"
  | "hit"
  | "heroHit"
  | "guard"
  | "correct"
  | "wrong"
  | "victory"
  | "buy"
  | "boss"
  | "step"
  | "ultimate";

type ToneOptions = {
  at: number;
  duration: number;
  frequency: number;
  gain: number;
  type?: OscillatorType;
  endFrequency?: number;
};

/**
 * Small, dependency-free Web Audio sound engine for the battle UI.
 * The AudioContext is intentionally created only after the first play/unlock call.
 */
export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private activeSources = new Set<AudioScheduledSourceNode>();
  private mutedState = false;
  private volumeState = 0.62;

  get muted(): boolean {
    return this.mutedState;
  }

  get volume(): number {
    return this.volumeState;
  }

  setMuted(muted: boolean): void {
    this.mutedState = muted;
    if (muted) this.stopActiveSources();
    this.updateMasterGain();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedState);
    return this.mutedState;
  }

  setVolume(volume: number): void {
    this.volumeState = Math.min(1, Math.max(0, volume));
    this.updateMasterGain();
  }

  /** Call from a pointer/key handler when the app wants to unlock audio up front. */
  async unlock(): Promise<boolean> {
    if (this.mutedState) return false;

    const context = this.ensureContext();
    if (!context) return false;

    try {
      if (context.state === "suspended") await context.resume();
      return context.state === "running";
    } catch {
      return false;
    }
  }

  /** Returns false when audio is muted, unavailable, or blocked by the browser. */
  async play(effect: SoundEffect): Promise<boolean> {
    if (!(await this.unlock())) return false;

    const context = this.context;
    if (!context || !this.master) return false;

    const now = context.currentTime + 0.006;

    try {
      switch (effect) {
        case "click":
          this.tone({ at: now, duration: 0.055, frequency: 720, endFrequency: 600, gain: 0.11, type: "square" });
          break;
        case "attack":
          this.tone({ at: now, duration: 0.07, frequency: 1180, endFrequency: 760, gain: 0.13, type: "square" });
          this.tone({ at: now + 0.045, duration: 0.2, frequency: 820, endFrequency: 120, gain: 0.22, type: "sawtooth" });
          this.noise(now + 0.04, 0.16, 0.12, 1800);
          break;
        case "enemyAttack":
          this.tone({ at: now, duration: 0.24, frequency: 155, endFrequency: 62, gain: 0.24, type: "sawtooth" });
          this.tone({ at: now + 0.08, duration: 0.17, frequency: 420, endFrequency: 105, gain: 0.13, type: "square" });
          this.noise(now + 0.035, 0.22, 0.11, 720);
          break;
        case "hit":
          this.tone({ at: now, duration: 0.16, frequency: 125, endFrequency: 58, gain: 0.24, type: "square" });
          this.noise(now, 0.13, 0.16, 420);
          break;
        case "heroHit":
          this.tone({ at: now, duration: 0.28, frequency: 92, endFrequency: 42, gain: 0.3, type: "sawtooth" });
          this.tone({ at: now + 0.05, duration: 0.22, frequency: 210, endFrequency: 70, gain: 0.16, type: "square" });
          this.noise(now, 0.2, 0.2, 320);
          break;
        case "guard":
          this.tone({ at: now, duration: 0.14, frequency: 440, endFrequency: 880, gain: 0.13, type: "triangle" });
          this.tone({ at: now + 0.08, duration: 0.25, frequency: 1318.51, gain: 0.12, type: "sine" });
          this.noise(now, 0.08, 0.045, 2600);
          break;
        case "correct":
          this.sequence(now, [523.25, 659.25, 783.99], 0.075, 0.13, "square");
          break;
        case "wrong":
          this.sequence(now, [311.13, 246.94, 196], 0.105, 0.14, "sawtooth");
          break;
        case "victory":
          this.sequence(now, [392, 523.25, 659.25, 783.99, 659.25, 1046.5], 0.115, 0.14, "square", 0.19);
          break;
        case "buy":
          this.tone({ at: now, duration: 0.08, frequency: 987.77, gain: 0.12, type: "sine" });
          this.tone({ at: now + 0.07, duration: 0.12, frequency: 1318.51, gain: 0.14, type: "sine" });
          break;
        case "boss":
          this.sequence(now, [98, 98, 116.54, 92.5], 0.2, 0.18, "sawtooth", 0.29);
          this.noise(now, 0.78, 0.055, 180);
          break;
        case "step":
          this.tone({ at: now, duration: 0.11, frequency: 88, endFrequency: 52, gain: 0.15, type: "sine" });
          this.noise(now, 0.07, 0.055, 260);
          break;
        case "ultimate":
          this.sequence(now, [261.63, 392, 523.25, 783.99, 1046.5], 0.12, 0.16, "triangle", 0.16);
          this.noise(now + 0.1, 0.32, 0.09, 1700);
          break;
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Release browser audio resources. A later play call may initialize a fresh context. */
  dispose(): void {
    const context = this.context;
    this.stopActiveSources();
    this.context = null;
    this.master = null;

    if (context && context.state !== "closed") {
      void context.close().catch(() => undefined);
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== "closed") return this.context;
    if (typeof window === "undefined" || !window.AudioContext) return null;

    const context = new window.AudioContext();
    const master = context.createGain();
    master.gain.value = this.mutedState ? 0 : this.volumeState;
    master.connect(context.destination);
    this.context = context;
    this.master = master;
    return context;
  }

  private updateMasterGain(): void {
    if (!this.context || !this.master || this.context.state === "closed") return;
    const now = this.context.currentTime;
    const target = this.mutedState ? 0 : this.volumeState;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(target, now, 0.012);
  }

  private tone(options: ToneOptions): void {
    if (!this.context || !this.master) return;

    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const end = options.at + options.duration;

    oscillator.type = options.type ?? "square";
    oscillator.frequency.setValueAtTime(Math.max(1, options.frequency), options.at);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), end);
    }

    envelope.gain.setValueAtTime(0.0001, options.at);
    envelope.gain.exponentialRampToValueAtTime(options.gain, options.at + Math.min(0.012, options.duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(envelope);
    envelope.connect(this.master);
    this.activeSources.add(oscillator);
    oscillator.start(options.at);
    oscillator.stop(end + 0.01);
    oscillator.addEventListener("ended", () => {
      this.activeSources.delete(oscillator);
      oscillator.disconnect();
      envelope.disconnect();
    }, { once: true });
  }

  private sequence(
    at: number,
    frequencies: readonly number[],
    spacing: number,
    gain: number,
    type: OscillatorType,
    duration = spacing * 0.9,
  ): void {
    frequencies.forEach((frequency, index) => {
      this.tone({ at: at + index * spacing, duration, frequency, gain, type });
    });
  }

  private noise(at: number, duration: number, gain: number, cutoff: number): void {
    if (!this.context || !this.master) return;

    const frameCount = Math.max(1, Math.ceil(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    const end = at + duration;

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff * 0.35), end);
    envelope.gain.setValueAtTime(gain, at);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    this.activeSources.add(source);
    source.start(at);
    source.stop(end + 0.01);
    source.addEventListener("ended", () => {
      this.activeSources.delete(source);
      source.disconnect();
      filter.disconnect();
      envelope.disconnect();
    }, { once: true });
  }

  private stopActiveSources(): void {
    this.activeSources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source may already have ended between scheduling and cleanup.
      }
    });
    this.activeSources.clear();
  }
}

export const gameAudio = new GameAudio();
