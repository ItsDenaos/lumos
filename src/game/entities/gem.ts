// Gemas: soles de oro para Mos y lunas de plata para Lu. Solo las recoge su dueño.

import { RULES, WORLD } from '../../config';
import type { Cell } from '../../levels/types';
import type { PlayerId, Rect } from '../types';

const T = WORLD.tile;

export interface Gem {
  owner: PlayerId;
  col: number;
  row: number;
  collected: boolean;
}

/** Caja de recogida de una gema, centrada en su celda. */
export function gemRect(cell: Cell): Rect {
  const s = RULES.gemSize;
  return { x: cell[0] * T + (T - s) / 2, y: cell[1] * T + (T - s) / 2, w: s, h: s };
}
