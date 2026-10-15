// Sonido chiptune sintetizado con Web Audio API, sin archivos: ondas cuadradas y triangulares
// y ruido, como en las consolas de 8 bits.
// El audio se activa con la primera tecla o clic, por la política de reproducción automática.

import { Melody, MOODS, midiToFrequency, type MusicMood } from './music';
import type { Settings } from './settings';

export type Sfx =
  | 'jumpMos'
  | 'jumpLu'
  | 'gemMos'
  | 'gemLu'
  | 'click'
  | 'thud'
  | 'deathMos'
  | 'deathLu'
  | 'victory'
  | 'menuMove'
  | 'menuSelect';

/** Volumen relativo de la música respecto a los efectos. */
const MUSIC_LEVEL = 0.45;
/** Cuánto se adelanta la programación de notas (segundos). */
const LOOKAHEAD = 0.3;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private hum!: GainNode;
  private wantedMood: MusicMood | null = null;
  private mood: MusicMood | null = null;
  private melody: Melody | null = null;
  private echo!: DelayNode;
  private nextNote = 0;
  private nextBeat = 0;
  private beatIndex = 0;

  constructor(private readonly settings: Settings) {}

  /** Crea o reanuda el audio. Llamar dentro de un gesto del usuario (tecla o clic). */
  unlock(): void {
    if (typeof AudioContext === 'undefined') return;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
      this.buildGraph(this.ctx);
      this.applySettings();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => undefined);
    if (this.wantedMood !== this.mood) this.setMusic(this.wantedMood);
  }

  private get running(): AudioContext | null {
    return this.ctx && this.ctx.state === 'running' ? this.ctx : null;
  }

  private buildGraph(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);

    // Eco corto para la melodía, como en muchas bandas sonoras de 8 bits.
    this.echo = ctx.createDelay(1);
    this.echo.delayTime.value = 0.21;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.echo.connect(feedback).connect(this.echo);
    this.echo.connect(wet).connect(this.musicBus);

    // Ruido blanco reutilizable (siseos, chasquidos, explosiones).
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // Zumbido grave de las plataformas: siempre encendido, en silencio hasta que algo se mueve.
    this.hum = ctx.createGain();
    this.hum.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    for (const frequency of [55, 82.5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = frequency;
      osc.connect(filter);
      osc.start();
    }
    filter.connect(this.hum);
    this.hum.connect(this.sfxBus);
  }

  /** Aplica volúmenes y silencio de las opciones. */
  applySettings(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const s = this.settings;
    this.master.gain.setTargetAtTime(s.muted ? 0 : s.masterVolume, t, 0.03);
    this.musicBus.gain.setTargetAtTime(s.musicVolume * MUSIC_LEVEL, t, 0.03);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.03);
  }

  /** Zumbido de plataformas en marcha. */
  setHum(on: boolean): void {
    if (!this.ctx) return;
    this.hum.gain.setTargetAtTime(on ? 0.07 : 0, this.ctx.currentTime, 0.08);
  }

  // ── Efectos ──────────────────────────────────────────────────────────────

  play(sfx: Sfx): void {
    const ctx = this.running;
    if (!ctx) return;
    const t = ctx.currentTime + 0.005;
    switch (sfx) {
      case 'jumpMos': // salto de 8 bits, grave
        this.tone(t, 150, 330, 0.13, 'square', 0.07);
        break;
      case 'jumpLu': // más agudo y ligero
        this.tone(t, 440, 990, 0.11, 'square', 0.05);
        this.tone(t, 880, 1980, 0.08, 'triangle', 0.05);
        break;
      case 'gemMos': // moneda: arpegio rápido grave
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.045, f, f, 0.09, 'square', 0.05));
        break;
      case 'gemLu': // arpegio agudo y cristalino
        [1047, 1319, 1568, 2093].forEach((f, i) => {
          this.tone(t + i * 0.045, f, f, 0.12, 'triangle', 0.1);
          this.tone(t + i * 0.045, f, f, 0.05, 'square', 0.02);
        });
        break;
      case 'click': // palanca o botón: chasquido y bip
        this.noiseBurst(t, 0.03, 'highpass', 3000, 3000, 1, 0.25);
        this.tone(t, 330, 165, 0.06, 'square', 0.05);
        break;
      case 'thud':
        this.noiseBurst(t, 0.14, 'lowpass', 600, 150, 1, 0.45);
        this.tone(t, 110, 40, 0.16, 'triangle', 0.3);
        break;
      case 'deathMos': // se apaga: tono que cae, con ruido
        this.tone(t, 523, 65, 0.6, 'square', 0.06);
        this.noiseBurst(t, 0.6, 'lowpass', 3000, 200, 1, 0.22);
        break;
      case 'deathLu': // se evapora: tono que sube y siseo
        this.tone(t, 392, 2349, 0.5, 'triangle', 0.14);
        this.noiseBurst(t, 0.5, 'bandpass', 1500, 7000, 3, 0.2);
        break;
      case 'victory': // fanfarria
        [523, 659, 784, 1047].forEach((f, i) => this.tone(t + i * 0.09, f, f, 0.16, 'square', 0.05));
        for (const f of [523, 659, 784]) this.tone(t + 0.36, f, f, 0.9, 'square', 0.035, 0.01);
        this.tone(t + 0.36, 131, 131, 0.9, 'triangle', 0.2, 0.01);
        this.tone(t + 0.36, 2093, 2093, 0.5, 'triangle', 0.05);
        break;
      case 'menuMove':
        this.tone(t, 880, 880, 0.04, 'square', 0.035);
        break;
      case 'menuSelect':
        this.tone(t, 660, 660, 0.05, 'square', 0.04);
        this.tone(t + 0.05, 1320, 1320, 0.08, 'square', 0.04);
        break;
    }
  }

  /** Nota con barrido de frecuencia y envolvente corta. */
  private tone(
    start: number,
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    attack = 0.008,
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(gain, start + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env).connect(this.sfxBus);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Ráfaga de ruido filtrado con barrido del filtro. */
  private noiseBurst(
    start: number,
    duration: number,
    type: BiquadFilterType,
    from: number,
    to: number,
    q: number,
    gain: number,
  ): void {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, start);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, start + duration);
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(env).connect(this.sfxBus);
    source.start(start, Math.random() * 0.5);
    source.stop(start + duration + 0.02);
  }

  // ── Música ───────────────────────────────────────────────────────────────

  /** Cambia el ambiente musical (o lo apaga con null). */
  setMusic(mood: MusicMood | null): void {
    this.wantedMood = mood;
    const ctx = this.ctx;
    if (!ctx || mood === this.mood) return;
    this.mood = mood;
    this.melody = mood ? new Melody(MOODS[mood], mood.length * 31 + 7) : null;
    this.nextNote = ctx.currentTime + 0.6;
    this.nextBeat = ctx.currentTime + 0.1;
    this.beatIndex = 0;
  }

  /** Programa las notas que tocan pronto. Se llama en cada paso de lógica. */
  update(): void {
    const ctx = this.running;
    if (!ctx || !this.mood || !this.melody) return;
    const spec = MOODS[this.mood];
    const beat = 60 / spec.tempo;
    const horizon = ctx.currentTime + LOOKAHEAD;
    // Si el audio estuvo parado (pestaña oculta), no se intenta recuperar el tiempo perdido.
    if (this.nextNote < ctx.currentTime - 1) this.nextNote = ctx.currentTime + 0.1;
    if (this.nextBeat < ctx.currentTime - 1) this.nextBeat = ctx.currentTime + 0.1;

    // Acompañamiento: bajo triangular cada dos pulsos y, en algunas zonas, un arpegio suave.
    while (this.nextBeat < horizon) {
      const chord = spec.chords[Math.floor(this.beatIndex / 16) % spec.chords.length];
      const base = spec.root - 12;
      if (this.beatIndex % 2 === 0) this.bass(this.nextBeat, midiToFrequency(base - 12 + chord[0]), beat * 1.7);
      if (spec.arpeggio) {
        for (let half = 0; half < 2; half++) {
          const offset = chord[(this.beatIndex * 2 + half) % chord.length];
          this.arp(this.nextBeat + (half * beat) / 2, midiToFrequency(base + offset), beat * 0.4);
        }
      }
      this.beatIndex++;
      this.nextBeat += beat;
    }
    while (this.nextNote < horizon) {
      const note = this.melody.next();
      if (note.midi !== null) this.lead(this.nextNote, midiToFrequency(note.midi), note.beats * beat);
      this.nextNote += note.beats * beat;
    }
  }

  /** Voz principal: onda cuadrada suavizada, con vibrato que entra tarde y eco. */
  private lead(start: number, frequency: number, duration: number): void {
    const ctx = this.ctx!;
    const length = Math.max(0.15, duration * 0.9);
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = frequency;
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 6;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, start);
    depth.gain.linearRampToValueAtTime(frequency * 0.008, start + Math.min(0.4, length));
    vibrato.connect(depth).connect(osc.frequency);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.07, start + 0.01);
    env.gain.linearRampToValueAtTime(0.045, start + 0.12);
    env.gain.setValueAtTime(0.045, start + length - 0.05);
    env.gain.linearRampToValueAtTime(0, start + length);
    osc.connect(filter).connect(env);
    env.connect(this.musicBus);
    env.connect(this.echo);
    for (const node of [osc, vibrato]) {
      node.start(start);
      node.stop(start + length + 0.05);
    }
  }

  /** Bajo: onda triangular, golpe corto. */
  private bass(start: number, frequency: number, duration: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.16, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(env).connect(this.musicBus);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  /** Arpegio: notas cortas y bajitas de onda cuadrada filtrada. */
  private arp(start: number, frequency: number, duration: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = frequency;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(0.022, start + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter).connect(env).connect(this.musicBus);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
