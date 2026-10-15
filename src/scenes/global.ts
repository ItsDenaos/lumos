// Atajos que funcionan en cualquier pantalla.

import { es } from '../i18n/es';
import type { GameContext } from './context';

/** M: silencia o devuelve todo el sonido, lo guarda y lo avisa en pantalla. */
export function toggleMute(game: GameContext): void {
  game.settings.muted = !game.settings.muted;
  game.audio.applySettings();
  game.persist();
  game.toast(game.settings.muted ? es.sound.muted : es.sound.unmuted);
}
