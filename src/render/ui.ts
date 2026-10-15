// Interfaz en pixel art: paneles con esquinas en escalón, botones, deslizadores, teclas,
// estrellas, logo, HUD y avisos. Se dibuja a resolución lógica (1280 × 720) con "píxeles"
// de 4 px para los bordes y los iconos ampliados sin suavizar.

import { COLORS, RULES, WORLD } from '../config';
import type { Point } from '../core/input';
import type { World } from '../game/world';
import { es } from '../i18n/es';
import { setFont } from './fonts';
import { drawIcon, flat } from './icons';
import { drawText } from './shapes';

const W = WORLD.width;
const H = WORLD.height;
const ACCENT = COLORS.ui.accent;
/** Tamaño de un "píxel" de la interfaz. */
const P = 4;

export interface UiRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function contains(r: UiRect, p: Point | null): boolean {
  return !!p && p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}

/** Rectángulos apilados en vertical y centrados en x. */
export function stackRects(cx: number, top: number, width: number, height: number, gap: number, count: number): UiRect[] {
  return Array.from({ length: count }, (_, i) => ({ x: cx - width / 2, y: top + i * (height + gap), w: width, h: height }));
}

function fillRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Caja con borde de un píxel, esquinas en escalón y un bisel claro arriba y oscuro abajo. */
export function pixelBox(
  ctx: CanvasRenderingContext2D,
  r: UiRect,
  fill: string,
  bevel: string = COLORS.ui.bevel,
  border: string = COLORS.ui.border,
): void {
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const w = Math.round(r.w);
  const h = Math.round(r.h);
  fillRect(ctx, x + P, y, w - 2 * P, h, border);
  fillRect(ctx, x, y + P, w, h - 2 * P, border);
  fillRect(ctx, x + P, y + P, w - 2 * P, h - 2 * P, fill);
  fillRect(ctx, x + P, y + P, w - 2 * P, P / 2, bevel);
  ctx.globalAlpha *= 0.5;
  fillRect(ctx, x + P, y + h - P - P / 2, w - 2 * P, P / 2, border);
  ctx.globalAlpha *= 2;
}

export function drawPanel(ctx: CanvasRenderingContext2D, r: UiRect, _radius = 0, fill: string = COLORS.ui.panel): void {
  pixelBox(ctx, r, fill);
}

/** Oscurece lo que haya detrás (pausa, resultados, opciones). */
export function dimBackground(ctx: CanvasRenderingContext2D, alpha = 0.6): void {
  ctx.fillStyle = `rgba(10, 6, 20, ${alpha})`;
  ctx.fillRect(0, 0, W, H);
}

/** Flecha de selección ▶ hecha de píxeles, con la punta en (x, cy). */
function cursorArrow(ctx: CanvasRenderingContext2D, x: number, cy: number, color: string): void {
  for (let i = 0; i < 4; i++) fillRect(ctx, x - (4 - i) * P, cy - (3 - i) * P, P, (3 - i) * 2 * P + P, color);
}

/** Botón. El seleccionado se resalta con borde dorado y una flecha a la izquierda. */
export function drawButton(ctx: CanvasRenderingContext2D, label: string, r: UiRect, selected: boolean, enabled = true): void {
  pixelBox(ctx, r, selected ? '#3a2f63' : '#231c3d', selected ? ACCENT : COLORS.ui.bevel, selected ? '#5c4310' : COLORS.ui.border);
  const size = Math.min(26, Math.round(r.h * 0.5));
  if (selected) cursorArrow(ctx, r.x + 22, r.y + r.h / 2, ACCENT);
  drawText(ctx, label, r.x + r.w / 2, r.y + r.h / 2, {
    size,
    weight: 700,
    align: 'center',
    color: enabled ? (selected ? ACCENT : COLORS.ui.text) : COLORS.ui.dim,
    outline: false,
  });
}

function rowBackground(ctx: CanvasRenderingContext2D, r: UiRect, selected: boolean): void {
  pixelBox(ctx, r, selected ? '#2e2550' : '#211a3a', selected ? ACCENT : COLORS.ui.bevel);
}

