import type { LevelData } from './types';

// Primer nivel oscuro, con una mezcla suave de lo aprendido.
export const level07: LevelData = {
  id: 7,
  name: 'Penumbra',
  zone: 'observatory',
  parTime: 90,
  dark: true,
  map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#.......................c....*c#',
    '#..............................#',
    '#............................[]#',
    '#.............#######..####..###',
    '#.............##...............#',
    '#.............##...............#',
    '#.............##...............#',
    '#.............##...............#',
    '#..............................#',
    '#...*...c..*c....c.*...........#',
    '#........................*.....#',
    '#.ML...........................#',
    '####pp##oo#xx###################',
  ],
  entities: [
    { type: 'hint', at: [2, 11], text: 'En la penumbra, cada uno lleva su luz' },
    { type: 'lever', at: [13, 16], channel: 'pink' },
    { type: 'mover', at: [15, 13], size: [1, 4], to: [15, 9], channel: 'pink' },
    { type: 'button', at: [18, 16], channel: 'green' },
    { type: 'mover', at: [21, 16], size: [2, 1], to: [21, 8], channel: 'green' },
    { type: 'lever', at: [25, 7], channel: 'cyan' },
    { type: 'mover', at: [27, 16], size: [2, 1], to: [27, 8], channel: 'cyan' },
  ],
};
