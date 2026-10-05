'use client';
/**
 * Audio event system. Every game moment maps to a named event; each event is rendered by a
 * synthesised placeholder (Web Audio) unless a sample exists at /audio/<event>.(mp3|wav|ogg),
 * in which case the sample is used. Replace the files to re-skin the show's sound.
 */

export type AudioEvent =
  | 'questionReveal'
  | 'answerLocked'
  | 'scoreTick'
  | 'scoreLow'
  | 'scoreZero'
  | 'jackpotIncrease'
  | 'teamEliminated'
  | 'headToHeadPoint'
  | 'timerWarning'
  | 'timerEnd'
  | 'finalWin'
  | 'finalLoss'
  | 'roundIntro'
  | 'uiClick';

export const AUDIO_EVENTS: AudioEvent[] = ['questionReveal', 'answerLocked', 'scoreTick', 'scoreLow', 'scoreZero', 'jackpotIncrease', 'teamEliminated', 'headToHeadPoint', 'timerWarning', 'timerEnd', 'finalWin', 'finalLoss', 'roundIntro', 'uiClick'];

export interface AudioSettings {
  muted: boolean;
  master: number; // 0..1
  music: number;
  effects: number;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = { muted: false, master: 0.8, music: 0.35, effects: 0.9 };
const STORAGE_KEY = 'nadir.audio';

export function loadAudioSettings(): AudioSettings {
  if (typeof window === 'undefined') return DEFAULT_AUDIO_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_AUDIO_SETTINGS, ...JSON.parse(raw) } : DEFAULT_AUDIO_SETTINGS;
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(s: AudioSettings) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number };

