import { describe, expect, it } from 'vitest';
import { PHYSICS } from '../src/config';
import { World } from '../src/game/world';
import { waypointBot } from './bots';
import { blankMap, fill, makeLevel, put, run, seconds, T } from './helpers';

describe('bloques de piedra', () => {
  it('se empujan a unos 110 px/s', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 5, 16, 'B');
    const world = new World(makeLevel(map));
    const block = world.blocks[0];
    run(world, seconds(1), () => ({ mos: { right: true } }));
    const before = block.x;
    run(world, seconds(1), () => ({ mos: { right: true } }));
    expect(block.x - before).toBeCloseTo(PHYSICS.blockPushSpeed, -1);
    expect(world.players.mos.x + world.players.mos.w).toBeCloseTo(block.x, 6);
  });

  it('no se empujan contra una pared', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 5, 16, 'B');
    put(map, 8, 16, '#');
    const world = new World(makeLevel(map));
    run(world, seconds(3), () => ({ mos: { right: true } }));
    expect(world.blocks[0].x).toBe(7 * T);
  });

  it('el otro personaje los frena: no se empujan a través de nadie', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 5, 16, 'B');
    put(map, 9, 16, 'L');
    const world = new World(makeLevel(map));
    const lu = world.players.lu;
    run(world, seconds(3), () => ({ mos: { right: true } }));
    expect(world.blocks[0].x + T).toBeCloseTo(lu.x, 6);
  });

  it('caen con gravedad al empujarlos fuera de un borde', () => {
    const map = blankMap();
    fill(map, 1, 13, 8, 16, '#');
    put(map, 2, 12, 'M');
    put(map, 5, 12, 'B');
    const world = new World(makeLevel(map));
    const block = world.blocks[0];
    // Mos empuja mientras el bloque siga sobre la repisa.
    run(world, seconds(4), (_, w) => ({ mos: { right: w.blocks[0].y === 12 * T } }));
    expect(block.y).toBe(16 * T);
    // Se encaja en el borde para caer; Mos, frenando, aún puede darle un empujoncito en el aire.
    expect(block.x).toBeGreaterThanOrEqual(9 * T);
    expect(block.x).toBeLessThan(9 * T + 4);
  });

  it('caen en un charco, quedan medio hundidos y hacen de puente', () => {
    const map = blankMap();
    put(map, 3, 16, 'L');
    put(map, 5, 16, 'B');
    put(map, 7, 17, 'o');
    const world = new World(makeLevel(map));
    const block = world.blocks[0];
    run(world, seconds(4), () => ({ lu: { right: true } }));
    expect(block.x).toBe(7 * T);
    expect(block.y).toBe(17 * T + T / 2 - T);
    expect(world.deaths.lu).toBe(0);
    expect(world.players.lu.x).toBeGreaterThan(9 * T);
  });

  it('sirven de escalón para subir 3 baldosas', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 5, 16, 'B');
    fill(map, 8, 14, 30, 16, '#');
    const world = new World(makeLevel(map));
    const mos = waypointBot('mos', [{ x: 25 * T }]);
    run(world, seconds(5), (_, w) => ({ mos: mos(w) }));
    const p = world.players.mos;
    expect(p.y + p.h).toBe(14 * T);
    expect(p.x).toBeGreaterThan(9 * T);
  });

  it('si caen sobre un personaje se apoyan en él sin aplastarlo, y caen al apartarse', () => {
    const map = blankMap();
    put(map, 5, 16, 'M');
    put(map, 5, 10, 'B');
    const world = new World(makeLevel(map));
    const block = world.blocks[0];
    const mos = world.players.mos;
    run(world, seconds(1));
    expect(world.state).toBe('playing');
    expect(block.y + block.h).toBe(mos.y);
    expect(mos.y + mos.h).toBe(17 * T);
    run(world, seconds(1), () => ({ mos: { right: true } }));
    run(world, seconds(1));
    expect(block.y).toBe(16 * T);
  });

  it('llevan encima a quien esté sobre ellos al empujarlos', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 5, 16, 'B');
    put(map, 5, 15, 'L');
    const world = new World(makeLevel(map));
    const block = world.blocks[0];
    const lu = world.players.lu;
    run(world, seconds(0.3));
    const blockStart = block.x;
    const luStart = lu.x;
    run(world, seconds(1.5), () => ({ mos: { right: true } }));
    expect(block.x - blockStart).toBeGreaterThan(T);
    expect(lu.x - luStart).toBeCloseTo(block.x - blockStart, 6);
    expect(lu.y + lu.h).toBe(block.y);
  });
});

describe('muros de oro y plata', () => {
  function wallLevel(wall: 'O' | 'P', who: 'M' | 'L') {
    const map = blankMap();
    put(map, 2, 16, who);
    fill(map, 6, 14, 6, 16, wall);
    fill(map, 1, 13, 30, 13, '#');
    return new World(makeLevel(map));
  }

  it('el oro deja pasar a Mos y frena a Lu', () => {
    const mos = wallLevel('O', 'M');
    run(mos, seconds(2), () => ({ mos: { right: true } }));
    expect(mos.players.mos.x).toBeGreaterThan(7 * T);
    const lu = wallLevel('O', 'L');
    run(lu, seconds(2), () => ({ lu: { right: true } }));
    expect(lu.players.lu.x + lu.players.lu.w).toBe(6 * T);
  });

  it('la plata deja pasar a Lu y frena a Mos', () => {
    const lu = wallLevel('P', 'L');
    run(lu, seconds(2), () => ({ lu: { right: true } }));
    expect(lu.players.lu.x).toBeGreaterThan(7 * T);
    const mos = wallLevel('P', 'M');
    run(mos, seconds(2), () => ({ mos: { right: true } }));
    expect(mos.players.mos.x + mos.players.mos.w).toBe(6 * T);
  });

  it('ningún bloque los atraviesa', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 4, 16, 'B');
    fill(map, 6, 14, 6, 16, 'O');
    const world = new World(makeLevel(map));
    run(world, seconds(3), () => ({ mos: { right: true } }));
    expect(world.blocks[0].x).toBe(5 * T);
  });
});
