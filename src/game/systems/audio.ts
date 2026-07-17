/**
 * All audio is synthesized with the Web Audio API — original, licence-free.
 * A tiny sequencer drives an upbeat two-bar music loop; SFX are short
 * envelope-shaped oscillator/noise bursts.
 *
 * The module is a singleton usable from both Phaser and React. Nothing
 * plays before `unlock()` is called from a user gesture, per autoplay rules.
 */

type SfxName =
  | "pickup"
  | "badge"
  | "powerStore"
  | "coffee"
  | "shieldUp"
  | "shieldPop"
  | "wifi"
  | "gemini"
  | "nearMiss"
  | "collision"
  | "laneChange"
  | "countdownBeep"
  | "go"
  | "finish"
  | "fail"
  | "personalBest"
  | "uiClick";

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private rainNoise: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private musicOn = true;
  private sfxOn = true;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beatIndex = 0;
  private musicPlaying = false;

  get unlocked(): boolean {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** Call from a user gesture (button press) before any sound. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.musicOn ? 0.5 : 0;
      this.musicBus.connect(this.master);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = this.sfxOn ? 0.85 : 0;
      this.sfxBus.connect(this.master);
      this.noiseBuffer = this.makeNoise();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  suspend(): void {
    if (this.ctx?.state === "running") void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === "suspended") void this.ctx.resume();
  }

  setMusicOn(on: boolean): void {
    this.musicOn = on;
    if (this.musicBus && this.ctx) {
      this.musicBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
    }
  }

  setSfxOn(on: boolean): void {
    this.sfxOn = on;
    if (this.sfxBus && this.ctx) {
      this.sfxBus.gain.setTargetAtTime(on ? 0.85 : 0, this.ctx.currentTime, 0.02);
    }
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ------------------------------- music ------------------------------ */

  startMusic(): void {
    if (!this.ctx || this.musicPlaying) return;
    this.musicPlaying = true;
    this.nextBeat = this.ctx.currentTime + 0.06;
    this.beatIndex = 0;
    // 8th-note scheduler with lookahead
    this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
  }

  stopMusic(): void {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || !this.musicPlaying) return;
    const eighth = 60 / 116 / 2; // 116 BPM, 8th notes
    while (this.nextBeat < ctx.currentTime + 0.25) {
      this.playMusicStep(this.beatIndex % 32, this.nextBeat);
      this.nextBeat += eighth;
      this.beatIndex++;
    }
  }

  private playMusicStep(step: number, t: number): void {
    const bus = this.musicBus;
    if (!this.ctx || !bus) return;
    // Two-bar loop: C - Am - F - G, highlife-ish bounce
    const chords = [
      [261.63, 329.63, 392.0], // C
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
      [196.0, 246.94, 293.66], // G
    ];
    const chord = chords[Math.floor(step / 8) % 4];
    const bassNotes = [65.41, 55.0, 43.65, 49.0];
    const bass = bassNotes[Math.floor(step / 8) % 4];

    // bass on beats 0,3,4,6 of each bar-half (bouncy)
    if ([0, 3, 4, 6].includes(step % 8)) {
      this.tone(bus, bass * 2, t, 0.22, "triangle", 0.34);
    }
    // offbeat "shekere" hat
    if (step % 2 === 1) this.noiseHit(bus, t, 0.03, 6000, 0.07);
    // plucky arp lead
    const arp = [0, 1, 2, 1][step % 4];
    if (step % 2 === 0) {
      this.tone(bus, chord[arp] * 2, t, 0.11, "square", 0.05);
    }
    // sparkle every bar end
    if (step % 16 === 14) this.tone(bus, chord[2] * 4, t, 0.16, "sine", 0.06);
  }

  /* ------------------------------- engine ----------------------------- */

  startEngine(): void {
    if (!this.ctx || !this.sfxBus || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 220;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.sfxBus);
    this.engineOsc.start();
    this.engineGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.4);
  }

  /** speed 0..1 */
  setEngineSpeed(speed: number): void {
    if (!this.ctx || !this.engineOsc || !this.engineFilter) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speed * 70, t, 0.15);
    this.engineFilter.frequency.setTargetAtTime(180 + speed * 420, t, 0.15);
  }

  stopEngine(): void {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const osc = this.engineOsc;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    setTimeout(() => osc.stop(), 600);
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
  }

  /* -------------------------------- rain ------------------------------ */

  setRain(on: boolean): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuffer) return;
    if (on && !this.rainNoise) {
      this.rainNoise = this.ctx.createBufferSource();
      this.rainNoise.buffer = this.noiseBuffer;
      this.rainNoise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 3200;
      filter.Q.value = 0.6;
      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainNoise.connect(filter);
      filter.connect(this.rainGain);
      this.rainGain.connect(this.sfxBus);
      this.rainNoise.start();
      this.rainGain.gain.setTargetAtTime(0.05, this.ctx.currentTime, 0.8);
    } else if (!on && this.rainNoise) {
      const src = this.rainNoise;
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
      setTimeout(() => src.stop(), 2000);
      this.rainNoise = null;
      this.rainGain = null;
    }
  }

  /* -------------------------------- sfx ------------------------------- */

  play(name: SfxName): void {
    const bus = this.sfxBus;
    if (!this.ctx || !bus) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "pickup":
        this.tone(bus, 740, t, 0.07, "square", 0.12);
        this.tone(bus, 988, t + 0.06, 0.09, "square", 0.1);
        break;
      case "badge":
        this.tone(bus, 660, t, 0.08, "square", 0.12);
        this.tone(bus, 880, t + 0.07, 0.08, "square", 0.12);
        this.tone(bus, 1175, t + 0.14, 0.12, "square", 0.12);
        break;
      case "powerStore":
        this.tone(bus, 523, t, 0.09, "triangle", 0.16);
        this.tone(bus, 784, t + 0.08, 0.12, "triangle", 0.14);
        break;
      case "coffee":
        this.tone(bus, 392, t, 0.07, "sawtooth", 0.12);
        this.tone(bus, 523, t + 0.06, 0.07, "sawtooth", 0.12);
        this.tone(bus, 659, t + 0.12, 0.07, "sawtooth", 0.12);
        this.tone(bus, 784, t + 0.18, 0.14, "sawtooth", 0.12);
        break;
      case "shieldUp":
        this.sweep(bus, 300, 900, t, 0.25, "sine", 0.16);
        break;
      case "shieldPop":
        this.noiseHit(bus, t, 0.12, 1200, 0.2);
        this.sweep(bus, 900, 300, t, 0.18, "sine", 0.14);
        break;
      case "wifi":
        this.tone(bus, 587, t, 0.06, "sine", 0.14);
        this.tone(bus, 587, t + 0.09, 0.06, "sine", 0.14);
        this.tone(bus, 880, t + 0.18, 0.12, "sine", 0.14);
        break;
      case "gemini":
        this.tone(bus, 1046, t, 0.09, "sine", 0.1);
        this.tone(bus, 1318, t + 0.07, 0.09, "sine", 0.1);
        this.tone(bus, 1568, t + 0.14, 0.16, "sine", 0.1);
        break;
      case "nearMiss":
        this.noiseHit(bus, t, 0.1, 2400, 0.12);
        this.sweep(bus, 500, 950, t, 0.1, "sine", 0.05);
        break;
      case "collision":
        this.noiseHit(bus, t, 0.22, 500, 0.3);
        this.sweep(bus, 180, 70, t, 0.25, "sawtooth", 0.24);
        break;
      case "laneChange":
        this.noiseHit(bus, t, 0.05, 1600, 0.05);
        break;
      case "countdownBeep":
        this.tone(bus, 880, t, 0.08, "square", 0.1);
        break;
      case "go":
        this.tone(bus, 523, t, 0.1, "square", 0.14);
        this.tone(bus, 784, t + 0.1, 0.2, "square", 0.14);
        break;
      case "finish":
        [523, 659, 784, 1046].forEach((f, i) =>
          this.tone(bus, f, t + i * 0.09, 0.16, "triangle", 0.16),
        );
        this.tone(bus, 1318, t + 0.4, 0.3, "triangle", 0.14);
        break;
      case "fail":
        this.sweep(bus, 300, 240, t, 0.25, "sawtooth", 0.14);
        this.sweep(bus, 240, 160, t + 0.28, 0.4, "sawtooth", 0.14);
        break;
      case "personalBest":
        [659, 784, 988, 1318, 1568].forEach((f, i) =>
          this.tone(bus, f, t + i * 0.08, 0.14, "square", 0.1),
        );
        break;
      case "uiClick":
        this.tone(bus, 660, t, 0.04, "square", 0.06);
        break;
    }
  }

  private tone(
    bus: GainNode,
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private sweep(
    bus: GainNode,
    from: number,
    to: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(bus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private noiseHit(
    bus: GainNode,
    t: number,
    dur: number,
    cutoff: number,
    vol: number,
  ): void {
    const ctx = this.ctx!;
    if (!this.noiseBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(bus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}

export const gameAudio = new GameAudio();
