import type { LevelData } from './types';

// Botón y plataforma: uno sostiene el botón mientras el otro sube; arriba, otro botón trae al compañero.
export const level03: LevelData = {
  id: 3,
  name: 'La piedra que sube',
  zone: 'forest',
  parTime: 60,
  map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#.............*.........*......#',
    '#.........*........*........c..#',
    '#............................[]#',
    '######..######pp########..######',
    '#.............##...............#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..........c....c..............#',
    '#...................c..........#',
    '#.L.M...........#..............#',
    '###########oo######pp###########',
  ],
  entities: [
    { type: 'hint', at: [1, 11], text: 'Lu: pisa el botón verde y sube a Mos' },
    { type: 'hint', at: [9, 3], text: 'Mos: el botón rosa sube a Lu' },
    { type: 'button', at: [3, 16], channel: 'green' },
    { type: 'mover', at: [6, 16], size: [2, 1], to: [6, 8], channel: 'green' },
    { type: 'button', at: [27, 7], channel: 'pink' },
    { type: 'mover', at: [24, 16], size: [2, 1], to: [24, 8], channel: 'pink' },
  ],
};
