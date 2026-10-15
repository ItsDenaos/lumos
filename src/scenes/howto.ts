// Cómo jugar: controles de cada uno, reglas básicas y el aviso de ghosting.

import { COLORS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { es } from '../i18n/es';
import { drawText } from '../render/shapes';
import { dimBackground, drawButton, drawKeycap, drawPanel, wrapText } from '../render/ui';
import type { GameContext } from './context';
import { backPressed, MenuController } from './menu';

const W = WORLD.width;
const BACK = { x: W / 2 - 120, y: 632, w: 240, h: 48 };

export class HowToScene implements Scene {
  private readonly menu = new MenuController();

  constructor(
    private readonly game: GameContext,
    private readonly below: Scene,
  ) {}

  update(): void {
    if (backPressed(this.game) || this.menu.update(this.game, [BACK]) !== null) this.game.scenes.pop();
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.below.render(ctx, alpha);
    dimBackground(ctx, 0.7);
    drawPanel(ctx, { x: 110, y: 28, w: W - 220, h: 664 }, 26, COLORS.ui.solidPanel);
    drawText(ctx, es.howTo.title, W / 2, 72, { size: 40, weight: 700, align: 'center', color: COLORS.ui.accent });
    drawText(ctx, es.howTo.intro, W / 2, 112, { size: 20, align: 'center', outline: false });
    drawText(ctx, es.howTo.story, W / 2, 140, { size: 16, align: 'center', color: COLORS.lu.glow, outline: false });

    // Controles: Lu a la izquierda del teclado, Mos a la derecha.
    const rows = [es.howTo.move, es.howTo.jump, es.howTo.lever];
    const columns = [
      { name: es.players.lu, color: COLORS.lu.silver, x: 400, keys: [['A', 'D'], ['W'], ['S']] },
      { name: es.players.mos, color: COLORS.mos.gold, x: 880, keys: [['←', '→'], ['↑'], ['↓']] },
    ];
    for (const column of columns) {
      drawText(ctx, column.name, column.x, 180, { size: 26, weight: 700, align: 'center', color: column.color });
      column.keys.forEach((keys, row) => {
        const y = 224 + row * 52;
        drawText(ctx, rows[row], column.x - 30, y, { size: 19, align: 'right', outline: false });
        keys.forEach((key, k) => drawKeycap(ctx, key, column.x + 10 + k * 50, y, 40));
      });
    }

    es.howTo.rules.forEach((rule, i) => {
      const y = 398 + i * 28;
      ctx.fillStyle = COLORS.ui.accent;
      ctx.fillRect(172, y - 4, 8, 8);
      drawText(ctx, rule, 192, y, { size: 18, outline: false });
    });
    drawText(ctx, es.howTo.keys, W / 2, 568, { size: 18, align: 'center', color: COLORS.ui.accent, outline: false });
    wrapText(ctx, es.howTo.ghosting, 900, 15).forEach((line, i) => {
      drawText(ctx, line, W / 2, 592 + i * 18, { size: 15, align: 'center', color: COLORS.ui.dim, outline: false });
    });
    drawButton(ctx, es.menu.back, BACK, true);
  }
}
