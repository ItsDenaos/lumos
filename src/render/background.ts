// Fondos de cada zona: las ilustraciones del diseño, pasadas a pixel art (640 × 360) por
// tools/sprites/convertir_fondos.py. Se pintan una sola vez por nivel; encima, cada fotograma,
// solo lo que se mueve (nubes, polvo dorado, estrellas que titilan).
// Aquí viven también el cielo, el eclipse y el reloj del cielo que se dibujan en código para el final.

import forestUrl from '../assets/fondo-bosque.png';
import observatoryUrl from '../assets/fondo-observatorio.png';
import sanctuaryUrl from '../assets/fondo-santuario.png';
import type { Zone } from '../levels/types';
import type { ZoneStyle } from './palette';
import { ART_H, ART_W, circle, dither, line, loadImage, rect, ring } from './pixel';
import { hash, smoothNoise } from './random';

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
export function skyBands(ctx: CanvasRenderingContext2D, colors: readonly string[], top = 0, height = ART_H, width = ART_W): void {
  const band = height / colors.length;
  colors.forEach((color, i) => rect(ctx, 0, top + Math.floor(i * band), width, Math.ceil(band) + 1, color));
  for (let i = 1; i < colors.length; i++) {
    const y = top + Math.floor(i * band);
    dither(ctx, 0, y - 2, width, 4, colors[i - 1], colors[i]);
  }
}

/** Estrellas fijas (algunas más brillantes). */
export function stars(ctx: CanvasRenderingContext2D, count: number, maxY: number, seed: number, width = ART_W): void {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, seed) * width);
    const y = Math.floor(hash(i, seed + 1) * maxY);
    const bright = hash(i, seed + 2) > 0.85;
    rect(ctx, x, y, 1, 1, bright ? '#ffffff' : '#9f9cc8');
    if (bright) {
      rect(ctx, x - 1, y, 1, 1, '#5d5a8c');
      rect(ctx, x + 1, y, 1, 1, '#5d5a8c');
    }
  }
}

/** Cresta de montañas píxel a píxel, rellena hasta abajo. */
export function ridge(ctx: CanvasRenderingContext2D, base: number, amp: number, seed: number, freq: number, color: string, width = ART_W): void {
  ctx.fillStyle = color;
  for (let x = 0; x < width; x++) {
    const n = 1 - Math.abs(smoothNoise(x * freq, seed));
    const top = Math.round(base - amp * (n * 0.85 + smoothNoise(x * freq * 4, seed + 1) * 0.12));
    ctx.fillRect(x, top, 1, ART_H * 2 - top);
  }
}

/**
 * El Sol y la Luna. separation 0 = atascados uno sobre otro (el eclipse), 1 = cada uno en su sitio.
 */
export function drawEclipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  separation: number,
  clock: number,
  reduce: boolean,
  /** Distancia a la que se apartan, en radios. */
  spread = 2.4,
): void {
  const eclipse = 1 - separation;
  if (eclipse > 0.4) {
    // Corona: anillos y rayos de luz.
    const pulse = reduce ? 0 : Math.round(Math.sin(clock * 1.2));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (reduce ? 0 : clock * 0.05);
      const len = r + 6 + Math.round(hash(i, 4) * r * 0.6) + pulse;
      line(ctx, cx + Math.cos(a) * (r + 3), cy + Math.sin(a) * (r + 3), cx + Math.cos(a) * len, cy + Math.sin(a) * len, i % 2 ? '#fff2c8' : '#e0c27a');
    }
    ring(ctx, cx, cy, r + 3 + pulse, 2, '#fff2c8');
  }
  const sunX = cx + separation * r * spread;
  const sunY = cy + separation * r * spread * 0.2;
  const moonX = cx - separation * r * spread;
  const moonY = cy - separation * r * spread * 0.12;
  circle(ctx, sunX, sunY, r, '#f5a524');
  circle(ctx, sunX - 1, sunY - 1, r - 2, '#ffd866');
  circle(ctx, sunX - r / 3, sunY - r / 3, Math.max(1, Math.floor(r / 4)), '#fff4c2');
  // La Luna: oscura mientras tapa al Sol, plateada cuando se aparta.
  const lit = separation > 0.5;
  circle(ctx, moonX, moonY, r - 1, lit ? '#aebfe0' : '#120c1e');
  if (lit) {
    circle(ctx, moonX + 1, moonY - 1, r - 3, '#e8eef8');
    circle(ctx, moonX - r / 3, moonY + r / 4, Math.max(1, Math.floor(r / 5)), '#c4cfe6');
    circle(ctx, moonX + r / 3, moonY - r / 5, Math.max(1, Math.floor(r / 6)), '#c4cfe6');
  }
}

/** El gran reloj del cielo, con el Sol y la Luna en el centro (el final lo hace girar). */
export function drawSkyClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  separation: number,
  clock: number,
  reduce: boolean,
): void {
  circle(ctx, cx, cy, r, '#16132e');
  ring(ctx, cx, cy, r, 4, '#c9a24a');
  ring(ctx, cx, cy, r - 4, 1, '#7d6224');
  ring(ctx, cx, cy, r + 1, 1, '#7d6224');
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = i % 3 === 0 ? r - 15 : r - 10;
    line(ctx, cx + Math.cos(a) * inner, cy + Math.sin(a) * inner, cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6), '#f0d58a');
    if (i % 3 === 0) {
      line(ctx, cx + Math.cos(a) * inner + 1, cy + Math.sin(a) * inner, cx + Math.cos(a) * (r - 6) + 1, cy + Math.sin(a) * (r - 6), '#f0d58a');
    }
  }
  // Agujas: atascadas (tiemblan) mientras dura el eclipse; giran cuando vuelve a funcionar.
  const stuck = separation < 0.5;
  const jitter = stuck && !reduce ? Math.round(Math.sin(clock * 9)) * 0.04 : 0;
  const turn = stuck ? 0 : clock * 0.6;
  const hour = -Math.PI / 2 + 0.6 + jitter + turn * 0.2;
  const minute = -Math.PI / 2 - 1.1 - jitter + turn;
  const hub = Math.round(r * 0.3) + 2;
  line(ctx, cx + Math.cos(hour) * hub, cy + Math.sin(hour) * hub, cx + Math.cos(hour) * (r - 26), cy + Math.sin(hour) * (r - 26), '#f0d58a');
  line(ctx, cx + Math.cos(minute) * hub, cy + Math.sin(minute) * hub, cx + Math.cos(minute) * (r - 14), cy + Math.sin(minute) * (r - 14), '#c9a24a');
  // Dentro de la esfera: al separarse, cada uno queda a un lado sin salirse del reloj.
  const small = Math.round(r * 0.3);
  drawEclipse(ctx, cx, cy, small, separation, clock, reduce, (r - small - 8) / small);
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
export function twinkle(ctx: CanvasRenderingContext2D, clock: number, maxY = 260, top = 0): void {
  for (let i = 0; i < 30; i++) {
    const on = Math.sin(clock * (1 + hash(i, 11) * 2) + i * 1.7) > 0.7;
    if (!on) continue;
    const x = Math.floor(hash(i, 5) * ART_W);
    const y = top + Math.floor(hash(i, 6) * maxY);
    rect(ctx, x, y - 1, 1, 3, '#ffffff');
    rect(ctx, x - 1, y, 3, 1, '#ffffff');
  }
}
