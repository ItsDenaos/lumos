// Música generativa chiptune: melodías en escala pentatónica sobre un bajo y arpegios, una por zona.
// Esta parte es pura (sin Web Audio) para poder probarla.

import { seededRandom } from '../render/random';

export type MusicMood = 'title' | 'forest' | 'sanctuary' | 'observatory' | 'dawn';

const MINOR_PENTATONIC = [0, 3, 5, 7, 10];
const MAJOR_PENTATONIC = [0, 2, 4, 7, 9];

export interface MoodSpec {
  /** Nota MIDI de la tónica de la melodía. */
  root: number;
  scale: readonly number[];
  /** Pulsos por minuto. */
  tempo: number;
  /** Probabilidad de que suene una nota en cada pulso (el resto, silencios). */
  density: number;
  /** Acordes del acompañamiento (semitonos sobre la tónica, una octava más grave), alternados. */
  chords: readonly (readonly number[])[];
  /** Arpegio de corcheas sobre el acorde (si no, solo el bajo). */
  arpeggio: boolean;
}

export const MOODS: Record<MusicMood, MoodSpec> = {
  // Título: la menor, pausado.
  title: { root: 69, scale: MINOR_PENTATONIC, tempo: 72, density: 0.55, chords: [[0, 7, 12], [-2, 5, 10]], arpeggio: true },
  // Bosque del Alba: amanecer, re mayor pentatónico, más vivo.
  forest: { root: 74, scale: MAJOR_PENTATONIC, tempo: 92, density: 0.7, chords: [[0, 7, 12], [5, 9, 12]], arpeggio: true },
  // Santuario de los Astros: mi menor, solemne.
  sanctuary: { root: 76, scale: MINOR_PENTATONIC, tempo: 76, density: 0.55, chords: [[0, 7, 12], [-4, 3, 8]], arpeggio: false },
  // Observatorio: re menor, grave y escaso bajo el eclipse.
  observatory: { root: 62, scale: MINOR_PENTATONIC, tempo: 64, density: 0.35, chords: [[0, 7, 10], [-2, 5, 10]], arpeggio: false },
  // El final: sol mayor, luminoso.
  dawn: { root: 79, scale: MAJOR_PENTATONIC, tempo: 84, density: 0.75, chords: [[0, 4, 7], [5, 9, 12]], arpeggio: true },
};

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface MelodyNote {
  /** null = silencio. */
  midi: number | null;
  /** Duración en pulsos. */
  beats: number;
}

/** Melodía que pasea por la escala casi siempre a pasos cortos, para cantarla de memoria. */
export class Melody {
  private degree = 0;
  private readonly random: () => number;

  constructor(
    private readonly spec: MoodSpec,
    seed = 1,
  ) {
    this.random = seededRandom(seed);
  }

  next(): MelodyNote {
    const r = this.random;
    const beats = [0.5, 1, 1, 1, 1.5, 2][Math.floor(r() * 6)];
    if (r() > this.spec.density) return { midi: null, beats };
    const steps = [-2, -1, -1, 0, 1, 1, 2];
    const span = this.spec.scale.length * 2;
    this.degree = Math.max(0, Math.min(span - 1, this.degree + steps[Math.floor(r() * steps.length)]));
    const octave = Math.floor(this.degree / this.spec.scale.length);
    const midi = this.spec.root + octave * 12 + this.spec.scale[this.degree % this.spec.scale.length];
    return { midi, beats };
  }
}
