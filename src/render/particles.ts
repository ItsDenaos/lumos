// Partículas: polvo, chispas, destellos, brillo de gemas, humo y bruma.
// Son solo visuales: nunca afectan a la física. Se mueven en coordenadas lógicas
// y se dibujan como cuadraditos en el lienzo del arte.

import { EFFECTS } from '../config';
import { art, rect, ring } from './pixel';

export type ParticleShape = 'dot' | 'spark' | 'glint' | 'ring';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Aceleración vertical (gravedad positiva, flotación negativa). */
  gravity: number;
  /** Frenado por segundo (0 = ninguno). */
  drag: number;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  color: string;
  alpha: number;
  shape: ParticleShape;
  /** Se suma a la luz (brillos) en vez de taparla. */
  additive: boolean;
}

export type ParticleSpec = Partial<Particle> & { x: number; y: number; life: number; color: string };

export class ParticleSystem {
  readonly particles: Particle[] = [];

  constructor(readonly max = EFFECTS.maxParticles) {}

  emit(spec: ParticleSpec): void {
    // Lleno: la más antigua deja su sitio.
    if (this.particles.length >= this.max) this.particles.shift();
    this.particles.push({
      vx: 0,
      vy: 0,
      gravity: 0,
      drag: 0,
      maxLife: spec.life,
      size: 3,
      sizeEnd: spec.size ?? 3,
      alpha: 1,
      shape: 'dot',
      additive: false,
      ...spec,
    });
  }

  /** Emite `count` partículas variando un poco cada una (random da valores en [0, 1)). */
  burst(count: number, make: (i: number, random: () => number) => ParticleSpec, random = Math.random): void {
    for (let i = 0; i < count; i++) this.emit(make(i, random));
  }

  update(dt: number): void {
    const list = this.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag > 0) {
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  clear(): void {
    this.particles.length = 0;
  }

  /** Dibuja en el lienzo del arte (640 × 360). */
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      // El tamaño se da en px lógicos: en el arte es la mitad, nunca menos de un píxel.
      const size = Math.max(1, Math.round((p.size + (p.sizeEnd - p.size) * t) / 2));
      const fade = Math.min(1, p.life / (p.maxLife * 0.4));
      ctx.globalAlpha = p.alpha * fade;
      ctx.globalCompositeOperation = p.additive ? 'lighter' : 'source-over';
      const x = art(p.x);
      const y = art(p.y);
      switch (p.shape) {
        case 'dot':
          rect(ctx, x - Math.floor(size / 2), y - Math.floor(size / 2), size, size, p.color);
          break;
        case 'spark':
          rect(ctx, x, y, 1, 1, p.color);
          rect(ctx, x - Math.sign(p.vx), y - Math.sign(p.vy), 1, 1, p.color);
          break;
        case 'glint':
          rect(ctx, x, y, 1, 1, p.color);
          if (size >= 2) {
            rect(ctx, x - 1, y, 3, 1, p.color);
            rect(ctx, x, y - 1, 1, 3, p.color);
          }
          break;
        case 'ring':
          ring(ctx, x, y, size, 1, p.color);
          break;
      }
    }
    ctx.restore();
  }
}
