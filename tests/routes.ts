// Rutas de los bots para cada nivel de la campaña (ver campaign-walkthrough.test.ts).

import { atStart, atTop, col, mover, rides, standsOn, type RouteBuilder } from './walkthroughs';

export const ROUTES: Record<number, RouteBuilder> = {
  // Nivel 1: cada uno por su camino.
  1: () => ({
    mos: [{ x: 205, jump: true }, { x: 378, jump: true }, { x: col(25) }],
    lu: [{ x: 290, jump: true }, { x: 421, jump: true }, { x: col(28) }],
  }),

  // Nivel 2: los mismos andenes; cada uno salta los charcos del otro y los dos la sombra.
  2: () => ({
    mos: [
      { x: 375, jump: true },
      { x: 735, jump: true },
      { x: 1150, land: true },
      { x: 1130, jump: true },
      { x: 1015, jump: true },
      { x: 665, jump: true },
      { x: 425, jump: true },
      { x: col(3) },
    ],
    lu: [
      { x: 215, jump: true },
      { x: 548, jump: true },
      { x: 1150, land: true },
      { x: 1130, jump: true },
      { x: 1015, jump: true },
      { x: 815, jump: true },
      { x: 665, jump: true },
      { x: col(5) },
    ],
  }),

  // Nivel 3: Lu sube a Mos con el botón verde; Mos la sube a ella con el rosa.
  3: (world) => {
    const green = mover(world, 'green');
    const pink = mover(world, 'pink');
    const { mos, lu } = world.players;
    return {
      mos: [
        { x: 280, until: () => atTop(green) },
        { x: 410, jump: true },
        { x: 540, jump: true },
        { x: 770, jump: true },
        { x: 935, until: () => rides(lu, pink) },
        { x: 940, jump: true },
        { x: 1100, until: () => standsOn(lu, 8) && lu.centerX > 1045 },
        { x: col(29) },
      ],
      lu: [
        { x: 100, until: () => rides(mos, green) },
        { x: 140, until: () => standsOn(mos, 8) && mos.centerX > 340 },
        { x: 418, jump: true },
        { x: 655, jump: true },
        { x: 810, jump: true },
        { x: 1000, until: () => atTop(pink) },
        { x: 1135, jump: true },
        { x: col(30) },
      ],
    };
  },

  // Nivel 4: palancas en orden; Lu abre a Mos antes de saltar al carril bajo.
  4: (world) => {
    const [green, pink, cyan, white] = (['green', 'pink', 'cyan', 'white'] as const).map((c) => mover(world, c));
    return {
      mos: [
        { x: 140, action: true },
        { x: 220, jump: true },
        { x: 330, until: () => atTop(pink) },
        { x: 452, jump: true },
        { x: 660, action: true },
        { x: 780, jump: true },
        { x: 900, jump: true },
        { x: 970, until: () => atTop(white) },
        { x: 1100, jump: true },
        { x: col(29) },
      ],
      lu: [
        { x: 140, jump: true },
        { x: 210, until: () => atTop(green) },
        { x: 380, jump: true },
        { x: 420, action: true },
        { x: 655, jump: true },
        { x: 810, until: () => atTop(cyan) },
        { x: 940, action: true },
        { x: 980, jump: true },
        { x: 1100, jump: true },
        { x: col(29) },
      ],
    };
  },

  // Nivel 5: un bloque al pozo (puente), otro de escalón y otro sobre el botón.
  5: (world) => {
    const [bridge, offering] = world.blocks;
    const sunk = () => bridge.y === 17 * 40 + 20 - 40;
    const onButton = () => world.buttons[0].pressed && offering.x > 960;
    return {
      mos: [
        { x: 60, jump: true },
        { x: 500, land: true },
        { x: 760, land: true },
        // Salto casi vertical a por la gema, sin pasar por encima del bloque.
        { x: 800, land: true },
        { x: 780, jump: true },
        { x: 790, land: true },
        { x: 988, until: onButton },
        { x: 1100, jump: true },
        { x: col(28) },
      ],
      lu: [
        { x: 180, jump: true },
        { x: 140, until: sunk },
        { x: 520, land: true },
        { x: 740, jump: true },
        { x: 760, until: onButton },
        { x: 940, jump: true },
        { x: 1180, jump: true },
        { x: col(30) },
      ],
    };
  },

  // Nivel 6: suelo de oro para Mos y de plata para Lu; cada uno abre al otro.
  6: (world) => {
    const [pink, green, cyan, white] = (['pink', 'green', 'cyan', 'white'] as const).map((c) => mover(world, c));
    const { mos, lu } = world.players;
    return {
      mos: [
        { x: 380, action: true },
        { x: 420, jump: true },
        { x: 450, until: () => atTop(green) },
        { x: 900, jump: true },
        { x: 900, until: () => rides(lu, cyan) && atStart(cyan) },
        { x: 940, until: () => standsOn(lu, 8) && lu.centerX > 810 },
        { x: 978, jump: true },
        { x: 1160, until: () => atTop(white) },
        { x: 1215, jump: true },
        { x: col(30) },
      ],
      lu: [
        { x: 300, jump: true },
        { x: 420, until: () => atTop(pink) },
        { x: 540, jump: true },
        { x: 600, land: true },
        { x: 660, action: true },
        { x: 700, jump: true },
        { x: 760, until: () => atTop(cyan) },
        { x: 1060, jump: true },
        { x: 1100, until: () => rides(mos, white) && atStart(white) },
        { x: 1100, action: true },
        { x: col(23) },
      ],
    };
  },

  // Nivel 7: a oscuras; Mos sube a Lu con el botón y ella a él con la palanca.
  7: (world) => {
    const [pink, green, cyan] = (['pink', 'green', 'cyan'] as const).map((c) => mover(world, c));
    const { mos, lu } = world.players;
    return {
      mos: [
        { x: 155, jump: true },
        { x: 418, jump: true },
        { x: 540, action: true },
        { x: 570, until: () => atTop(pink) },
        { x: 780, jump: true },
        { x: 790, until: () => rides(lu, green) },
        { x: 740, until: () => standsOn(lu, 8) && lu.centerX > 930 },
        { x: 1020, jump: true },
        { x: 1120, until: () => atTop(cyan) },
        { x: 1175, jump: true },
        { x: col(29) },
      ],
      lu: [
        { x: 300, jump: true },
        { x: 418, jump: true },
        { x: 570, until: () => atTop(pink) },
        { x: 700, jump: true },
        { x: 880, until: () => atTop(green) },
        { x: 980, jump: true },
        { x: 1020, until: () => rides(mos, cyan) },
        { x: 1020, action: true },
        { x: 1030, until: () => atTop(cyan) },
        { x: 1215, jump: true },
        { x: col(30) },
      ],
    };
  },

  // Nivel 8: la escalera, turnándose en los botones.
  8: (world) => {
    const [e1, e2, e3, e4] = (['green', 'pink', 'cyan', 'white'] as const).map((c) => mover(world, c));
    const { mos, lu } = world.players;
    return {
      mos: [
        { x: 220, jump: true },
        { x: 280, until: () => atTop(e1) },
        { x: 380, jump: true },
        { x: 500, jump: true },
        { x: 420, until: () => rides(lu, e2) },
        { x: 460, until: () => standsOn(lu, 8) && lu.centerX > 220 },
        { x: 560, until: () => atTop(e3) },
        { x: 700, jump: true },
        { x: 780, until: () => rides(lu, e4) },
        { x: 820, until: () => standsOn(lu, 4) && lu.centerX > 600 },
        { x: 980, jump: true },
        { x: 1100, jump: true },
        { x: col(28) },
      ],
      lu: [
        { x: 60, until: () => rides(mos, e1) },
        { x: 100, until: () => standsOn(mos, 12) && mos.centerX > 330 },
        { x: 100, jump: true },
        { x: 160, until: () => atTop(e2) },
        { x: 60, jump: true },
        { x: 300, jump: true },
        { x: 300, until: () => rides(mos, e3) },
        { x: 340, until: () => standsOn(mos, 4) && mos.centerX > 610 },
        { x: 440, until: () => atTop(e4) },
        { x: 506, jump: true },
        { x: 860, jump: true },
        { x: 1020, jump: true },
        { x: 1180, jump: true },
        { x: col(30) },
      ],
    };
  },

  // Nivel 9: todo junto, de los charcos de abajo a la piedra del sol.
  9: (world) => {
    const green = mover(world, 'green');
    const ferry = mover(world, 'pink');
    const ferryCenter = () => ferry.x + ferry.w / 2;
    const { mos, lu } = world.players;
    return {
      mos: [
        { x: 155, jump: true },
        { x: 458, jump: true },
        { x: 980, jump: true },
        { x: 1080, until: () => atTop(green) },
        { x: 1140, until: () => rides(lu, green) && atStart(green) },
        { x: 1180, until: () => standsOn(lu, 12) && lu.centerX > 1125 },
        { x: 700, until: () => rides(lu, ferry) },
        { x: 700, action: true },
        { x: 700, jump: true },
        { x: ferryCenter, until: () => atTop(ferry) },
        { x: 340, jump: true },
        { x: 140, land: true },
        { x: 90, jump: true },
        { x: 200, land: true },
        { x: 225, jump: true },
        { x: 860, jump: true },
        { x: col(20) },
      ],
      lu: [
        { x: 300, jump: true },
        { x: 458, jump: true },
        { x: 900, until: () => rides(mos, green) },
        { x: 940, until: () => standsOn(mos, 12) && mos.centerX > 1125 },
        { x: 1000, until: () => atStart(green) },
        { x: 1080, until: () => atTop(green) },
        { x: 1140, jump: true },
        { x: ferryCenter, until: () => atTop(ferry) },
        { x: 140, land: true },
        { x: 90, jump: true },
        { x: 200, land: true },
        { x: 225, jump: true },
        { x: col(24) },
      ],
    };
  },
};
