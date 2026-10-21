// Partes del arte que se pueden comprobar sin navegador: partículas, iconos, la hoja de sprites
// de Lu y Mos, la animación de los personajes, el aspecto de los charcos y los colores.

import { describe, expect, it } from 'vitest';
import finalData from '../src/assets/final.png?inline';
import forestData from '../src/assets/fondo-bosque.png?inline';
import observatoryData from '../src/assets/fondo-observatorio.png?inline';
import sanctuaryData from '../src/assets/fondo-santuario.png?inline';
import mapData from '../src/assets/mapa.png?inline';
import coverData from '../src/assets/portada.png?inline';
import propsData from '../src/assets/elementos.png?inline';
import sheetData from '../src/assets/personajes.png?inline';
import { EFFECTS, PHYSICS, RULES, WORLD } from '../src/config';
import { isAtDoor } from '../src/game/entities/door';
import { World } from '../src/game/world';
import { CharacterAnimator } from '../src/render/animation';
import { CHANNEL_SHAPES, DIGITS, ICON_GRIDS, ICON_PALETTES } from '../src/render/icons';
import { liquidRuns } from '../src/render/liquids';
import { ParticleSystem } from '../src/render/particles';
import { ART_H, ART_W, gridProblems } from '../src/render/pixel';
import { PROP_FRAMES, PROP_SHEET_SIZE } from '../src/render/propSheet';
import { CHARACTER_ANIMS, FRAME_COUNT, SHEET, SHEET_SIZE } from '../src/render/sprites';
import { mix, rgba, shade } from '../src/render/shapes';
import { blankMap, DT, fill, makeLevel, put, run, seconds } from './helpers';

describe('partículas', () => {
  it('nunca hay más de 400 a la vez', () => {
    const system = new ParticleSystem();
    for (let i = 0; i < 1000; i++) system.emit({ x: i, y: 0, life: 5, color: '#ffffff' });
    expect(system.particles).toHaveLength(EFFECTS.maxParticles);
    // Al llenarse, las más antiguas dejan su sitio.
    expect(system.particles[0].x).toBe(1000 - EFFECTS.maxParticles);
  });

  it('se mueven y desaparecen al acabar su vida', () => {
    const system = new ParticleSystem();
    system.emit({ x: 0, y: 0, vx: 60, vy: 0, gravity: 120, life: 0.5, color: '#ffffff' });
    for (let i = 0; i < 15; i++) system.update(DT);
    const p = system.particles[0];
    expect(p.x).toBeCloseTo(15, 6);
    expect(p.y).toBeGreaterThan(0);
    for (let i = 0; i < 30; i++) system.update(DT);
    expect(system.particles).toHaveLength(0);
  });
});

