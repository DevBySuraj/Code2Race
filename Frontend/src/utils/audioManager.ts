export interface SoundSettings {
  engineEnabled: boolean;
  clickType: 'off' | 'blue' | 'linear' | 'typewriter';
  volume: number; // 0.0 to 1.0
  muted: boolean;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = {
    engineEnabled: true,
    clickType: 'blue',
    volume: 0.5,
    muted: false
  };

  // Engine Synth nodes
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private engineRunning = false;
  private engineShouldBeRunning = false;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('keyracer_sound_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }

  public saveSettings(newSettings: Partial<SoundSettings>) {
    const wasMuted = this.settings.muted;
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem('keyracer_sound_settings', JSON.stringify(this.settings));
    } catch (e) {}

    // Apply engine changes immediately
    if (this.settings.muted) {
      this.stopAudioNodes();
    } else if (wasMuted && !this.settings.muted) {
      // If we just unmuted, restart the engine if it should be running
      if (this.engineShouldBeRunning) {
        this.startEngine();
      }
    } else if (this.engineRunning) {
      if (!this.settings.engineEnabled) {
        this.stopAudioNodes();
      } else {
        this.updateEngineVolume();
      }
    } else if (!this.engineRunning && this.settings.engineEnabled && this.engineShouldBeRunning) {
      this.startEngine();
    }
  }

  public getSettings(): SoundSettings {
    return this.settings;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- Click Sounds ---
  public playClick() {
    if (this.settings.muted) return;
    const type = this.settings.clickType;
    if (type === 'off') return;

    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime;

      // Master volume scale
      const vol = this.settings.volume;

      if (type === 'blue') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.06);

        gainNode.gain.setValueAtTime(0.3 * vol, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.06);
      } else if (type === 'linear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);

        gainNode.gain.setValueAtTime(0.45 * vol, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.08);
      } else if (type === 'typewriter') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(300, t + 0.1);

        gainNode.gain.setValueAtTime(0.18 * vol, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(900, t);

        osc.connect(hp);
        hp.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.1);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- F1 Engine Loop Synth ---
  public startEngine() {
    this.engineShouldBeRunning = true;
    if (this.settings.muted || !this.settings.engineEnabled) return;
    if (this.engineRunning) return;

    try {
      const ctx = this.initCtx();
      this.osc1 = ctx.createOscillator();
      this.osc2 = ctx.createOscillator();
      this.filter = ctx.createBiquadFilter();
      this.engineGain = ctx.createGain();

      this.osc1.type = 'sawtooth';
      this.osc2.type = 'triangle';

      const t = ctx.currentTime;
      this.osc1.frequency.setValueAtTime(50, t);
      this.osc2.frequency.setValueAtTime(25, t);

      this.filter.type = 'lowpass';
      this.filter.frequency.setValueAtTime(260, t);

      // Scale volume by master
      this.updateEngineVolume();

      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);
      this.filter.connect(this.engineGain);
      this.engineGain.connect(ctx.destination);

      this.osc1.start();
      this.osc2.start();
      this.engineRunning = true;
    } catch (e) {
      console.error('Failed to start engine', e);
    }
  }

  private updateEngineVolume() {
    if (!this.engineGain || !this.ctx) return;
    const vol = this.settings.muted ? 0 : this.settings.volume * 0.08; // scale engine down so it's not deafening
    this.engineGain.gain.setValueAtTime(vol, this.ctx.currentTime);
  }

  public setEngineWPM(wpm: number) {
    if (this.settings.muted) return;
    if (!this.engineRunning || !this.ctx || !this.osc1 || !this.osc2 || !this.filter) return;

    try {
      const wpmFactor = Math.min(1.0, wpm / 150);
      const targetFreq1 = 50 + wpmFactor * 260; // 50Hz to 310Hz
      const targetFreq2 = 25 + wpmFactor * 130;
      const filterFreq = 260 + wpmFactor * 850; // filter opens up for screaming high rpm sound

      const t = this.ctx.currentTime;
      this.osc1.frequency.setTargetAtTime(targetFreq1, t, 0.15);
      this.osc2.frequency.setTargetAtTime(targetFreq2, t, 0.15);
      this.filter.frequency.setTargetAtTime(filterFreq, t, 0.15);
    } catch (e) {
      console.error(e);
    }
  }

  private stopAudioNodes() {
    if (!this.engineRunning) return;

    try {
      this.osc1?.stop();
      this.osc2?.stop();
    } catch (e) {}

    this.osc1 = null;
    this.osc2 = null;
    this.filter = null;
    this.engineGain = null;
    this.engineRunning = false;
  }

  public stopEngine() {
    this.engineShouldBeRunning = false;
    this.stopAudioNodes();
  }

  // --- Tire Screech (Typo) ---
  public playTireScreech() {
    if (this.settings.muted) return;
    try {
      const ctx = this.initCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const t = ctx.currentTime;
      const vol = this.settings.volume;

      osc1.type = 'sawtooth';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(800, t);
      osc1.frequency.linearRampToValueAtTime(950, t + 0.12);
      osc1.frequency.linearRampToValueAtTime(700, t + 0.25);

      osc2.frequency.setValueAtTime(810, t);
      osc2.frequency.linearRampToValueAtTime(960, t + 0.12);
      osc2.frequency.linearRampToValueAtTime(710, t + 0.25);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(900, t);
      filter.Q.setValueAtTime(4, t);

      gainNode.gain.setValueAtTime(0.12 * vol, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(t + 0.25);
      osc2.stop(t + 0.25);
    } catch (e) {
      console.error(e);
    }
  }

  // --- Countdown Beep ---
  public playCountdownBeep(isGreen: boolean) {
    if (this.settings.muted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime;
      const vol = this.settings.volume;

      if (isGreen) {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, t);
        
        gainNode.gain.setValueAtTime(0.18 * vol, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.5);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        
        gainNode.gain.setValueAtTime(0.15 * vol, t);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(t + 0.12);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Victory Siren ---
  public playFinishSiren() {
    if (this.settings.muted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const t = ctx.currentTime;
      const vol = this.settings.volume;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, t);

      // Modulate frequency to create wailing siren
      const steps = 15;
      for (let i = 0; i < steps; i++) {
        const timeOffset = i * 0.1;
        const high = i % 2 === 0;
        osc.frequency.linearRampToValueAtTime(high ? 750 : 450, t + timeOffset);
      }

      gainNode.gain.setValueAtTime(0.15 * vol, t);
      gainNode.gain.exponentialRampToValueAtTime(0.001, t + steps * 0.1);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(t + steps * 0.1);
    } catch (e) {
      console.error(e);
    }
  }
}

export const audioManager = new AudioManager();
