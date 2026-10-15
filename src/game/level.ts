// Lectura de los mapas ASCII: convierte cada carácter en una baldosa o en un marcador.

import { WORLD } from '../config';
import type { Cell, LevelData } from '../levels/types';
import type { PlayerId } from './types';

export type Tile =
  | 'stone'
  | 'air'
  | 'goldPool'
  | 'silverPool'
  | 'shadowPool'
  | 'goldWall'
  | 'silverWall';

export type Liquid = 'gold' | 'silver' | 'shadow';

/** Caracteres que definen la baldosa por sí mismos. */
export const TILE_CHARS: Readonly<Record<string, Tile>> = {
  '#': 'stone',
  '.': 'air',
  o: 'goldPool',
  p: 'silverPool',
  x: 'shadowPool',
  O: 'goldWall',
  P: 'silverWall',
};

/** Marcadores colocados sobre una baldosa de aire. */
export const MARKER_CHARS = ['M', 'L', '[', ']', '*', 'c', 'B'] as const;

export interface GemSpot {
  owner: PlayerId;
  cell: Cell;
}

export interface ParsedLevel {
  data: LevelData;
  /** tiles[fila][columna] */
  tiles: Tile[][];
  starts: Record<PlayerId, Cell>;
  doors: Record<PlayerId, Cell>;
  gems: GemSpot[];
  blocks: Cell[];
}

export function liquidOf(tile: Tile): Liquid | null {
  switch (tile) {
    case 'goldPool':
      return 'gold';
    case 'silverPool':
      return 'silver';
    case 'shadowPool':
      return 'shadow';
    default:
      return null;
  }
}

/** Baldosa en una celda; fuera del nivel todo es piedra. */
export function tileAt(level: ParsedLevel, col: number, row: number): Tile {
  if (row < 0 || row >= level.tiles.length) return 'stone';
  const line = level.tiles[row];
  if (col < 0 || col >= line.length) return 'stone';
  return line[col];
}

/** Interpreta un nivel. Lanza un error si falta lo imprescindible para jugarlo. */
export function parseLevel(data: LevelData): ParsedLevel {
  const tiles: Tile[][] = [];
  const starts: Partial<Record<PlayerId, Cell>> = {};
  const doors: Partial<Record<PlayerId, Cell>> = {};
  const gems: GemSpot[] = [];
  const blocks: Cell[] = [];

  for (let row = 0; row < WORLD.rows; row++) {
    const line = data.map[row] ?? '';
    const tileRow: Tile[] = [];
    for (let col = 0; col < WORLD.cols; col++) {
      const ch = line[col] ?? '#';
      const cell: Cell = [col, row];
      const tile = TILE_CHARS[ch];
      if (tile) {
        tileRow.push(tile);
        continue;
      }
      tileRow.push('air');
      switch (ch) {
        case 'M':
          starts.mos = cell;
          break;
        case 'L':
          starts.lu = cell;
          break;
        case '[':
          doors.mos = cell;
          break;
        case ']':
          doors.lu = cell;
          break;
        case '*':
          gems.push({ owner: 'mos', cell });
          break;
        case 'c':
          gems.push({ owner: 'lu', cell });
          break;
        case 'B':
          blocks.push(cell);
          break;
        default:
          throw new Error(`Nivel ${data.id}: carácter desconocido "${ch}" en [${col}, ${row}]`);
      }
    }
    tiles.push(tileRow);
  }

  if (!starts.mos || !starts.lu) throw new Error(`Nivel ${data.id}: falta el inicio de Mos o de Lu`);
  if (!doors.mos || !doors.lu) throw new Error(`Nivel ${data.id}: falta la puerta de Mos o de Lu`);

  return {
    data,
    tiles,
    starts: { mos: starts.mos, lu: starts.lu },
    doors: { mos: doors.mos, lu: doors.lu },
    gems,
    blocks,
  };
}
