// Selección en menús con teclado (flechas o WASD, Enter) y ratón (pasar por encima, clic).

import { KEYS } from '../config';
import { contains, type UiRect } from '../render/ui';
import type { GameContext } from './context';

export class MenuController {
  constructor(public index = 0) {}

  /**
   * Procesa un paso de entrada. Devuelve el índice confirmado (Enter o clic), o null.
   * @param axis vertical: ↑/↓ (y W/S); horizontal: ←/→ (y A/D)
   */
  update(
    game: GameContext,
    rects: readonly UiRect[],
    enabled: (i: number) => boolean = () => true,
    axis: 'vertical' | 'horizontal' = 'vertical',
  ): number | null {
    const { input, audio } = game;
    const back = axis === 'vertical' ? KEYS.menu.up : KEYS.menu.left;
    const forward = axis === 'vertical' ? KEYS.menu.down : KEYS.menu.right;
    if (input.anyPressed(back)) this.move(-1, rects.length, enabled, game);
    if (input.anyPressed(forward)) this.move(1, rects.length, enabled, game);

    // El ratón solo cambia la selección si se mueve: así no pisa al teclado.
    const hovered = rects.findIndex((r, i) => enabled(i) && contains(r, input.pointer));
    if (hovered >= 0 && input.pointerMoved && hovered !== this.index) {
      this.index = hovered;
      audio.play('menuMove');
    }
    game.setCursor(hovered >= 0);

    if (input.click) {
      const clicked = rects.findIndex((r, i) => enabled(i) && contains(r, input.click));
      if (clicked >= 0) {
        this.index = clicked;
        audio.play('menuSelect');
        return clicked;
      }
    }
    if (input.anyPressed(KEYS.menu.confirm) && enabled(this.index)) {
      audio.play('menuSelect');
      return this.index;
    }
    return null;
  }

  private move(step: number, count: number, enabled: (i: number) => boolean, game: GameContext): void {
    if (count === 0) return;
    let next = this.index;
    for (let tries = 0; tries < count; tries++) {
      next = (next + step + count) % count;
      if (enabled(next)) break;
    }
    if (next !== this.index) {
      this.index = next;
      game.audio.play('menuMove');
    }
  }
}

/** Tecla de volver (Esc o Retroceso). */
export function backPressed(game: GameContext): boolean {
  return game.input.anyPressed(KEYS.menu.back);
}
