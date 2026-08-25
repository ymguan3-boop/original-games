"use client";

import { gameAsset } from "./assetPath";

export type BgmTheme = "journey" | "storybookBoss";

const BGM_SOURCES: Record<BgmTheme, string> = {
  journey: gameAsset("/audio/bgm/math-kings-road-theme.mp3"),
  storybookBoss: gameAsset("/audio/bgm/storybook-boss-theme.mp3"),
};

/** A lightweight looping music player that starts only after a player gesture. */
class GameBgm {
  private audio: HTMLAudioElement | null = null;
  private mutedState = false;
  private volumeState = 0.18;
  private voiceDucked = false;
  private wantsPlayback = false;
  private theme: BgmTheme = "journey";

  get currentTheme(): BgmTheme {
    return this.theme;
  }

  setTheme(theme: BgmTheme, restart = false): void {
    const changed = this.theme !== theme;
    this.theme = theme;
    const audio = this.audio;
    if (!audio || (!changed && !restart)) return;

    audio.pause();
    audio.src = BGM_SOURCES[theme];
    audio.load();
    audio.loop = true;
    audio.muted = this.mutedState;
    this.applyVolume();
    if (restart) audio.currentTime = 0;
    if (this.wantsPlayback && !this.mutedState) {
      void audio.play().catch(() => undefined);
    }
  }

  setMuted(muted: boolean): void {
    this.mutedState = muted;
    if (this.audio) this.audio.muted = muted;
    if (!muted && this.wantsPlayback) void this.audio?.play().catch(() => undefined);
  }

  setVolume(volume: number): void {
    this.volumeState = Math.min(0.32, Math.max(0, volume));
    this.applyVolume();
  }

  setVoiceDucked(ducked: boolean): void {
    this.voiceDucked = ducked;
    this.applyVolume();
  }

  async play(): Promise<boolean> {
    this.wantsPlayback = true;
    if (typeof window === "undefined") return false;
    const audio = this.ensureAudio();
    audio.muted = this.mutedState;
    this.applyVolume();
    try {
      await audio.play();
      return true;
    } catch {
      return false;
    }
  }

  pause(): void {
    this.wantsPlayback = false;
    this.audio?.pause();
  }

  dispose(): void {
    const audio = this.audio;
    this.audio = null;
    this.wantsPlayback = false;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio;
    const audio = new Audio(BGM_SOURCES[this.theme]);
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = this.outputVolume();
    audio.muted = this.mutedState;
    this.audio = audio;
    return audio;
  }

  private outputVolume(): number {
    return this.voiceDucked ? this.volumeState * 0.58 : this.volumeState;
  }

  private applyVolume(): void {
    if (this.audio) this.audio.volume = this.outputVolume();
  }
}

export const gameBgm = new GameBgm();
