// Puertas: cada personaje tiene la suya y ambos deben estar frente a ella a la vez.

import { WORLD } from '../../config';
import type { Cell } from '../../levels/types';
import type { Rect } from '../types';

const T = WORLD.tile;

/** Zona de una puerta: su celda y la de encima (el personaje mide más de una baldosa). */
export function doorRect(cell: Cell): Rect {
  return { x: cell[0] * T, y: (cell[1] - 1) * T, w: T, h: 2 * T };
}

/** Está frente a su puerta si el centro de su caja cae dentro de ella. */
export function isAtDoor(box: Rect, door: Cell): boolean {
  const r = doorRect(door);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
}
