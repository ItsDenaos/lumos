// Pose de reposo de Lu y Mos fuera de los niveles (título, mapa y final).

import type { PlayerId } from '../game/types';
import { STAND_FRAME, type CharacterPose } from './animation';
import { FRAME_COUNT } from './sprites';

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
