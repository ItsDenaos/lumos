// Iconos en pixel art: sol, luna, estrella, aspa y candado. Se dibujan ampliados sin suavizar.

import { makeSprite, type Grid, type Palette, type Sprite } from './pixel';

const SUN: Grid = [
  '....r....',
  '.r..r..r.',
  '...ooo...',
  '..oOOOo..',
  'rroOOOorr',
  '..oOOOo..',
  '...ooo...',
  '.r..r..r.',
  '....r....',
];

const MOON: Grid = [
  '...mmmm..',
  '..mMMm...',
  '.mMMm....',
  '.mMM.....',
  '.mMM.....',
  '.mMMm....',
  '..mMMm...',
  '...mmmm..',
  '.........',
];

const STAR: Grid = [
  '....y....',
  '....y....',
  '...yYy...',
  'yyyYYYyyy',
  '.yYYYYYy.',
  '..yYYYy..',
  '..yYyYy..',
  '.yYy.yYy.',
  '.yy...yy.',
];

const CROSS: Grid = ['v...v', '.v.v.', '..v..', '.v.v.', 'v...v'];

const LOCK: Grid = ['..kkk..', '.k...k.', '.k...k.', 'kkkkkkk', 'kLLLLLk', 'kLLkLLk', 'kLLLLLk', 'kkkkkkk'];

// Formas de los canales (opción "formas en los mecanismos"): blancas con contorno oscuro,
// para no depender del color.
const TRIANGLE: Grid = ['...k...', '..kfk..', '..kfk..', '.kfffk.', '.kfffk.', 'kfffffk', 'kkkkkkk'];
const CIRCLE: Grid = ['..kkk..', '.kfffk.', 'kfffffk', 'kfffffk', 'kfffffk', '.kfffk.', '..kkk..'];
const SQUARE: Grid = ['kkkkkkk', 'kfffffk', 'kfffffk', 'kfffffk', 'kfffffk', 'kfffffk', 'kkkkkkk'];
const DIAMOND: Grid = ['...k...', '..kfk..', '.kfffk.', 'kfffffk', '.kfffk.', '..kfk..', '...k...'];

export type IconName = 'sun' | 'moon' | 'star' | 'cross' | 'lock' | 'triangle' | 'circle' | 'square' | 'diamond';

const GRIDS: Record<IconName, Grid> = {
  sun: SUN,
  moon: MOON,
  star: STAR,
  cross: CROSS,
  lock: LOCK,
  triangle: TRIANGLE,
  circle: CIRCLE,
  square: SQUARE,
  diamond: DIAMOND,
};

/** Colores por defecto de cada icono (se pueden cambiar al pedirlo). */
const DEFAULT_PALETTES: Record<IconName, Palette> = {
  sun: { o: '#f5a524', O: '#ffe08a', r: '#f5a524' },
  moon: { m: '#aebfe0', M: '#f2f6ff' },
  star: { y: '#e0a019', Y: '#ffd866' },
  cross: { v: '#b57bff' },
  lock: { k: '#2a2632', L: '#6b6576' },
  triangle: { k: '#140c1e', f: '#ffffff' },
  circle: { k: '#140c1e', f: '#ffffff' },
  square: { k: '#140c1e', f: '#ffffff' },
  diamond: { k: '#140c1e', f: '#ffffff' },
};

/** La forma de cada canal: verde triángulo, rosa círculo, cian cuadrado y blanco rombo. */
export const CHANNEL_SHAPES = { green: 'triangle', pink: 'circle', cyan: 'square', white: 'diamond' } as const satisfies Record<
  string,
  IconName
>;

const cache = new Map<string, Sprite>();

/** Sprite de un icono (con su paleta o con otra). */
export function icon(name: IconName, palette: Palette = DEFAULT_PALETTES[name]): Sprite {
  const key = `${name}:${JSON.stringify(palette)}`;
  let sprite = cache.get(key);
  if (!sprite) {
    sprite = makeSprite(GRIDS[name], palette);
    cache.set(key, sprite);
  }
  return sprite;
}

/** Paleta de un icono en un solo color (para sombras, apagados, etc.). */
export function flat(name: IconName, color: string): Palette {
  const palette: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_PALETTES[name])) palette[key] = color;
  return palette;
}

/** Dibuja un icono centrado en (x, y), a `scale` píxeles por píxel del icono. */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  x: number,
  y: number,
  scale: number,
  palette?: Palette,
): void {
  const sprite = icon(name, palette);
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  ctx.drawImage(sprite.canvas, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
  ctx.imageSmoothingEnabled = smoothing;
}

export const ICON_GRIDS = GRIDS;
export const ICON_PALETTES = DEFAULT_PALETTES;

/**
 * Cifras de 5 × 7 píxeles. Todos los números del juego se escriben con ellas (también dentro de
 * los textos): en la fuente Pixelify Sans el 5 es casi igual que una S.
 */
export const DIGITS: Record<string, Grid> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
};

const digitCache = new Map<string, Sprite>();

function digitSprite(ch: string, color: string): Sprite {
  const key = `${ch}:${color}`;
  let sprite = digitCache.get(key);
  if (!sprite) {
    sprite = makeSprite(DIGITS[ch], { '#': color });
    digitCache.set(key, sprite);
  }
  return sprite;
}

/** Ancho de una tira de cifras de píxel a `px` píxeles por píxel (cada cifra: 5 de ancho y 1 de separación). */
export function digitsWidth(digits: string, px: number): number {
  return digits.length * 6 * px - px;
}

/** Una tira de cifras de píxel con su borde izquierdo en x y centrada en altura en y. */
export function drawDigits(ctx: CanvasRenderingContext2D, digits: string, x: number, y: number, px: number, color: string): void {
  const smoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  for (let i = 0; i < digits.length; i++) {
    ctx.drawImage(digitSprite(digits[i], color).canvas, x + i * 6 * px, y - 3.5 * px, 5 * px, 7 * px);
  }
  ctx.imageSmoothingEnabled = smoothing;
}

/** Escribe un número con las cifras de píxel, centrado en (x, y), a `scale` píxeles por píxel. */
export function drawNumber(ctx: CanvasRenderingContext2D, value: number, x: number, y: number, scale: number, color: string): void {
  const text = String(value);
  drawDigits(ctx, text, Math.round(x - digitsWidth(text, scale) / 2), Math.round(y), scale, color);
}
