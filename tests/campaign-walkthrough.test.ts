// Cada nivel de la campaña se completa con la física real, con todas las gemas,
// sin morir y por debajo del tiempo objetivo (3 estrellas).

import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { ROUTES } from './routes';
import { walk } from './walkthroughs';

describe('recorridos de la campaña', () => {
  for (const level of LEVELS) {
    const routes = ROUTES[level.id];
    if (!routes) continue;
    it(`nivel ${level.id} "${level.name}": 3 estrellas, sin morir`, () => {
      const { world, log } = walk(level, routes);
      expect({ state: world.state, deaths: world.deaths, stars: world.stars, log }).toMatchObject({
        state: 'won',
        deaths: { mos: 0, lu: 0 },
        stars: 3,
      });
    });
  }
});
