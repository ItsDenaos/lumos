// Mapa de niveles: sobre la ilustración de las 3 zonas, un camino que sube del Bosque del Alba
// al Observatorio, con un nodo por nivel que muestra estrellas y mejor tiempo. Los niveles
// bloqueados se ven en gris.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { isUnlocked } from '../core/storage';
import { es } from '../i18n/es';
import type { LevelData } from '../levels/types';
import { drawCharacter } from '../render/characters';
import { drawIcon, drawNumber } from '../render/icons';
import { PIXEL_COLORS, ZONE_STYLES } from '../render/palette';
import { drawMapArt, MAP_BANDS } from '../render/mapArt';
import { ArtSurface, circle, rect, ring } from '../render/pixel';
import { idlePose } from '../render/screens';
import { drawText, mix } from '../render/shapes';
import { contains, drawButton, drawPanel, drawStarRow, type UiRect } from '../render/ui';
import type { GameContext } from './context';
import { backPressed } from './menu';
import { PlayScene } from './play';
import { TitleScene } from './title';

const W = WORLD.width;
const H = WORLD.height;
const NODE_RADIUS = 30;
const BACK: UiRect = { x: 24, y: 18, w: 150, h: 44 };

/**
 * Huecos del camino: 3 por zona, subiendo en zigzag del Bosque del Alba al Observatorio.
 * Están colocados para no tapar el eclipse ni los estandartes; el último nivel, "El reloj del
 * cielo", está sobre la esfera armilar.
 */
export const MAP_SLOTS: readonly { x: number; y: number }[] = [
  { x: 200, y: 520 },
  { x: 560, y: 500 },
  { x: 880, y: 470 },
  { x: 1130, y: 360 },
  { x: 640, y: 350 },
  { x: 200, y: 340 },
  { x: 260, y: 180 },
  { x: 560, y: 130 },
  { x: 960, y: 205 },
];

/** Puntos del camino entre los huecos (en píxeles lógicos), cada pocos píxeles. */
function pathPoints(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 1; i < MAP_SLOTS.length; i++) {
    const a = MAP_SLOTS[i - 1];
    const b = MAP_SLOTS[i];
    // Curva suave hasta el punto medio y recta hasta el siguiente hueco.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const ctrl = { x: a.x, y: b.y };
    for (let t = 0; t < 1; t += 0.02) {
      const u = 1 - t;
      points.push({ x: u * u * a.x + 2 * u * t * ctrl.x + t * t * mid.x, y: u * u * a.y + 2 * u * t * ctrl.y + t * t * mid.y });
    }
    for (let t = 0; t < 1; t += 0.04) points.push({ x: mid.x + (b.x - mid.x) * t, y: mid.y + (b.y - mid.y) * t });
  }
  return points;
}

/** Puntos del camino, cada 18 px lógicos, ya en píxeles del arte. */
const PATH_DOTS: readonly { x: number; y: number }[] = (() => {
  const dots: { x: number; y: number }[] = [];
  let last: { x: number; y: number } | null = null;
  for (const p of pathPoints()) {
    if (last && Math.hypot(p.x - last.x, p.y - last.y) < 18) continue;
    last = p;
    dots.push({ x: Math.round(p.x / 2), y: Math.round(p.y / 2) });
  }
  return dots;
})();

function drawPath(ctx: CanvasRenderingContext2D): void {
  for (const { x, y } of PATH_DOTS) {
    rect(ctx, x - 2, y - 2, 4, 4, '#140c1e');
    rect(ctx, x - 1, y - 1, 2, 2, '#f1e4c8');
  }
}

/** Siguiente nivel desbloqueado en una dirección, o el mismo si no hay. */
export function stepSelection(levels: readonly LevelData[], unlocked: (id: number) => boolean, index: number, step: number): number {
  for (let i = index + step; i >= 0 && i < levels.length; i += step) if (unlocked(levels[i].id)) return i;
  return index;
}

export class LevelSelectScene implements Scene {
  private clock = 0;
  private index: number;
  private readonly art = new ArtSurface();

  constructor(
    private readonly game: GameContext,
    selectedId?: number,
  ) {
    const levels = game.levels;
    const wanted = selectedId ?? Math.min(game.save.unlocked, levels.length);
    const found = levels.findIndex((l) => l.id === wanted);
    this.index = found >= 0 && isUnlocked(game.save, levels[found].id) ? found : 0;
  }

  enter(): void {
    this.game.audio.setMusic('title');
  }

  private get levels(): readonly LevelData[] {
    return this.game.levels;
  }

  private unlocked = (id: number) => isUnlocked(this.game.save, id);

  private nodeRect(i: number): UiRect {
    const slot = MAP_SLOTS[i];
    return { x: slot.x - NODE_RADIUS - 6, y: slot.y - NODE_RADIUS - 6, w: NODE_RADIUS * 2 + 12, h: NODE_RADIUS * 2 + 12 };
  }

