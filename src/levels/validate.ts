// Validación estructural de los niveles (se ejecuta dentro de npm test).

import { WORLD } from '../config';
import { MARKER_CHARS, TILE_CHARS } from '../game/level';
import type { Cell, Channel, LevelData } from './types';

const KNOWN_CHARS = new Set<string>([...Object.keys(TILE_CHARS), ...MARKER_CHARS]);

/** Devuelve la lista de problemas encontrados; vacía si el nivel es correcto. */
export function validateLevel(level: LevelData): string[] {
  const errors: string[] = [];
  const { cols, rows } = WORLD;

  if (level.map.length !== rows) errors.push(`tiene ${level.map.length} filas en vez de ${rows}`);
  level.map.forEach((line, row) => {
    if (line.length !== cols) errors.push(`la fila ${row} tiene ${line.length} columnas en vez de ${cols}`);
    [...line].forEach((ch, col) => {
      if (!KNOWN_CHARS.has(ch)) errors.push(`carácter desconocido "${ch}" en [${col}, ${row}]`);
    });
  });
  if (errors.length > 0) return errors;

  const at = (col: number, row: number) => level.map[row]?.[col] ?? '#';
  const inside = ([col, row]: Cell) => col >= 0 && col < cols && row >= 0 && row < rows;
  const onFloor = ([col, row]: Cell) => at(col, row + 1) === '#';

  // Borde cerrado. La fila inferior es suelo y admite charcos: su mitad de abajo es sólida.
  const closedBottom = (ch: string) => ch === '#' || ch === 'o' || ch === 'p' || ch === 'x';
  for (let col = 0; col < cols; col++) {
    if (at(col, 0) !== '#' || !closedBottom(at(col, rows - 1))) {
      errors.push(`el borde no está cerrado en la columna ${col}`);
      break;
    }
  }
  for (let row = 0; row < rows; row++) {
    if (at(0, row) !== '#' || at(cols - 1, row) !== '#') {
      errors.push(`el borde no está cerrado en la fila ${row}`);
      break;
    }
  }

  // Exactamente un inicio y una puerta por personaje, sobre suelo.
  const names: Record<string, string> = {
    M: 'inicio de Mos',
    L: 'inicio de Lu',
    '[': 'puerta de Mos',
    ']': 'puerta de Lu',
  };
  for (const [ch, name] of Object.entries(names)) {
    const cells = findChars(level.map, ch);
    if (cells.length !== 1) {
      errors.push(`debe haber exactamente un ${name} ("${ch}") y hay ${cells.length}`);
      continue;
    }
    if (!onFloor(cells[0])) errors.push(`el ${name} no está sobre suelo de piedra`);
  }

  // Charcos siempre en la fila del suelo.
  for (const ch of ['o', 'p', 'x']) {
    for (const cell of findChars(level.map, ch)) {
      if (!onFloor(cell)) errors.push(`el charco en [${cell.join(', ')}] no tiene piedra debajo`);
    }
  }

  // Entidades dentro del nivel; canales con activador y receptor.
  const activators = new Set<Channel>();
  const receivers = new Set<Channel>();
  for (const e of level.entities) {
    if (!inside(e.at)) errors.push(`${e.type} fuera del nivel en [${e.at.join(', ')}]`);
    switch (e.type) {
      case 'button':
      case 'lever':
        activators.add(e.channel);
        if (!onFloor(e.at)) errors.push(`${e.type} en [${e.at.join(', ')}] no está sobre suelo`);
        break;
      case 'mover': {
        receivers.add(e.channel);
        const [w, h] = e.size;
        for (const [col, row] of [e.at, e.to]) {
          if (col < 0 || row < 0 || col + w > cols || row + h > rows) {
            errors.push(`la plataforma de [${e.at.join(', ')}] se sale del nivel en [${col}, ${row}]`);
          }
        }
        break;
      }
      case 'hint':
        break;
    }
  }
  for (const channel of new Set([...activators, ...receivers])) {
    if (!activators.has(channel)) errors.push(`el canal ${channel} no tiene botón ni palanca`);
    if (!receivers.has(channel)) errors.push(`el canal ${channel} no mueve ninguna plataforma`);
  }

  // Gemas, bloques e inicios fuera de sólidos: ni dentro de una plataforma en su posición inicial.
  const what: Record<string, string> = { '*': 'la gema', c: 'la gema', B: 'el bloque', M: 'el inicio', L: 'el inicio' };
  for (const [ch, name] of Object.entries(what)) {
    for (const [col, row] of findChars(level.map, ch)) {
      for (const e of level.entities) {
        if (e.type !== 'mover') continue;
        const [mc, mr] = e.at;
        const [w, h] = e.size;
        if (col >= mc && col < mc + w && row >= mr && row < mr + h) {
          errors.push(`${name} en [${col}, ${row}] queda dentro de una plataforma`);
        }
      }
    }
  }

  return errors;
}

function findChars(map: readonly string[], ch: string): Cell[] {
  const cells: Cell[] = [];
  map.forEach((line, row) => {
    for (let col = 0; col < line.length; col++) if (line[col] === ch) cells.push([col, row]);
  });
  return cells;
}
