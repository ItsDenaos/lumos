// Lu y Mos en pantalla, con los fotogramas de la hoja de sprites del diseño.
// Se dibujan sobre el contexto lógico (1280 × 720) a un píxel lógico por píxel del sprite:
// el doble de resolución que el escenario, para que quepa el detalle del diseño.
// Cada fotograma (y su versión volteada o apagada) se recorta una sola vez en su propio canvas.

import sheetUrl from '../assets/personajes.png';
import type { PlayerId } from '../game/types';
import type { CharacterPose } from './animation';
import { loadImage } from './pixel';
import { SHEET, type CharacterAnim } from './sprites';

let sheet: HTMLImageElement | null = null;
const cache = new Map<string, HTMLCanvasElement>();

/** Carga la hoja de sprites antes de dibujar a nadie (sin ella no se ven, pero se puede jugar). */
export async function loadCharacters(): Promise<void> {
  sheet = await loadImage(sheetUrl);
}

/** Un fotograma recortado en su canvas: mirando a la izquierda (flip) o apagado (gray), si hace falta. */
function frameCanvas(id: PlayerId, anim: CharacterAnim, frame: number, flip: boolean, gray: boolean): HTMLCanvasElement | null {
  if (!sheet) return null;
  const key = `${id}:${anim}:${frame}:${flip ? 1 : 0}:${gray ? 1 : 0}`;
  let canvas = cache.get(key);
  if (!canvas) {
    const e = SHEET[id];
    const frames = e.frames[anim];
    const sx = frames[Math.max(0, Math.min(frames.length - 1, frame))];
    canvas = document.createElement('canvas');
    canvas.width = e.w;
    canvas.height = e.h;
    const ctx = canvas.getContext('2d')!;
    if (flip) {
      ctx.translate(e.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sheet, sx, e.y, e.w, e.h, 0, 0, e.w, e.h);
    if (gray) {
      // Gris oscuro: Mos apagándose.
      const data = ctx.getImageData(0, 0, e.w, e.h);
      const d = data.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * 0.6;
        d[i] = d[i + 1] = d[i + 2] = lum;
      }
      ctx.putImageData(data, 0, 0);
    }
    cache.set(key, canvas);
  }
  return canvas;
}

/**
 * Dibuja un personaje con los pies en (pose.x, pose.y), en coordenadas lógicas.
 * scale amplía el sprite (2 en el título y el final).
 */
export function drawCharacter(ctx: CanvasRenderingContext2D, id: PlayerId, pose: CharacterPose, scale = 1): void {
  if (pose.alpha <= 0) return;
  const flip = pose.facing === -1;
  const canvas = frameCanvas(id, pose.anim, pose.frame, flip, pose.dim > 0.5);
  if (!canvas) return;
  const e = SHEET[id];
  const fx = Math.round(pose.x);
  const fy = Math.round(pose.y - pose.lift);
  // Squash & stretch en filas enteras: el sprite se encoge o se estira hacia los pies.
  const squash = Math.max(-4, Math.min(6, Math.round((1 - pose.scaleY) * 16)));
  const anchorX = flip ? e.w - e.ax : e.ax;
  const dx = fx - anchorX * scale;
  const dy = fy - (e.ay - squash) * scale;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = pose.alpha;
  if (!pose.airborne && pose.lift === 0) {
    // Sombra en el suelo.
    ctx.globalAlpha = 0.3 * pose.alpha;
    ctx.fillStyle = '#000000';
    ctx.fillRect(fx - 12 * scale, fy, 24 * scale, 2 * scale);
    ctx.fillRect(fx - 8 * scale, fy - 2 * scale, 16 * scale, 2 * scale);
    ctx.globalAlpha = pose.alpha;
  }
  ctx.drawImage(canvas, dx, dy, e.w * scale, (e.h - squash) * scale);
  if (id === 'lu' && pose.anim === 'action' && pose.frame > 0) sparkles(ctx, e.tips[pose.frame], fx, fy, flip, pose.time, scale);
  ctx.restore();
}

/** Destellos que giran alrededor de la media luna del báculo mientras Lu lanza el hechizo. */
function sparkles(
  ctx: CanvasRenderingContext2D,
  tip: [number, number] | undefined,
  fx: number,
  fy: number,
  flip: boolean,
  time: number,
  scale: number,
): void {
  if (!tip) return;
  const cx = fx + (flip ? -tip[0] : tip[0]) * scale;
  const cy = fy + tip[1] * scale;
  const p = 2 * scale;
  for (let i = 0; i < 4; i++) {
    const a = time * 6 + (i * Math.PI) / 2;
    const x = Math.round(cx + Math.cos(a) * 11 * scale);
    const y = Math.round(cy + Math.sin(a) * 9 * scale);
    ctx.fillStyle = i % 2 ? '#ffffff' : '#a9c8ff';
    ctx.fillRect(x - p / 2, y - p * 1.5, p, p * 3);
    ctx.fillRect(x - p * 1.5, y - p / 2, p * 3, p);
  }
}
