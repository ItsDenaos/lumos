// Personaje: Mos y Lu comparten exactamente la misma física.

import { PHYSICS, PLAYER } from '../config';
import { moveBox } from './physics';
import type { Controls, PlayerId, Rect } from './types';

export class Player {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Posición al empezar el paso anterior, para interpolar el dibujo. */
  prevX = 0;
  prevY = 0;
  grounded = false;
  facing: 1 | -1 = 1;
  /** Tiempo restante para saltar tras salir de un borde. */
  coyote = 0;
  /** Tiempo restante de un salto pulsado antes de tocar el suelo. */
  jumpBuffer = 0;
  /** Subiendo por un salto (el salto variable puede recortarlo). */
  jumping = false;

  readonly w = PLAYER.width;
  readonly h = PLAYER.height;

  constructor(readonly id: PlayerId) {}

  /** Coloca al personaje de pie sobre la base de una celda, centrado. */
  spawnAt(col: number, row: number, tile: number): void {
    this.x = col * tile + (tile - this.w) / 2;
    this.y = (row + 1) * tile - this.h;
    this.prevX = this.x;
    this.prevY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.facing = 1;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.jumping = false;
  }

  get box(): Rect {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get centerX(): number {
    return this.x + this.w / 2;
  }

  get centerY(): number {
    return this.y + this.h / 2;
  }
}

export interface PlayerStepResult {
  jumped: boolean;
  /** Aterrizó en este paso (estaba en el aire). */
  landed: boolean;
  /** Velocidad vertical al aterrizar, para el polvo y el squash. */
  impactSpeed: number;
}

/** Lo que el personaje necesita saber de su entorno para moverse. */
export interface PlayerEnv {
  /** Sólidos que pueden afectar a una región. */
  solidsNear: (region: Rect) => Rect[];
  /**
   * Empuja lo que haya justo delante (un bloque) antes de moverse.
   * Devuelve cuánto se desplazó lo empujado (0 si nada).
   */
  push?: (box: Rect, dx: number) => number;
}

function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}

/**
 * Un paso de física: controles, salto con coyote y búfer, gravedad, empujes y colisiones.
 * No toca prevX/prevY: el mundo los fija al principio del paso, antes de que las
 * plataformas muevan a sus pasajeros.
 */
export function stepPlayer(p: Player, c: Controls, dt: number, env: PlayerEnv): PlayerStepResult {
  // Horizontal: acelerar hacia la velocidad pedida; frenar más fuerte en el suelo.
  const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
  if (dir !== 0) p.facing = dir > 0 ? 1 : -1;
  let rate: number;
  if (!p.grounded) rate = PHYSICS.airAccel;
  else if (dir === 0 || (p.vx !== 0 && Math.sign(p.vx) !== dir)) rate = PHYSICS.groundDecel;
  else rate = PHYSICS.groundAccel;
  p.vx = approach(p.vx, dir * PHYSICS.maxRunSpeed, rate * dt);

  // Salto: tiempo coyote al salir de un borde y búfer al pulsar antes de aterrizar.
  p.coyote = p.grounded ? PHYSICS.coyoteTime : Math.max(0, p.coyote - dt);
  p.jumpBuffer = c.jumpPressed ? PHYSICS.jumpBufferTime : Math.max(0, p.jumpBuffer - dt);
  let jumped = false;
  if (p.jumpBuffer > 0 && p.coyote > 0) {
    p.vy = -PHYSICS.jumpVelocity;
    p.jumpBuffer = 0;
    p.coyote = 0;
    p.grounded = false;
    p.jumping = true;
    jumped = true;
  }
  // Salto variable: soltar mientras se sube recorta la velocidad una sola vez.
  if (p.jumping && !c.jumpHeld && p.vy < 0) {
    p.vy *= PHYSICS.jumpCutMultiplier;
    p.jumping = false;
  }

  // Gravedad con la velocidad media del paso: la parábola es exacta (altura ≈ 98 px).
  const vy0 = p.vy;
  const vy1 = Math.min(vy0 + PHYSICS.gravity * dt, PHYSICS.maxFallSpeed);
  p.vy = vy1;
  const dx = p.vx * dt;
  const dy = ((vy0 + vy1) / 2) * dt;

  const margin = PHYSICS.stepHeight + 2;
  const region: Rect = {
    x: Math.min(p.x, p.x + dx) - margin,
    y: Math.min(p.y, p.y + dy) - margin,
    w: p.w + Math.abs(dx) + margin * 2,
    h: p.h + Math.abs(dy) + margin * 2,
  };
  const wasGrounded = p.grounded;
  // Primero se empuja lo que haya delante; después el personaje choca con su nueva posición.
  const pushed = dx !== 0 && env.push ? env.push(p.box, dx) : 0;
  const result = moveBox(p.box, dx, dy, env.solidsNear(region), wasGrounded ? PHYSICS.stepHeight : 0);
  p.x = result.x;
  p.y = result.y;
  // Empujando se avanza a la velocidad del bloque; contra algo inmóvil, se para.
  if (result.hitX) p.vx = pushed !== 0 ? Math.sign(p.vx) * Math.min(Math.abs(p.vx), PHYSICS.blockPushSpeed) : 0;
  p.grounded = result.landed;
  if (result.landed || result.bumpedHead) {
    p.vy = 0;
    p.jumping = false;
  }
  if (p.vy >= 0) p.jumping = false;

  return { jumped, landed: result.landed && !wasGrounded, impactSpeed: result.landed ? vy1 : 0 };
}
