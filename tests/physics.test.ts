import { describe, expect, it } from 'vitest';
import { PHYSICS, PLAYER } from '../src/config';
import { moveBox } from '../src/game/physics';
import { Player, stepPlayer } from '../src/game/player';
import { NO_CONTROLS, type Controls, type Rect } from '../src/game/types';
import { World } from '../src/game/world';
import { blankMap, DT, fill, makeLevel, put, run, seconds, T } from './helpers';

const FLOOR_Y = 17 * T; // borde superior de la fila 17 (suelo del mapa vacío)

/** Jugador suelto sobre una lista fija de sólidos. */
function soloPlayer(x: number, y: number): Player {
  const p = new Player('mos');
  p.x = x;
  p.y = y;
  p.prevX = x;
  p.prevY = y;
  return p;
}

function controls(partial: Partial<Controls>): Controls {
  return { ...NO_CONTROLS, ...partial };
}

describe('colisiones', () => {
  it('una pared frena al personaje a velocidad máxima sin dejarle atravesarla', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    fill(map, 10, 1, 10, 16, '#');
    const world = new World(makeLevel(map));
    run(world, seconds(3), () => ({ mos: { right: true } }));
    const p = world.players.mos;
    expect(p.x + p.w).toBe(10 * T);
    expect(p.vx).toBe(0);
  });

  it('cae a velocidad máxima sobre un suelo de una baldosa y no lo atraviesa', () => {
    const map = blankMap();
    put(map, 5, 1, 'M');
    fill(map, 1, 12, 30, 12, '#');
    const world = new World(makeLevel(map));
    const p = world.players.mos;
    let maxSpeed = 0;
    run(world, seconds(2), () => {
      maxSpeed = Math.max(maxSpeed, p.vy);
      return {};
    });
    expect(maxSpeed).toBe(PHYSICS.maxFallSpeed);
    expect(p.y + p.h).toBe(12 * T);
    expect(p.grounded).toBe(true);
  });

  it('moveBox no se salta un sólido fino con un desplazamiento grande', () => {
    const wall: Rect = { x: 100, y: 0, w: 4, h: 100 };
    const box: Rect = { x: 60, y: 20, w: 24, h: 44 };
    const result = moveBox(box, 80, 0, [wall]);
    expect(result.x).toBe(100 - 24);
    expect(result.hitX).toBe(true);
  });

  it('un sólido que ya solapaba no engancha al personaje', () => {
    const inside: Rect = { x: 50, y: 30, w: 40, h: 40 };
    const box: Rect = { x: 60, y: 20, w: 24, h: 44 };
    const result = moveBox(box, -5, 0, [inside]);
    expect(result.x).toBe(55);
  });

  it('Mos y Lu se mueven a la vez sin interferirse y se atraviesan', () => {
    const map = blankMap();
    put(map, 10, 16, 'M');
    put(map, 12, 16, 'L');
    const world = new World(makeLevel(map));
    const mos = world.players.mos;
    const lu = world.players.lu;
    const startMos = mos.x;
    const startLu = lu.x;
    run(world, seconds(0.5), () => ({ mos: { right: true }, lu: { left: true } }));
    // Recorren lo mismo en sentidos opuestos, aunque se crucen por el camino.
    expect(mos.x - startMos).toBeCloseTo(startLu - lu.x, 6);
    expect(mos.x).toBeGreaterThan(startLu);
    expect(lu.x).toBeLessThan(startMos);
  });
});

