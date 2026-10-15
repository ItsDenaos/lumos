// Comprobador de alcance aproximado (se ejecuta dentro de npm test).
//
// Búsqueda en anchura por baldosas con las reglas de salto del plan:
//   - subir 2 baldosas como mucho, con 4 de altura libre sobre el punto de salto;
//   - cruzar huecos de hasta 3 baldosas en plano, o de 2 subiendo;
//   - en pasillos bajos el salto es más corto.
// Cada plataforma se prueba en sus dos posiciones: el estado incluye qué canales están
// activos, y se puede cambiar en cualquier momento (se supone que el compañero o una
// palanca lo hacen). Quien va encima de una plataforma viaja con ella. Los bloques se
// suponen empujables a cualquier sitio donde puedan quedar parados (por su fila, cayendo
// por huecos y hundiéndose en charcos), donde sirven de suelo.
// Es optimista a propósito: avisa de lo que seguro no se alcanza.

import { WORLD } from '../config';
import { CHANNELS } from '../game/channels';
import { liquidOf, parseLevel, tileAt, type ParsedLevel, type Tile } from '../game/level';
import { isImmune } from '../game/rules';
import { PLAYER_IDS, type PlayerId } from '../game/types';
import type { Cell, Channel, Entity, LevelData } from './types';

export interface ReachIssue {
  player: PlayerId;
  what: 'door' | 'gem';
  cell: Cell;
}

type MoverData = Extract<Entity, { type: 'mover' }>;

interface Context {
  level: ParsedLevel;
  movers: MoverData[];
  /** Canales que mueven alguna plataforma, en orden: el bit i del estado es channels[i]. */
  channels: Channel[];
  /** Celdas donde un bloque puede quedar parado (y servir de suelo). */
  blockCells: Set<number>;
}

const key = (col: number, row: number) => row * WORLD.cols + col;

/** Posición (en celdas) de una plataforma según el estado de los canales. */
function moverAt(ctx: Context, m: MoverData, config: number): Cell {
  const bit = ctx.channels.indexOf(m.channel);
  return config & (1 << bit) ? m.to : m.at;
}

function moverCovers(ctx: Context, col: number, row: number, config: number): MoverData | null {
  for (const m of ctx.movers) {
    const [mc, mr] = moverAt(ctx, m, config);
    if (col >= mc && col < mc + m.size[0] && row >= mr && row < mr + m.size[1]) return m;
  }
  return null;
}

/** ¿Puede ocupar el cuerpo del personaje esta celda? */
function passable(ctx: Context, id: PlayerId, col: number, row: number, config: number): boolean {
  if (col < 0 || row < 0 || col >= WORLD.cols || row >= WORLD.rows) return false;
  if (!tilePassable(tileAt(ctx.level, col, row), id)) return false;
  return !moverCovers(ctx, col, row, config);
}

function tilePassable(tile: Tile, id: PlayerId | null): boolean {
  if (tile === 'air') return true;
  if (tile === 'goldWall') return id === 'mos';
  if (tile === 'silverWall') return id === 'lu';
  return false;
}

type Support = 'solid' | 'deadly' | 'none';

/** Qué hay bajo los pies si el personaje está en la fila de encima de (col, row). */
function supportAt(ctx: Context, id: PlayerId, col: number, row: number, config: number): Support {
  if (row >= WORLD.rows) return 'solid';
  if (ctx.blockCells.has(key(col, row))) return 'solid';
  if (moverCovers(ctx, col, row, config)) return 'solid';
  const tile = tileAt(ctx.level, col, row);
  const liquid = liquidOf(tile);
  if (liquid) return isImmune(id, liquid) ? 'solid' : 'deadly';
  return tilePassable(tile, id) ? 'none' : 'solid';
}

function standable(ctx: Context, id: PlayerId, col: number, row: number, config: number): boolean {
  return (
    passable(ctx, id, col, row, config) &&
    passable(ctx, id, col, row - 1, config) &&
    supportAt(ctx, id, col, row + 1, config) === 'solid'
  );
}

/** Altura libre (en celdas, como mucho 4) desde la fila del cuerpo hacia arriba. */
function headroom(ctx: Context, id: PlayerId, col: number, row: number, config: number): number {
  let free = 0;
  while (free < 4 && passable(ctx, id, col, row - free, config)) free++;
  return free;
}

