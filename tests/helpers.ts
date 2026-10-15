// Utilidades para construir niveles de prueba y simular pasos de lógica.

import { LOOP, WORLD } from '../src/config';
import { SAVE_KEY, type KeyValueStore } from '../src/core/storage';
import { NO_CONTROLS, type Controls, type PlayerId } from '../src/game/types';
import { World } from '../src/game/world';
import type { Entity, LevelData } from '../src/levels/types';

export const T = WORLD.tile;
export const DT = LOOP.dt;

/** Mapa vacío de 18 × 32: borde de piedra y aire dentro. */
export function blankMap(): string[][] {
  const rows: string[][] = [];
  for (let row = 0; row < WORLD.rows; row++) {
    const line: string[] = [];
    for (let col = 0; col < WORLD.cols; col++) {
      const border = row === 0 || row === WORLD.rows - 1 || col === 0 || col === WORLD.cols - 1;
      line.push(border ? '#' : '.');
    }
    rows.push(line);
  }
  return rows;
}

/** Rellena un rectángulo de celdas (ambos extremos incluidos). */
export function fill(map: string[][], c0: number, r0: number, c1: number, r1: number, ch: string): void {
  for (let row = r0; row <= r1; row++) for (let col = c0; col <= c1; col++) map[row][col] = ch;
}

export function put(map: string[][], col: number, row: number, ch: string): void {
  map[row][col] = ch;
}

/**
 * Nivel de prueba. Si el mapa no tiene inicios o puertas, se colocan arriba a la
 * derecha (fila 1), lejos de la acción.
 */
export function makeLevel(map: string[][], entities: Entity[] = [], parTime = 30): LevelData {
  const has = (ch: string) => map.some((line) => line.includes(ch));
  const defaults: [string, number][] = [
    ['M', 27],
    ['L', 28],
    ['[', 29],
    [']', 30],
  ];
  for (const [ch, col] of defaults) if (!has(ch)) map[1][col] = ch;
  return {
    id: 99,
    name: 'Prueba',
    zone: 'forest',
    parTime,
    map: map.map((line) => line.join('')),
    entities,
  };
}

export type ControlScript = (frame: number, world: World) => Partial<Record<PlayerId, Partial<Controls>>>;

/** Simula frames pasos con controles por frame. */
export function run(world: World, frames: number, script: ControlScript = () => ({})): void {
  for (let frame = 0; frame < frames; frame++) {
    const wanted = script(frame, world);
    world.step(
      {
        mos: { ...NO_CONTROLS, ...wanted.mos },
        lu: { ...NO_CONTROLS, ...wanted.lu },
      },
      DT,
    );
  }
}

export const seconds = (s: number) => Math.round(s / DT);

/** localStorage en memoria; initial es el texto guardado de antemano. */
export function memoryStore(initial?: string): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SAVE_KEY, initial);
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}
