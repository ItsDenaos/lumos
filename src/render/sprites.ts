// Animaciones de Lu y Mos: las de la hoja de sprites del diseño.
// Los fotogramas salen de src/assets/personajes.png (generada por tools/sprites/convertir.py
// a partir de la hoja original) y sus posiciones, de spriteSheet.ts.
//
// Lu (la luna): pelo plateado, túnica azul con ribetes de plata y báculo de media luna.
// Mos (el sol): pelo de fuego, armadura de oro, escudo con el sol y espada dorada.

export type CharacterAnim = 'stand' | 'walk' | 'action' | 'hurt';

/** Fotogramas de cada animación, como en la hoja de sprites. */
export const FRAME_COUNT: Record<CharacterAnim, number> = { stand: 3, walk: 4, action: 3, hurt: 1 };

export const CHARACTER_ANIMS = Object.keys(FRAME_COUNT) as CharacterAnim[];

export { SHEET, SHEET_SIZE, type SheetEntry } from './spriteSheet';