/** Fila con un deslizador de 0 a 1; devuelve el rectángulo de la pista (para el ratón). */
export function drawSlider(ctx: CanvasRenderingContext2D, label: string, r: UiRect, value: number, selected: boolean): UiRect {
  rowBackground(ctx, r, selected);
  drawText(ctx, label, r.x + 24, r.y + r.h / 2, { size: 22, color: selected ? ACCENT : COLORS.ui.text, outline: false });
  const track = sliderTrack(r);
  fillRect(ctx, track.x - P, track.y - P, track.w + 2 * P, track.h + 2 * P, COLORS.ui.border);
  fillRect(ctx, track.x, track.y, track.w, track.h, '#3a3152');
  const filled = Math.round((track.w * value) / P) * P;
  fillRect(ctx, track.x, track.y, filled, track.h, selected ? ACCENT : '#c9a24a');
  fillRect(ctx, track.x, track.y, filled, P / 2, '#fff2c8');
  const knobX = track.x + filled;
  fillRect(ctx, knobX - 8, track.y - 10, 16, track.h + 20, COLORS.ui.border);
  fillRect(ctx, knobX - 4, track.y - 6, 8, track.h + 12, '#ffffff');
  drawText(ctx, `${Math.round(value * 100)}%`, r.x + r.w - 24, r.y + r.h / 2, { size: 20, align: 'right', outline: false });
  return track;
}

export function sliderTrack(r: UiRect): UiRect {
  return { x: r.x + r.w * 0.48, y: r.y + r.h / 2 - 4, w: r.w * 0.36, h: 8 };
}

/** Fila con un interruptor Sí/No. */
export function drawToggle(
  ctx: CanvasRenderingContext2D,
  label: string,
  r: UiRect,
  on: boolean,
  selected: boolean,
  help?: string,
): void {
  rowBackground(ctx, r, selected);
  drawText(ctx, label, r.x + 24, r.y + r.h / 2 - (help ? 8 : 0), {
    size: 22,
    color: selected ? ACCENT : COLORS.ui.text,
    outline: false,
  });
  if (help) drawText(ctx, help, r.x + 24, r.y + r.h / 2 + 14, { size: 14, color: COLORS.ui.dim, outline: false });
  const sw = { x: r.x + r.w - 104, y: r.y + r.h / 2 - 14, w: 80, h: 28 };
  pixelBox(ctx, sw, on ? '#b0862a' : '#3a3152', on ? '#fff2c8' : COLORS.ui.bevel);
  const knob = on ? sw.x + sw.w - 28 : sw.x + 8;
  fillRect(ctx, knob, sw.y + 6, 20, 16, '#ffffff');
  fillRect(ctx, knob, sw.y + 18, 20, 4, '#b8b2cc');
  drawText(ctx, on ? es.options.on : es.options.off, sw.x - 14, r.y + r.h / 2, { size: 18, align: 'right', outline: false });
}

/** Parte un texto en líneas que quepan en maxWidth. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number): string[] {
  ctx.save();
  setFont(ctx, size);
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

/** Tecla dibujada en pixel art (las flechas se dibujan aparte, como vectores). */
export function drawKeycap(ctx: CanvasRenderingContext2D, label: string, cx: number, cy: number, size = 40): void {
  const x = Math.round(cx - size / 2);
  const y = Math.round(cy - size / 2);
  fillRect(ctx, x + P, y, size - 2 * P, size + P, COLORS.ui.border);
  fillRect(ctx, x, y + P, size, size - P, COLORS.ui.border);
  fillRect(ctx, x + P, y + P, size - 2 * P, size - P, '#b9ab95');
  fillRect(ctx, x + P, y + P, size - 2 * P, size - 3 * P, '#efe6d6');
  fillRect(ctx, x + P, y + P, size - 2 * P, P / 2, '#ffffff');
  drawText(ctx, label, cx, cy - 1, { size: size * 0.5, weight: 700, align: 'center', color: '#2e2440', outline: false, shadow: false });
}

/** Fila de 3 estrellas; scales permite animarlas una a una (0 = aún no aparece). */
export function drawStarRow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  filled: number,
  size: number,
  gap: number,
  scales: readonly number[] = [1, 1, 1],
): void {
  const base = Math.max(2, Math.round(size / 4));
  for (let i = 0; i < 3; i++) {
    const x = cx + (i - 1) * gap;
    drawIcon(ctx, 'star', x, cy, base, flat('star', '#3a3150'));
    const s = scales[i] ?? 1;
    if (i < filled && s > 0) drawIcon(ctx, 'star', x, cy, Math.max(1, Math.round(base * s)));
  }
}

