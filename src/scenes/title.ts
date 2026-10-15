// Título: la portada de Lu y Mos con el logo de LUMOS. En el hueco junto a Lu, "Pulsa Enter"
// y después el menú (Jugar, Cómo jugar y Opciones); en el hueco junto a Mos, la historia.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import { es } from '../i18n/es';
import { COVER, drawCover } from '../render/cover';
import { drawIcon } from '../render/icons';
import { ArtSurface } from '../render/pixel';
import { drawText } from '../render/shapes';
import { drawButton, stackRects, wrapText, type UiRect } from '../render/ui';
import type { GameContext } from './context';
import { HowToScene } from './howto';
import { LevelSelectScene } from './levelSelect';
import { backPressed, MenuController } from './menu';
import { OptionsScene } from './options';

const W = WORLD.width;
const ITEMS = [es.menu.play, es.menu.howTo, es.menu.options];

/** De un recuadro del arte a coordenadas lógicas. */
function logical(r: UiRect): UiRect {
  return { x: r.x * 2, y: r.y * 2, w: r.w * 2, h: r.h * 2 };
}

const LU_PANEL = logical(COVER.luPanel);
const STORY = logical(COVER.mosPanel);
const MENU_X = LU_PANEL.x + LU_PANEL.w / 2;
const MENU_Y = LU_PANEL.y + LU_PANEL.h / 2;
/** Botones del menú (exportados para los tests con ratón). */
export const TITLE_MENU = stackRects(MENU_X, MENU_Y - 91, 216, 50, 16, ITEMS.length);

export class TitleScene implements Scene {
  private clock = 0;
  private showMenu: boolean;
  private readonly menu = new MenuController();
  private readonly art = new ArtSurface();

  constructor(
    private readonly game: GameContext,
    startInMenu = false,
  ) {
    this.showMenu = startInMenu;
  }

  enter(): void {
    this.game.audio.setMusic('title');
  }

  update(dt: number): void {
    const { input, scenes, audio } = this.game;
    this.clock += dt;
    if (!this.showMenu) {
      this.game.setCursor(false);
      if (input.anyPressed(KEYS.menu.confirm) || input.click) {
        this.showMenu = true;
        audio.play('menuSelect');
      }
      return;
    }
    if (backPressed(this.game)) {
      this.showMenu = false;
      return;
    }
    const chosen = this.menu.update(this.game, TITLE_MENU);
    if (chosen === 0) scenes.switchTo(new LevelSelectScene(this.game));
    else if (chosen === 1) scenes.push(new HowToScene(this.game, this));
    else if (chosen === 2) scenes.push(new OptionsScene(this.game, this));
  }

  render(ctx: CanvasRenderingContext2D): void {
    const reduce = this.game.settings.reduceEffects;
    drawCover(this.art.begin(), this.clock, reduce);
    this.art.present(ctx);

    // Junto a Lu: "Pulsa Enter" y luego el menú.
    if (this.showMenu) {
      ITEMS.forEach((label, i) => drawButton(ctx, label, TITLE_MENU[i], i === this.menu.index));
    } else {
      const on = reduce || Math.sin(this.clock * 3) > -0.3;
      drawIcon(ctx, 'moon', MENU_X, MENU_Y - 44, 3);
      if (on) drawText(ctx, es.pressEnter, MENU_X, MENU_Y + 6, { size: 28, weight: 700, align: 'center', color: COLORS.ui.accent });
      drawText(ctx, es.title.toStart, MENU_X, MENU_Y + 44, { size: 15, align: 'center', color: COLORS.ui.dim, outline: false });
    }

    // Junto a Mos: la historia del reloj del cielo, en la parte que no tapa su escudo.
    const cx = STORY.x + STORY.w / 2;
    drawIcon(ctx, 'sun', cx, STORY.y + 34, 3);
    drawText(ctx, es.gameSubtitle, cx, STORY.y + 80, { size: 20, weight: 700, align: 'center', color: COLORS.mos.glow });
    wrapText(ctx, es.prologue, STORY.w - 18, 15).forEach((line, i) => {
      drawText(ctx, line, cx, STORY.y + 122 + i * 21, { size: 15, align: 'center', color: COLORS.ui.text, outline: false });
    });

    // Abajo, quién juega con qué.
    drawText(ctx, es.title.controls, W / 2, 664, { size: 18, align: 'center', color: COLORS.lu.glow });
  }
}
