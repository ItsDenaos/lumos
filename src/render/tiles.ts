// Piedra del nivel, a resolución lógica: la textura de ladrillos de cada zona (del diseño) en cada
// baldosa sólida, con su remate arriba (pasto, moldura de oro o ribete de latón) donde da al aire
// y un contorno oscuro en los lados y abajo. Se pinta una sola vez por nivel (ver renderer.ts).

import { WORLD } from '../config';
import { liquidOf, tileAt, type ParsedLevel } from '../game/level';
import type { Zone } from '../levels/types';
import type { ZoneStyle } from './palette';
import { drawFrame, drawFrameBottom } from './props';
import { PROP_FRAMES } from './propSheet';
import { mix } from './shapes';

const T = WORLD.tile;
const HALF = T / 2;
/** Grosor del contorno donde la piedra da al aire. */
const EDGE = 2;

/** ¿Es piedra la media baldosa (col, k)? k cuenta medias filas: los charcos solo tienen piedra abajo. */
export function solidHalf(level: ParsedLevel, col: number, k: number): boolean {
  const tile = tileAt(level, col, Math.floor(k / 2));
  if (tile === 'stone') return true;
  return liquidOf(tile) !== null && k % 2 === 1;
}

export function renderStoneLayer(ctx: CanvasRenderingContext2D, level: ParsedLevel, zone: Zone, style: ZoneStyle): void {
  const outline = mix(style.mortar, '#000000', 0.35);
  ctx.imageSmoothingEnabled = false;

  // Ladrillos: la baldosa entera, o solo la mitad de abajo bajo un charco.
  for (let row = 0; row < WORLD.rows; row++) {
    for (let col = 0; col < WORLD.cols; col++) {
      const tile = tileAt(level, col, row);
      if (tile === 'stone') drawFrame(ctx, `stone-${zone}`, col * T, row * T);
      else if (liquidOf(tile)) drawFrameBottom(ctx, `stone-${zone}`, col * T, row * T + HALF, HALF);
    }
  }

  // Contorno donde la piedra da al aire (o al líquido), por medias baldosas.
  ctx.fillStyle = outline;
  for (let k = 0; k < WORLD.rows * 2; k++) {
    for (let col = 0; col < WORLD.cols; col++) {
      if (!solidHalf(level, col, k)) continue;
      const x = col * T;
      const y = k * HALF;
      if (col > 0 && !solidHalf(level, col - 1, k)) ctx.fillRect(x, y, EDGE, HALF);
      if (col < WORLD.cols - 1 && !solidHalf(level, col + 1, k)) ctx.fillRect(x + T - EDGE, y, EDGE, HALF);
      if (k < WORLD.rows * 2 - 1 && !solidHalf(level, col, k + 1)) ctx.fillRect(x, y + HALF - EDGE, T, EDGE);
      // Fondo del charco: una línea oscura bajo el líquido.
      if (k % 2 === 1 && liquidOf(tileAt(level, col, Math.floor(k / 2)))) ctx.fillRect(x, y, T, EDGE);
    }
  }

  // Remate de arriba en la piedra que tiene aire encima.
  const [, , , rimH] = PROP_FRAMES[`rim-${zone}`];
  for (let row = 1; row < WORLD.rows; row++) {
    for (let col = 0; col < WORLD.cols; col++) {
      if (tileAt(level, col, row) !== 'stone') continue;
      const above = tileAt(level, col, row - 1);
      if (above === 'stone' || liquidOf(above)) continue;
      drawFrame(ctx, `rim-${zone}`, col * T, row * T);
      // Debajo del remate, una línea de sombra para que el borde de arriba se lea sólido.
      ctx.fillStyle = mix(style.stoneDark, '#000000', 0.2);
      ctx.fillRect(col * T, row * T + rimH, T, 1);
    }
  }
}
