// Fondos de cada zona: las ilustraciones del diseño, pasadas a pixel art (640 × 360) por
// tools/sprites/convertir_fondos.py. Se pintan una sola vez por nivel; encima, cada fotograma,
// solo lo que se mueve (nubes, polvo dorado, estrellas que titilan).

import forestUrl from '../assets/fondo-bosque.png';
import observatoryUrl from '../assets/fondo-observatorio.png';
import sanctuaryUrl from '../assets/fondo-santuario.png';
import type { Zone } from '../levels/types';
import type { ZoneStyle } from './palette';
import { ART_H, ART_W, dither, loadImage, rect } from './pixel';
import { hash } from './random';

const URLS: Record<Zone, string> = { forest: forestUrl, sanctuary: sanctuaryUrl, observatory: observatoryUrl };
const images: Partial<Record<Zone, HTMLImageElement>> = {};

/** Carga los fondos de las tres zonas. */
export async function loadBackgrounds(): Promise<void> {
  await Promise.all(
    (Object.keys(URLS) as Zone[]).map(async (zone) => {
      const img = await loadImage(URLS[zone]);
      if (img) images[zone] = img;
    }),
  );
}

/**
 * Cuánto se oscurece cada fondo para que lo que se juega encima (piedra, gemas, personajes)
 * se lea mejor. El bosque es el más claro y con más detalle abajo.
 */
export const BACKGROUND_DIM: Record<Zone, number> = { forest: 0.32, sanctuary: 0.18, observatory: 0.22 };

/** Parte fija del fondo de una zona (si la imagen no cargó, solo su cielo en bandas). */
export function renderBackground(ctx: CanvasRenderingContext2D, zone: Zone, style: ZoneStyle): void {
  const img = images[zone];
  if (!img) {
    skyBands(ctx, style.sky);
    return;
  }
  ctx.drawImage(img, 0, 0, ART_W, ART_H);
  ctx.globalAlpha = BACKGROUND_DIM[zone];
  rect(ctx, 0, 0, ART_W, ART_H, '#0b0815');
  ctx.globalAlpha = 1;
}

/** Lo que se mueve en el fondo. Con "reducir efectos" nada parpadea. */
export function drawBackgroundOverlay(ctx: CanvasRenderingContext2D, zone: Zone, clock: number, reduce: boolean): void {
  if (zone === 'forest') clouds(ctx, clock);
  else if (zone === 'sanctuary') motes(ctx, clock);
  else if (!reduce) twinkle(ctx, clock, 120);
}

/** Nubes rosadas que cruzan despacio por lo alto del cielo del bosque. */
function clouds(ctx: CanvasRenderingContext2D, clock: number): void {
  for (let i = 0; i < 4; i++) {
    const speed = 2 + hash(i, 1) * 4;
    const span = ART_W + 120;
    const x = Math.round(((hash(i, 2) * span + clock * speed) % span) - 60);
    const y = 14 + Math.floor(hash(i, 3) * 50);
    const w = 24 + Math.floor(hash(i, 4) * 24);
    rect(ctx, x, y, w, 3, '#f0b8c4');
    rect(ctx, x + 5, y - 2, w - 12, 2, '#f0b8c4');
    rect(ctx, x + 2, y + 3, w - 4, 1, '#c98aa8');
  }
}

/** Motas de polvo dorado que suben por el Santuario. */
function motes(ctx: CanvasRenderingContext2D, clock: number): void {
  for (let i = 0; i < 30; i++) {
    const x = Math.round((hash(i, 7) * ART_W + Math.sin(clock * 0.3 + i) * 10 + ART_W) % ART_W);
    const y = Math.round((hash(i, 8) * ART_H - clock * (2 + hash(i, 9) * 3) + ART_H * 10) % ART_H);
    rect(ctx, x, y, 1, 1, '#ffe2a0');
  }
}

/** Cielo en bandas de color, con un tramado entre banda y banda. */
function skyBands(ctx: CanvasRenderingContext2D, colors: readonly string[], top = 0, height = ART_H, width = ART_W): void {
  const band = height / colors.length;
  colors.forEach((color, i) => rect(ctx, 0, top + Math.floor(i * band), width, Math.ceil(band) + 1, color));
  for (let i = 1; i < colors.length; i++) {
    const y = top + Math.floor(i * band);
    dither(ctx, 0, y - 2, width, 4, colors[i - 1], colors[i]);
  }
}

/** Estrellas que titilan en forma de cruz, repartidas por unas zonas (en proporción a su área). */
export function twinkleIn(
  ctx: CanvasRenderingContext2D,
  zones: readonly { x: number; y: number; w: number; h: number }[],
  clock: number,
  count = 26,
): void {
  const total = zones.reduce((sum, r) => sum + r.w * r.h, 0);
  for (let i = 0; i < count; i++) {
    if (Math.sin(clock * (1 + hash(i, 21) * 2) + i * 2.3) < 0.75) continue;
    let pick = hash(i, 22) * total;
    let zone = zones[0];
    for (const r of zones) {
      zone = r;
      pick -= r.w * r.h;
      if (pick <= 0) break;
    }
    const x = zone.x + Math.floor(hash(i, 23) * zone.w);
    const y = zone.y + Math.floor(hash(i, 24) * zone.h);
    rect(ctx, x, y - 1, 1, 3, '#ffffff');
    rect(ctx, x - 1, y, 3, 1, '#ffffff');
  }
}

/** Algunas estrellas titilan en forma de cruz, en las filas de arriba (hasta maxY). */
function twinkle(ctx: CanvasRenderingContext2D, clock: number, maxY = 260, top = 0): void {
  for (let i = 0; i < 30; i++) {
    const on = Math.sin(clock * (1 + hash(i, 11) * 2) + i * 1.7) > 0.7;
    if (!on) continue;
    const x = Math.floor(hash(i, 5) * ART_W);
    const y = top + Math.floor(hash(i, 6) * maxY);
    rect(ctx, x, y - 1, 1, 3, '#ffffff');
    rect(ctx, x - 1, y, 3, 1, '#ffffff');
  }
}
