// El nivel "sandbox" usa todos los mecanismos y se completa sin fallos.

import { describe, expect, it } from 'vitest';
import { CHANNELS } from '../src/game/channels';
import { World } from '../src/game/world';
import { sandbox } from '../src/levels/sandbox';
import { validateLevel } from '../src/levels/validate';
import { waypointBot } from './bots';
import { run, seconds, T } from './helpers';

const doorCenter = (col: number) => col * T + T / 2;

describe('sandbox', () => {
  it('tiene una estructura correcta', () => {
    expect(validateLevel(sandbox)).toEqual([]);
  });

  it('contiene todos los mecanismos, canales, charcos y muros', () => {
    const types = new Set(sandbox.entities.map((e) => e.type));
    expect([...types].sort()).toEqual(['button', 'hint', 'lever', 'mover']);
    const channels = new Set(sandbox.entities.flatMap((e) => ('channel' in e ? [e.channel] : [])));
    expect([...channels].sort()).toEqual([...CHANNELS].sort());
    const chars = sandbox.map.join('');
    for (const ch of ['B', 'O', 'P', 'o', 'p', 'x', '*', 'c']) expect(chars).toContain(ch);
  });

  it('se completa en cooperación usando cada mecanismo', () => {
    const world = new World(sandbox);
    const [elevator, ferry, cyanGate, whiteGate] = world.movers;
    const mos = world.players.mos;
    const mosOnElevator = () => mos.grounded && Math.abs(mos.y + mos.h - elevator.y) < 0.5;
    const mosUpstairs = () => mos.centerX > 9 * T + 20 && mos.y + mos.h === 10 * T;

    const mosBot = waypointBot('mos', [
      // Se sube al ascensor y espera a que Lu lo suba.
      { x: 320, until: () => elevator.y === elevator.to.y },
      // Acciona la palanca rosa, salta a la plataforma y cruza la sombra en ella.
      { x: 500, action: true },
      { x: 500, jump: true },
      { x: 580, until: () => ferry.x === ferry.to.x },
      // Atraviesa el muro de oro hasta su puerta.
      { x: doorCenter(29) },
    ]);
    const luBot = waypointBot('lu', [
      // Espera a que Mos esté en el ascensor y pisa el botón verde hasta que llegue arriba.
      { x: 180, until: mosOnElevator },
      { x: 220, until: mosUpstairs },
      // Empuja un bloque al charco de oro (puente) y el otro al botón cian.
      { x: 628 },
      // Salta el bloque y la sombra, y pasa por las compuertas abiertas.
      { x: 628, jump: true },
      { x: 740, jump: true },
      { x: doorCenter(29) },
    ]);

    let cyanOpened = false;
    let elevatorUsed = false;
    run(world, seconds(60), (_, w) => {
      if (w.channels.cyan && cyanGate.y === cyanGate.to.y) cyanOpened = true;
      if (elevator.y === elevator.to.y) elevatorUsed = true;
      return w.state === 'playing' ? { mos: mosBot(w), lu: luBot(w) } : {};
    });

    expect(world.deaths).toEqual({ mos: 0, lu: 0 });
    expect(elevatorUsed).toBe(true);
    expect(world.levers.find((l) => l.channel === 'pink')?.on).toBe(true);
    expect(ferry.x).toBe(ferry.to.x);
    // Un bloque quedó hundido en el charco de oro y el otro sobre el botón cian.
    expect(world.blocks[0]).toMatchObject({ x: 12 * T, y: 17 * T + T / 2 - T });
    expect(world.buttons.find((b) => b.channel === 'cyan')?.pressed).toBe(true);
    expect(cyanOpened).toBe(true);
    expect(whiteGate.y).toBe(whiteGate.to.y);
    expect(world.gemCount('mos')).toEqual({ collected: 2, total: 2 });
    expect(world.gemCount('lu')).toEqual({ collected: 2, total: 2 });
    expect(world.state).toBe('won');
  });
});
