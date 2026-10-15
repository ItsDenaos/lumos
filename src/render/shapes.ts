// Colores y texto con contorno de píxel (la fuente es Pixelify Sans).

import { COLORS } from '../config';
import { setFont } from './fonts';
import { digitsWidth, drawDigits } from './icons';

type RGB = [number, number, number];

/** Lee un color #RRGGBB. */
function parse(hex: string): RGB {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: RGB): string {
  const part = (c: number) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Aclara (amount > 0) u oscurece (amount < 0) un color #RRGGBB. */
export function shade(hex: string, amount: number): string {
  const target = amount > 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(parse(hex).map((c) => c + (target - c) * t) as RGB);
}

/** Mezcla dos colores #RRGGBB (t = 0 da el primero, t = 1 el segundo). */
export function mix(a: string, b: string, t: number): string {
  const ca = parse(a);
  const cb = parse(b);
  return toHex([0, 1, 2].map((i) => ca[i] + (cb[i] - ca[i]) * t) as RGB);
}

/** Un color #RRGGBB con transparencia. */
export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export interface TextStyle {
  size?: number;
  weight?: 500 | 700;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  color?: string;
  /** Contorno oscuro para leerse sobre cualquier fondo (sin él, solo una sombra abajo). */
  outline?: boolean;
  /** Sombra abajo cuando no hay contorno (sí por defecto). */
  shadow?: boolean;
}

/** Flechas que la fuente no trae: se dibujan como vectores (ángulo hacia donde apuntan). */
const ARROWS: Record<string, number> = { '→': 0, '↓': Math.PI / 2, '←': Math.PI, '↑': -Math.PI / 2 };
/** Lo que no se escribe con la fuente: las flechas y las cifras (que van con las cifras de píxel). */
const SPECIAL = /([←→↑↓]|[0-9]+)/;
const DIGIT_RUN = /^[0-9]+$/;

export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle = {}): void {
  const size = style.size ?? 18;
  ctx.save();
  setFont(ctx, size, style.weight ?? 500);
  ctx.textBaseline = style.baseline ?? 'middle';
  const color = style.color ?? COLORS.ui.text;
  const outline = style.outline ?? true;
  const align = style.align ?? 'left';
  // Contorno duro, como en el pixel art: el texto repetido alrededor en el color de la sombra,
  // con un píxel más de sombra hacia abajo.
  const o = Math.max(2, Math.round(size / 14));
  const offsets: [number, number][] = outline
    ? [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o], [0, o * 2], [-o, o * 2], [o, o * 2]]
    : style.shadow === false
      ? []
      : [[0, Math.max(2, Math.round(size / 12))]];

  if (!SPECIAL.test(text)) {
    ctx.textAlign = align;
    ctx.fillStyle = COLORS.ui.shadow;
    for (const [dx, dy] of offsets) ctx.fillText(text, x + dx, y + dy);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }

  // Con flechas o cifras: se mide cada trozo y se colocan uno tras otro.
  ctx.textAlign = 'left';
  const parts = text.split(SPECIAL).filter((part) => part.length > 0);
  const arrowWidth = size * 0.9;
  // Cifras: el alto de una mayúscula de la fuente (unos 7/10 del tamaño), con un hueco a cada lado.
  const px = size / 10;
  const widths = parts.map((part) =>
    part in ARROWS ? arrowWidth : DIGIT_RUN.test(part) ? digitsWidth(part, px) + px * 2 : ctx.measureText(part).width,
  );
  const total = widths.reduce((a, b) => a + b, 0);
  const left = align === 'center' ? x - total / 2 : align === 'right' || align === 'end' ? x - total : x;
  const baseline = ctx.textBaseline;
  const midY =
    baseline === 'middle'
      ? y
      : baseline === 'top' || baseline === 'hanging'
        ? y + size * 0.5
        : baseline === 'bottom' || baseline === 'ideographic'
          ? y - size * 0.5
          : y - size * 0.35;
  const paint = (dx: number, dy: number, fill: string) => {
    let cx = left + dx;
    ctx.fillStyle = fill;
    parts.forEach((part, i) => {
      if (part in ARROWS) drawArrow(ctx, cx + arrowWidth / 2, midY + dy, size * 0.36, ARROWS[part]);
      else if (DIGIT_RUN.test(part)) drawDigits(ctx, part, cx + px, midY + dy + size * 0.04, px, fill);
      else ctx.fillText(part, cx, y + dy);
      cx += widths[i];
    });
  };
  for (const [dx, dy] of offsets) paint(dx, dy, COLORS.ui.shadow);
  paint(0, 0, color);
  ctx.restore();
}

/** Flecha gruesa y recta centrada en (x, y), con el relleno actual. */
function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(r * 0.05, -r * 0.8);
  ctx.lineTo(r * 0.05, -r * 0.3);
  ctx.lineTo(-r, -r * 0.3);
  ctx.lineTo(-r, r * 0.3);
  ctx.lineTo(r * 0.05, r * 0.3);
  ctx.lineTo(r * 0.05, r * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
