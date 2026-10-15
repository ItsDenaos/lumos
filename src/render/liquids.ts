// Charcos: oro (con el sol), plata (con la luna) y sombra (con el aspa). Cada uno trae su símbolo
// para distinguirse sin depender del color, y su superficie animada (ver props.ts).

import { WORLD } from '../config';
import { liquidOf, tileAt, type Liquid, type ParsedLevel } from '../game/level';
import { drawLiquid } from './props';

export interface LiquidRun {
  liquid: Liquid;
  row: number;
  c0: number;
  c1: number;
}

/** Charcos contiguos del mismo líquido en una fila. */
export function liquidRuns(level: ParsedLevel): LiquidRun[] {
  const runs: LiquidRun[] = [];
  for (let row = 0; row < WORLD.rows; row++) {
    let current: LiquidRun | null = null;
    for (let col = 0; col < WORLD.cols; col++) {
      const liquid = liquidOf(tileAt(level, col, row));
      if (liquid && current && current.liquid === liquid && current.c1 === col - 1) {
        current.c1 = col;
      } else if (liquid) {
        current = { liquid, row, c0: col, c1: col };
        runs.push(current);
      } else {
        current = null;
      }
    }
  }
  return runs;
}

export function drawLiquids(ctx: CanvasRenderingContext2D, runs: readonly LiquidRun[], clock: number, reduce: boolean): void {
  for (const run of runs) {
    for (let col = run.c0; col <= run.c1; col++) drawLiquid(ctx, run.liquid, col, run.row, clock, reduce);
  }
}
