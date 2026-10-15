import { describe, expect, it } from 'vitest';
import { Melody, midiToFrequency, MOODS, type MusicMood } from '../src/core/music';

describe('música generativa', () => {
  it('convierte notas MIDI a frecuencia (la 440)', () => {
    expect(midiToFrequency(69)).toBe(440);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
  });

  for (const mood of Object.keys(MOODS) as MusicMood[]) {
    it(`"${mood}" solo usa notas de su escala pentatónica, a pasos cortos y con silencios`, () => {
      const spec = MOODS[mood];
      expect(spec.scale).toHaveLength(5);
      const melody = new Melody(spec, 3);
      const notes = Array.from({ length: 300 }, () => melody.next());
      const sounding = notes.filter((n) => n.midi !== null).map((n) => n.midi!);
      for (const midi of sounding) {
        expect(spec.scale).toContain((((midi - spec.root) % 12) + 12) % 12);
        expect(midi).toBeGreaterThanOrEqual(spec.root);
        expect(midi).toBeLessThan(spec.root + 24);
      }
      // La melodía casi siempre se mueve poco: ningún salto mayor de dos grados (una séptima).
      for (let i = 1; i < sounding.length; i++) expect(Math.abs(sounding[i] - sounding[i - 1])).toBeLessThanOrEqual(10);
      const rests = notes.length - sounding.length;
      expect(rests).toBeGreaterThan(0);
      expect(sounding.length).toBeGreaterThan(0);
    });
  }

  it('es la misma melodía con la misma semilla', () => {
    const a = new Melody(MOODS.forest, 9);
    const b = new Melody(MOODS.forest, 9);
    expect(Array.from({ length: 50 }, () => a.next())).toEqual(Array.from({ length: 50 }, () => b.next()));
  });
});
