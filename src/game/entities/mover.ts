// Plataforma móvil: va a su destino mientras su canal está activo y vuelve al apagarse.
// Atraviesa la piedra (se dibuja detrás, así sirve de compuerta escondida en los muros).

import { MECHANISMS, WORLD } from '../../config';
import type { Channel, Entity } from '../../levels/types';
import type { Rect } from '../types';

const T = WORLD.tile;

export type MoverData = Extract<Entity, { type: 'mover' }>;

export class Mover {
  x = 0;
  y = 0;
  prevX = 0;
  prevY = 0;
  /** Se movió en el último paso (para el zumbido de la fase de sonido). */
  moving = false;
  readonly w: number;
  readonly h: number;
  readonly from: { x: number; y: number };
  readonly to: { x: number; y: number };
  /** Píxeles por segundo. */
  readonly speed: number;
  readonly channel: Channel;

  constructor(data: MoverData) {
    this.w = data.size[0] * T;
    this.h = data.size[1] * T;
    this.from = { x: data.at[0] * T, y: data.at[1] * T };
    this.to = { x: data.to[0] * T, y: data.to[1] * T };
    this.speed = (data.speed ?? MECHANISMS.moverSpeed) * T;
    this.channel = data.channel;
    this.reset();
  }

  reset(): void {
    this.x = this.from.x;
    this.y = this.from.y;
    this.prevX = this.x;
    this.prevY = this.y;
    this.moving = false;
  }

  get rect(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}
