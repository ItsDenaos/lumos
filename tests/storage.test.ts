import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  isUnlocked,
  loadSave,
  recordWin,
  SAVE_KEY,
  SAVE_VERSION,
  totalStars,
  writeSave,
  type KeyValueStore,
} from '../src/core/storage';
import { memoryStore } from './helpers';

const brokenStore: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
};

describe('guardado', () => {
  it('sin datos guardados empieza una partida nueva con el nivel 1 desbloqueado', () => {
    const save = loadSave(memoryStore());
    expect(save).toEqual(defaultSave());
    expect(isUnlocked(save, 1)).toBe(true);
    expect(isUnlocked(save, 2)).toBe(false);
  });

  it('sin localStorage disponible tampoco falla', () => {
    expect(loadSave(null)).toEqual(defaultSave());
    expect(loadSave(brokenStore)).toEqual(defaultSave());
    expect(writeSave(brokenStore, defaultSave())).toBe(false);
    expect(writeSave(null, defaultSave())).toBe(false);
  });

  it('guarda y vuelve a leer lo mismo (sobrevive a recargar la página)', () => {
    const store = memoryStore();
    const save = recordWin(defaultSave(), 1, 33.3, 3, 9).save;
    save.settings.musicVolume = 0.3;
    save.settings.reduceEffects = true;
    save.deaths.lu = 4;
    expect(writeSave(store, save)).toBe(true);
    expect(JSON.parse(store.data.get(SAVE_KEY)!).version).toBe(SAVE_VERSION);
    expect(loadSave(store)).toEqual(save);
  });

  it('tolera datos corruptos o de otra versión', () => {
    expect(loadSave(memoryStore('{no es json'))).toEqual(defaultSave());
    expect(loadSave(memoryStore('null'))).toEqual(defaultSave());
    expect(loadSave(memoryStore('[1, 2, 3]'))).toEqual(defaultSave());
    expect(loadSave(memoryStore(JSON.stringify({ ...defaultSave(), version: 99, unlocked: 5 })))).toEqual(defaultSave());
  });

  it('se queda con lo que tiene sentido y descarta lo demás', () => {
    const raw = {
      version: SAVE_VERSION,
      unlocked: 3.7,
      levels: {
        1: { stars: 7, bestTime: 41.2 },
        2: { stars: -1, bestTime: -5 },
        abc: { stars: 3, bestTime: 10 },
        4: 'hola',
      },
      settings: { masterVolume: 3, musicVolume: 'alto', sfxVolume: 0.25, muted: 'sí', reduceEffects: true },
      deaths: { mos: 12, lu: Number.NaN },
      extra: { lo: 'que sea' },
    };
    const save = loadSave(memoryStore(JSON.stringify(raw)));
    expect(save.unlocked).toBe(3);
    expect(save.levels).toEqual({ 1: { stars: 3, bestTime: 41.2 }, 2: { stars: 0, bestTime: null } });
    expect(save.settings).toEqual({ ...defaultSave().settings, masterVolume: 1, sfxVolume: 0.25, reduceEffects: true });
    expect(save.deaths).toEqual({ mos: 12, lu: 0 });
    expect(save).not.toHaveProperty('extra');
  });
});

describe('progreso', () => {
  it('ganar un nivel desbloquea el siguiente y guarda estrellas y mejor tiempo', () => {
    const first = recordWin(defaultSave(), 1, 50, 2, 9);
    expect(first.newBest).toBe(true);
    expect(first.unlockedNext).toBe(true);
    expect(first.save.unlocked).toBe(2);
    expect(first.save.levels[1]).toEqual({ stars: 2, bestTime: 50 });
  });

  it('nunca empeora un récord: se queda con más estrellas y el menor tiempo', () => {
    let save = recordWin(defaultSave(), 1, 50, 3, 9).save;
    const slower = recordWin(save, 1, 70, 1, 9);
    expect(slower.newBest).toBe(false);
    expect(slower.unlockedNext).toBe(false);
    expect(slower.save.levels[1]).toEqual({ stars: 3, bestTime: 50 });
    save = recordWin(slower.save, 1, 30, 2, 9).save;
    expect(save.levels[1]).toEqual({ stars: 3, bestTime: 30 });
  });

  it('el último nivel no desbloquea nada más allá', () => {
    const save = recordWin({ ...defaultSave(), unlocked: 9 }, 9, 100, 1, 9).save;
    expect(save.unlocked).toBe(9);
  });

  it('suma las estrellas de todos los niveles', () => {
    let save = recordWin(defaultSave(), 1, 30, 3, 9).save;
    save = recordWin(save, 2, 40, 2, 9).save;
    expect(totalStars(save)).toBe(5);
  });
});
