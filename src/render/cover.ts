// Portada del menú: la ilustración de Lu y Mos del diseño, pasada a pixel art (640 × 360) por
// tools/sprites/convertir_fondos.py. Encima, solo lo que se mueve: estrellas que titilan en
// el fondo y motas de luz que suben en cada retrato (plata en el de Lu, oro en el de Mos).

import coverUrl from '../assets/portada.png';
import { twinkleIn } from './background';
import type { UiRect } from './ui';
import { loadImage, rect } from './pixel';
import { hash } from './random';

let cover: HTMLImageElement | null = null;

export async function loadCover(): Promise<void> {
  cover = await loadImage(coverUrl);
}

/** Zonas de la ilustración, en píxeles del arte. */
export const COVER = {
  /** Hueco oscuro junto a Lu (marco de plata). */
  luPanel: { x: 26, y: 82, w: 130, h: 192 },
  /** Hueco oscuro junto a Mos (marco de oro), sin la parte que tapa su escudo (hasta x = 514). */
  mosPanel: { x: 515, y: 82, w: 99, h: 192 },
  /** Retratos. */
  luPortrait: { x: 162, y: 72, w: 136, h: 212 },
  mosPortrait: { x: 342, y: 72, w: 136, h: 212 },
} satisfies Record<string, UiRect>;

/** Fondo libre donde pueden titilar estrellas (fuera de los marcos y del logo). */
const SKY: readonly UiRect[] = [
  { x: 8, y: 4, w: 206, h: 50 },
  { x: 426, y: 4, w: 206, h: 50 },
  { x: 304, y: 80, w: 32, h: 200 },
  { x: 8, y: 302, w: 624, h: 50 },
];

/** La portada y lo que se mueve encima, en el lienzo del arte. */
export function drawCover(ctx: CanvasRenderingContext2D, clock: number, reduce: boolean): void {
  if (cover) ctx.drawImage(cover, 0, 0);
  else rect(ctx, 0, 0, 640, 360, '#0b0a1c');
  if (reduce) return;
  twinkleIn(ctx, SKY, clock);
  motes(ctx, COVER.luPortrait, clock, ['#ffffff', '#a9c8ff'], 3);
  motes(ctx, COVER.mosPortrait, clock, ['#fff2b0', '#f5a524'], 5);
}

/** Motas que suben despacio por un retrato y se apagan arriba. */
function motes(ctx: CanvasRenderingContext2D, r: UiRect, clock: number, colors: readonly string[], seed: number): void {
  for (let i = 0; i < 9; i++) {
    const period = 4 + hash(i, seed) * 3;
    const t = ((clock + hash(i, seed + 1) * period) % period) / period;
    const x = r.x + 4 + Math.floor(hash(i, seed + 2) * (r.w - 8)) + Math.round(Math.sin(clock * 1.3 + i) * 2);
    const y = Math.round(r.y + r.h - 8 - t * (r.h - 30));
    ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    rect(ctx, x, y, 1, 1, colors[i % colors.length]);
    if (i % 3 === 0) rect(ctx, x, y + 1, 1, 1, colors[(i + 1) % colors.length]);
  }
  ctx.globalAlpha = 1;
}
