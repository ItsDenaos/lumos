import { describe, expect, it } from 'vitest';
import { RULES } from '../src/config';
import { parseLevel } from '../src/game/level';
import { isAtDoor } from '../src/game/entities/door';
import { computeStars, lethalLiquid } from '../src/game/rules';
import { World } from '../src/game/world';
import { blankMap, fill, makeLevel, put, run, seconds, T } from './helpers';

describe('charcos', () => {
  function walkInto(pool: string, who: 'M' | 'L') {
    const map = blankMap();
    put(map, 3, 16, who);
    fill(map, 6, 17, 7, 17, pool);
    const world = new World(makeLevel(map));
    const id = who === 'M' ? 'mos' : 'lu';
    run(world, seconds(2), (_, w) => (w.state === 'playing' ? { [id]: { right: true } } : {}));
    return { world, id } as const;
  }

  it('el oro quema a Lu y la plata apaga a Mos', () => {
    const lu = walkInto('o', 'L');
    expect(lu.world.deaths.lu).toBe(1);
    const mos = walkInto('p', 'M');
    expect(mos.world.deaths.mos).toBe(1);
  });

  it('cada uno cruza su propio metal sin daño', () => {
    expect(walkInto('o', 'M').world.deaths.mos).toBe(0);
    expect(walkInto('p', 'L').world.deaths.lu).toBe(0);
  });

  it('la sombra mata a los dos, y si caen a la vez cuentan ambas muertes', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 18, 16, 'L');
    fill(map, 6, 17, 7, 17, 'x');
    fill(map, 21, 17, 22, 17, 'x');
    const world = new World(makeLevel(map));
    let deathFrameState = '';
    run(world, seconds(1), (_, w) => {
      if (w.state === 'dying' && !deathFrameState) deathFrameState = [...w.dead].sort().join(',');
      return w.state === 'playing' ? { mos: { right: true }, lu: { right: true } } : {};
    });
    expect(deathFrameState).toBe('lu,mos');
    expect(world.deaths).toEqual({ mos: 1, lu: 1 });
  });

  it('rozar el borde de un charco (4 px o menos) no mata', () => {
    const map = blankMap();
    put(map, 6, 17, 'o');
    const level = parseLevel(makeLevel(map));
    const liquidRight = 7 * T;
    const box = (x: number) => ({ x, y: 17 * T + 20 - 44, w: 24, h: 44 });
    expect(lethalLiquid(level, box(liquidRight - RULES.liquidKillOverlap), 'lu')).toBeNull();
    expect(lethalLiquid(level, box(liquidRight - RULES.liquidKillOverlap - 1), 'lu')).toBe('gold');
    expect(lethalLiquid(level, box(liquidRight - 20), 'mos')).toBeNull();
  });

  it('al morir hay 1 s de animación y después se reinicia todo menos el contador de muertes', () => {
    const map = blankMap();
    put(map, 3, 16, 'L');
    put(map, 6, 16, 'c');
    fill(map, 10, 17, 11, 17, 'o');
    const world = new World(makeLevel(map));
    const lu = world.players.lu;
    const startX = lu.x;
    run(world, seconds(3), (_, w) => (w.state === 'playing' && w.deaths.lu === 0 ? { lu: { right: true } } : {}));
    expect(world.deaths.lu).toBe(1);
    expect(world.state).toBe('playing');
    expect(lu.x).toBe(startX);
    expect(world.gemCount('lu').collected).toBe(0);
    expect(world.time).toBe(0);
    expect(world.timerStarted).toBe(false);
  });

  it('la muerte dura exactamente el tiempo configurado', () => {
    const map = blankMap();
    put(map, 3, 16, 'L');
    fill(map, 5, 17, 6, 17, 'o');
    const world = new World(makeLevel(map));
    let dyingFrames = 0;
    run(world, seconds(3), (_, w) => {
      if (w.state === 'dying') dyingFrames++;
      return w.state === 'playing' && w.deaths.lu === 0 ? { lu: { right: true } } : {};
    });
    expect(dyingFrames).toBe(seconds(RULES.deathTime));
  });

  it('en modo invencible nadie muere', () => {
    const lu = (() => {
      const map = blankMap();
      put(map, 3, 16, 'L');
      fill(map, 6, 17, 7, 17, 'o');
      const world = new World(makeLevel(map));
      world.invincible = true;
      run(world, seconds(2), () => ({ lu: { right: true } }));
      return world;
    })();
    expect(lu.deaths.lu).toBe(0);
    expect(lu.state).toBe('playing');
  });
});

