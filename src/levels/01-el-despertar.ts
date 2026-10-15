import type { LevelData } from './types';

// Nivel 1: Lu va por arriba sobre plata, Mos por abajo sobre oro, y se reúnen en las puertas.
export const level01: LevelData = {
  id: 1,
  name: 'El despertar',
  zone: 'forest',
  parTime: 40,
  map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#.........c....................#',
    '#......c......c................#',
    '#.L.......#....................#',
    '######pp#####ppp######.........#',
    '##################.............#',
    '##################.............#',
    '##################.............#',
    '##################.......[..]..#',
    '##################....##########',
    '#.....................##########',
    '#..................*############',
    '#...........*.......############',
    '#.....*...........##############',
    '#.M......#........##############',
    '#####oo####ooo##################',
  ],
  entities: [
    { type: 'hint', at: [2, 2], text: 'Lu: A / D para moverte · W para saltar' },
    { type: 'hint', at: [2, 13], text: 'Mos: ← / → para moverte · ↑ para saltar' },
    { type: 'hint', at: [12, 2], text: 'La plata protege a Lu… y apaga a Mos' },
    { type: 'hint', at: [11, 12], text: 'El oro protege a Mos… y quema a Lu' },
    { type: 'hint', at: [22, 7], text: 'Lleguen juntos, cada uno a su puerta' },
  ],
};
