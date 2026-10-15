// Opciones del jugador (se guardan con el progreso).

export interface Settings {
  /** Volúmenes de 0 a 1. */
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  /** Sin temblores ni destellos, y con menos partículas. */
  reduceEffects: boolean;
  /** Una forma por color en botones, palancas y plataformas (para distinguirlos sin el color). */
  channelShapes: boolean;
}

export function defaultSettings(): Settings {
  return { masterVolume: 0.8, musicVolume: 0.6, sfxVolume: 0.8, muted: false, reduceEffects: false, channelShapes: false };
}
