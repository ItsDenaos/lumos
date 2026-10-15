// Recorridos completos con la física real, jugados por bots deterministas.

import { describe, expect, it } from 'vitest';
import { World } from '../src/game/world';
import { level01 } from '../src/levels/01-el-despertar';
import { waypointBot } from './bots';
import { run, seconds, T } from './helpers';

const doorCenter = (col: number) => col * T + T / 2;

describe('nivel 1 "El despertar" de principio a fin', () => {
  it('ambos llegan a su puerta con todas sus gemas y bajo el tiempo objetivo', () => {
    const world = new World(level01);
    const mos = waypointBot('mos', [{ x: 205, jump: true }, { x: 378, jump: true }, { x: doorCenter(25) }]);
    const lu = waypointBot('lu', [{ x: 290, jump: true }, { x: 421, jump: true }, { x: doorCenter(28) }]);

    run(world, seconds(level01.parTime), (_, w) => (w.state === 'playing' ? { mos: mos(w), lu: lu(w) } : {}));

    expect(world.deaths).toEqual({ mos: 0, lu: 0 });
    expect(world.gemCount('mos')).toEqual({ collected: 3, total: 3 });
    expect(world.gemCount('lu')).toEqual({ collected: 3, total: 3 });
    expect(world.state).toBe('won');
    expect(world.time).toBeLessThan(level01.parTime);
    expect(world.stars).toBe(3);
  });
});