  update(dt: number): void {
    const { input, audio, scenes } = this.game;
    this.clock += dt;
    if (backPressed(this.game)) {
      scenes.switchTo(new TitleScene(this.game, true));
      return;
    }
    const before = this.index;
    if (input.anyPressed(KEYS.menu.left) || input.anyPressed(KEYS.menu.down)) {
      this.index = stepSelection(this.levels, this.unlocked, this.index, -1);
    }
    if (input.anyPressed(KEYS.menu.right) || input.anyPressed(KEYS.menu.up)) {
      this.index = stepSelection(this.levels, this.unlocked, this.index, 1);
    }

    const count = Math.min(this.levels.length, MAP_SLOTS.length);
    let hovered = -1;
    for (let i = 0; i < count; i++) if (contains(this.nodeRect(i), input.pointer)) hovered = i;
    const backHover = contains(BACK, input.pointer);
    this.game.setCursor((hovered >= 0 && this.unlocked(this.levels[hovered].id)) || backHover);
    if (hovered >= 0 && input.pointerMoved && this.unlocked(this.levels[hovered].id)) this.index = hovered;
    if (this.index !== before) audio.play('menuMove');

    if (input.click && contains(BACK, input.click)) {
      audio.play('menuSelect');
      scenes.switchTo(new TitleScene(this.game, true));
      return;
    }
    const clickedNode = input.click ? this.nodeIndexAt(input.click) : -1;
    const confirm = input.anyPressed(KEYS.menu.confirm) || (clickedNode >= 0 && clickedNode === this.index);
    if (confirm && this.unlocked(this.levels[this.index].id)) {
      audio.play('menuSelect');
      scenes.switchTo(new PlayScene(this.game, this.levels, this.index));
    }
  }

  private nodeIndexAt(point: { x: number; y: number }): number {
    const count = Math.min(this.levels.length, MAP_SLOTS.length);
    for (let i = 0; i < count; i++) if (contains(this.nodeRect(i), point)) return i;
    return -1;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const reduce = this.game.settings.reduceEffects;
    const art = this.art.begin();
    drawMapArt(art, this.clock, reduce);
    drawPath(art);
    const count = Math.min(this.levels.length, MAP_SLOTS.length);
    for (let i = 0; i < count; i++) this.drawNode(art, i);
    this.art.present(ctx);
    // Lu y Mos junto al nivel elegido.
    const slot = MAP_SLOTS[this.index];
    for (const [id, dx] of [['lu', -66], ['mos', 66]] as const) {
      drawCharacter(ctx, id, idlePose(id, slot.x + dx, slot.y + 30, this.clock));
    }

    for (let i = 0; i < count; i++) this.drawNodeText(ctx, i);
    for (const band of MAP_BANDS) {
      drawText(ctx, es.zones[band.zone], W - 24, band.top + 24, { size: 18, weight: 700, align: 'right', color: ZONE_STYLES[band.zone].rimLight });
    }
    drawText(ctx, es.levelSelect.title, W / 2, 40, { size: 34, weight: 700, align: 'center', color: COLORS.ui.accent });
    drawButton(ctx, `← ${es.menu.back}`, BACK, contains(BACK, this.game.input.pointer));
    this.drawInfo(ctx);
  }

  /** Nodo de un nivel, en el lienzo del arte. */
  private drawNode(art: CanvasRenderingContext2D, i: number): void {
    const level = this.levels[i];
    const x = MAP_SLOTS[i].x / 2;
    const y = MAP_SLOTS[i].y / 2;
    const r = NODE_RADIUS / 2;
    const open = this.unlocked(level.id);
    const record = this.game.save.levels[level.id];
    const style = ZONE_STYLES[level.zone];

    if (i === this.index) {
      const pulse = this.game.settings.reduceEffects ? 0 : Math.round(Math.sin(this.clock * 5) + 1);
      ring(art, x, y, r + 4 + pulse, 2, COLORS.ui.accent);
    }
    circle(art, x, y, r + 1, '#140c1e');
    const base = open ? mix(style.stone, '#ffffff', 0.15) : '#5c5866';
    circle(art, x, y, r, mix(base, '#000000', 0.25));
    circle(art, x - 1, y - 1, r - 2, base);
    circle(art, x - 5, y - 5, 2, mix(base, '#ffffff', 0.35));
    const edge = record?.bestTime ? PIXEL_COLORS.gold.base : open ? PIXEL_COLORS.silver.base : '#3c3846';
    ring(art, x, y, r, 2, edge);
    if (!open) drawIcon(art, 'lock', x, y, 2);
  }

  /** Número, estrellas y mejor tiempo de un nodo, a resolución lógica. */
  private drawNodeText(ctx: CanvasRenderingContext2D, i: number): void {
    const level = this.levels[i];
    if (!this.unlocked(level.id)) return;
    const slot = MAP_SLOTS[i];
    const record = this.game.save.levels[level.id];
    // Cifras de píxel, oscuras sobre el nodo claro (con la fuente, el 5 parecía una S).
    drawNumber(ctx, level.id, slot.x, slot.y, 4, '#1a1430');
    drawStarRow(ctx, slot.x, slot.y + NODE_RADIUS + 16, record?.stars ?? 0, 8, 22);
    if (record?.bestTime) {
      drawText(ctx, es.formatTime(record.bestTime), slot.x, slot.y + NODE_RADIUS + 38, { size: 14, align: 'center' });
    }
  }

  private drawInfo(ctx: CanvasRenderingContext2D): void {
    const level = this.levels[this.index];
    const record = this.game.save.levels[level.id];
    drawPanel(ctx, { x: W / 2 - 330, y: 620, w: 660, h: 88 }, 0, COLORS.ui.solidPanel);
    drawText(ctx, es.levelBanner(level.id, level.name), W / 2, 648, { size: 26, weight: 700, align: 'center', color: COLORS.ui.accent });
    const detail = record?.bestTime ? es.levelSelect.bestTime(es.formatTime(record.bestTime)) : es.levelSelect.noTime;
    drawText(ctx, `${es.zones[level.zone]} · ${detail}`, W / 2, 678, { size: 17, align: 'center', outline: false });
    drawText(ctx, es.levelSelect.hint, W / 2, H - 6, { size: 13, align: 'center', baseline: 'bottom', color: COLORS.ui.dim, outline: false });
  }
}
