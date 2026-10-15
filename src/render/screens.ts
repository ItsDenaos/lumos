// Arte de las pantallas fuera de la partida, en el lienzo del arte (640 × 360): el cielo que
// amanece y la cornisa del final, y la pose de reposo de Lu y Mos fuera de los niveles.

import type { PlayerId } from '../game/types';
import { STAND_FRAME, type CharacterPose } from './animation';
import { ridge, skyBands, stars, twinkle } from './background';
import { ZONE_STYLES } from './palette';
import { ART_H, ART_W, rect } from './pixel';
import { mix } from './shapes';
import { FRAME_COUNT } from './sprites';

/** Cielo de noche (o de amanecer, con dawn de 0 a 1), estrellas y montañas. */
export function drawSky(ctx: CanvasRenderingContext2D, dawn: number, clock: number, reduce: boolean): void {
  const night = ZONE_STYLES.observatory.sky;
  const day = ZONE_STYLES.forest.sky;
  const bands = day.map((color, i) => mix(night[Math.min(night.length - 1, Math.floor((i * night.length) / day.length))], color, dawn));
  skyBands(ctx, bands);
  if (dawn < 0.85) {
    ctx.globalAlpha = 1 - dawn / 0.85;
    stars(ctx, 150, 250, 5);
    if (!reduce) twinkle(ctx, clock, 240);
    ctx.globalAlpha = 1;
  }
  ridge(ctx, 296, 72, 71, 0.006, mix('#1c1a36', '#6a4e7c', dawn));
  ridge(ctx, 322, 44, 83, 0.011, mix('#131126', '#3e3456', dawn));
}

/** Cornisa de piedra con ribete de latón, de `top` hasta abajo. */
export function drawLedge(ctx: CanvasRenderingContext2D, top: number): void {
  const s = ZONE_STYLES.observatory;
  rect(ctx, 0, top, ART_W, ART_H - top, s.stone);
  for (let y = top + 3, k = 0; y < ART_H; y += 10, k++) {
    rect(ctx, 0, y, ART_W, 1, s.stoneLight);
    rect(ctx, 0, y + 8, ART_W, 1, s.stoneDark);
    rect(ctx, 0, y + 9, ART_W, 1, s.mortar);
    for (let x = k % 2 ? 10 : 0; x < ART_W; x += 20) {
      rect(ctx, x + 19, y, 1, 10, s.mortar);
      rect(ctx, x, y, 1, 8, s.stoneLight);
    }
  }
  rect(ctx, 0, top, ART_W, 2, s.rim);
  rect(ctx, 0, top, ART_W, 1, s.rimLight);
  rect(ctx, 0, top + 2, ART_W, 1, s.rimDark);
}

/** Pose de reposo animada solo con el reloj (para el título, el mapa y el final). */
export function idlePose(id: PlayerId, x: number, y: number, clock: number, celebrate = 0): CharacterPose {
  const isMos = id === 'mos';
  let anim: CharacterPose['anim'] = 'stand';
  let frame = Math.floor(clock / STAND_FRAME[id]) % FRAME_COUNT.stand;
  let lift = 0;
  if (celebrate > 0) {
    // Celebran: el gesto de cada uno cada poco, con un saltito.
    const beat = (clock + (isMos ? 0.5 : 0)) % 1.2;
    if (beat < 0.36) {
      anim = 'action';
      frame = Math.min(2, Math.floor(beat / 0.12));
    }
    lift = Math.abs(Math.sin(clock * 2.6)) * 10 * celebrate;
  }
  return {
    x,
    y,
    // Lu (izquierda del teclado) mira a la derecha; Mos, a la izquierda.
    facing: isMos ? -1 : 1,
    scaleX: 1,
    scaleY: 1,
    runPhase: 0,
    run: 0,
    airborne: lift > 0,
    vy: 0,
    anim,
    frame,
    alpha: 1,
    lift,
    celebrate,
    dim: 0,
    time: clock,
  };
}
