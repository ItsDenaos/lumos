// Pixel art: el mundo se dibuja en un lienzo pequeño (640 × 360) y se amplía sin suavizar.
// Los iconos se definen como rejillas de caracteres con una paleta.

import { WORLD } from '../config';

/** Píxeles lógicos por cada píxel del arte. */
export const ART_SCALE = 2;
export const ART_W = WORLD.width / ART_SCALE;
export const ART_H = WORLD.height / ART_SCALE;

/** De coordenadas lógicas a píxeles del arte (redondeando, para que nada quede a medio píxel). */
export function art(v: number): number {
  return Math.round(v / ART_SCALE);
}

export type Palette = Readonly<Record<string, string>>;
export type Grid = readonly string[];

/** Comprueba que una rejilla es rectangular y solo usa colores de la paleta. */
export function gridProblems(grid: Grid, palette: Palette): string[] {
  const problems: string[] = [];
  const width = grid[0]?.length ?? 0;
  grid.forEach((row, r) => {
    if (row.length !== width) problems.push(`fila ${r}: ${row.length} de ancho en vez de ${width}`);
    for (const ch of row) if (ch !== '.' && !(ch in palette)) problems.push(`fila ${r}: color "${ch}" sin definir`);
  });
  return problems;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Pinta una rejilla en un canvas propio (una sola vez; luego se dibuja con drawImage). */
export function makeSprite(grid: Grid, palette: Palette, flip = false): Sprite {
  const h = grid.length;
  const w = grid[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d')!;
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  return { canvas, w, h };
}

/** Rectángulo en píxeles enteros del arte. */
export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Rellena con un tramado de dos colores (patrón de tablero de ajedrez). */
export function dither(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string): void {
  rect(ctx, x, y, w, h, a);
  ctx.fillStyle = b;
  for (let yy = 0; yy < h; yy++) {
    for (let xx = (yy + x + y) % 2; xx < w; xx += 2) ctx.fillRect(x + xx, y + yy, 1, 1);
  }
}

/** Círculo relleno píxel a píxel (sin bordes suavizados). */
export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  ctx.fillStyle = color;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy + r * 0.8));
    ctx.fillRect(x0 - half, y0 + dy, half * 2 + 1, 1);
  }
}

/** Anillo píxel a píxel (entre r - grosor y r). */
export function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, thickness: number, color: string): void {
  ctx.fillStyle = color;
  const x0 = Math.round(cx);
  const y0 = Math.round(cy);
  const inner = r - thickness;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const d = dx * dx + dy * dy;
      if (d <= r * r + r * 0.8 && d > inner * inner + inner * 0.8) ctx.fillRect(x0 + dx, y0 + dy, 1, 1);
    }
  }
}

/** Crea un canvas de trabajo. */
export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** Contexto 2D con el suavizado apagado (los píxeles se amplían tal cual). */
export function pixelContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Carga una imagen incrustada en el juego; null si no se puede (el juego sigue sin ella). */
export async function loadImage(url: string): Promise<HTMLImageElement | null> {
  if (typeof Image === 'undefined') return null;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

/**
 * Lienzo del arte (640 × 360): se pinta en píxeles del arte y se vuelca ampliado
 * sin suavizar sobre el contexto lógico (1280 × 720).
 */
export class ArtSurface {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /** Empieza un fotograma: devuelve el contexto del arte, limpio (el canvas se crea al primer uso). */
  begin(): CanvasRenderingContext2D {
    if (!this.canvas || !this.ctx) {
      this.canvas = makeCanvas(ART_W, ART_H);
      this.ctx = pixelContext(this.canvas);
    }
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ART_W, ART_H);
    return ctx;
  }

  /** Vuelca el arte sobre el contexto lógico. */
  present(target: CanvasRenderingContext2D): void {
    if (!this.canvas) return;
    const smoothing = target.imageSmoothingEnabled;
    target.imageSmoothingEnabled = false;
    target.drawImage(this.canvas, 0, 0, WORLD.width, WORLD.height);
    target.imageSmoothingEnabled = smoothing;
  }
}
