// Palanca: Mos (↓) o Lu (S) la accionan estando encima; alterna su canal.

import { WORLD } from '../../config';
import type { Channel } from '../../levels/types';
import type { Rect } from '../types';

const T = WORLD.tile;

export class Lever {
  on: boolean;
  readonly rect: Rect;

  constructor(
    readonly col: number,
    readonly row: number,
    readonly channel: Channel,
    readonly startOn = false,
  ) {
    this.on = startOn;
    this.rect = { x: col * T, y: row * T, w: T, h: T };
  }

  reset(): void {
    this.on = this.startOn;
  }

  /** Está a su alcance si el centro del personaje cae en su columna y su caja toca la celda. */
  reachableFrom(box: Rect): boolean {
    const cx = box.x + box.w / 2;
    const r = this.rect;
    return cx >= r.x && cx <= r.x + r.w && box.y < r.y + r.h && box.y + box.h > r.y;
  }

  toggle(): void {
    this.on = !this.on;
  }
}
