// Fondo del mapa de niveles: la ilustración de las tres zonas del diseño (el Observatorio con
// su esfera armilar arriba, el muro de oro y plata del Santuario en medio y el Bosque del Alba
// con el eclipse abajo), pasada a pixel art (640 × 360) por tools/sprites/convertir_fondos.py.

import mapUrl from '../assets/mapa.png';
import type { Zone } from '../levels/types';
import { twinkleIn } from './background';
import { loadImage, rect } from './pixel';

let image: HTMLImageElement | null = null;

export async function loadMapArt(): Promise<void> {
  image = await loadImage(mapUrl);
}

/** Dónde empieza cada zona en la ilustración, en píxeles lógicos (de arriba a abajo). */
export const MAP_BANDS: readonly { zone: Zone; top: number }[] = [
  { zone: 'observatory', top: 0 },
  { zone: 'sanctuary', top: 262 },
  { zone: 'forest', top: 440 },
];

/** Cielo libre del Observatorio (sin la esfera armilar ni el título), en píxeles del arte. */
const SKY = [{ x: 4, y: 36, w: 352, h: 90 }];

/** La ilustración y, encima, estrellas que titilan en el cielo. */
export function drawMapArt(ctx: CanvasRenderingContext2D, clock: number, reduce: boolean): void {
  if (image) ctx.drawImage(image, 0, 0);
  else rect(ctx, 0, 0, 640, 360, '#0b0a1c');
  if (!reduce) twinkleIn(ctx, SKY, clock, 18);
}
