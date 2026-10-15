// Progreso guardado: niveles desbloqueados, estrellas y mejor tiempo por nivel, opciones
// y totales para el final. Siempre dentro de try/catch y tolerante a datos corruptos.

import { defaultSettings, type Settings } from './settings';

export const SAVE_KEY = 'lumos-save-v1';
export const SAVE_VERSION = 1;

export interface LevelRecord {
  stars: 0 | 1 | 2 | 3;
  /** Mejor tiempo en segundos, o null si aún no se completó. */
  bestTime: number | null;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  /** Id del nivel más alto desbloqueado (el 1 siempre lo está). */
  unlocked: number;
  /** Récords por id de nivel. */
  levels: Record<number, LevelRecord>;
  settings: Settings;
  /** Muertes acumuladas de cada uno en toda la partida, para el final. */
  deaths: { mos: number; lu: number };
}

/** Lo mínimo de localStorage que se usa (así los tests pueden pasar uno en memoria). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function defaultSave(): SaveData {
  return { version: SAVE_VERSION, unlocked: 1, levels: {}, settings: defaultSettings(), deaths: { mos: 0, lu: 0 } };
}

/** localStorage del navegador, o null si no está disponible (modo privado, permisos…). */
export function browserStore(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    return store ?? null;
  } catch {
    return null;
  }
}

/** Lee la partida guardada. Ante cualquier problema, devuelve lo que pueda salvar o una partida nueva. */
export function loadSave(store: KeyValueStore | null): SaveData {
  let raw: string | null = null;
  try {
    raw = store?.getItem(SAVE_KEY) ?? null;
  } catch {
    return defaultSave();
  }
  if (!raw) return defaultSave();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultSave();
  }
  return sanitize(parsed);
}

/** Guarda la partida. Devuelve false si no se pudo (sin espacio, sin permiso…). */
export function writeSave(store: KeyValueStore | null, save: SaveData): boolean {
  if (!store) return false;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

export interface WinResult {
  save: SaveData;
  newBest: boolean;
  unlockedNext: boolean;
}

/** Apunta un nivel ganado: mejores estrellas y tiempo, y desbloquea el siguiente. */
export function recordWin(save: SaveData, levelId: number, time: number, stars: 1 | 2 | 3, lastLevelId: number): WinResult {
  const previous = save.levels[levelId] ?? { stars: 0, bestTime: null };
  const newBest = previous.bestTime === null || time < previous.bestTime;
  const record: LevelRecord = {
    stars: Math.max(previous.stars, stars) as LevelRecord['stars'],
    bestTime: newBest ? time : previous.bestTime,
  };
  const next = Math.min(levelId + 1, lastLevelId);
  const unlockedNext = next > save.unlocked;
  return {
    save: { ...save, unlocked: Math.max(save.unlocked, next), levels: { ...save.levels, [levelId]: record } },
    newBest,
    unlockedNext,
  };
}

export function isUnlocked(save: SaveData, levelId: number): boolean {
  return levelId >= 1 && levelId <= save.unlocked;
}

/** Estrellas sumadas de todos los niveles. */
export function totalStars(save: SaveData): number {
  return Object.values(save.levels).reduce((sum, record) => sum + record.stars, 0);
}

// ── Saneado ────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finite(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

/** Toma de los datos guardados solo lo que tiene sentido; el resto vuelve a su valor por defecto. */
function sanitize(data: unknown): SaveData {
  const save = defaultSave();
  if (!isObject(data) || data.version !== SAVE_VERSION) return save;

  save.unlocked = Math.floor(finite(data.unlocked, 1, 1, 999));

  if (isObject(data.levels)) {
    for (const [key, value] of Object.entries(data.levels)) {
      const id = Number(key);
      if (!Number.isInteger(id) || id < 1 || !isObject(value)) continue;
      const stars = Math.round(finite(value.stars, 0, 0, 3)) as LevelRecord['stars'];
      const bestTime = typeof value.bestTime === 'number' && Number.isFinite(value.bestTime) && value.bestTime > 0 ? value.bestTime : null;
      save.levels[id] = { stars, bestTime };
    }
  }

  if (isObject(data.settings)) {
    const s = data.settings;
    const d = save.settings;
    save.settings = {
      masterVolume: finite(s.masterVolume, d.masterVolume, 0, 1),
      musicVolume: finite(s.musicVolume, d.musicVolume, 0, 1),
      sfxVolume: finite(s.sfxVolume, d.sfxVolume, 0, 1),
      muted: typeof s.muted === 'boolean' ? s.muted : d.muted,
      reduceEffects: typeof s.reduceEffects === 'boolean' ? s.reduceEffects : d.reduceEffects,
      channelShapes: typeof s.channelShapes === 'boolean' ? s.channelShapes : d.channelShapes,
    };
  }

  if (isObject(data.deaths)) {
    save.deaths = {
      mos: Math.floor(finite(data.deaths.mos, 0, 0, 1e9)),
      lu: Math.floor(finite(data.deaths.lu, 0, 0, 1e9)),
    };
  }
  return save;
}