describe('gemas', () => {
  it('solo las recoge su dueño', () => {
    const map = blankMap();
    put(map, 3, 16, 'L');
    put(map, 8, 16, '*');
    put(map, 12, 16, 'c');
    const world = new World(makeLevel(map));
    run(world, seconds(2), () => ({ lu: { right: true } }));
    expect(world.gemCount('mos')).toEqual({ collected: 0, total: 1 });
    expect(world.gemCount('lu')).toEqual({ collected: 1, total: 1 });
    const events = world.drainEvents().filter((e) => e.type === 'gem');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'gem', player: 'lu' });
  });
});

describe('puertas y victoria', () => {
  function doorsLevel() {
    const map = blankMap();
    put(map, 7, 16, 'M');
    put(map, 8, 16, '[');
    put(map, 17, 16, 'L');
    put(map, 18, 16, ']');
    return new World(makeLevel(map));
  }

  const atDoor = (w: World, id: 'mos' | 'lu') => isAtDoor(w.players[id].box, w.level.doors[id]);

  it('con ambos en su puerta durante 0,5 s se gana el nivel', () => {
    const world = doorsLevel();
    let bothFrame = -1;
    let wonFrame = -1;
    run(world, seconds(2), (frame, w) => {
      if (bothFrame < 0 && atDoor(w, 'mos') && atDoor(w, 'lu')) bothFrame = frame;
      if (wonFrame < 0 && w.state === 'won') wonFrame = frame;
      return {
        mos: { right: !atDoor(w, 'mos') },
        lu: { right: !atDoor(w, 'lu') },
      };
    });
    expect(world.state).toBe('won');
    expect((wonFrame - bothFrame) / 60).toBeCloseTo(RULES.doorHoldTime, 1);
  });

  it('si uno se aparta antes de tiempo, se cancela', () => {
    const world = doorsLevel();
    let both = 0;
    run(world, seconds(2), (_, w) => {
      if (atDoor(w, 'mos') && atDoor(w, 'lu')) both++;
      const leave = both > seconds(RULES.doorHoldTime * 0.6);
      return {
        mos: leave ? { left: true } : { right: !atDoor(w, 'mos') },
        lu: { right: !atDoor(w, 'lu') },
      };
    });
    expect(world.state).toBe('playing');
    expect(world.doorHold).toBe(0);
  });

  it('el cronómetro arranca con la primera tecla y se detiene al ganar', () => {
    const world = doorsLevel();
    run(world, seconds(1));
    expect(world.timerStarted).toBe(false);
    expect(world.time).toBe(0);
    run(world, seconds(2), (_, w) => ({
      mos: { right: !atDoor(w, 'mos') },
      lu: { right: !atDoor(w, 'lu') },
    }));
    expect(world.state).toBe('won');
    const finalTime = world.time;
    expect(finalTime).toBeGreaterThan(0.5);
    run(world, seconds(1));
    expect(world.time).toBe(finalTime);
  });
});

describe('estrellas', () => {
  it('1 por completar, 2 con todas las gemas, 3 además bajo el tiempo objetivo', () => {
    expect(computeStars(10, 40, false)).toBe(1);
    expect(computeStars(50, 40, true)).toBe(2);
    expect(computeStars(30, 40, true)).toBe(3);
    expect(computeStars(30, 40, false)).toBe(1);
  });
});
