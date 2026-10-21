// Arranque: canvas escalado, teclado y ratón, progreso guardado, sonido, escenas y bucle de paso fijo.

import { KEYS, LOOP, WORLD } from './config';
import { AudioEngine } from './core/audio';
import { Input } from './core/input';
import { FixedStepper, startLoop } from './core/loop';
import { SceneManager } from './core/scenes';
import { Screen, toggleFullscreen } from './core/screen';
import { browserStore, loadSave, writeSave } from './core/storage';
import { es } from './i18n/es';
import { LEVELS } from './levels';
import { sandbox } from './levels/sandbox';
import { loadBackgrounds } from './render/background';
import { loadCharacters } from './render/characters';
import { loadCover } from './render/cover';
import { loadEndingArt } from './render/endingArt';
import { loadMapArt } from './render/mapArt';
import { loadProps } from './render/props';
import { loadFonts } from './render/fonts';
import { ZONE_STYLES } from './render/palette';
import { drawText } from './render/shapes';
import { drawToast } from './render/ui';
import type { GameContext } from './scenes/context';
import { toggleMute } from './scenes/global';
import { PlayScene } from './scenes/play';
import { TitleScene } from './scenes/title';

const TOAST_TIME = 1.6;

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>('#game');
  if (!canvas) throw new Error('Falta el elemento <canvas id="game">');
  const screen = new Screen(canvas);
  const input = new Input();
  const scenes = new SceneManager();
  const params = new URLSearchParams(window.location.search);
  const store = browserStore();
  const save = loadSave(store);
  const audio = new AudioEngine(save.settings);
  let toast = { text: '', remaining: 0 };
  let pointerCursor = false;

  const game: GameContext = {
    input,
    scenes,
    audio,
    levels: LEVELS,
    save,
    settings: save.settings,
    persist: () => void writeSave(store, game.save),
    debug: params.has('debug'),
    fps: 60,
    setCursor: (pointer) => {
      if (pointer === pointerCursor) return;
      pointerCursor = pointer;
      canvas.style.cursor = pointer ? 'pointer' : 'default';
    },
    toggleFullscreen,
    isFullscreen: () => !!document.fullscreenElement,
    toast: (text) => {
      toast = { text, remaining: TOAST_TIME };
    },
  };

  // En depuración, el contexto queda a mano en la consola del navegador.
  if (game.debug) (window as unknown as { lumos: GameContext }).lumos = game;

  input.attach(window);
  input.attachPointer(canvas, (x, y) => screen.toLogical(x, y));
  input.onKeyDown = (code) => {
    // El audio solo puede arrancar dentro de un gesto del usuario.
    audio.unlock();
    if (KEYS.fullscreen.some((key) => key === code)) toggleFullscreen();
    if (KEYS.mute.some((key) => key === code)) toggleMute(game);
  };
  input.onPointerDown = () => {
    audio.unlock();
    canvas.focus();
  };
  input.onFocusLost = () => scenes.focusLost();

  // Pantalla de carga mientras llegan la fuente y las imágenes (personajes, portada, mapa, fondos y elementos).
  const ctx = screen.beginFrame();
  ctx.fillStyle = ZONE_STYLES.observatory.sky[0];
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  drawText(ctx, es.loading, WORLD.width / 2, WORLD.height / 2, { size: 28, align: 'center' });
  await Promise.all([loadFonts(), loadCharacters(), loadCover(), loadMapArt(), loadBackgrounds(), loadProps(), loadEndingArt()]);

  // En depuración, ?nivel=N (o ?nivel=sandbox) entra directo en ese nivel; N recorre la campaña y el sandbox.
  const wanted = game.debug ? params.get('nivel') : null;
  if (wanted) {
    const playlist = [...LEVELS, sandbox];
    const requested = wanted === 'sandbox' ? playlist.length - 1 : Number(wanted) - 1;
    const index = Number.isInteger(requested) && requested >= 0 && requested < playlist.length ? requested : 0;
    scenes.switchTo(new PlayScene(game, playlist, index));
  } else {
    scenes.switchTo(new TitleScene(game));
  }
  canvas.focus();

  const stepper = new FixedStepper(LOOP.dt, LOOP.maxFrameTime);
  startLoop(
    stepper,
    (dt) => {
      input.beginStep();
      scenes.update(dt);
      audio.update();
      toast.remaining = Math.max(0, toast.remaining - dt);
    },
    (alpha, frameTime) => {
      if (frameTime > 0) game.fps += (1 / frameTime - game.fps) * 0.05;
      const frame = screen.beginFrame();
      scenes.render(frame, alpha);
      drawToast(frame, toast.text, toast.remaining);
    },
  );
}

void main();
