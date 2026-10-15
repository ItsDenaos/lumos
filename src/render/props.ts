// Elementos del nivel: puertas, gemas, botones, palancas, plataformas, bloques, rejas, charcos
// y la piedra. Son las piezas del diseño (src/assets/elementos.png, convertidas por
// tools/elementos/convertir.py) y se dibujan a resolución lógica: un píxel por píxel del juego,
// como Lu y Mos (el fondo va detrás, a píxel doble).

import sheetUrl from '../assets/elementos.png';
import { COLORS, WORLD } from '../config';
import type { Button } from '../game/entities/button';
import { gemRect, type Gem } from '../game/entities/gem';
import type { Lever } from '../game/entities/lever';
import type { Mover } from '../game/entities/mover';
import type { Liquid } from '../game/level';
import type { PlayerId } from '../game/types';
import type { Cell, Channel, Zone } from '../levels/types';
import { CHANNEL_SHAPES, drawIcon } from './icons';
import { circle, loadImage } from './pixel';
import { PROP_FRAMES, type PropFrame } from './propSheet';

const T = WORLD.tile;

let atlas: HTMLImageElement | null = null;

export async function loadProps(): Promise<void> {
  atlas = await loadImage(sheetUrl);
}

/** Dibuja una pieza con su esquina en (x, y); con w/h recorta la pieza (empezando por la izquierda y arriba). */
export function drawFrame(ctx: CanvasRenderingContext2D, name: PropFrame, x: number, y: number, w?: number, h?: number): void {
  if (!atlas) return;
  const [sx, sy, fw, fh] = PROP_FRAMES[name];
  const cw = Math.min(fw, w ?? fw);
  const ch = Math.min(fh, h ?? fh);
  ctx.drawImage(atlas, sx, sy, cw, ch, Math.round(x), Math.round(y), cw, ch);
}

/** Igual, pero recortando la pieza desde abajo (para medio bloque de piedra bajo un charco). */
export function drawFrameBottom(ctx: CanvasRenderingContext2D, name: PropFrame, x: number, y: number, h: number): void {
  if (!atlas) return;
  const [sx, sy, fw, fh] = PROP_FRAMES[name];
  ctx.drawImage(atlas, sx, sy + fh - h, fw, h, Math.round(x), Math.round(y), fw, h);
}

/** Fotograma de una animación de 4 a `fps` fotogramas por segundo (quieto con "reducir efectos"). */
function frame4(clock: number, fps: number, reduce: boolean, offset = 0): 0 | 1 | 2 | 3 {
  return reduce ? 0 : ((Math.floor(clock * fps + offset) % 4) as 0 | 1 | 2 | 3);
}

/** Puerta en arco: cerrada, abriéndose y abierta (open 0..1). Ocupa su celda y la de encima. */
export function drawDoor(ctx: CanvasRenderingContext2D, owner: PlayerId, cell: Cell, open: number): void {
  const state = open <= 0 ? 0 : open >= 1 ? 2 : 1;
  const [, , w, h] = PROP_FRAMES[`door-${owner}-0`];
  drawFrame(ctx, `door-${owner}-${state}`, cell[0] * T + (T - w) / 2, (cell[1] + 1) * T - h);
}

/** Sol de oro o luna de plata: brilla en 4 fotogramas y flota un poco. */
export function drawGem(ctx: CanvasRenderingContext2D, gem: Gem, clock: number, reduce: boolean): void {
  const r = gemRect([gem.col, gem.row]);
  const bob = reduce ? 0 : Math.round(Math.sin(clock * 3 + gem.col) * 3);
  const kind = gem.owner === 'mos' ? 'sun' : 'moon';
  const [, , w, h] = PROP_FRAMES[`gem-${kind}-0`];
  // Un halo suave detrás, para que se vean sobre los fondos con mucho detalle.
  ctx.globalAlpha = 0.3;
  circle(ctx, r.x + r.w / 2, r.y + r.h / 2 + bob, 14, gem.owner === 'mos' ? COLORS.mos.glow : COLORS.lu.glow);
  ctx.globalAlpha = 1;
  drawFrame(ctx, `gem-${kind}-${frame4(clock, 5, reduce, gem.col)}`, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2 + bob);
}

