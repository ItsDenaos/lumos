// Colisiones AABB resueltas por ejes: primero X, luego Y.
// Funciones puras, sin DOM, para poder probarlas con tests.

import type { Rect } from './types';

const EPS = 1e-6;

/** Solape estricto: tocarse por un borde no cuenta. */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Tamaño del solape entre dos rectángulos (negativo si no se tocan). */
export function intersection(a: Rect, b: Rect): { w: number; h: number } {
  return {
    w: Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x),
    h: Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y),
  };
}

export function isFree(box: Rect, solids: readonly Rect[]): boolean {
  return solids.every((s) => !overlaps(box, s));
}

export interface MoveResult {
  x: number;
  y: number;
  /** Algo frenó el movimiento horizontal. */
  hitX: boolean;
  /** Tocó suelo al bajar. */
  landed: boolean;
  /** Se dio con el techo al subir. */
  bumpedHead: boolean;
  /** Subió un escalón bajo caminando. */
  stepped: boolean;
}

/**
 * Mueve una caja dx y luego dy sin atravesar ningún sólido.
 * Solo frenan los sólidos que quedan por delante en la dirección del movimiento,
 * así nada se queda enganchado en algo que ya solapaba.
 * Con stepHeight > 0, un obstáculo cuyo borde superior esté a esa altura o menos
 * sobre los pies se sube caminando (el borde de un charco, un bloque hundido).
 */
export function moveBox(
  box: Rect,
  dx: number,
  dy: number,
  solids: readonly Rect[],
  stepHeight = 0,
): MoveResult {
  const { w, h } = box;
  let x = box.x;
  let y = box.y;
  let hitX = false;
  let stepped = false;

  if (dx !== 0) {
    const target = x + dx;
    const nx = sweepX(x, y, w, h, dx, solids);
    if (nx !== target) {
      const top = stepHeight > 0 ? highestBlockingTop(x, y, w, h, dx, solids) : null;
      const lift = top === null ? Infinity : y + h - top;
      if (lift > EPS && lift <= stepHeight + EPS && isFree({ x: target, y: top! - h, w, h }, solids)) {
        x = target;
        y = top! - h;
        stepped = true;
      } else {
        x = nx;
        hitX = true;
      }
    } else {
      x = nx;
    }
  }

  let landed = false;
  let bumpedHead = false;
  if (dy !== 0) {
    const target = y + dy;
    const ny = sweepY(x, y, w, h, dy, solids);
    if (ny !== target) {
      if (dy > 0) landed = true;
      else bumpedHead = true;
    }
    y = ny;
  }

  return { x, y, hitX, landed, bumpedHead, stepped };
}

function sweepX(x: number, y: number, w: number, h: number, dx: number, solids: readonly Rect[]): number {
  let nx = x + dx;
  for (const s of solids) {
    if (y >= s.y + s.h - EPS || y + h <= s.y + EPS) continue;
    if (dx > 0) {
      if (s.x >= x + w - EPS && s.x < nx + w) nx = Math.min(nx, s.x - w);
    } else if (s.x + s.w <= x + EPS && s.x + s.w > nx) {
      nx = Math.max(nx, s.x + s.w);
    }
  }
  return nx;
}

function sweepY(x: number, y: number, w: number, h: number, dy: number, solids: readonly Rect[]): number {
  let ny = y + dy;
  for (const s of solids) {
    if (x >= s.x + s.w - EPS || x + w <= s.x + EPS) continue;
    if (dy > 0) {
      if (s.y >= y + h - EPS && s.y < ny + h) ny = Math.min(ny, s.y - h);
    } else if (s.y + s.h <= y + EPS && s.y + s.h > ny) {
      ny = Math.max(ny, s.y + s.h);
    }
  }
  return ny;
}

/** Borde superior más alto entre los sólidos que frenan un movimiento horizontal. */
function highestBlockingTop(
  x: number,
  y: number,
  w: number,
  h: number,
  dx: number,
  solids: readonly Rect[],
): number | null {
  let top: number | null = null;
  const left = dx > 0 ? x + w : x + dx;
  const right = dx > 0 ? x + w + dx : x;
  for (const s of solids) {
    if (y >= s.y + s.h - EPS || y + h <= s.y + EPS) continue;
    if (s.x + s.w <= left + EPS || s.x >= right - EPS) continue;
    if (top === null || s.y < top) top = s.y;
  }
  return top;
}
