// Partida: un nivel con su HUD, sonidos, pausa, reinicio, resultados y teclas de depuración.

import { DEBUG_KEYS, KEYS, RULES } from '../config';
import type { Sfx } from '../core/audio';
import type { Scene } from '../core/scenes';
import { recordWin, type WinResult } from '../core/storage';
import type { GameEvent } from '../game/world';
import { World } from '../game/world';
import { es } from '../i18n/es';
import type { LevelData } from '../levels/types';
import { LevelRenderer } from '../render/renderer';
import { contains, drawDebugInfo, drawHud, drawLevelBanner, HUD_PAUSE } from '../render/ui';
import type { GameContext } from './context';
import { EndingScene } from './ending';
import { LevelSelectScene } from './levelSelect';
import { PauseScene } from './pause';
import { ResultsScene } from './results';

const NO_INPUT = { left: false, right: false, jumpHeld: false, jumpPressed: false, actionPressed: false };

export class PlayScene implements Scene {
  readonly world: World;
  private readonly renderer: LevelRenderer;
  private bannerRemaining: number = RULES.levelTitleTime;
  private showHitboxes = false;
  private resultsShown = false;
  private win: WinResult | null = null;

  /**
   * @param levels lista de niveles por la que avanza N en depuración (la campaña, y el sandbox)
   * @param levelIndex nivel de esa lista que se juega
   */
  constructor(
    private readonly game: GameContext,
    private readonly levels: readonly LevelData[],
    private readonly levelIndex: number,
  ) {
    this.world = new World(levels[levelIndex]);
    this.renderer = new LevelRenderer(this.world, game.settings);
  }

  get data(): LevelData {
    return this.world.data;
  }

  /** Posición en la campaña; -1 si no es de la campaña (el sandbox no guarda progreso). */
  private get campaignIndex(): number {
    return this.game.levels.indexOf(this.data);
  }

  enter(): void {
    this.game.audio.setMusic(this.data.zone);
  }

  exit(): void {
    this.game.audio.setHum(false);
  }

  update(dt: number): void {
    const { input } = this.game;

    if (this.game.debug) {
      if (input.wasPressed(DEBUG_KEYS.hitboxes)) this.showHitboxes = !this.showHitboxes;
      if (input.wasPressed(DEBUG_KEYS.invincible)) this.world.invincible = !this.world.invincible;
      if (input.wasPressed(DEBUG_KEYS.zone)) this.renderer.cycleZone();
      if (input.wasPressed(DEBUG_KEYS.dark)) this.renderer.dark = !this.renderer.dark;
      if (input.wasPressed(DEBUG_KEYS.nextLevel)) {
        this.game.scenes.switchTo(new PlayScene(this.game, this.levels, (this.levelIndex + 1) % this.levels.length));
        return;
      }
    }

    const playing = this.world.state !== 'won';
    this.game.setCursor(playing && contains(HUD_PAUSE, input.pointer));
    if (playing && (input.anyPressed(KEYS.pause) || (input.click && contains(HUD_PAUSE, input.click)))) {
      this.pause();
      return;
    }
    if (input.anyPressed(KEYS.restart)) {
      this.restart();
      return;
    }

    this.bannerRemaining = Math.max(0, this.bannerRemaining - dt);
    this.world.step({ mos: input.controlsFor('mos'), lu: input.controlsFor('lu') }, dt);
    this.afterStep(dt);

    if (this.world.state === 'won' && this.world.stateTime >= RULES.resultsDelay && !this.resultsShown) {
      this.resultsShown = true;
      this.game.scenes.push(new ResultsScene(this.game, this, this.win));
    }
  }

  /** Sigue animando el nivel (partículas, agua…) mientras hay algo encima, sin mover a nadie. */
  animate(dt: number): void {
    if (this.world.state === 'won') this.world.step({ mos: NO_INPUT, lu: NO_INPUT }, dt);
    this.afterStep(dt);
  }

  private afterStep(dt: number): void {
    const events = this.world.drainEvents();
    for (const event of events) this.onEvent(event);
    this.renderer.update(dt, events);
    this.game.audio.setHum(this.world.state === 'playing' && this.world.movers.some((m) => m.moving));
  }

  private onEvent(event: GameEvent): void {
    const { audio } = this.game;
    switch (event.type) {
      case 'jump':
        audio.play(event.player === 'mos' ? 'jumpMos' : 'jumpLu');
        break;
      case 'gem':
        audio.play(event.player === 'mos' ? 'gemMos' : 'gemLu');
        break;
      case 'button':
        if (event.pressed) audio.play('click');
        break;
      case 'lever':
        audio.play('click');
        break;
      case 'blockLand':
        if (event.speed > 150) audio.play('thud');
        break;
      case 'death': {
        const sound: Sfx = event.player === 'mos' ? 'deathMos' : 'deathLu';
        audio.play(sound);
        if (this.campaignIndex >= 0) {
          this.game.save.deaths[event.player]++;
          this.game.persist();
        }
        break;
      }
      case 'doorsOpen':
        audio.play('victory');
        this.recordWin();
        break;
      default:
        break;
    }
  }

  /** Guarda estrellas y mejor tiempo, y desbloquea el siguiente nivel. */
  private recordWin(): void {
    if (this.campaignIndex < 0) return;
    const last = this.game.levels[this.game.levels.length - 1].id;
    this.win = recordWin(this.game.save, this.data.id, this.world.time, this.world.stars, last);
    this.game.save = this.win.save;
    this.game.persist();
  }

  pause(): void {
    this.game.audio.setHum(false);
    this.game.scenes.push(new PauseScene(this.game, this));
  }

  restart(): void {
    this.world.reset();
    this.resultsShown = false;
    this.win = null;
  }

  /** Tras ganar: el siguiente nivel de la campaña, o el final si era el último. */
  goNext(): void {
    const index = this.campaignIndex;
    const campaign = this.game.levels;
    if (index < 0) this.exitToMap();
    else if (index + 1 < campaign.length) this.game.scenes.switchTo(new PlayScene(this.game, campaign, index + 1));
    else this.game.scenes.switchTo(new EndingScene(this.game));
  }

  exitToMap(): void {
    this.game.scenes.switchTo(new LevelSelectScene(this.game, this.data.id));
  }

  render(ctx: CanvasRenderingContext2D, alpha: number): void {
    this.renderer.render(ctx, { alpha, showHitboxes: this.showHitboxes });
    drawHud(ctx, this.world, this.world.state !== 'won' && contains(HUD_PAUSE, this.game.input.pointer));
    drawLevelBanner(ctx, es.levelBanner(this.data.id, this.data.name), this.bannerRemaining);
    if (this.game.debug) drawDebugInfo(ctx, this.game.fps, this.world.invincible);
  }

  onFocusLost(): void {
    if (this.world.state !== 'won') this.pause();
  }
}