/** La forma del canal (opción "formas en los mecanismos"), centrada en (x, y). */
function channelShape(ctx: CanvasRenderingContext2D, channel: Channel, x: number, y: number): void {
  drawIcon(ctx, CHANNEL_SHAPES[channel], x, y, 2);
}

/** Placa de presión: en alto, o pisada y encendida. */
export function drawButton(ctx: CanvasRenderingContext2D, b: Button, shapes = false): void {
  const name: PropFrame = `button-${b.channel}-${b.pressed ? 'down' : 'up'}`;
  const [, , w, h] = PROP_FRAMES[name];
  drawFrame(ctx, name, b.col * T + (T - w) / 2, (b.row + 1) * T - h);
  if (shapes) channelShape(ctx, b.channel, b.col * T + T / 2, (b.row + 1) * T - (b.pressed ? 6 : 10));
}

/** Palanca: el mango a la izquierda (apagada) o a la derecha (encendida). angle va de -0,6 a 0,6 al moverse. */
export function drawLever(ctx: CanvasRenderingContext2D, l: Lever, angle: number, shapes = false): void {
  const name: PropFrame = `lever-${l.channel}-${angle > 0 ? 'on' : 'off'}`;
  const [, , w, h] = PROP_FRAMES[name];
  drawFrame(ctx, name, l.col * T + (T - w) / 2, (l.row + 1) * T - h);
  if (shapes) channelShape(ctx, l.channel, l.col * T + T / 2, (l.row + 1) * T - 9);
}

/** Plataforma móvil: horizontal (tapa, cuerpo repetido, tapa) o vertical (tapa arriba y abajo). */
export function drawMover(ctx: CanvasRenderingContext2D, m: Mover, x: number, y: number, shapes = false): void {
  const ch = m.channel;
  x = Math.round(x);
  y = Math.round(y);
  if (m.w >= m.h) {
    const [, , lw] = PROP_FRAMES[`platform-${ch}-left`];
    const [, , rw] = PROP_FRAMES[`platform-${ch}-right`];
    const [, , bw] = PROP_FRAMES[`platform-${ch}-body`];
    for (let bx = x + lw; bx < x + m.w - rw; bx += bw) drawFrame(ctx, `platform-${ch}-body`, bx, y, x + m.w - rw - bx, m.h);
    drawFrame(ctx, `platform-${ch}-left`, x, y);
    drawFrame(ctx, `platform-${ch}-right`, x + m.w - rw, y);
  } else {
    const [, , , th] = PROP_FRAMES['platform-vtop'];
    const [, , , bh] = PROP_FRAMES['platform-vbottom'];
    const [, , , vh] = PROP_FRAMES[`platform-${ch}-vbody`];
    for (let by = y + th; by < y + m.h - bh; by += vh) drawFrame(ctx, `platform-${ch}-vbody`, x, by, m.w, y + m.h - bh - by);
    drawFrame(ctx, 'platform-vtop', x, y);
    drawFrame(ctx, 'platform-vbottom', x, y + m.h - bh);
  }
  if (shapes) channelShape(ctx, ch, x + m.w / 2, y + m.h / 2);
}

/** Bloque de piedra tallada con su estrella, del estilo de la zona. */
export function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, zone: Zone): void {
  drawFrame(ctx, `block-${zone}`, x, y);
}

/**
 * Reja de metal: la de oro deja pasar a Mos y la de plata a Lu.
 * openTop / openBottom: no hay más reja encima o debajo (ahí van los rieles).
 */
export function drawMetalWall(ctx: CanvasRenderingContext2D, col: number, row: number, metal: 'gold' | 'silver', openTop: boolean, openBottom: boolean): void {
  const kind = openTop && openBottom ? 'single' : openTop ? 'top' : openBottom ? 'bottom' : 'middle';
  drawFrame(ctx, `gate-${metal}-${kind}`, col * T, row * T);
}

/** Un charco: la mitad de arriba de su celda, con su superficie animada en 4 fotogramas. */
export function drawLiquid(ctx: CanvasRenderingContext2D, liquid: Liquid, col: number, row: number, clock: number, reduce: boolean): void {
  drawFrame(ctx, `liquid-${liquid}-${frame4(clock, 4, reduce)}`, col * T, row * T);
}
