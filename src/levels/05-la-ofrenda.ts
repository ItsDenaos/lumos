import type { LevelData } from './types';

// Bloques: sobre un botón para sostener una compuerta, como escalón y como puente sobre un charco.
export const level05: LevelData = {
  id: 5,
  name: 'La ofrenda',
  zone: 'sanctuary',
  parTime: 80,
  map: [
    '################################',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#.........................######',
    '#*..c......###.................#',
    '#..........###.............*.c.#',
    '#.ML...B...###....c*...c.......#',
    '##########.###..............[.]#',
    '##########.###...*...B....######',
    '##########.###....##############',
    '##########........##############',
    '##########..*c.B..##############',
    '##########o#####################',
  ],
  entities: [
    { type: 'hint', at: [1, 6], text: 'Empujen el bloque al pozo: hará de puente sobre el oro' },
    { type: 'hint', at: [14, 6], text: 'Un bloque también sirve de escalón' },
    { type: 'hint', at: [18, 9], text: 'El bloque puede pisar el botón por ustedes' },
    { type: 'button', at: [25, 13], channel: 'cyan' },
    { type: 'mover', at: [26, 9], size: [1, 4], to: [26, 5], channel: 'cyan' },
  ],
};
