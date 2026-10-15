import type { LevelData } from './types';

// Final: todo combinado, a oscuras, con las puertas junto a la piedra del sol en la cima.
export const level09: LevelData = {
  id: 9,
  name: 'El reloj del cielo',
  zone: 'observatory',
  parTime: 150,
  dark: true,
  map: [
    '################################',
    '#.....................c........#',
    '#....................*.........#',
    '#..................O..#..P.....#',
    '#..................O[.#.]P.....#',
    '#.................#########....#',
    '#.................#########....#',
    '#......#########################',
    '#...##.........................#',
    '#...##..*...................c..#',
    '###.........c..................#',
    '###............................#',
    '##########xxxxx###########..####',
    '#.........#####.#####..........#',
    '#...*...c...*c..#####...*......#',
    '#..............................#',
    '#.ML............B.*.c..........#',
    '####pp##oo##xx####o#############',
  ],
  entities: [
    { type: 'hint', at: [1, 6], text: 'El reloj del cielo los espera en la cima' },
    { type: 'button', at: [23, 16], channel: 'green' },
    { type: 'mover', at: [26, 16], size: [2, 1], to: [26, 12], channel: 'green' },
    { type: 'button', at: [29, 11], channel: 'green' },
    { type: 'lever', at: [17, 11], channel: 'pink' },
    { type: 'mover', at: [15, 11], size: [2, 1], to: [8, 11], channel: 'pink' },
  ],
};
