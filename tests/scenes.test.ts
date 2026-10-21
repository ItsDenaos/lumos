// Recorrido por las pantallas con teclado y con ratón, sin navegador:
// título → mapa → partida → pausa → resultados → siguiente nivel → final.

import { describe, expect, it } from 'vitest';
import { WORLD } from '../src/config';
import { AudioEngine } from '../src/core/audio';
import { Input } from '../src/core/input';
import { SceneManager } from '../src/core/scenes';
import { loadSave, SAVE_KEY, writeSave } from '../src/core/storage';
import { es } from '../src/i18n/es';
import type { LevelData } from '../src/levels/types';
import type { GameContext } from '../src/scenes/context';
import { EndingScene } from '../src/scenes/ending';
import { toggleMute } from '../src/scenes/global';
import { HowToScene } from '../src/scenes/howto';
import { LevelSelectScene, MAP_SLOTS } from '../src/scenes/levelSelect';
import { OptionsScene } from '../src/scenes/options';
import { PauseScene } from '../src/scenes/pause';
import { PlayScene } from '../src/scenes/play';
import { ResultsScene } from '../src/scenes/results';
import { TITLE_MENU, TitleScene } from '../src/scenes/title';
import { blankMap, DT, makeLevel, memoryStore, put } from './helpers';

/** Nivel cortito: cada uno empieza al lado de su puerta. */
function quickLevel(id: number): LevelData {
  const map = blankMap();
  put(map, 4, 16, 'M');
  put(map, 5, 16, '[');
  put(map, 10, 16, 'L');
  put(map, 11, 16, ']');
  return { ...makeLevel(map), id, name: `Prueba ${id}` };
}

function fakeGame(levels: LevelData[] = [quickLevel(1), quickLevel(2)]) {
  const store = memoryStore();
  const save = loadSave(store);
  let fullscreen = false;
  const toasts: string[] = [];
  const game: GameContext = {
    input: new Input(),
    scenes: new SceneManager(),
    audio: new AudioEngine(save.settings),
    levels,
    save,
    settings: save.settings,
    persist: () => void writeSave(store, game.save),
    debug: false,
    fps: 60,
    setCursor: () => undefined,
    toggleFullscreen: () => {
      fullscreen = !fullscreen;
    },
    isFullscreen: () => fullscreen,
    toast: (text) => void toasts.push(text),
  };
  game.scenes.switchTo(new TitleScene(game));
  return { game, store, toasts };
}

function tick(game: GameContext, steps = 1): void {
  for (let i = 0; i < steps; i++) {
    game.input.beginStep();
    game.scenes.update(DT);
  }
}

function press(game: GameContext, code: string): void {
  game.input.keyDown(code);
  tick(game);
  game.input.keyUp(code);
}

function click(game: GameContext, x: number, y: number): void {
  game.input.pointerMove({ x, y });
  game.input.pointerDown({ x, y });
  tick(game);
}

const current = (game: GameContext) => game.scenes.scene;

/** Lleva a Mos y Lu a su puerta desde su inicio, a pie. */
function walkToDoors(game: GameContext): void {
  game.input.keyDown('ArrowRight');
  game.input.keyDown('KeyD');
  tick(game, 8);
  game.input.keyUp('ArrowRight');
  game.input.keyUp('KeyD');
  tick(game, 90);
}