/** Synthesised placeholder cues. Times in seconds relative to the event start. */
const SYNTH: Record<AudioEvent, Note[]> = {
  questionReveal: [{ f: 523, t: 0, d: 0.12, type: 'triangle' }, { f: 784, t: 0.12, d: 0.35, type: 'triangle' }],
  answerLocked: [{ f: 330, t: 0, d: 0.08, type: 'square', g: 0.4 }, { f: 220, t: 0.08, d: 0.18, type: 'square', g: 0.4 }],
  scoreTick: [{ f: 1200, t: 0, d: 0.03, type: 'square', g: 0.25 }],
  scoreLow: [{ f: 440, t: 0, d: 0.6, type: 'sine' }, { f: 554, t: 0.2, d: 0.6, type: 'sine', g: 0.5 }],
  scoreZero: [{ f: 523, t: 0, d: 0.25, type: 'triangle' }, { f: 659, t: 0.18, d: 0.25, type: 'triangle' }, { f: 784, t: 0.36, d: 0.3, type: 'triangle' }, { f: 1047, t: 0.54, d: 1.4, type: 'triangle' }, { f: 1319, t: 0.7, d: 1.2, type: 'sine', g: 0.4 }],
  jackpotIncrease: [{ f: 880, t: 0, d: 0.1, type: 'triangle' }, { f: 1109, t: 0.1, d: 0.1, type: 'triangle' }, { f: 1319, t: 0.2, d: 0.5, type: 'triangle' }],
  teamEliminated: [{ f: 294, t: 0, d: 0.5, type: 'sawtooth', g: 0.3 }, { f: 262, t: 0.4, d: 0.6, type: 'sawtooth', g: 0.3 }, { f: 196, t: 0.9, d: 1.2, type: 'sawtooth', g: 0.3 }],
  headToHeadPoint: [{ f: 659, t: 0, d: 0.15, type: 'triangle' }, { f: 988, t: 0.15, d: 0.4, type: 'triangle' }],
  timerWarning: [{ f: 880, t: 0, d: 0.08, type: 'square', g: 0.3 }],
  timerEnd: [{ f: 440, t: 0, d: 0.3, type: 'square', g: 0.3 }, { f: 440, t: 0.35, d: 0.3, type: 'square', g: 0.3 }, { f: 349, t: 0.7, d: 0.8, type: 'square', g: 0.3 }],
  finalWin: [{ f: 523, t: 0, d: 0.3 }, { f: 659, t: 0.25, d: 0.3 }, { f: 784, t: 0.5, d: 0.3 }, { f: 1047, t: 0.75, d: 1.8 }, { f: 1319, t: 1.0, d: 1.6, g: 0.5 }, { f: 1568, t: 1.25, d: 1.5, g: 0.4 }],
  finalLoss: [{ f: 392, t: 0, d: 0.6, type: 'sine' }, { f: 349, t: 0.5, d: 0.7, type: 'sine' }, { f: 262, t: 1.1, d: 1.6, type: 'sine' }],
  roundIntro: [{ f: 196, t: 0, d: 0.6, type: 'sawtooth', g: 0.25 }, { f: 392, t: 0.1, d: 0.8, type: 'triangle' }, { f: 587, t: 0.3, d: 1.0, type: 'triangle', g: 0.6 }],
  uiClick: [{ f: 900, t: 0, d: 0.03, type: 'square', g: 0.15 }],
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private effects: GainNode | null = null;
  private music: GainNode | null = null;
  private samples = new Map<AudioEvent, AudioBuffer | null>();
  private settings: AudioSettings = DEFAULT_AUDIO_SETTINGS;
  private musicNodes: AudioNode[] = [];
  private unlocked = false;

  constructor(settings?: AudioSettings) {
    if (settings) this.settings = settings;
  }

  /** Must be called from a user gesture on iOS/Safari before any sound. */
  unlock() {
    this.ensure();
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
    this.unlocked = true;
  }

  isUnlocked() {
    return this.unlocked && this.ctx?.state === 'running';
  }

  setSettings(s: AudioSettings) {
    this.settings = s;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(s.muted ? 0 : s.master, this.ctx.currentTime, 0.02);
      this.effects!.gain.setTargetAtTime(s.effects, this.ctx.currentTime, 0.02);
      this.music!.gain.setTargetAtTime(s.music, this.ctx.currentTime, 0.05);
    }
  }

  private ensure() {
    if (this.ctx || typeof window === 'undefined') return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.effects = this.ctx.createGain();
    this.music = this.ctx.createGain();
    this.effects.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.setSettings(this.settings);
    void this.preloadSamples();
  }

  /**
   * Loads replacement samples listed in /audio/manifest.json ({ "scoreZero": "scoreZero.mp3", ... }).
   * Without a manifest the synthesised placeholders are used and no requests are made.
   */
  private async preloadSamples() {
    if (!this.ctx) return;
    let manifest: Partial<Record<AudioEvent, string>> = {};
    try {
      const res = await fetch('/audio/manifest.json', { cache: 'force-cache' });
      if (!res.ok) return;
      manifest = (await res.json()) as Partial<Record<AudioEvent, string>>;
    } catch {
      return;
    }
    await Promise.all(
      (Object.entries(manifest) as [AudioEvent, string][]).map(async ([ev, file]) => {
        try {
          const res = await fetch(`/audio/${file}`, { cache: 'force-cache' });
          if (!res.ok) return;
          const buf = await this.ctx!.decodeAudioData(await res.arrayBuffer());
          this.samples.set(ev, buf);
        } catch {
          this.samples.set(ev, null);
        }
      }),
    );
  }

  play(event: AudioEvent, opts: { gain?: number; rate?: number } = {}) {
    this.ensure();
    if (!this.ctx || !this.effects || this.settings.muted) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const sample = this.samples.get(event);
    const now = this.ctx.currentTime;
    if (sample) {
      const src = this.ctx.createBufferSource();
      src.buffer = sample;
      src.playbackRate.value = opts.rate ?? 1;
      const g = this.ctx.createGain();
      g.gain.value = opts.gain ?? 1;
      src.connect(g).connect(this.effects);
      src.start(now);
      return;
    }
    for (const n of SYNTH[event]) {
      const osc = this.ctx.createOscillator();
      osc.type = n.type ?? 'sine';
      osc.frequency.value = n.f * (opts.rate ?? 1);
      const g = this.ctx.createGain();
      const peak = (n.g ?? 0.6) * (opts.gain ?? 1) * 0.5;
      g.gain.setValueAtTime(0.0001, now + n.t);
      g.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
      osc.connect(g).connect(this.effects);
      osc.start(now + n.t);
      osc.stop(now + n.t + n.d + 0.05);
    }
  }

  /** Slow ambient pad used under the intro / final discussion. */
  startMusic() {
    this.ensure();
    if (!this.ctx || !this.music || this.musicNodes.length) return;
    const chord = [110, 164.8, 220, 277.2];
    const now = this.ctx.currentTime;
    for (const [i, f] of chord.entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = i % 2 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.08 + i * 0.03;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 1.5;
      lfo.connect(lfoGain).connect(osc.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 3);
      osc.connect(g).connect(this.music);
      osc.start(now);
      lfo.start(now);
      this.musicNodes.push(osc, lfo, g);
    }
  }

  stopMusic() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const n of this.musicNodes) {
      if (n instanceof GainNode) n.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      if (n instanceof OscillatorNode) n.stop(now + 1.6);
    }
    this.musicNodes = [];
  }
}
