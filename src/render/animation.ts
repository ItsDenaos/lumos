// Estado de animación de un personaje. Solo visual: lee la lógica, nunca la cambia.
// Elige la animación de la hoja de sprites (quieto, andar, acción, daño) y su fotograma.

import { PHYSICS, RULES, WORLD } from '../config';
import { doorRect } from '../game/entities/door';
import type { Player } from '../game/player';
import type { PlayerId } from '../game/types';
import type { GameEvent, World } from '../game/world';
import { FRAME_COUNT, type CharacterAnim } from './sprites';

export interface CharacterPose {
  /** Pies: centro inferior de la caja, ya interpolado (coordenadas lógicas). */
  x: number;
  y: number;
  facing: 1 | -1;
  /** Squash & stretch, anclado a los pies (en pixel art se aplica en filas enteras). */
  scaleX: number;
  scaleY: number;
  /** Avance del ciclo de pasos y cuánto corre (0..1). */
  runPhase: number;
  run: number;
  airborne: boolean;
  vy: number;
  /** Animación de la hoja de sprites y fotograma. */
  anim: CharacterAnim;
  frame: number;
  /** Transparencia y elevación en px lógicos (muerte, entrar por la puerta). */
  alpha: number;
  lift: number;
  /** 0..1: celebra al ganar. */
  celebrate: number;
  /** 0..1: Mos apagándose. */
  dim: number;
  /** Reloj propio para detalles (destellos). */
  time: number;
}

/** Segundos por fotograma de la animación de reposo: Mos, enérgico, respira deprisa; Lu, serena, despacio. */
export const STAND_FRAME: Record<PlayerId, number> = { mos: 0.32, lu: 0.55 };

/** Segundos por fotograma de la acción (lanzar el hechizo, dar el espadazo). */
export const ACTION_FRAME = 0.12;
/** Avance del ciclo de pasos por fotograma de andar. */
const STEP = 3;

export class CharacterAnimator {
  private time = 0;
  private runPhase = 0;
  /** > 0 aplastado (aterrizaje), < 0 estirado (salto). Vuelve a 0 solo. */
  private squash = 0;
  /** Tiempo desde que empezó la acción (palanca); < 0 si no hay ninguna. */
  private action = -1;

  constructor(readonly id: PlayerId) {}

  update(dt: number, p: Player, events: readonly GameEvent[]): void {
    this.time += dt;
    for (const e of events) {
      if (e.type === 'reset') {
        this.squash = 0;
        this.action = -1;
      } else if (e.type === 'land' && e.player === this.id) {
        this.squash = Math.min(0.35, (e.speed / PHYSICS.maxFallSpeed) * 0.45);
      } else if (e.type === 'jump' && e.player === this.id) {
        this.squash = -0.22;
      } else if (e.type === 'lever' && e.player === this.id) {
        this.action = 0;
      }
    }
    this.squash *= Math.exp(-dt * 11);
    if (this.action >= 0) {
      this.action += dt;
      if (this.action >= ACTION_FRAME * FRAME_COUNT.action) this.action = -1;
    }

    if (p.grounded) this.runPhase += (Math.abs(p.vx) * dt) / 7;
  }

  pose(p: Player, world: World, alpha: number): CharacterPose {
    const x = p.prevX + (p.x - p.prevX) * alpha + p.w / 2;
    const y = p.prevY + (p.y - p.prevY) * alpha + p.h;
    const airborne = !p.grounded;
    const run = airborne ? 0 : Math.min(1, Math.abs(p.vx) / PHYSICS.maxRunSpeed);

    // En el aire se estira un poco al subir y al caer rápido.
    let squash = this.squash;
    if (airborne) squash -= p.vy < 0 ? 0.06 : Math.min(0.06, p.vy / 9000);

    let anim: CharacterAnim = 'stand';
    let frame = Math.floor(this.time / STAND_FRAME[this.id]) % FRAME_COUNT.stand;
    if (this.action >= 0) {
      anim = 'action';
      frame = Math.min(FRAME_COUNT.action - 1, Math.floor(this.action / ACTION_FRAME));
    } else if (airborne) {
      // Subiendo, la zancada de un pie; cayendo, la del otro.
      anim = 'walk';
      frame = p.vy < 0 ? 0 : 2;
    } else if (Math.abs(p.vx) > 8) {
      anim = 'walk';
      frame = Math.floor(this.runPhase / STEP) % FRAME_COUNT.walk;
    }

    const pose: CharacterPose = {
      x,
      y,
      facing: p.facing,
      scaleX: 1 + squash * 0.8,
      scaleY: 1 - squash,
      runPhase: this.runPhase,
      run,
      airborne,
      vy: p.vy,
      anim,
      frame,
      alpha: 1,
      lift: 0,
      celebrate: 0,
      dim: 0,
      time: this.time,
    };

    if (world.state === 'dying' && world.dead.includes(this.id)) {
      const t = Math.min(1, world.stateTime / RULES.deathTime);
      pose.anim = 'hurt';
      pose.frame = 0;
      if (this.id === 'mos') {
        // Se apaga: pierde el color y se desvanece entre el humo.
        pose.dim = Math.min(1, t * 3);
        pose.alpha = 1 - Math.max(0, (t - 0.3) / 0.7);
        pose.scaleY *= 1 - t * 0.25;
      } else {
        // Se evapora: sube y se desvanece en bruma.
        pose.alpha = 1 - t;
        pose.lift = t * 26;
        pose.scaleX *= 1 - t * 0.5;
        pose.scaleY *= 1 + t * 0.2;
      }
    } else if (world.state === 'won') {
      // Celebra con su gesto (hechizo o espadazo) y un saltito, y entra por su puerta.
      const t = world.stateTime;
      const hop = 0.36;
      if (t < hop) {
        pose.celebrate = 1;
        pose.anim = 'action';
        pose.frame = Math.min(FRAME_COUNT.action - 1, Math.floor(t / ACTION_FRAME));
        pose.lift = Math.sin((t / hop) * Math.PI) * 12;
      } else {
        const enter = Math.min(1, (t - hop) / (RULES.resultsDelay - hop));
        const door = doorRect(world.level.doors[this.id]);
        const targetX = door.x + WORLD.tile / 2;
        if (Math.abs(targetX - pose.x) > 2) pose.facing = targetX > pose.x ? 1 : -1;
        pose.x += (targetX - pose.x) * enter;
        pose.anim = 'walk';
        pose.frame = Math.floor(t / 0.1) % FRAME_COUNT.walk;
        pose.alpha = 1 - enter;
        pose.scaleX *= 1 - enter * 0.3;
        pose.scaleY *= 1 - enter * 0.3;
        pose.celebrate = 1 - enter;
      }
    }
    return pose;
  }
}
