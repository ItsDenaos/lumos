// Servicios compartidos que reciben todas las escenas.

import type { AudioEngine } from '../core/audio';
import type { Input } from '../core/input';
import type { SceneManager } from '../core/scenes';
import type { Settings } from '../core/settings';
import type { SaveData } from '../core/storage';
import type { LevelData } from '../levels/types';

export interface GameContext {
  input: Input;
  scenes: SceneManager;
  audio: AudioEngine;
  /** Niveles de la campaña, en orden. */
  levels: readonly LevelData[];
  /** Progreso guardado. Sus opciones son el mismo objeto que `settings`. */
  save: SaveData;
  settings: Settings;
  /** Guarda el progreso y las opciones. */
  persist(): void;
  /** Modo depuración, activado con ?debug en la dirección. */
  debug: boolean;
  /** Fotogramas por segundo medidos (para el modo depuración). */
  fps: number;
  /** Cursor de mano sobre lo que se puede pulsar. */
  setCursor(pointer: boolean): void;
  /** Pantalla completa: hay que llamarlo poco después de una tecla o un clic. */
  toggleFullscreen(): void;
  isFullscreen(): boolean;
  /** Aviso breve en pantalla (por ejemplo, al silenciar con M). */
  toast(text: string): void;
}
