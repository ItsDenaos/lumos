import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { validateLevel } from '../src/levels/validate';
import { blankMap, fill, makeLevel, put } from './helpers';

describe('validación de niveles', () => {
  for (const level of LEVELS) {
    it(`nivel ${level.id} "${level.name}" tiene una estructura correcta`, () => {
      expect(validateLevel(level)).toEqual([]);
    });
  }

  it('los ids de los niveles son consecutivos desde 1', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(LEVELS.map((_, i) => i + 1));
  });

  function validLevel() {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 3, 16, 'L');
    put(map, 5, 16, '[');
    put(map, 6, 16, ']');
    return makeLevel(map);
  }

  it('acepta un nivel mínimo correcto', () => {
    expect(validateLevel(validLevel())).toEqual([]);
  });

  it('detecta un borde abierto', () => {
    const level = validLevel();
    level.map[5] = '.' + level.map[5].slice(1);
    expect(validateLevel(level).join('\n')).toMatch(/borde/);
  });

  it('detecta un inicio repetido y una puerta en el aire', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 4, 16, 'M');
    put(map, 3, 16, 'L');
    put(map, 5, 10, '[');
    put(map, 6, 16, ']');
    const errors = validateLevel(makeLevel(map)).join('\n');
    expect(errors).toMatch(/inicio de Mos/);
    expect(errors).toMatch(/puerta de Mos no está sobre suelo/);
  });

  it('detecta tamaños incorrectos y caracteres desconocidos', () => {
    const level = validLevel();
    level.map[3] = level.map[3].slice(0, 20);
    level.map[4] = level.map[4].slice(0, 10) + '?' + level.map[4].slice(11);
    const errors = validateLevel(level).join('\n');
    expect(errors).toMatch(/fila 3/);
    expect(errors).toMatch(/desconocido/);
  });

  it('detecta charcos sin suelo y canales incompletos', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 3, 16, 'L');
    put(map, 5, 16, '[');
    put(map, 6, 16, ']');
    fill(map, 10, 10, 11, 10, 'o');
    const level = makeLevel(map, [
      { type: 'button', at: [8, 16], channel: 'green' },
      { type: 'mover', at: [20, 10], size: [3, 1], to: [20, 30], channel: 'pink' },
    ]);
    const errors = validateLevel(level).join('\n');
    expect(errors).toMatch(/charco/);
    expect(errors).toMatch(/green no mueve/);
    expect(errors).toMatch(/pink no tiene/);
    expect(errors).toMatch(/se sale del nivel/);
  });

  it('detecta bloques metidos dentro de una plataforma', () => {
    const level = validLevel();
    level.map[16] = level.map[16].slice(0, 12) + 'B' + level.map[16].slice(13);
    level.entities.push(
      { type: 'lever', at: [9, 16], channel: 'cyan' },
      { type: 'mover', at: [12, 15], size: [2, 2], to: [12, 12], channel: 'cyan' },
    );
    expect(validateLevel(level).join('\n')).toMatch(/bloque en \[12, 16\] queda dentro de una plataforma/);
  });
});
