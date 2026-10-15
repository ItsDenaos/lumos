import { describe, expect, it } from 'vitest';
import { MECHANISMS } from '../src/config';
import { World } from '../src/game/world';
import type { Entity } from '../src/levels/types';
import { blankMap, fill, makeLevel, put, run, seconds, T } from './helpers';

const SPEED = MECHANISMS.moverSpeed * T;
/** Palanca encendida desde el principio en un rincón: el canal está activo sin que nadie haga nada. */
const alwaysOn = (channel: 'green' | 'pink' | 'cyan' | 'white' = 'white'): Entity => ({
  type: 'lever',
  at: [29, 16],
  channel,
  startOn: true,
});

describe('plataformas móviles', () => {
  it('van a su destino a 2 baldosas por segundo y vuelven al apagarse el canal', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    const world = new World(
      makeLevel(map, [
        { type: 'lever', at: [3, 16], channel: 'pink', startOn: true },
        { type: 'mover', at: [10, 14], size: [2, 1], to: [10, 10], channel: 'pink' },
      ]),
    );
    const mover = world.movers[0];
    run(world, seconds(1));
    expect(mover.y).toBeCloseTo(14 * T - SPEED, 6);
    run(world, seconds(1.5));
    expect(mover.y).toBe(10 * T);
    expect(mover.moving).toBe(false);
    // Mos apaga la palanca: vuelve a su sitio.
    run(world, 1, () => ({ mos: { actionPressed: true } }));
    run(world, seconds(2.5));
    expect(mover.y).toBe(14 * T);
  });

  it('llevan encima a un personaje al subir', () => {
    const map = blankMap();
    put(map, 10, 13, 'L');
    const world = new World(
      makeLevel(map, [alwaysOn(), { type: 'mover', at: [10, 14], size: [2, 1], to: [10, 10], channel: 'white' }]),
    );
    const lu = world.players.lu;
    const startX = lu.x;
    run(world, seconds(3));
    expect(lu.y + lu.h).toBe(10 * T);
    expect(lu.x).toBe(startX);
    expect(lu.grounded).toBe(true);
  });

  it('llevan encima a un personaje en horizontal', () => {
    const map = blankMap();
    put(map, 6, 11, 'L');
    const world = new World(
      makeLevel(map, [alwaysOn(), { type: 'mover', at: [5, 12], size: [3, 1], to: [15, 12], channel: 'white' }]),
    );
    const lu = world.players.lu;
    const startX = lu.x;
    run(world, seconds(6));
    expect(lu.x - startX).toBeCloseTo(10 * T, 6);
    expect(lu.y + lu.h).toBe(12 * T);
  });

  it('nunca aplastan: una compuerta que baja se detiene sobre la cabeza y sigue cuando se apartan', () => {
    const map = blankMap();
    put(map, 10, 16, 'M');
    const world = new World(
      makeLevel(map, [alwaysOn(), { type: 'mover', at: [10, 8], size: [1, 3], to: [10, 14], channel: 'white' }]),
    );
    const mos = world.players.mos;
    const mover = world.movers[0];
    run(world, seconds(4));
    expect(world.state).toBe('playing');
    expect(mos.y + mos.h).toBe(17 * T);
    expect(mover.y + mover.h).toBeLessThanOrEqual(mos.y);
    expect(mover.y + mover.h).toBeGreaterThan(mos.y - 2);
    run(world, seconds(1), () => ({ mos: { left: true } }));
    run(world, seconds(2));
    expect(mover.y).toBe(14 * T);
  });

  it('nunca aplastan a un pasajero contra el techo', () => {
    const map = blankMap();
    put(map, 10, 13, 'L');
    fill(map, 9, 10, 12, 10, '#');
    const world = new World(
      makeLevel(map, [alwaysOn(), { type: 'mover', at: [10, 14], size: [2, 1], to: [10, 8], channel: 'white' }]),
    );
    const lu = world.players.lu;
    const mover = world.movers[0];
    run(world, seconds(4));
    expect(world.state).toBe('playing');
    expect(lu.y).toBeGreaterThanOrEqual(11 * T);
    expect(lu.y + lu.h).toBe(mover.y);
    expect(mover.y).toBeGreaterThan(8 * T);
  });

  it('al bajar no se llevan a quien está apoyado también en el suelo', () => {
    const map = blankMap();
    // Ascensor arriba, a ras del suelo de una repisa; Lu con medio cuerpo en cada lado.
    fill(map, 1, 11, 9, 11, '#');
    put(map, 9, 10, 'L');
    const world = new World(
      makeLevel(map, [
        { type: 'lever', at: [2, 10], channel: 'cyan', startOn: true },
        { type: 'mover', at: [10, 11], size: [2, 1], to: [10, 15], channel: 'cyan' },
      ]),
    );
    const lu = world.players.lu;
    lu.x = 10 * T - lu.w / 2;
    lu.prevX = lu.x;
    run(world, seconds(3));
    expect(lu.y + lu.h).toBe(11 * T);
    expect(world.movers[0].y).toBe(15 * T);
  });

  it('atraviesan la piedra: una compuerta se esconde en el techo', () => {
    const map = blankMap();
    fill(map, 1, 11, 30, 13, '#');
    const world = new World(
      makeLevel(map, [alwaysOn(), { type: 'mover', at: [10, 14], size: [1, 3], to: [10, 11], channel: 'white' }]),
    );
    run(world, seconds(2));
    expect(world.movers[0].y).toBe(11 * T);
  });

  it('son sólidas: nadie atraviesa una compuerta cerrada', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    const world = new World(
      makeLevel(map, [
        { type: 'lever', at: [28, 16], channel: 'pink' },
        { type: 'mover', at: [10, 14], size: [1, 3], to: [10, 11], channel: 'pink' },
      ]),
    );
    const mos = world.players.mos;
    run(world, seconds(2), () => ({ mos: { right: true } }));
    expect(mos.x + mos.w).toBe(10 * T);
  });
});
