import { describe, expect, it } from 'vitest';
import { computeChannels } from '../src/game/channels';
import { Button } from '../src/game/entities/button';
import { Lever } from '../src/game/entities/lever';
import { World } from '../src/game/world';
import type { Entity } from '../src/levels/types';
import { blankMap, makeLevel, put, run, seconds } from './helpers';

/** Una plataforma cualquiera para que el canal tenga receptor. */
const receiver = (channel: 'green' | 'pink' | 'cyan' | 'white'): Entity => ({
  type: 'mover',
  at: [20, 5],
  size: [2, 1],
  to: [20, 3],
  channel,
});

describe('canales', () => {
  it('un canal está activo si cualquiera de sus botones está pisado o cualquiera de sus palancas encendida', () => {
    const b1 = new Button(1, 1, 'green');
    const b2 = new Button(2, 1, 'green');
    const lever = new Lever(3, 1, 'pink');
    expect(computeChannels([b1, b2], [lever])).toEqual({ green: false, pink: false, cyan: false, white: false });
    b2.pressed = true;
    lever.on = true;
    expect(computeChannels([b1, b2], [lever])).toEqual({ green: true, pink: true, cyan: false, white: false });
  });

  it('un botón se activa mientras un personaje está encima y se apaga al bajarse', () => {
    const map = blankMap();
    put(map, 6, 16, 'L');
    const world = new World(makeLevel(map, [{ type: 'button', at: [6, 16], channel: 'green' }, receiver('green')]));
    run(world, 1);
    expect(world.channels.green).toBe(true);
    const events = world.drainEvents();
    expect(events).toContainEqual({ type: 'button', channel: 'green', pressed: true });
    run(world, seconds(0.5), () => ({ lu: { left: true } }));
    expect(world.channels.green).toBe(false);
    expect(world.drainEvents()).toContainEqual({ type: 'button', channel: 'green', pressed: false });
  });

  it('un bloque encima mantiene pisado el botón', () => {
    const map = blankMap();
    put(map, 6, 16, 'B');
    const world = new World(makeLevel(map, [{ type: 'button', at: [6, 16], channel: 'cyan' }, receiver('cyan')]));
    run(world, seconds(1));
    expect(world.channels.cyan).toBe(true);
  });

  it('con dos botones del mismo canal basta con pisar uno', () => {
    const map = blankMap();
    put(map, 4, 16, 'M');
    const world = new World(
      makeLevel(map, [
        { type: 'button', at: [4, 16], channel: 'green' },
        { type: 'button', at: [12, 16], channel: 'green' },
        receiver('green'),
      ]),
    );
    run(world, 2);
    expect(world.buttons.map((b) => b.pressed)).toEqual([true, false]);
    expect(world.channels.green).toBe(true);
  });

  it('la palanca solo se acciona estando encima, y alterna su canal', () => {
    const map = blankMap();
    put(map, 8, 16, 'M');
    put(map, 12, 16, 'L');
    const world = new World(makeLevel(map, [{ type: 'lever', at: [8, 16], channel: 'pink' }, receiver('pink')]));
    // Lu está lejos: su S no hace nada.
    run(world, 1, () => ({ lu: { actionPressed: true } }));
    expect(world.channels.pink).toBe(false);
    // Mos está encima: ↓ la enciende y otra vez la apaga.
    run(world, 1, () => ({ mos: { actionPressed: true } }));
    expect(world.channels.pink).toBe(true);
    expect(world.drainEvents()).toContainEqual({ type: 'lever', channel: 'pink', on: true, player: 'mos' });
    run(world, 1, () => ({ mos: { actionPressed: true } }));
    expect(world.channels.pink).toBe(false);
  });

  it('una palanca con startOn empieza encendida y el reinicio la devuelve a ese estado', () => {
    const map = blankMap();
    put(map, 8, 16, 'L');
    const world = new World(
      makeLevel(map, [{ type: 'lever', at: [8, 16], channel: 'white', startOn: true }, receiver('white')]),
    );
    expect(world.channels.white).toBe(true);
    run(world, 1, () => ({ lu: { actionPressed: true } }));
    expect(world.channels.white).toBe(false);
    world.reset();
    expect(world.levers[0].on).toBe(true);
    expect(world.channels.white).toBe(true);
  });
});
