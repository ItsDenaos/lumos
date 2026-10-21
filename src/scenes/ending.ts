// Final: amanece desde la terraza del Observatorio y el reloj del cielo vuelve a girar,
// con estadísticas totales y un reto para seguir jugando.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { totalStars } from '../core/storage';
import { es } from '../i18n/es';
import { drawCharacter } from '../render/characters';
import { drawEndingArt, ENDING_FLOOR } from '../render/endingArt';
import { ART_SCALE, ArtSurface } from '../render/pixel';
import { idlePose } from '../render/screens';
import { drawText } from '../render/shapes';
import { drawPanel, drawTitleText } from '../render/ui';
import type { GameContext } from './context';
import { TitleScene } from './title';

const W = WORLD.width;
/** Segundos que tarda en amanecer; a la mitad, el reloj vuelve a girar. */
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
    drawEndingArt(art, ease, this.clock, this.clock - SUNRISE / 2, reduce);

    this.art.present(ctx);
    // Lu y Mos celebran en la terraza, el doble de grandes (por dentro del telescopio y del engranaje).
    for (const [id, x] of [['lu', W / 2 - 440], ['mos', W / 2 + 440]] as const) {
      drawCharacter(ctx, id, idlePose(id, x, ENDING_FLOOR * ART_SCALE, this.clock, ease), 2);
    }

    const show = Math.max(0, Math.min(1, (this.clock - SUNRISE * 0.7) / 1.2));
    if (show <= 0) return;
    ctx.save();
    ctx.globalAlpha = show;
    drawTitleText(ctx, es.ending.title, W / 2, 332, 60);
    drawText(ctx, es.ending.story, W / 2, 384, { size: 22, align: 'center' });

    const save = this.game.save;
    const levels = this.game.levels;
    const bestSum = levels.reduce((sum, level) => sum + (save.levels[level.id]?.bestTime ?? 0), 0);
    const stars = totalStars(save);
    const total = levels.length * 3;
    drawPanel(ctx, { x: W / 2 - 330, y: 406, w: 660, h: 176 }, 0, COLORS.ui.solidPanel);
    drawText(ctx, es.ending.stars(stars, total), W / 2, 436, { size: 20, weight: 700, align: 'center', color: COLORS.ui.accent });
    drawText(ctx, es.ending.time(es.formatTime(bestSum)), W / 2, 462, { size: 18, align: 'center', outline: false });
    drawText(ctx, es.ending.deaths(save.deaths.mos, save.deaths.lu), W / 2, 486, { size: 18, align: 'center', outline: false });
    const [goal, hint] = es.ending.challenge(total - stars, total, save.deaths.mos + save.deaths.lu);
    drawText(ctx, goal, W / 2, 524, { size: 18, align: 'center', outline: false });
    drawText(ctx, hint, W / 2, 550, { size: 16, align: 'center', color: COLORS.ui.dim, outline: false });
    drawText(ctx, es.ending.thanks, W / 2, 654, { size: 24, weight: 700, align: 'center', color: COLORS.mos.glow });
    if (this.clock > SKIPPABLE) drawText(ctx, es.ending.continue, W / 2, 684, { size: 16, align: 'center' });
    ctx.restore();
  }
}
