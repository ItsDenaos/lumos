// Tipos compartidos por la lógica del juego (sin DOM).

export type PlayerId = 'mos' | 'lu';

export const PLAYER_IDS: readonly PlayerId[] = ['mos', 'lu'];

/** Lo que un jugador pide hacer en un paso de lógica. */
export interface Controls {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  /** Recién pulsado en este paso (sin autorepetición). */
  jumpPressed: boolean;
  /** Accionar palanca: recién pulsado en este paso. */
  actionPressed: boolean;
}

export const NO_CONTROLS: Readonly<Controls> = {
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  actionPressed: false,
};

/** Rectángulo alineado con los ejes, en píxeles lógicos. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
