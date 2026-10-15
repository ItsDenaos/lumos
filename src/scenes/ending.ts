// Final: el reloj del cielo vuelve a girar, el Sol y la Luna se separan y amanece,
// con estadísticas totales y créditos.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { totalStars } from '../core/storage';
import { es } from '../i18n/es';
import { drawSkyClock } from '../render/background';
import { drawCharacter } from '../render/characters';
import { ArtSurface } from '../render/pixel';
import { drawLedge, drawSky, idlePose } from '../render/screens';
import { drawText } from '../render/shapes';
import { drawPanel, drawTitleText } from '../render/ui';
import type { GameContext } from './context';
import { TitleScene } from './title';

const W = WORLD.width;
/** Segundos que tarda en separarse el eclipse y en amanecer. */
const SUNRISE = 4.5;
/** A partir de cuándo se puede salir. */
const SKIPPABLE = 2;

export class EndingScene implements Scene {
  private clock = 0;
  private readonly art = new ArtSurface();

  constructor(private readonly game: GameContext) {}

  enter(): void {
    this.game.audio.setMusic('dawn');
  }

  update(dt: number): void {
    const { input } = this.game;
    this.clock += dt;
    this.game.setCursor(false);
    if (this.clock < SKIPPABLE) return;
    if (input.anyPressed(KEYS.menu.confirm) || input.anyPressed(KEYS.menu.back) || input.click) {
      this.game.audio.play('menuSelect');
      this.game.scenes.switchTo(new TitleScene(this.game, true));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const reduce = this.game.settings.reduceEffects;
    const t = Math.min(1, this.clock / SUNRISE);
    const ease = t * t * (3 - 2 * t);
    const art = this.art.begin();
    drawSky(art, ease, this.clock, reduce);
    drawSkyClock(art, W / 4, 84 - Math.round(ease * 10), 56, ease, this.clock, reduce);
    drawLedge(art, 340);

    this.art.present(ctx);
    // Lu y Mos celebran, el doble de grandes.
    for (const [id, x] of [['lu', W / 2 - 470], ['mos', W / 2 + 470]] as const) {
      drawCharacter(ctx, id, idlePose(id, x, 680, this.clock, ease), 2);
    }

    const show = Math.max(0, Math.min(1, (this.clock - SUNRISE * 0.7) / 1.2));
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = show;
    drawTitleText(ctx, es.ending.title, W / 2, 338, 60);
    drawText(ctx, es.ending.story, W / 2, 392, { size: 22, align: 'center' });

    const save = this.game.save;
    const levels = this.game.levels;
    const bestSum = levels.reduce((sum, level) => sum + (save.levels[level.id]?.bestTime ?? 0), 0);
    drawPanel(ctx, { x: W / 2 - 330, y: 416, w: 660, h: 216 }, 0, COLORS.ui.solidPanel);
    drawText(ctx, es.ending.stars(totalStars(save), levels.length * 3), W / 2, 448, { size: 20, weight: 700, align: 'center', color: COLORS.ui.accent });
    drawText(ctx, es.ending.time(es.formatTime(bestSum)), W / 2, 474, { size: 18, align: 'center', outline: false });
    drawText(ctx, es.ending.deaths(save.deaths.mos, save.deaths.lu), W / 2, 498, { size: 18, align: 'center', outline: false });
    es.ending.credits.forEach((line, i) => {
      drawText(ctx, line, W / 2, 526 + i * 20, { size: 15, align: 'center', color: COLORS.ui.dim, outline: false });
    });
    drawText(ctx, es.ending.thanks, W / 2, 654, { size: 24, weight: 700, align: 'center', color: COLORS.mos.glow });
    if (this.clock > SKIPPABLE) drawText(ctx, es.ending.continue, W / 2, 684, { size: 16, align: 'center' });
    ctx.restore();
  }
}