/** Celdas donde un bloque puede acabar parado, empujándolo por su fila y dejándolo caer. */
function blockRestingCells(level: ParsedLevel): Set<number> {
  const cells = new Set<number>();
  const solidForBlock = (col: number, row: number) => {
    if (row >= WORLD.rows) return true;
    const tile = tileAt(level, col, row);
    return !tilePassable(tile, null) && liquidOf(tile) === null;
  };
  const free = (col: number, row: number) =>
    col >= 0 && col < WORLD.cols && row >= 0 && row < WORLD.rows && tilePassable(tileAt(level, col, row), null);
  const settle = (col: number, row: number): Cell | null => {
    let r = row;
    while (r + 1 < WORLD.rows && !solidForBlock(col, r + 1)) {
      // En un charco se hunde a medias y se queda.
      if (liquidOf(tileAt(level, col, r + 1))) return [col, r + 1];
      if (!free(col, r + 1)) return null;
      r++;
    }
    return [col, r];
  };
  const queue: Cell[] = level.blocks.map(([c, r]) => settle(c, r) ?? [c, r]);
  const seen = new Set<number>();
  while (queue.length > 0) {
    const [col, row] = queue.shift()!;
    if (seen.has(key(col, row))) continue;
    seen.add(key(col, row));
    cells.add(key(col, row));
    // Hundido en un charco ya no se mueve.
    if (liquidOf(tileAt(level, col, row))) continue;
    for (const step of [-1, 1]) {
      const next = col + step;
      if (!free(next, row)) continue;
      const rest = settle(next, row);
      if (rest) queue.push(rest);
    }
  }
  return cells;
}

/** Celdas que el cuerpo atraviesa en un salto (para las gemas) y si es posible. */
function jump(
  ctx: Context,
  id: PlayerId,
  col: number,
  row: number,
  config: number,
  dir: number,
  dx: number,
  dy: number,
): { touched: number[]; landCol: number; landRow: number } | null {
  const needHeight = dy >= 2 ? 4 : dy === 1 ? 3 : dx >= 4 ? 4 : dx === 3 ? 3 : 2;
  const touched: number[] = [];
  // Despegue y columnas intermedias: altura libre suficiente.
  for (let k = 0; k < dx; k++) {
    const c = col + dir * k;
    if (headroom(ctx, id, c, row, config) < needHeight) return null;
    for (let r = row; r > row - Math.min(needHeight, 3); r--) touched.push(key(c, r));
  }
  // Columna de llegada: libre desde lo alto del salto hasta donde se aterriza (y el cuerpo, de pie).
  const landCol = col + dir * dx;
  const landRow = row - dy;
  const top = Math.min(row - needHeight + 1, landRow - 1);
  for (let r = top; r <= landRow; r++) {
    if (!passable(ctx, id, landCol, r, config)) return null;
    if (r >= landRow - 1) touched.push(key(landCol, r));
  }
  return { touched, landCol, landRow };
}

/** Caída en vertical hasta apoyarse. null si acaba en un charco letal. */
function fall(ctx: Context, id: PlayerId, col: number, row: number, config: number, touched: number[]): number | null {
  let r = row;
  for (;;) {
    touched.push(key(col, r), key(col, r - 1));
    const support = supportAt(ctx, id, col, r + 1, config);
    if (support === 'solid') return r;
    if (support === 'deadly') return null;
    if (!passable(ctx, id, col, r + 1, config)) return null;
    r++;
  }
}

