// Resultados: tiempo, gemas, estrellas animadas y muertes de cada uno,
// con los botones Siguiente, Repetir y Mapa.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import type { WinResult } from '../core/storage';
import { es } from '../i18n/es';
import { drawIcon } from '../render/icons';
import { drawText } from '../render/shapes';
import { dimBackground, drawButton, drawPanel, drawStarRow, type UiRect } from '../render/ui';
import type { GameContext } from './context';
import { MenuController } from './menu';
import type { PlayScene } from './play';

const W = WORLD.width;
const H = WORLD.height;
const PANEL: UiRect = { x: W / 2 - 300, y: H / 2 - 236, w: 600, h: 472 };
const ITEMS = [es.results.next, es.results.replay, es.results.map];
const RECTS: UiRect[] = ITEMS.map((_, i) => ({ x: W / 2 - 270 + i * 186, y: PANEL.y + PANEL.h - 76, w: 168, h: 50 }));
/** Segundos entre estrella y estrella. */
const STAR_DELAY = 0.35;

export class ResultsScene implements Scene {
  private readonly menu = new MenuController(0);
  private clock = 0;
  private lastStarSound = -1;

  constructor(
    private readonly game: GameContext,
    private readonly play: PlayScene,
    private readonly win: WinResult | null,
  ) {}

  update(dt: number): void {
    const { input } = this.game;
    this.clock += dt;
    this.play.animate(dt);
    // Un tintineo por cada estrella que aparece.
    const star = Math.floor((this.clock - 0.2) / STAR_DELAY);
    if (star > this.lastStarSound && star < this.play.world.stars) {
      this.lastStarSound = star;
      this.game.audio.play('menuSelect');
    }
    if (input.anyPressed(KEYS.restart)) return this.replay();
    switch (this.menu.update(this.game, RECTS, undefined, 'horizontal')) {
      case 0:
        this.play.goNext();
        break;
      case 1:
        this.replay();
        break;
      case 2:
        this.play.exitToMap();
        break;
    }
  }

  private replay(): void {
    this.play.restart();
    this.game.scenes.pop();
  }

  /** Escala de cada estrella: aparecen una a una con un pequeño rebote. */
  private starScales(): number[] {
    return [0, 1, 2].map((i) => {
      const t = (this.clock - 0.2 - i * STAR_DELAY) / 0.25;
      if (t <= 0) return 0;
      if (t >= 1 || this.game.settings.reduceEffects) return 1;
      return 1 + Math.sin(t * Math.PI) * 0.45;
    });
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.play.render(ctx, alpha);
    const world = this.play.world;
    dimBackground(ctx, 0.55);
    drawPanel(ctx, PANEL, 26, COLORS.ui.solidPanel);
    const cx = W / 2;
    drawText(ctx, es.results.title, cx, PANEL.y + 46, { size: 38, weight: 700, align: 'center', color: COLORS.ui.accent });
    drawStarRow(ctx, cx, PANEL.y + 110, world.stars, 28, 72, this.starScales());
    if (this.win?.newBest && this.clock > 1.2) {
      drawText(ctx, es.results.newBest, cx, PANEL.y + 154, { size: 20, weight: 700, align: 'center', color: COLORS.mos.glow });
    }

    // Columnas: Lu a la izquierda y Mos a la derecha, como en el teclado.
    const left = PANEL.x + 70;
    const colLu = PANEL.x + 360;
    const colMos = PANEL.x + 480;
    let y = PANEL.y + 196;
    drawText(ctx, es.results.time, left, y, { size: 22 });
    drawText(ctx, es.formatTime(world.time), colLu - 30, y, { size: 24, weight: 700 });
    drawText(ctx, es.results.par(world.data.parTime), colMos + 40, y, {
      size: 16,
      align: 'right',
      color: COLORS.ui.dim,
      outline: false,
    });
    y += 46;
    drawIcon(ctx, 'moon', colLu, y, 2);
    drawIcon(ctx, 'sun', colMos, y, 2);
    drawText(ctx, es.players.lu, colLu, y + 24, { size: 16, align: 'center', color: COLORS.lu.silver, outline: false });
    drawText(ctx, es.players.mos, colMos, y + 24, { size: 16, align: 'center', color: COLORS.mos.gold, outline: false });
    y += 56;
    const lu = world.gemCount('lu');
    const mos = world.gemCount('mos');
    drawText(ctx, es.results.gems, left, y, { size: 22 });
    drawText(ctx, `${lu.collected}/${lu.total}`, colLu, y, { size: 22, weight: 700, align: 'center' });
    drawText(ctx, `${mos.collected}/${mos.total}`, colMos, y, { size: 22, weight: 700, align: 'center' });
    y += 40;
    drawText(ctx, es.results.deaths, left, y, { size: 22 });
    drawText(ctx, `${world.deaths.lu}`, colLu, y, { size: 22, weight: 700, align: 'center' });
    drawText(ctx, `${world.deaths.mos}`, colMos, y, { size: 22, weight: 700, align: 'center' });

    ITEMS.forEach((label, i) => drawButton(ctx, label, RECTS[i], i === this.menu.index));
  }
}