/** Texto en dos tonos (claro arriba, oscuro abajo) con contorno grueso de píxel. */
function twoTone(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  top: string,
  bottom: string,
  outline = '#140c1e',
): void {
  const o = Math.max(3, Math.round(size / 15));
  ctx.fillStyle = outline;
  for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o], [0, o * 2], [-o, o * 2], [o, o * 2]]) {
    ctx.fillText(text, x + dx, y + dy);
  }
  ctx.fillStyle = top;
  ctx.fillText(text, x, y);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 2000, y + size * 0.06, 4000, size);
  ctx.clip();
  ctx.fillStyle = bottom;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Título grande en oro (claro arriba, más intenso abajo), con contorno de píxel. */
export function drawTitleText(ctx: CanvasRenderingContext2D, text: string, cx: number, cy: number, size: number): void {
  ctx.save();
  setFont(ctx, size, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  twoTone(ctx, text, cx, cy, size, '#ffe27a', '#f59e0b');
  ctx.restore();
}

// ── Partida ──────────────────────────────────────────────────────────────

/** Botón de pausa del HUD (se puede pulsar con el ratón). */
export const HUD_PAUSE: UiRect = { x: W - 52, y: 6, w: 44, h: 40 };

/** HUD superior: lunas de Lu, cronómetro, soles de Mos e icono de pausa. */
export function drawHud(ctx: CanvasRenderingContext2D, world: World, pauseHover = false): void {
  drawPanel(ctx, { x: W / 2 - 68, y: 6, w: 136, h: 40 });
  drawText(ctx, es.formatTime(world.time), W / 2, 25, { size: 22, weight: 700, align: 'center', outline: false });

  const lu = world.gemCount('lu');
  const mos = world.gemCount('mos');
  drawPanel(ctx, { x: W / 2 - 212, y: 6, w: 128, h: 40 });
  drawIcon(ctx, 'moon', W / 2 - 184, 26, 2);
  drawText(ctx, `${lu.collected}/${lu.total}`, W / 2 - 162, 25, { size: 20, weight: 700, outline: false });
  drawPanel(ctx, { x: W / 2 + 84, y: 6, w: 128, h: 40 });
  drawIcon(ctx, 'sun', W / 2 + 112, 26, 2);
  drawText(ctx, `${mos.collected}/${mos.total}`, W / 2 + 134, 25, { size: 20, weight: 700, outline: false });

  const p = HUD_PAUSE;
  pixelBox(ctx, p, pauseHover ? '#3a2f63' : COLORS.ui.panel, pauseHover ? ACCENT : COLORS.ui.bevel);
  fillRect(ctx, p.x + 14, p.y + 12, 6, 16, COLORS.ui.text);
  fillRect(ctx, p.x + 24, p.y + 12, 6, 16, COLORS.ui.text);
}

/** Rótulo "Nivel N · Nombre" que aparece y se desvanece al entrar. */
export function drawLevelBanner(ctx: CanvasRenderingContext2D, text: string, remaining: number): void {
  if (remaining <= 0) return;
  const fade = 0.3;
  const elapsed = RULES.levelTitleTime - remaining;
  const alpha = Math.max(0, Math.min(1, elapsed / fade, remaining / fade));
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPanel(ctx, { x: W / 2 - 300, y: H / 2 - 44, w: 600, h: 88 }, 0, COLORS.ui.solidPanel);
  drawText(ctx, text, W / 2, H / 2 - 2, { size: 34, weight: 700, align: 'center', color: ACCENT });
  ctx.restore();
}

export function drawDebugInfo(ctx: CanvasRenderingContext2D, fps: number, invincible: boolean): void {
  const text = `${es.debug.label} · ${es.debug.fps(Math.round(fps))}${invincible ? ` · ${es.debug.invincible}` : ''}`;
  drawText(ctx, text, 10, H - 14, { size: 14, color: '#9ef' });
  drawText(ctx, es.debug.help, W - 10, H - 14, { size: 14, align: 'right', color: '#9ef' });
}

/** Aviso breve abajo en el centro; remaining en segundos. */
export function drawToast(ctx: CanvasRenderingContext2D, text: string, remaining: number): void {
  if (remaining <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, remaining / 0.3);
  setFont(ctx, 20, 700);
  const width = Math.round((ctx.measureText(text).width + 56) / P) * P;
  drawPanel(ctx, { x: W / 2 - width / 2, y: H - 80, w: width, h: 48 }, 0, COLORS.ui.solidPanel);
  drawText(ctx, text, W / 2, H - 57, { size: 20, weight: 700, align: 'center', outline: false });
  ctx.restore();
}