describe('salto', () => {
  it('alcanza unos 98 px de altura con el salto completo', () => {
    const map = blankMap();
    put(map, 5, 16, 'M');
    const world = new World(makeLevel(map));
    const p = world.players.mos;
    const startY = p.y;
    let minY = p.y;
    run(world, seconds(1), (frame) => {
      minY = Math.min(minY, p.y);
      return { mos: { jumpPressed: frame === 0, jumpHeld: true } };
    });
    const expected = PHYSICS.jumpVelocity ** 2 / (2 * PHYSICS.gravity);
    expect(startY - minY).toBeGreaterThan(expected - 1);
    expect(startY - minY).toBeLessThanOrEqual(expected + 0.01);
  });

  it('recorre unas 4 baldosas en un salto completo a toda velocidad', () => {
    const map = blankMap();
    put(map, 2, 16, 'M');
    const world = new World(makeLevel(map));
    const p = world.players.mos;
    run(world, seconds(0.5), () => ({ mos: { right: true } }));
    const takeoff = p.x;
    let landedX = 0;
    run(world, seconds(1.5), (frame) => {
      if (frame > 0 && p.grounded && landedX === 0) landedX = p.x;
      return { mos: { right: true, jumpPressed: frame === 0, jumpHeld: true } };
    });
    const tiles = (landedX - takeoff) / T;
    expect(tiles).toBeGreaterThan(3.8);
    expect(tiles).toBeLessThan(4.3);
  });

  it('soltar el salto pronto da un salto más bajo (salto variable)', () => {
    const height = (holdFrames: number) => {
      const map = blankMap();
      put(map, 5, 16, 'M');
      const world = new World(makeLevel(map));
      const p = world.players.mos;
      const startY = p.y;
      let minY = p.y;
      run(world, seconds(1), (frame) => {
        minY = Math.min(minY, p.y);
        return { mos: { jumpPressed: frame === 0, jumpHeld: frame < holdFrames } };
      });
      return startY - minY;
    };
    const full = height(60);
    const tap = height(4);
    expect(tap).toBeLessThan(full * 0.5);
    expect(tap).toBeGreaterThan(10);
  });

  /** Intenta subir un escalón de `steps` baldosas saltando contra él durante 3 s. */
  function climbs(steps: number): boolean {
    const map = blankMap();
    put(map, 4, 16, 'M');
    fill(map, 10, 17 - steps, 30, 16, '#');
    const world = new World(makeLevel(map));
    const p = world.players.mos;
    run(world, seconds(3), () => ({
      mos: { right: true, jumpHeld: true, jumpPressed: p.grounded && p.x + p.w >= 10 * T - 30 && p.x < 10 * T },
    }));
    return p.y + p.h === (17 - steps) * T && p.x > 10 * T;
  }

  it('sube un escalón de 2 baldosas', () => {
    expect(climbs(2)).toBe(true);
  });

  it('no sube un escalón de 3 baldosas', () => {
    expect(climbs(3)).toBe(false);
  });
});

describe('tiempo coyote y búfer de salto', () => {
  const ledge: Rect = { x: 0, y: 400, w: 200, h: 40 };
  const ground: Rect = { x: -1000, y: 700, w: 3000, h: 40 };
  const solids = () => [ledge, ground];

  /** Camina hasta salir del borde y salta `framesAfter` pasos después de perder el suelo. */
  function jumpAfterLeavingLedge(framesAfter: number): boolean {
    const p = soloPlayer(150, 400 - PLAYER.height);
    p.grounded = true;
    p.vx = PHYSICS.maxRunSpeed;
    let airborne = 0;
    for (let i = 0; i < 120; i++) {
      if (!p.grounded) airborne++;
      const press = airborne === framesAfter && !p.grounded;
      const result = stepPlayer(p, controls({ right: true, jumpPressed: press, jumpHeld: true }), DT, { solidsNear: solids });
      if (result.jumped) return true;
      if (airborne > framesAfter) return false;
    }
    return false;
  }

  it('permite saltar poco después de salir de un borde', () => {
    expect(jumpAfterLeavingLedge(3)).toBe(true);
  });

  it('no permite saltar pasado el tiempo coyote', () => {
    expect(jumpAfterLeavingLedge(Math.ceil(PHYSICS.coyoteTime / DT) + 2)).toBe(false);
  });

  /** Deja caer al personaje y pulsa salto `framesBefore` pasos antes de aterrizar. */
  function bufferedJump(framesBefore: number): boolean {
    const fall = () => {
      const p = soloPlayer(300, 500);
      let frames = 0;
      while (!p.grounded && frames < 300) {
        stepPlayer(p, NO_CONTROLS, DT, { solidsNear: solids });
        frames++;
      }
      return frames;
    };
    const landingFrame = fall();
    const p = soloPlayer(300, 500);
    for (let i = 0; i < landingFrame + 5; i++) {
      const press = i === landingFrame - framesBefore;
      const result = stepPlayer(p, controls({ jumpPressed: press, jumpHeld: true }), DT, { solidsNear: solids });
      if (result.jumped) return true;
    }
    return false;
  }

  it('un salto pulsado justo antes de aterrizar se ejecuta al tocar el suelo', () => {
    expect(bufferedJump(4)).toBe(true);
  });

  it('un salto pulsado demasiado pronto se descarta', () => {
    expect(bufferedJump(Math.ceil(PHYSICS.jumpBufferTime / DT) + 3)).toBe(false);
  });
});

describe('charcos y escalones bajos', () => {
  it('Mos cruza un charco de oro medio hundido y sale caminando, sin saltar', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    fill(map, 6, 17, 8, 17, 'o');
    const world = new World(makeLevel(map));
    const p = world.players.mos;
    let deepest = 0;
    run(world, seconds(2), () => {
      deepest = Math.max(deepest, p.y + p.h);
      return { mos: { right: true } };
    });
    expect(world.state).toBe('playing');
    expect(deepest).toBe(FLOOR_Y + T / 2);
    expect(p.x).toBeGreaterThan(9 * T);
    expect(p.y + p.h).toBe(FLOOR_Y);
  });
});
