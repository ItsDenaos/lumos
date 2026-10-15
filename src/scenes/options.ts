// Opciones: volumen general, música, efectos, pantalla completa, "reducir efectos" y
// "formas en los mecanismos" (para distinguir los colores de los canales sin depender del color).
// Se guardan al momento.

import { COLORS, KEYS, WORLD } from '../config';
import type { Scene } from '../core/scenes';
import type { Settings } from '../core/settings';
import { es } from '../i18n/es';
import { drawText } from '../render/shapes';
import { contains, dimBackground, drawButton, drawPanel, drawSlider, drawToggle, sliderTrack, stackRects } from '../render/ui';
import type { GameContext } from './context';
import { backPressed, MenuController } from './menu';

const W = WORLD.width;

type VolumeKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';
type ToggleKey = 'reduceEffects' | 'channelShapes';
type Row =
  | { kind: 'volume'; key: VolumeKey; label: string }
  | { kind: 'fullscreen' }
  | { kind: 'toggle'; key: ToggleKey; label: string; help: string }
  | { kind: 'back' };

const ROWS: Row[] = [
  { kind: 'volume', key: 'masterVolume', label: es.options.master },
  { kind: 'volume', key: 'musicVolume', label: es.options.music },
  { kind: 'volume', key: 'sfxVolume', label: es.options.sfx },
  { kind: 'fullscreen' },
  { kind: 'toggle', key: 'reduceEffects', label: es.options.reduceEffects, help: es.options.reduceEffectsHelp },
  { kind: 'toggle', key: 'channelShapes', label: es.options.channelShapes, help: es.options.channelShapesHelp },
  { kind: 'back' },
];
const RECTS = [...stackRects(W / 2, 168, 600, 58, 10, 6), { x: W / 2 - 120, y: 584, w: 240, h: 48 }];
const STEP = 0.1;

export class OptionsScene implements Scene {
  private readonly menu = new MenuController();

  constructor(
    private readonly game: GameContext,
    private readonly below: Scene,
  ) {}

  private get settings(): Settings {
    return this.game.settings;
  }

  update(): void {
    const { input } = this.game;
    if (backPressed(this.game)) {
      this.close();
      return;
    }

    // Clic directo en la pista de un deslizador: fija el valor.
    if (input.click) {
      ROWS.forEach((row, i) => {
        if (row.kind !== 'volume') return;
        const track = sliderTrack(RECTS[i]);
        const hit = { x: track.x - 14, y: RECTS[i].y, w: track.w + 28, h: RECTS[i].h };
        if (!contains(hit, input.click)) return;
        this.setVolume(row.key, (input.click!.x - track.x) / track.w);
      });
    }

    const chosen = this.menu.update(this.game, RECTS);
    const row = ROWS[this.menu.index];
    const left = input.anyPressed(KEYS.menu.left);
    const right = input.anyPressed(KEYS.menu.right);
    if (row.kind === 'volume' && (left || right)) {
      this.setVolume(row.key, this.settings[row.key] + (right ? STEP : -STEP));
      this.game.audio.play('menuMove');
    }
    if (row.kind === 'toggle' && (left || right)) this.setToggle(row.key, right);
    if (row.kind === 'fullscreen' && (left || right) && right !== this.game.isFullscreen()) this.game.toggleFullscreen();

    if (chosen === null) return;
    const picked = ROWS[chosen];
    if (picked.kind === 'fullscreen') this.game.toggleFullscreen();
    else if (picked.kind === 'toggle') this.setToggle(picked.key, !this.settings[picked.key]);
    else if (picked.kind === 'back') this.close();
  }

  private setVolume(key: VolumeKey, value: number): void {
    this.settings[key] = Math.round(Math.min(1, Math.max(0, value)) * 10) / 10;
    this.game.audio.applySettings();
    this.game.persist();
  }

  private setToggle(key: ToggleKey, on: boolean): void {
    this.settings[key] = on;
    this.game.persist();
  }

  private close(): void {
    this.game.persist();
    this.game.scenes.pop();
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.below.render(ctx, alpha);
    dimBackground(ctx, 0.7);
    drawPanel(ctx, { x: W / 2 - 340, y: 56, w: 680, h: 640 }, 26, COLORS.ui.solidPanel);
    drawText(ctx, es.options.title, W / 2, 110, { size: 40, weight: 700, align: 'center', color: COLORS.ui.accent });
    ROWS.forEach((row, i) => {
      const selected = i === this.menu.index;
      const r = RECTS[i];
      if (row.kind === 'volume') drawSlider(ctx, row.label, r, this.settings[row.key], selected);
      else if (row.kind === 'fullscreen') drawToggle(ctx, es.options.fullscreen, r, this.game.isFullscreen(), selected);
      else if (row.kind === 'toggle') drawToggle(ctx, row.label, r, this.settings[row.key], selected, row.help);
      else drawButton(ctx, es.menu.back, r, selected);
    });
    if (this.settings.muted) {
      drawText(ctx, es.options.mutedNote, W / 2, 650, { size: 16, align: 'center', color: COLORS.mos.glow, outline: false });
    }
    drawText(ctx, es.options.hint, W / 2, 674, { size: 16, align: 'center', color: COLORS.ui.dim, outline: false });
  }
}