describe('pixel art', () => {
  it('detecta filas torcidas y colores sin definir', () => {
    expect(gridProblems(['ab', 'a'], { a: '#000', b: '#fff' })).toHaveLength(1);
    expect(gridProblems(['az'], { a: '#000' })).toHaveLength(1);
  });

  it('las cifras de píxel miden 5 × 7 y no se confunden entre sí', () => {
    const grids = Object.values(DIGITS);
    expect(Object.keys(DIGITS)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    for (const grid of grids) {
      expect(grid).toHaveLength(7);
      expect(gridProblems(grid, { '#': '#000' })).toEqual([]);
      expect(grid[0]).toHaveLength(5);
    }
    expect(new Set(grids.map((g) => g.join('/'))).size).toBe(10);
  });

  it('cada canal tiene su propia forma, para distinguirlos sin depender del color', () => {
    expect(Object.keys(CHANNEL_SHAPES).sort()).toEqual(['cyan', 'green', 'pink', 'white']);
    expect(new Set(Object.values(CHANNEL_SHAPES)).size).toBe(4);
  });

  it('los iconos son rectangulares y usan su paleta', () => {
    for (const [name, grid] of Object.entries(ICON_GRIDS)) {
      expect(gridProblems(grid, ICON_PALETTES[name as keyof typeof ICON_GRIDS])).toEqual([]);
    }
  });
});

describe('hoja de sprites de Lu y Mos', () => {
  it('tiene los fotogramas del diseño: quieto 3, andar 4, acción 3, daño 1', () => {
    expect(FRAME_COUNT).toEqual({ stand: 3, walk: 4, action: 3, hurt: 1 });
    for (const id of ['lu', 'mos'] as const) {
      for (const anim of CHARACTER_ANIMS) expect(SHEET[id].frames[anim]).toHaveLength(FRAME_COUNT[anim]);
    }
  });

  it('cada celda cabe en la imagen, sin pisar a la siguiente, con el ancla dentro', () => {
    for (const id of ['lu', 'mos'] as const) {
      const e = SHEET[id];
      const xs = CHARACTER_ANIMS.flatMap((anim) => e.frames[anim]);
      xs.forEach((x, i) => {
        expect(x + e.w).toBeLessThanOrEqual(SHEET_SIZE.w);
        if (i > 0) expect(x).toBeGreaterThanOrEqual(xs[i - 1] + e.w);
      });
      expect(e.y + e.h).toBeLessThanOrEqual(SHEET_SIZE.h);
      expect(e.ax).toBeGreaterThan(0);
      expect(e.ax).toBeLessThan(e.w);
      expect(e.ay).toBeLessThanOrEqual(e.h);
    }
    expect(SHEET.lu.tips).toHaveLength(FRAME_COUNT.action);
  });

  it('los personajes caben de pie en un pasillo de 2 baldosas', () => {
    for (const id of ['lu', 'mos'] as const) expect(SHEET[id].ay).toBeLessThanOrEqual(2 * WORLD.tile);
  });

  it('la imagen es un PNG con paleta y transparencia, del tamaño que dicen los datos', () => {
    const png = pngInfo(sheetData);
    expect(png).toMatchObject({ w: SHEET_SIZE.w, h: SHEET_SIZE.h, palette: true, transparency: true });
  });

  it('la portada, el mapa, los fondos de las zonas y el final ocupan justo el lienzo del arte (640 × 360) y usan paleta', () => {
    for (const data of [coverData, mapData, forestData, sanctuaryData, observatoryData, finalData]) {
      expect(pngInfo(data)).toMatchObject({ w: ART_W, h: ART_H, palette: true });
    }
  });
});

/** Tamaño y tipo de un PNG incrustado como data URL. */
function pngInfo(dataUrl: string) {
  const bytes = atob(dataUrl.split(',')[1]);
  const u32 = (at: number) => [0, 1, 2, 3].reduce((n, i) => n * 256 + bytes.charCodeAt(at + i), 0);
  expect(bytes.slice(1, 4)).toBe('PNG');
  // Tipo de color 3: con paleta.
  return { w: u32(16), h: u32(20), palette: bytes.charCodeAt(25) === 3, transparency: bytes.includes('tRNS') };
}

describe('animación de los personajes', () => {
  function floorWorld() {
    const map = blankMap();
    put(map, 4, 16, 'M');
    put(map, 8, 16, 'L');
    return new World(makeLevel(map));
  }

  it('aterrizar aplasta un momento (squash) y después recupera la forma', () => {
    const world = floorWorld();
    const anim = new CharacterAnimator('mos');
    const mos = world.players.mos;
    anim.update(DT, mos, [{ type: 'land', player: 'mos', speed: PHYSICS.maxFallSpeed }]);
    const squashed = anim.pose(mos, world, 1);
    expect(squashed.scaleY).toBeLessThan(0.8);
    expect(squashed.scaleX).toBeGreaterThan(1.1);
    for (let i = 0; i < 30; i++) anim.update(DT, mos, []);
    expect(anim.pose(mos, world, 1).scaleY).toBeCloseTo(1, 1);
  });

  it('saltar estira (stretch)', () => {
    const world = floorWorld();
    const anim = new CharacterAnimator('lu');
    anim.update(DT, world.players.lu, [{ type: 'jump', player: 'lu' }]);
    expect(anim.pose(world.players.lu, world, 1).scaleY).toBeGreaterThan(1.1);
  });

  it('correr avanza el ciclo de pasos y la mirada sigue la dirección', () => {
    const world = floorWorld();
    const anim = new CharacterAnimator('mos');
    run(world, seconds(0.5), (_, w) => {
      anim.update(DT, w.players.mos, []);
      return { mos: { left: true } };
    });
    const pose = anim.pose(world.players.mos, world, 1);
    expect(pose.runPhase).toBeGreaterThan(5);
    expect(pose.run).toBeGreaterThan(0.9);
    expect(pose.facing).toBe(-1);
  });

  it('en reposo respiran a su ritmo: Mos deprisa, Lu despacio', () => {
    const world = floorWorld();
    const changes = { mos: 0, lu: 0 };
    for (const id of ['mos', 'lu'] as const) {
      const anim = new CharacterAnimator(id);
      let last = -1;
      for (let i = 0; i < seconds(6); i++) {
        anim.update(DT, world.players[id], []);
        const pose = anim.pose(world.players[id], world, 1);
        expect(pose.anim).toBe('stand');
        if (pose.frame !== last) changes[id]++;
        last = pose.frame;
      }
    }
    expect(changes.lu).toBeGreaterThanOrEqual(8);
    expect(changes.mos).toBeGreaterThan(changes.lu);
  });

  it('elige la animación: quieto, andar, acción al usar una palanca', () => {
    const world = floorWorld();
    const anim = new CharacterAnimator('lu');
    const lu = world.players.lu;
    anim.update(DT, lu, []);
    expect(anim.pose(lu, world, 1).anim).toBe('stand');
    run(world, seconds(0.3), (_, w) => {
      anim.update(DT, w.players.lu, []);
      return { lu: { right: true } };
    });
    expect(anim.pose(lu, world, 1).anim).toBe('walk');
    anim.update(DT, lu, [{ type: 'lever', channel: 'green', on: true, player: 'lu' }]);
    const cast = anim.pose(lu, world, 1);
    expect(cast.anim).toBe('action');
    // El gesto dura sus tres fotogramas y se acaba solo.
    for (let i = 0; i < seconds(0.5); i++) anim.update(DT, lu, []);
    expect(anim.pose(lu, world, 1).anim).not.toBe('action');
  });

  it('la palanca que acciona uno no hace gesticular al otro', () => {
    const world = floorWorld();
    const anim = new CharacterAnimator('mos');
    anim.update(DT, world.players.mos, [{ type: 'lever', channel: 'green', on: true, player: 'lu' }]);
    expect(anim.pose(world.players.mos, world, 1).anim).toBe('stand');
  });

  it('al morir se desvanecen: Mos se apaga y Lu se evapora hacia arriba', () => {
    const map = blankMap();
    put(map, 3, 16, 'M');
    put(map, 3, 10, 'L');
    fill(map, 1, 11, 10, 11, '#');
    fill(map, 5, 17, 6, 17, 'p');
    fill(map, 5, 11, 6, 11, 'o');
    const world = new World(makeLevel(map));
    for (let i = 0; i < seconds(2) && world.state === 'playing'; i++) {
      run(world, 1, () => ({ mos: { right: true }, lu: { right: true } }));
    }
    expect(world.dead.sort()).toEqual(['lu', 'mos']);
    run(world, seconds(RULES.deathTime * 0.6));
    expect(world.state).toBe('dying');
    const mos = new CharacterAnimator('mos').pose(world.players.mos, world, 1);
    const lu = new CharacterAnimator('lu').pose(world.players.lu, world, 1);
    expect(mos.anim).toBe('hurt');
    expect(lu.anim).toBe('hurt');
    expect(mos.dim).toBe(1);
    expect(mos.alpha).toBeLessThan(1);
    expect(lu.alpha).toBeLessThan(0.5);
    expect(lu.lift).toBeGreaterThan(10);
  });

  it('al ganar celebran y después entran por su puerta', () => {
    const map = blankMap();
    put(map, 7, 16, 'M');
    put(map, 8, 16, '[');
    put(map, 17, 16, 'L');
    put(map, 18, 16, ']');
    const world = new World(makeLevel(map));
    const atDoor = (w: World, id: 'mos' | 'lu') => isAtDoor(w.players[id].box, w.level.doors[id]);
    run(world, seconds(2), (_, w) => ({ mos: { right: !atDoor(w, 'mos') }, lu: { right: !atDoor(w, 'lu') } }));
    expect(world.state).toBe('won');
    world.stateTime = 0.1;
    const celebrating = new CharacterAnimator('mos').pose(world.players.mos, world, 1);
    expect(celebrating.celebrate).toBe(1);
    expect(celebrating.anim).toBe('action');
    world.stateTime = RULES.resultsDelay;
    const entered = new CharacterAnimator('lu').pose(world.players.lu, world, 1);
    expect(entered.alpha).toBe(0);
    expect(entered.x).toBe(18 * WORLD.tile + WORLD.tile / 2);
  });
});

describe('charcos', () => {
  it('agrupa los charcos contiguos del mismo líquido en una sola superficie', () => {
    const map = blankMap();
    fill(map, 3, 17, 5, 17, 'o');
    fill(map, 6, 17, 6, 17, 'x');
    fill(map, 9, 17, 10, 17, 'o');
    const world = new World(makeLevel(map));
    expect(liquidRuns(world.level).map((r) => [r.liquid, r.c0, r.c1])).toEqual([
      ['gold', 3, 5],
      ['shadow', 6, 6],
      ['gold', 9, 10],
    ]);
  });
});

describe('elementos del nivel (hoja del diseño)', () => {
  const frames = PROP_FRAMES as Record<string, readonly [number, number, number, number]>;
  const has = (name: string) => expect(frames[name], name).toBeDefined();

  it('están todas las piezas que dibuja el juego', () => {
    for (const zone of ['forest', 'sanctuary', 'observatory']) {
      for (const kind of ['stone', 'rim', 'block']) has(`${kind}-${zone}`);
    }
    for (const liquid of ['gold', 'silver', 'shadow']) for (let i = 0; i < 4; i++) has(`liquid-${liquid}-${i}`);
    for (const kind of ['sun', 'moon']) for (let i = 0; i < 4; i++) has(`gem-${kind}-${i}`);
    for (const owner of ['mos', 'lu']) for (let i = 0; i < 3; i++) has(`door-${owner}-${i}`);
    for (const metal of ['gold', 'silver']) for (const kind of ['top', 'middle', 'bottom', 'single']) has(`gate-${metal}-${kind}`);
    for (const ch of ['green', 'pink', 'cyan', 'white']) {
      for (const state of ['off', 'on']) has(`lever-${ch}-${state}`);
      for (const state of ['up', 'down']) has(`button-${ch}-${state}`);
      for (const part of ['left', 'body', 'right', 'vbody']) has(`platform-${ch}-${part}`);
    }
    has('platform-vtop');
    has('platform-vbottom');
  });

  it('cada pieza cabe en la imagen y las que se empalman miden lo que deben', () => {
    for (const [name, [x, y, w, h]] of Object.entries(frames)) {
      expect(x + w, name).toBeLessThanOrEqual(PROP_SHEET_SIZE.w);
      expect(y + h, name).toBeLessThanOrEqual(PROP_SHEET_SIZE.h);
    }
    // Baldosas y rejas: 40 × 40; charcos: media baldosa; puertas: dos baldosas de alto.
    expect(frames['stone-forest'].slice(2)).toEqual([WORLD.tile, WORLD.tile]);
    expect(frames['gate-gold-middle'].slice(2)).toEqual([WORLD.tile, WORLD.tile]);
    expect(frames['liquid-gold-0'].slice(2)).toEqual([WORLD.tile, WORLD.tile / 2]);
    expect(frames['door-mos-0'][3]).toBe(2 * WORLD.tile);
  });

  it('la imagen es un PNG del tamaño que dicen los datos', () => {
    expect(pngInfo(propsData)).toMatchObject({ w: PROP_SHEET_SIZE.w, h: PROP_SHEET_SIZE.h });
  });
});

describe('colores', () => {
  it('aclara, oscurece y mezcla colores', () => {
    expect(shade('#808080', 1)).toBe('#ffffff');
    expect(shade('#808080', -1)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(rgba('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });
});