/** Todas las celdas que un personaje puede pisar o tocar. */
function explore(ctx: Context, id: PlayerId): { standing: Set<number>; touched: Set<number> } {
  const [startCol, startRow] = ctx.level.starts[id];
  let startConfig = 0;
  for (const e of ctx.level.data.entities) {
    if (e.type === 'lever' && e.startOn && ctx.channels.includes(e.channel)) startConfig |= 1 << ctx.channels.indexOf(e.channel);
  }
  const configs = 1 << ctx.channels.length;
  const stateKey = (col: number, row: number, config: number) => key(col, row) * configs + config;
  const seen = new Set<number>();
  const standing = new Set<number>();
  const touched = new Set<number>();
  const queue: [number, number, number][] = [];

  const visit = (col: number, row: number, config: number) => {
    if (!standable(ctx, id, col, row, config)) return;
    const k = stateKey(col, row, config);
    if (seen.has(k)) return;
    seen.add(k);
    standing.add(key(col, row));
    touched.add(key(col, row));
    touched.add(key(col, row - 1));
    queue.push([col, row, config]);
  };
  visit(startCol, startRow, startConfig);

  while (queue.length > 0) {
    const [col, row, config] = queue.shift()!;

    // Caminar (y caer si no hay suelo).
    for (const dir of [-1, 1]) {
      const c = col + dir;
      if (!passable(ctx, id, c, row, config) || !passable(ctx, id, c, row - 1, config)) continue;
      const path: number[] = [];
      const landed = fall(ctx, id, c, row, config, path);
      if (landed === null) continue;
      for (const t of path) touched.add(t);
      visit(c, landed, config);
    }

    // Saltar: en vertical (para gemas) y hacia los lados.
    const room = headroom(ctx, id, col, row, config);
    for (let r = row; r > row - Math.min(room, 3); r--) touched.add(key(col, r));
    for (const dir of [-1, 1]) {
      for (let dx = 1; dx <= 4; dx++) {
        for (let dy = 2; dy >= -2; dy--) {
          if (dy >= 1 && dx > 3) continue;
          const result = jump(ctx, id, col, row, config, dir, dx, dy);
          if (!result) continue;
          const path = [...result.touched];
          const landed = fall(ctx, id, result.landCol, result.landRow, config, path);
          if (landed === null) continue;
          for (const t of path) touched.add(t);
          visit(result.landCol, landed, config);
        }
      }
    }

    // Cambiar un canal: las plataformas se mueven; quien va encima viaja con ellas.
    for (let bit = 0; bit < ctx.channels.length; bit++) {
      const next = config ^ (1 << bit);
      const below = moverCovers(ctx, col, row + 1, config);
      if (below && ctx.channels.indexOf(below.channel) === bit) {
        const [fromCol, fromRow] = moverAt(ctx, below, config);
        const [toCol, toRow] = moverAt(ctx, below, next);
        const c = col + (toCol - fromCol);
        const r = row + (toRow - fromRow);
        // El camino del pasajero debe estar libre (si no, la plataforma se pararía antes).
        let clear = true;
        for (let rr = Math.min(row, r) - 1; rr <= Math.max(row, r); rr++) {
          if (!passable(ctx, id, c, rr, next) && moverCovers(ctx, c, rr, next) !== below) clear = false;
        }
        if (clear) {
          // Lo que toca por el camino (gemas sobre la ruta de la plataforma).
          const steps = Math.max(Math.abs(c - col), Math.abs(r - row));
          for (let s = 0; s <= steps; s++) {
            const pc = col + Math.round(((c - col) * s) / steps);
            const pr = row + Math.round(((r - row) * s) / steps);
            touched.add(key(pc, pr));
            touched.add(key(pc, pr - 1));
          }
          visit(c, r, next);
        }
      } else if (standable(ctx, id, col, row, next)) {
        visit(col, row, next);
      } else if (passable(ctx, id, col, row, next) && passable(ctx, id, col, row - 1, next)) {
        const path: number[] = [];
        const landed = fall(ctx, id, col, row, next, path);
        if (landed !== null) {
          for (const t of path) touched.add(t);
          visit(col, landed, next);
        }
      }
    }
  }
  return { standing, touched };
}

/** Devuelve quién no alcanza su puerta o alguna de sus gemas; vacío si todo se alcanza. */
export function checkReachability(data: LevelData): ReachIssue[] {
  const level = parseLevel(data);
  const movers = data.entities.filter((e): e is MoverData => e.type === 'mover');
  const channels = CHANNELS.filter((c) => movers.some((m) => m.channel === c));
  const ctx: Context = { level, movers, channels, blockCells: blockRestingCells(level) };
  const issues: ReachIssue[] = [];
  for (const id of PLAYER_IDS) {
    const { standing, touched } = explore(ctx, id);
    const door = level.doors[id];
    if (!standing.has(key(door[0], door[1]))) issues.push({ player: id, what: 'door', cell: door });
    for (const gem of level.gems) {
      if (gem.owner === id && !touched.has(key(gem.cell[0], gem.cell[1]))) {
        issues.push({ player: id, what: 'gem', cell: gem.cell });
      }
    }
  }
  return issues;
}

/** Texto legible de un aviso. */
export function describeIssue(issue: ReachIssue): string {
  const who = issue.player === 'mos' ? 'Mos' : 'Lu';
  const what = issue.what === 'door' ? 'su puerta' : 'su gema';
  return `${who} no alcanza ${what} en [${issue.cell.join(', ')}]`;
}
