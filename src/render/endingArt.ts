// Fondo del final: la ilustración del amanecer desde la terraza del Observatorio (el reloj del
// cielo arreglado, la Luna que se pone a la izquierda y el Sol que sale a la derecha), pasada a
// pixel art (640 × 360) por tools/sprites/convertir_fondos.py.
// Encima, la noche del eclipse se retira de derecha a izquierda, desde el lado del Sol, y el
// reloj suelta un destello al volver a girar.

import finalUrl from '../assets/final.png';
import { twinkleIn } from './background';
import { ART_H, ART_W, loadImage, rect, ring } from './pixel';
import type { UiRect } from './ui';

let image: HTMLImageElement | null = null;

export async function loadEndingArt(): Promise<void> {
  image = await loadImage(finalUrl);
}

/** El reloj del cielo en la ilustración, en píxeles del arte. */
const CLOCK = { x: 320, y: 80, r: 60 };
/** Fila del arte donde empieza el suelo de la terraza. */
export const ENDING_FLOOR = 313;
/** Cuánto tapa la noche al empezar. */
const NIGHT = 0.8;
/** Cielo a los lados del reloj, donde titilan las estrellas. */
const NIGHT_SKY: readonly UiRect[] = [
  { x: 0, y: 0, w: 250, h: 130 },
  { x: 390, y: 0, w: 250, h: 110 },
];
/** El rincón de arriba a la izquierda, que sigue de noche en la ilustración. */
const DAWN_SKY: readonly UiRect[] = [{ x: 0, y: 0, w: 200, h: 90 }];

/**
 * La ilustración con la noche encima (dawn de 0 a 1) y el destello del reloj,
 * `restart` segundos después de que vuelva a girar.
 */
export function drawEndingArt(ctx: CanvasRenderingContext2D, dawn: number, clock: number, restart: number, reduce: boolean): void {
  if (image) ctx.drawImage(image, 0, 0);
  else rect(ctx, 0, 0, ART_W, ART_H, '#0b0a1c');

  if (dawn < 1) {
    // La izquierda (la Luna) tarda más en aclararse que la derecha (el Sol).
    const night = ctx.createLinearGradient(0, 0, ART_W, 0);
    for (let i = 0; i <= 4; i++) {
      const u = i / 4;
      const a = NIGHT * Math.max(0, Math.min(1, 1 + 0.6 * (1 - u) - 1.6 * dawn));
      night.addColorStop(u, `rgba(11, 10, 28, ${a.toFixed(3)})`);
    }
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, ART_W, ART_H);
  }
  if (reduce) return;

  const stars = Math.max(0, 1 - dawn / 0.85);
  if (stars > 0) {
    ctx.globalAlpha = stars;
    twinkleIn(ctx, NIGHT_SKY, clock, 40);
    ctx.globalAlpha = 1;
  }
  twinkleIn(ctx, DAWN_SKY, clock, 8);

  // Dos ondas de luz que salen del reloj y se apagan al alejarse.
  for (const delay of [0, 0.35]) {
    const t = (restart - delay) / 1.4;
    if (t <= 0 || t >= 1) continue;
    ctx.globalAlpha = 1 - t;
    ring(ctx, CLOCK.x, CLOCK.y, CLOCK.r + 2 + Math.round(t * 70), 2, '#fff2c8');
    ctx.globalAlpha = 1;
  }
}
