// "Bots" deterministas para recorrer niveles con la física real: siguen una ruta de
// puntos de paso, saltan donde se les indica y también cuando chocan con un muro.

import type { Controls, PlayerId } from '../src/game/types';
import type { World } from '../src/game/world';

export interface Waypoint {
  /** Centro horizontal objetivo, en píxeles (o una función, para seguir algo que se mueve). */
  x: number | ((world: World) => number);
  /** Saltar al llegar (con los pies en el suelo). */
  jump?: boolean;
  /** Accionar la palanca al llegar. */
  action?: boolean;
  /** Al llegar (con los pies en el suelo), quedarse quieto hasta que se cumpla. */
  until?: (world: World) => boolean;
  /** No dar el punto por alcanzado hasta pisar suelo (por ejemplo, tras subir un escalón). */
  land?: boolean;
}

export function waypointBot(id: PlayerId, route: Waypoint[], tolerance = 6) {
  let index = 0;
  let hold = 0;
  /** Posición del paso anterior si entonces ya intentaba moverse (para detectar un muro). */
  let lastX = Number.NaN;
  let waiting = false;

  const bot = (world: World): Partial<Controls> => {
    const p = world.players[id];
    if (waiting) {
      if (!route[index].until!(world)) {
        lastX = Number.NaN;
        // Si el destino se mueve (una barca), se mantiene centrado encima; si no, quieto.
        if (typeof route[index].x !== 'function') return {};
        const follow = targetX(route[index], world) - p.centerX;
        return { right: follow > tolerance / 2, left: follow < -tolerance / 2 };
      }
      waiting = false;
      index++;
    }

    let jumpPressed = false;
    let actionPressed = false;
    const current = route[index];
    const isLast = index === route.length - 1;
    const needsGround = current.jump || current.until || current.land || current.action;
    if (!isLast && Math.abs(targetX(current, world) - p.centerX) <= tolerance && (!needsGround || p.grounded)) {
      if (current.jump) {
        jumpPressed = true;
        hold = 40;
      }
      actionPressed = current.action ?? false;
      if (current.until) {
        waiting = true;
        lastX = Number.NaN;
        return { actionPressed };
      }
      index++;
    }

    const d = targetX(route[index], world) - p.centerX;
    const right = d > tolerance / 2;
    const left = d < -tolerance / 2;
    // Bloqueado contra un muro (ya intentaba moverse y no avanzó): saltar.
    if (!jumpPressed && p.grounded && (right || left) && p.x === lastX) {
      jumpPressed = true;
      hold = 40;
    }
    lastX = right || left ? p.x : Number.NaN;
    if (hold > 0) hold--;
    return { right, left, jumpPressed, jumpHeld: jumpPressed || hold > 0, actionPressed };
  };
  /** Punto de la ruta en el que va (para diagnosticar recorridos que se atascan). */
  bot.progress = () => ({ index, waiting });
  return bot;
}

function targetX(waypoint: Waypoint, world: World): number {
  return typeof waypoint.x === 'function' ? waypoint.x(world) : waypoint.x;
}
