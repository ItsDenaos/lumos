// Botón (placa de presión): activa su canal mientras un personaje o un bloque está encima.

import { MECHANISMS, WORLD } from '../../config';
import type { Channel } from '../../levels/types';
import { overlaps } from '../physics';
import type { Rect } from '../types';

const T = WORLD.tile;

export class Button {
  pressed = false;
  /** Franja sobre el suelo de su celda que detecta peso. */
  readonly zone: Rect;

  constructor(
    readonly col: number,
    readonly row: number,
    readonly channel: Channel,
  ) {
    const inset = MECHANISMS.buttonInset;
    const height = MECHANISMS.buttonHeight;
    this.zone = { x: col * T + inset, y: (row + 1) * T - height, w: T - inset * 2, h: height };
  }

  reset(): void {
    this.pressed = false;
  }

  /** Recalcula si está pisado. Devuelve true si cambió. */
  update(bodies: readonly Rect[]): boolean {
    const pressed = bodies.some((body) => overlaps(body, this.zone));
    const changed = pressed !== this.pressed;
    this.pressed = pressed;
    return changed;
  }
}
