// Generado por tools/sprites/convertir.py a partir de la hoja de sprites del diseño.
// No editar a mano: vuelve a ejecutar el script.

import type { PlayerId } from '../game/types';

export interface SheetEntry {
  /** Fila de la hoja (y) y tamaño de cada celda. */
  y: number;
  w: number;
  h: number;
  /** Ancla (centro de los pies) dentro de la celda, mirando a la derecha. */
  ax: number;
  ay: number;
  /** x de cada fotograma de cada animación. */
  frames: { stand: number[]; walk: number[]; action: number[]; hurt: number[] };
  /** Centro de la media luna en cada fotograma del hechizo, relativo al ancla (solo Lu). */
  tips: [number, number][];
}

export const SHEET_SIZE = { w: 759, h: 136 };

export const SHEET: Record<PlayerId, SheetEntry> = {
  lu: { y: 0, w: 57, h: 73, ax: 17, ay: 73, frames: { stand: [0, 57, 114], walk: [171, 228, 285, 342], action: [399, 456, 513], hurt: [570] }, tips: [[12, -64], [15, -67], [16, -66]] },
  mos: { y: 73, w: 69, h: 63, ax: 37, ay: 63, frames: { stand: [0, 69, 138], walk: [207, 276, 345, 414], action: [483, 552, 621], hurt: [690] }, tips: [] },
};
