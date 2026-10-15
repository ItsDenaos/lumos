// Los 9 niveles de la campaña: estructura, alcance y lo que dice la tabla del plan.

import { describe, expect, it } from 'vitest';
import { parseLevel } from '../src/game/level';
import { LEVELS } from '../src/levels';
import { checkReachability, describeIssue } from '../src/levels/reachability';
import { validateLevel } from '../src/levels/validate';

/** Tabla de niveles del plan: zona, gemas de cada uno y tiempo objetivo. */
const PLAN = [
  { name: 'El despertar', zone: 'forest', gems: 3, par: 40 },
  { name: 'Oro y plata', zone: 'forest', gems: 4, par: 50 },
  { name: 'La piedra que sube', zone: 'forest', gems: 4, par: 60 },
  { name: 'Palancas del recinto', zone: 'sanctuary', gems: 5, par: 75 },
  { name: 'La ofrenda', zone: 'sanctuary', gems: 5, par: 80 },
  { name: 'Muros de oro y plata', zone: 'sanctuary', gems: 5, par: 90 },
  { name: 'Penumbra', zone: 'observatory', gems: 5, par: 90 },
  { name: 'La escalera del cielo', zone: 'observatory', gems: 6, par: 120 },
  { name: 'El reloj del cielo', zone: 'observatory', gems: 6, par: 150 },
] as const;

describe('campaña', () => {
  it('tiene los 9 niveles del plan, en orden', () => {
    expect(LEVELS.map((l) => [l.id, l.name, l.zone, l.parTime])).toEqual(PLAN.map((p, i) => [i + 1, p.name, p.zone, p.par]));
  });

  LEVELS.forEach((level, i) => {
    describe(`nivel ${level.id} "${level.name}"`, () => {
      it('tiene una estructura correcta', () => {
        expect(validateLevel(level)).toEqual([]);
      });

      it('no tiene avisos de alcance: cada uno llega a su puerta y a todas sus gemas', () => {
        expect(checkReachability(level).map(describeIssue)).toEqual([]);
      });

      it('tiene las gemas de la tabla del plan', () => {
        const parsed = parseLevel(level);
        const count = (owner: 'mos' | 'lu') => parsed.gems.filter((g) => g.owner === owner).length;
        expect([count('mos'), count('lu')]).toEqual([PLAN[i].gems, PLAN[i].gems]);
      });

      it('los de la zona 3 son oscuros', () => {
        expect(level.dark ?? false).toBe(level.zone === 'observatory');
      });
    });
  });
});
