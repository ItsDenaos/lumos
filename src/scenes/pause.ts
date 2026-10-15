// Pausa: Continuar, Reiniciar, Opciones y Salir al mapa. El cronómetro no avanza.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { es } from '../i18n/es';
import { drawText } from '../render/shapes';
import { dimBackground, drawButton, drawPanel, stackRects } from '../render/ui';
import type { GameContext } from './context';
import { MenuController } from './menu';
import { OptionsScene } from './options';
import type { PlayScene } from './play';

const W = WORLD.width;
const ITEMS = [es.pause.resume, es.pause.restart, es.pause.options, es.pause.exit];
const RECTS = stackRects(W / 2, 270, 320, 52, 14, ITEMS.length);

export class PauseScene implements Scene {
  private readonly menu = new MenuController();

  constructor(
    private readonly game: GameContext,
    private readonly play: PlayScene,
  ) {}

  update(): void {
    const { input, scenes } = this.game;
    if (input.anyPressed(KEYS.pause) || input.anyPressed(KEYS.menu.back)) {
      scenes.pop();
      return;
    }
    if (input.anyPressed(KEYS.restart)) {
      this.play.restart();
      scenes.pop();
      return;
    }
    switch (this.menu.update(this.game, RECTS)) {
      case 0:
        scenes.pop();
        break;
      case 1:
        this.play.restart();
        scenes.pop();
        break;
      case 2:
        scenes.push(new OptionsScene(this.game, this));
        break;
      case 3:
        this.play.exitToMap();
        break;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.play.render(ctx, 1);
    dimBackground(ctx, 0.6);
    drawPanel(ctx, { x: W / 2 - 220, y: 160, w: 440, h: 384 }, 26, COLORS.ui.solidPanel);
    drawText(ctx, es.pause.title, W / 2, 214, { size: 46, weight: 700, align: 'center', color: COLORS.ui.accent });
    ITEMS.forEach((label, i) => drawButton(ctx, label, RECTS[i], i === this.menu.index));
  }
}