describe('pantallas con teclado', () => {
  it('título → menú → mapa → partida', () => {
    const { game } = fakeGame();
    expect(current(game)).toBeInstanceOf(TitleScene);
    press(game, 'Enter');
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(LevelSelectScene);
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(PlayScene);
  });

  it('desde el título se abren Cómo jugar y Opciones, y se vuelve con Esc', () => {
    const { game } = fakeGame();
    press(game, 'Enter');
    press(game, 'ArrowDown');
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(HowToScene);
    press(game, 'Escape');
    expect(current(game)).toBeInstanceOf(TitleScene);
    press(game, 'KeyS');
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(OptionsScene);
    press(game, 'Escape');
    expect(current(game)).toBeInstanceOf(TitleScene);
  });

  it('las opciones cambian volúmenes, pantalla completa, "reducir efectos" y las formas, y se guardan', () => {
    const { game, store } = fakeGame();
    game.scenes.push(new OptionsScene(game, current(game)!));
    press(game, 'ArrowLeft'); // volumen general -0,1
    press(game, 'ArrowDown');
    press(game, 'ArrowDown');
    press(game, 'ArrowRight'); // efectos +0,1
    press(game, 'ArrowDown');
    press(game, 'Enter'); // pantalla completa
    press(game, 'ArrowDown');
    press(game, 'Enter'); // reducir efectos
    press(game, 'ArrowDown');
    press(game, 'ArrowRight'); // formas en los mecanismos
    const changed = { masterVolume: 0.7, sfxVolume: 0.9, reduceEffects: true, channelShapes: true };
    expect(game.settings).toMatchObject(changed);
    expect(game.isFullscreen()).toBe(true);
    expect(loadSave(store).settings).toMatchObject(changed);
  });

  it('pausa con Esc o P: continuar, y salir al mapa', () => {
    const { game } = fakeGame();
    game.scenes.switchTo(new PlayScene(game, game.levels, 0));
    press(game, 'Escape');
    expect(current(game)).toBeInstanceOf(PauseScene);
    const play = (game.scenes as unknown as { stack: unknown[] }).stack[0] as PlayScene;
    const time = play.world.time;
    tick(game, 60);
    expect(play.world.time).toBe(time);
    press(game, 'KeyP');
    expect(current(game)).toBe(play);
    press(game, 'KeyP');
    for (let i = 0; i < 3; i++) press(game, 'ArrowDown');
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(LevelSelectScene);
  });

  it('ganar guarda el progreso, enseña los resultados y "Siguiente" va al nivel desbloqueado', () => {
    const { game, store } = fakeGame();
    game.scenes.switchTo(new PlayScene(game, game.levels, 0));
    walkToDoors(game);
    expect(current(game)).toBeInstanceOf(ResultsScene);
    const saved = loadSave(store);
    expect(saved.unlocked).toBe(2);
    expect(saved.levels[1].stars).toBe(3);
    expect(saved.levels[1].bestTime).toBeGreaterThan(0);
    press(game, 'Enter');
    const next = current(game);
    expect(next).toBeInstanceOf(PlayScene);
    expect((next as PlayScene).data.id).toBe(2);
  });

  it('tras el último nivel llega el final, y de ahí al título', () => {
    const { game } = fakeGame();
    game.scenes.switchTo(new PlayScene(game, game.levels, 1));
    walkToDoors(game);
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(EndingScene);
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(EndingScene);
    tick(game, 150);
    press(game, 'Enter');
    expect(current(game)).toBeInstanceOf(TitleScene);
  });

  it('el reto del final depende de las estrellas que faltan y de las caídas', () => {
    expect(es.ending.challenge(8, 27, 3)[0]).toBe('Aún quedan 8 estrellas por conseguir en el cielo.');
    expect(es.ending.challenge(1, 27, 0)[0]).toBe('Aún queda 1 estrella por conseguir en el cielo.');
    expect(es.ending.challenge(0, 27, 5)).toEqual(['¡Las 27 estrellas! El reloj del cielo nunca brilló tanto.', '¿Y sin que nadie caiga en un charco?']);
    expect(es.ending.challenge(0, 27, 0)[0]).toBe('¡Las 27 estrellas, y sin caer nunca en un charco!');
  });

  it('en el mapa no se puede elegir un nivel bloqueado', () => {
    const { game } = fakeGame();
    game.scenes.switchTo(new LevelSelectScene(game));
    press(game, 'ArrowRight');
    press(game, 'Enter');
    expect((current(game) as PlayScene).data.id).toBe(1);
  });

  it('M silencia y vuelve a activar el sonido, y lo recuerda', () => {
    const { game, store, toasts } = fakeGame();
    toggleMute(game);
    expect(game.settings.muted).toBe(true);
    expect(loadSave(store).settings.muted).toBe(true);
    toggleMute(game);
    expect(game.settings.muted).toBe(false);
    expect(toasts).toHaveLength(2);
    expect(store.data.has(SAVE_KEY)).toBe(true);
  });
});

describe('pantallas con ratón', () => {
  it('clic en "Pulsa Enter", en Jugar y en el nodo del nivel', () => {
    const { game } = fakeGame();
    click(game, WORLD.width / 2, 300);
    click(game, TITLE_MENU[0].x + TITLE_MENU[0].w / 2, TITLE_MENU[0].y + TITLE_MENU[0].h / 2);
    expect(current(game)).toBeInstanceOf(LevelSelectScene);
    click(game, MAP_SLOTS[0].x, MAP_SLOTS[0].y);
    expect(current(game)).toBeInstanceOf(PlayScene);
  });

  it('el icono de pausa del HUD abre la pausa y "Continuar" la cierra', () => {
    const { game } = fakeGame();
    game.scenes.switchTo(new PlayScene(game, game.levels, 0));
    click(game, WORLD.width - 27, 20);
    expect(current(game)).toBeInstanceOf(PauseScene);
    click(game, WORLD.width / 2, 270 + 26);
    expect(current(game)).toBeInstanceOf(PlayScene);
  });

  it('un clic en la pista de un deslizador fija el volumen', () => {
    const { game } = fakeGame();
    game.scenes.push(new OptionsScene(game, current(game)!));
    // Fila de la música: pista del 48 % al 84 % del ancho de la fila (600 px centrados).
    const rowX = WORLD.width / 2 - 300;
    click(game, rowX + 600 * 0.48 + 600 * 0.36 * 0.3, 168 + 68 + 29);
    expect(game.settings.musicVolume).toBe(0.3);
  });
});
