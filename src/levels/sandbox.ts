import type { LevelData } from './types';

// Nivel de pruebas con todos los mecanismos (solo en modo depuración: ?debug&nivel=sandbox).
//
// Mos: sube en el ascensor verde mientras Lu pisa el botón, acciona la palanca rosa,
//       cruza la sombra en la plataforma rosa y atraviesa el muro de oro hasta su puerta.
// Lu: empuja un bloque al charco de oro (puente) y otro al botón cian (abre la compuerta),
//        salta la sombra, cruza el muro de plata y pasa la compuerta blanca (palanca encendida).
export const sandbox: LevelData = {
  id: 0,
  name: 'Sandbox',
  zone: 'forest',
  parTime: 60,
  map: [
    '################################',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#..............................#',
    '#.........................######',
    '#.........................O....#',
    '#................*........O....#',
    '#.........................O.*[.#',
    '#........######xxxxxx###########',
    '#........#######################',
    '#........#######################',
    '#........#######################',
    '#........................P.....#',
    '#...........c............P.....#',
    '#.ML......B...B..........Pc..].#',
    '############o######x###p########',
  ],
  entities: [
    { type: 'hint', at: [2, 2], text: 'Sandbox: todos los mecanismos' },
    { type: 'hint', at: [2, 4], text: 'Lu en el botón verde: Mos sube' },
    { type: 'hint', at: [10, 6], text: 'Mos: ↓ en la palanca rosa y súbete' },
    { type: 'hint', at: [9, 14], text: 'Bloques: puente en el oro y peso en el botón cian' },
    { type: 'hint', at: [19, 4], text: 'El oro deja pasar a Mos; la plata, a Lu' },
    // Ascensor: mientras alguien pise el botón verde, sube 6 baldosas hasta el piso de arriba.
    { type: 'button', at: [5, 16], channel: 'green' },
    { type: 'mover', at: [7, 16], size: [2, 1], to: [7, 10], channel: 'green' },
    // Plataforma horizontal sobre la sombra.
    { type: 'lever', at: [12, 9], channel: 'pink' },
    { type: 'mover', at: [13, 9], size: [2, 1], to: [21, 9], channel: 'pink' },
    // Compuerta que se esconde en el techo mientras algo pese sobre el botón cian.
    { type: 'button', at: [16, 16], channel: 'cyan' },
    { type: 'mover', at: [22, 14], size: [1, 3], to: [22, 11], channel: 'cyan' },
    // Compuerta abierta desde el principio: la palanca blanca empieza encendida.
    { type: 'lever', at: [24, 16], channel: 'white', startOn: true },
    { type: 'mover', at: [27, 14], size: [1, 3], to: [27, 11], channel: 'white' },
  ],
};
