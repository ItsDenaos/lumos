// Recorridos de los niveles de la campaña con bots: rutas y utilidades compartidas.

import { WORLD } from '../src/config';
import type { Mover } from '../src/game/entities/mover';
import type { Player } from '../src/game/player';
import type { PlayerId } from '../src/game/types';
import { World } from '../src/game/world';
import type { Channel, LevelData } from '../src/levels/types';
import { waypointBot, type Waypoint } from './bots';
import { DT } from './helpers';

const T = WORLD.tile;

/** Centro de una columna, en píxeles. */
export const col = (c: number) => c * T + T / 2;

/** Pies del personaje justo encima de la fila (de pie en la fila row - 1). */
export const standsOn = (p: Player, floorRow: number) => p.grounded && Math.abs(p.y + p.h - floorRow * T) < 0.5;

export function mover(world: World, channel: Channel, index = 0): Mover {
  return world.movers.filter((m) => m.channel === channel)[index];
}

export const atTop = (m: Mover) => m.x === m.to.x && m.y === m.to.y;
export const atStart = (m: Mover) => m.x === m.from.x && m.y === m.from.y;
/** Va de pie encima de la plataforma. */
export const rides = (p: Player, m: Mover) =>
  p.grounded && Math.abs(p.y + p.h - m.y) < 0.5 && p.x + p.w > m.x && p.x < m.x + m.w;

export type RouteBuilder = (world: World) => Record<PlayerId, Waypoint[]>;

export interface WalkResult {
  world: World;
  /** Qué pasó si algo salió mal (muertes, dónde se quedó cada uno). */
  log: string[];
}

/** Juega un nivel con los bots hasta ganar o agotar el tiempo. */
export function walk(level: LevelData, routes: RouteBuilder, maxSeconds = level.parTime): WalkResult {
  const world = new World(level);
  const plan = routes(world);
  const bots = { mos: waypointBot('mos', plan.mos), lu: waypointBot('lu', plan.lu) };
  const log: string[] = [];
  const reached = { mos: 0, lu: 0 };
  const steps = Math.round(maxSeconds / DT);
  for (let i = 0; i < steps && world.state !== 'won'; i++) {
    const controls = world.state === 'playing' ? { mos: bots.mos(world), lu: bots.lu(world) } : {};
    world.step(
      {
        mos: { left: false, right: false, jumpHeld: false, jumpPressed: false, actionPressed: false, ...controls.mos },
        lu: { left: false, right: false, jumpHeld: false, jumpPressed: false, actionPressed: false, ...controls.lu },
      },
      DT,
    );
    for (const e of world.drainEvents()) {
      if (e.type === 'death') log.push(`t=${world.time.toFixed(2)} muere ${e.player} en (${e.x.toFixed(0)}, ${e.y.toFixed(0)})`);
    }
    for (const id of ['mos', 'lu'] as const) {
      const { index } = bots[id].progress();
      if (index !== reached[id]) {
        reached[id] = index;
        const p = world.players[id];
        log.push(`t=${world.time.toFixed(2)} ${id} -> punto ${index} (x=${p.centerX.toFixed(0)}, pies=${(p.y + p.h).toFixed(0)})`);
      }
    }
  }
  for (const id of ['mos', 'lu'] as const) {
    const p = world.players[id];
    log.push(`${id}: x=${p.centerX.toFixed(0)} pies=${(p.y + p.h).toFixed(0)} gemas=${JSON.stringify(world.gemCount(id))}`);
  }
  log.push(`bloques: ${world.blocks.map((b) => `(${b.x.toFixed(0)}, ${b.y.toFixed(0)})`).join(' ')}`);
  log.push(`estado=${world.state} tiempo=${world.time.toFixed(2)}`);
  return { world, log };
}
