import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/levels';
import { checkReachability, describeIssue } from '../src/levels/reachability';
import { sandbox } from '../src/levels/sandbox';
import type { Entity } from '../src/levels/types';
import { blankMap, fill, makeLevel, put } from './helpers';

/** Mapa con los dos personajes abajo a la izquierda y sus puertas al lado. */
function baseMap() {
  const map = blankMap();
  put(map, 2, 16, 'M');
  put(map, 3, 16, 'L');
  put(map, 4, 16, '[');
  put(map, 5, 16, ']');
  return map;
}

const issuesOf = (map: string[][], entities = [] as Parameters<typeof makeLevel>[1]) =>
  checkReachability(makeLevel(map, entities)).map(describeIssue);

describe('comprobador de alcance', () => {
  it('no avisa de nada en un nivel abierto', () => {
    const map = baseMap();
    put(map, 20, 16, '*');
    put(map, 22, 14, 'c');
    expect(issuesOf(map)).toEqual([]);
  });

  it('se sube un escalón de 2 baldosas pero no uno de 3', () => {
    const two = baseMap();
    fill(two, 10, 15, 30, 16, '#');
    put(two, 20, 14, '*');
    expect(issuesOf(two)).toEqual([]);

    const three = baseMap();
    fill(three, 10, 14, 30, 16, '#');
    put(three, 20, 13, '*');
    expect(issuesOf(three)).toEqual(['Mos no alcanza su gema en [20, 13]']);
  });

  it('cruza huecos de 3 baldosas pero no de 5', () => {
    // Suelo alto (fila 12) con dos fosos: uno de 3 de ancho y otro de 5.
    const map = blankMap();
    fill(map, 1, 12, 30, 16, '#');
    put(map, 2, 11, 'M');
    put(map, 3, 11, 'L');
    put(map, 4, 11, '[');
    put(map, 5, 11, ']');
    fill(map, 8, 12, 10, 16, '.');
    put(map, 14, 11, '*');
    fill(map, 18, 12, 22, 16, '.');
    put(map, 26, 11, 'c');
    expect(issuesOf(map)).toEqual(['Lu no alcanza su gema en [26, 11]']);
  });

  it('cada uno cruza su charco; el del otro y la sombra solo saltando', () => {
    const map = baseMap();
    fill(map, 8, 17, 9, 17, 'o');
    fill(map, 6, 13, 30, 13, '#');
    put(map, 20, 16, '*');
    put(map, 20, 15, 'c');
    // Pasillo de 3 de alto (filas 14-16): se puede saltar un charco de 2.
    expect(issuesOf(map)).toEqual([]);
    // Con techo a 2 de alto ya no se salta: Lu no pasa el oro.
    fill(map, 6, 14, 30, 14, '#');
    expect(issuesOf(map)).toEqual(['Lu no alcanza su gema en [20, 15]']);
  });

  it('detecta una gema encerrada y una puerta inalcanzable', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    put(map, 3, 16, 'L');
    put(map, 5, 16, '[');
    fill(map, 20, 10, 30, 10, '#');
    fill(map, 20, 11, 20, 16, '#');
    put(map, 25, 16, ']');
    put(map, 26, 16, 'c');
    expect(issuesOf(map)).toEqual(['Lu no alcanza su puerta en [25, 16]', 'Lu no alcanza su gema en [26, 16]']);
  });

  it('un ascensor lleva hasta una repisa inalcanzable saltando', () => {
    const map = baseMap();
    fill(map, 12, 10, 30, 10, '#');
    put(map, 20, 9, '*');
    expect(issuesOf(map)).toEqual(['Mos no alcanza su gema en [20, 9]']);
    expect(
      issuesOf(map, [
        { type: 'button', at: [6, 16], channel: 'green' },
        { type: 'mover', at: [10, 16], size: [2, 1], to: [10, 10], channel: 'green' },
      ]),
    ).toEqual([]);
  });

  it('una compuerta abierta por un canal deja pasar', () => {
    const map = baseMap();
    fill(map, 15, 1, 15, 13, '#');
    put(map, 22, 16, 'c');
    const gate: Entity = { type: 'mover', at: [15, 14], size: [1, 3], to: [15, 11], channel: 'cyan' };
    expect(issuesOf(map, [{ type: 'button', at: [12, 16], channel: 'cyan' }, gate])).toEqual([]);
  });

  it('los muros de metal: el oro deja pasar a Mos y la plata a Lu', () => {
    const map = baseMap();
    fill(map, 10, 1, 10, 16, 'O');
    put(map, 20, 16, '*');
    put(map, 21, 16, 'c');
    expect(issuesOf(map)).toEqual(['Lu no alcanza su gema en [21, 16]']);
  });

  it('un bloque que cae en el charco del fondo de un pozo hace de puente', () => {
    // Repisa en la fila 12; pozo de una baldosa en la columna 10 con oro al fondo y,
    // abajo, un pasillo hacia la derecha con la gema de Lu.
    const map = blankMap();
    fill(map, 1, 12, 30, 16, '#');
    fill(map, 10, 12, 10, 16, '.');
    put(map, 10, 17, 'o');
    fill(map, 11, 15, 20, 16, '.');
    put(map, 2, 11, 'M');
    put(map, 3, 11, 'L');
    put(map, 4, 11, '[');
    put(map, 5, 11, ']');
    put(map, 20, 16, 'c');
    expect(issuesOf(map)).toEqual(['Lu no alcanza su gema en [20, 16]']);
    put(map, 7, 11, 'B');
    expect(issuesOf(map)).toEqual([]);
  });

  it('el nivel 1 y el sandbox no tienen avisos', () => {
    expect(checkReachability(LEVELS[0]).map(describeIssue)).toEqual([]);
    expect(checkReachability(sandbox).map(describeIssue)).toEqual([]);
  });
});
