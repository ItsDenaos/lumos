// Bloque de piedra: 1 × 1 baldosa, cae con gravedad, se empuja, pisa botones
// y sirve de escalón o de puente sobre un charco.

import { WORLD } from '../../config';
import type { Rect } from '../types';

const T = WORLD.tile;

export class Block {
  x = 0;
  y = 0;
  vy = 0;
  prevX = 0;
  prevY = 0;
  grounded = true;
  readonly w = T;
  readonly h = T;

  constructor(
    readonly col: number,
    readonly row: number,
  ) {
    this.reset();
  }

  reset(): void {
    this.x = this.col * T;
    this.y = this.row * T;
    this.prevX = this.x;
    this.prevY = this.y;
    this.vy = 0;
    this.grounded = true;
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
