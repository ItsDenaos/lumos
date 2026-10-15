// Reglas del nivel: qué es sólido para quién, charcos letales y estrellas.

import { RULES, WORLD } from '../config';
import { liquidOf, tileAt, type Liquid, type ParsedLevel, type Tile } from './level';
import { intersection } from './physics';
import type { PlayerId, Rect } from './types';

const T = WORLD.tile;

/** Cada uno cruza sin daño su metal; la sombra no perdona a nadie. */
export function isImmune(id: PlayerId, liquid: Liquid): boolean {
  if (liquid === 'gold') return id === 'mos';
  if (liquid === 'silver') return id === 'lu';
  return false;
}

/**
 * Parte sólida de una baldosa para un personaje (o para un bloque, con id null).
 * Los charcos ocupan la mitad superior: su mitad inferior es suelo.
 */
export function tileSolidRect(tile: Tile, col: number, row: number, id: PlayerId | null): Rect | null {
  switch (tile) {
    case 'stone':
      return { x: col * T, y: row * T, w: T, h: T };
    case 'goldWall':
      return id === 'mos' ? null : { x: col * T, y: row * T, w: T, h: T };
    case 'silverWall':
      return id === 'lu' ? null : { x: col * T, y: row * T, w: T, h: T };
    case 'goldPool':
    case 'silverPool':
    case 'shadowPool':
      return { x: col * T, y: row * T + T / 2, w: T, h: T / 2 };
    default:
      return null;
  }
}

/** Sólidos de las baldosas que tocan una región. */
export function tileSolidsIn(level: ParsedLevel, region: Rect, id: PlayerId | null): Rect[] {
  const solids: Rect[] = [];
  const c0 = Math.floor(region.x / T);
  const c1 = Math.floor((region.x + region.w) / T);
  const r0 = Math.floor(region.y / T);
  const r1 = Math.floor((region.y + region.h) / T);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const rect = tileSolidRect(tileAt(level, col, row), col, row, id);
      if (rect) solids.push(rect);
    }
  }
  return solids;
}

/** Zona de líquido de un charco: la mitad superior de su baldosa. */
export function liquidRect(col: number, row: number): Rect {
  return { x: col * T, y: row * T, w: T, h: T / 2 };
}

/** Líquido que mata a este personaje, si lo hay. Rozar el borde (≤ 4 px) no cuenta. */
export function lethalLiquid(level: ParsedLevel, box: Rect, id: PlayerId): Liquid | null {
  const c0 = Math.floor(box.x / T);
  const c1 = Math.floor((box.x + box.w) / T);
  const r0 = Math.floor(box.y / T);
  const r1 = Math.floor((box.y + box.h) / T);
  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      const liquid = liquidOf(tileAt(level, col, row));
      if (!liquid || isImmune(id, liquid)) continue;
      const overlap = intersection(box, liquidRect(col, row));
      if (overlap.w > RULES.liquidKillOverlap && overlap.h > RULES.liquidKillOverlap) return liquid;
    }
  }
  return null;
}

/** 1 por completar, 2 si además todas las gemas, 3 si además bajo el tiempo objetivo. */
export function computeStars(time: number, parTime: number, allGems: boolean): 1 | 2 | 3 {
  if (!allGems) return 1;
  return time <= parTime ? 3 : 2;
}
