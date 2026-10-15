// Mundo de un nivel: personajes, mecanismos, gemas, cronómetro, muerte, puertas y victoria.
// Determinista y sin DOM: recibe los controles de cada paso y produce eventos.
//
// Orden de cada paso:
//   1. palancas y botones → canales
//   2. plataformas (llevan a sus pasajeros; nunca aplastan)
//   3. personajes (empujan bloques)
//   4. bloques (gravedad)
//   5. gemas, charcos y puertas

import { MECHANISMS, PHYSICS, RULES, WORLD } from '../config';
import type { Channel, LevelData } from '../levels/types';
import { computeChannels, type ChannelState } from './channels';
import { Block } from './entities/block';
import { Button } from './entities/button';
import { isAtDoor } from './entities/door';
import { gemRect, type Gem } from './entities/gem';
import { Lever } from './entities/lever';
import { Mover } from './entities/mover';
import { parseLevel, tileAt, type Liquid, type ParsedLevel } from './level';
import { isFree, moveBox, overlaps } from './physics';
import { Player, stepPlayer } from './player';
import { computeStars, lethalLiquid, tileSolidRect, tileSolidsIn } from './rules';
import { PLAYER_IDS, type Controls, type PlayerId, type Rect } from './types';

const T = WORLD.tile;
const EPS = 1e-6;
/** Distancia máxima entre unos pies y una superficie para contar como "apoyado encima". */
const REST_TOLERANCE = 0.5;

export type WorldState = 'playing' | 'dying' | 'won';

export type GameEvent =
  | { type: 'jump'; player: PlayerId }
  | { type: 'land'; player: PlayerId; speed: number }
  | { type: 'gem'; player: PlayerId; x: number; y: number }
  | { type: 'death'; player: PlayerId; liquid: Liquid; x: number; y: number }
  | { type: 'button'; channel: Channel; pressed: boolean }
  | { type: 'lever'; channel: Channel; on: boolean; player: PlayerId }
  | { type: 'blockLand'; x: number; y: number; speed: number }
  | { type: 'doorsOpen' }
  | { type: 'reset' };

/** Cuerpos con gravedad que pueden apoyarse unos en otros y viajar en plataformas. */
export type Body = Player | Block;

interface SolidOptions {
  /** Cuerpos que no cuentan como obstáculo (por ejemplo, los pasajeros que viajan juntos). */
  exclude?: ReadonlySet<Body>;
  /** Plataforma que no cuenta como obstáculo (la que se está moviendo). */
  ignoreMover?: Mover;
}

export class World {
  readonly level: ParsedLevel;
  readonly players: Record<PlayerId, Player>;
  readonly buttons: Button[];
  readonly levers: Lever[];
  readonly movers: Mover[];
  readonly blocks: Block[];
  gems: Gem[] = [];
  channels: ChannelState = { green: false, pink: false, cyan: false, white: false };
  state: WorldState = 'playing';
  /** Tiempo en el estado actual (animaciones de muerte y victoria). */
  stateTime = 0;
  /** Cronómetro de la partida. */
  time = 0;
  timerStarted = false;
  /** Muertes de cada uno en este nivel (se conservan al reiniciar). */
  deaths: Record<PlayerId, number> = { mos: 0, lu: 0 };
  /** Quiénes murieron en la muerte en curso. */
  dead: PlayerId[] = [];
  /** Tiempo que ambos llevan frente a su puerta. */
  doorHold = 0;
  /** Modo depuración: nadie muere. */
  invincible = false;

  private events: GameEvent[] = [];

  constructor(data: LevelData) {
    this.level = parseLevel(data);
    this.players = { mos: new Player('mos'), lu: new Player('lu') };
    this.buttons = [];
    this.levers = [];
    this.movers = [];
    for (const e of data.entities) {
      if (e.type === 'button') this.buttons.push(new Button(e.at[0], e.at[1], e.channel));
      else if (e.type === 'lever') this.levers.push(new Lever(e.at[0], e.at[1], e.channel, e.startOn));
      else if (e.type === 'mover') this.movers.push(new Mover(e));
    }
    this.blocks = this.level.blocks.map(([col, row]) => new Block(col, row));
    this.reset();
  }

  get data(): LevelData {
    return this.level.data;
  }

  /** Reinicio completo: posiciones, gemas, mecanismos y cronómetro. */
  reset(): void {
    for (const id of PLAYER_IDS) {
      const [col, row] = this.level.starts[id];
      this.players[id].spawnAt(col, row, T);
    }
    this.gems = this.level.gems.map((g) => ({ owner: g.owner, col: g.cell[0], row: g.cell[1], collected: false }));
    for (const button of this.buttons) button.reset();
    for (const lever of this.levers) lever.reset();
    for (const mover of this.movers) mover.reset();
    for (const block of this.blocks) block.reset();
    this.channels = computeChannels(this.buttons, this.levers);
    this.state = 'playing';
    this.stateTime = 0;
    this.time = 0;
    this.timerStarted = false;
    this.dead = [];
    this.doorHold = 0;
    this.events.push({ type: 'reset' });
  }

  /** Eventos ocurridos desde la última llamada (sonidos, partículas…). */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  /** Personajes y bloques. */
  get bodies(): Body[] {
    return [this.players.mos, this.players.lu, ...this.blocks];
  }

  gemCount(owner: PlayerId): { collected: number; total: number } {
    let collected = 0;
    let total = 0;
    for (const g of this.gems) {
      if (g.owner !== owner) continue;
      total++;
      if (g.collected) collected++;
    }
    return { collected, total };
  }

  get allGemsCollected(): boolean {
    return this.gems.every((g) => g.collected);
  }

  get stars(): 1 | 2 | 3 {
    return computeStars(this.time, this.data.parTime, this.allGemsCollected);
  }

  step(controls: Record<PlayerId, Controls>, dt: number): void {
    this.stateTime += dt;
    switch (this.state) {
      case 'playing':
        this.stepPlaying(controls, dt);
        break;
      case 'dying':
        if (this.stateTime >= RULES.deathTime) this.reset();
        break;
      case 'won':
        break;
    }
  }

  private stepPlaying(controls: Record<PlayerId, Controls>, dt: number): void {
    for (const body of this.bodies) {
      body.prevX = body.x;
      body.prevY = body.y;
    }
    for (const mover of this.movers) {
      mover.prevX = mover.x;
      mover.prevY = mover.y;
    }

    // El cronómetro arranca con la primera tecla de cualquiera.
    if (!this.timerStarted && PLAYER_IDS.some((id) => hasInput(controls[id]))) this.timerStarted = true;
    if (this.timerStarted) this.time += dt;

    this.updateMechanisms(controls);
    for (const mover of this.movers) this.stepMover(mover, this.channels[mover.channel], dt);

    for (const id of PLAYER_IDS) {
      const p = this.players[id];
      const result = stepPlayer(p, controls[id], dt, {
        solidsNear: (region) => this.solidsFor(p, region),
        push: (box, dx) => this.pushBlock(box, dx, dt),
      });
      if (result.jumped) this.events.push({ type: 'jump', player: id });
      if (result.landed) this.events.push({ type: 'land', player: id, speed: result.impactSpeed });
    }

    for (const block of this.blocks) this.stepBlock(block, dt);

    this.collectGems();

    if (!this.invincible) {
      for (const id of PLAYER_IDS) {
        const p = this.players[id];
        const liquid = lethalLiquid(this.level, p.box, id);
        if (!liquid) continue;
        this.dead.push(id);
        this.deaths[id]++;
        this.events.push({ type: 'death', player: id, liquid, x: p.centerX, y: p.centerY });
      }
      if (this.dead.length > 0) {
        this.state = 'dying';
        this.stateTime = 0;
        return;
      }
    }

    const bothAtDoors = PLAYER_IDS.every((id) => isAtDoor(this.players[id].box, this.level.doors[id]));
    this.doorHold = bothAtDoors ? this.doorHold + dt : 0;
    if (this.doorHold >= RULES.doorHoldTime - 1e-9) {
      this.state = 'won';
      this.stateTime = 0;
      this.events.push({ type: 'doorsOpen' });
    }
  }

  // ── Mecanismos ────────────────────────────────────────────────────────────

  /** Palancas accionadas en este paso, botones pisados y estado de los canales. */
  private updateMechanisms(controls: Record<PlayerId, Controls>): void {
    for (const id of PLAYER_IDS) {
      if (!controls[id].actionPressed) continue;
      const box = this.players[id].box;
      const lever = this.levers.find((l) => l.reachableFrom(box));
      if (!lever) continue;
      lever.toggle();
      this.events.push({ type: 'lever', channel: lever.channel, on: lever.on, player: id });
    }
    const weights = this.bodies;
    for (const button of this.buttons) {
      if (button.update(weights)) this.events.push({ type: 'button', channel: button.channel, pressed: button.pressed });
    }
    this.channels = computeChannels(this.buttons, this.levers);
  }

  /** Mueve una plataforma hacia su destino (o de vuelta) con sus pasajeros. Nunca aplasta. */
  private stepMover(m: Mover, active: boolean, dt: number): void {
    m.moving = false;
    const target = active ? m.to : m.from;
    const tx = target.x - m.x;
    const ty = target.y - m.y;
    const dist = Math.hypot(tx, ty);
    if (dist === 0) return;
    const len = m.speed * dt;
    const dx = dist <= len ? tx : (tx / dist) * len;
    const dy = dist <= len ? ty : (ty / dist) * len;
    const next: Rect = { x: m.x + dx, y: m.y + dy, w: m.w, h: m.h };

    const riders = this.ridersOn(m.rect);
    // Se detiene si fuera a ocupar el sitio de alguien que no va encima.
    for (const body of this.bodies) if (!riders.has(body) && overlaps(next, body)) return;
    // Los pasajeros viajan con ella si caben. Si al subir alguno chocaría, se detiene
    // (aplastaría); al bajar o en horizontal, quien no cabe simplemente se queda.
    const carried: Body[] = [];
    for (const rider of riders) {
      const moved: Rect = { x: rider.x + dx, y: rider.y + dy, w: rider.w, h: rider.h };
      if (isFree(moved, this.solidsFor(rider, moved, { exclude: riders, ignoreMover: m }))) carried.push(rider);
      else if (dy < 0) return;
    }

    m.x = dist <= len ? target.x : next.x;
    m.y = dist <= len ? target.y : next.y;
    m.moving = true;
    for (const rider of carried) {
      rider.x += dx;
      rider.y += dy;
    }
  }

  /** Cuerpos apoyados sobre una superficie, y los que se apoyan en ellos (pilas). */
  private ridersOn(support: Rect, found = new Set<Body>()): Set<Body> {
    for (const body of this.bodies) {
      if (found.has(body) || body.vy < 0) continue;
      if (Math.abs(body.y + body.h - support.y) > REST_TOLERANCE) continue;
      if (body.x + body.w <= support.x + EPS || body.x >= support.x + support.w - EPS) continue;
      found.add(body);
      this.ridersOn(body, found);
    }
    return found;
  }

  /** Un personaje empuja el bloque que tenga justo delante. Devuelve cuánto se movió. */
  private pushBlock(pusher: Rect, dx: number, dt: number): number {
    let target: Block | null = null;
    let gap = Infinity;
    for (const block of this.blocks) {
      if (pusher.y >= block.y + block.h - EPS || pusher.y + pusher.h <= block.y + EPS) continue;
      const g = dx > 0 ? block.x - (pusher.x + pusher.w) : pusher.x - (block.x + block.w);
      if (g < -EPS || g >= Math.abs(dx)) continue;
      if (g < gap) {
        gap = g;
        target = block;
      }
    }
    if (!target) return 0;
    const amount = Math.sign(dx) * Math.min(Math.abs(dx) - Math.max(0, gap), PHYSICS.blockPushSpeed * dt);
    return this.slideBlock(target, amount);
  }

  /** Desliza un bloque en horizontal con lo que lleve encima. Devuelve el desplazamiento real. */
  private slideBlock(block: Block, amount: number): number {
    const riders = this.ridersOn(block.rect);
    const region: Rect = { x: block.x - T, y: block.y - T, w: block.w + 2 * T, h: block.h + 2 * T };
    const solids = this.solidsFor(block, region, { exclude: riders });
    let nx = moveBox(block.rect, amount, 0, solids).x;

    // Encaje: si casi está alineado sobre un hueco o un charco, se coloca justo encima para caer.
    if (block.grounded && nx !== block.x) {
      const aligned = amount > 0 ? Math.ceil(nx / T - EPS) * T : Math.floor(nx / T + EPS) * T;
      const snapped: Rect = { x: aligned, y: block.y, w: block.w, h: block.h };
      if (Math.abs(aligned - nx) <= MECHANISMS.blockSnap && this.hasGapBelow(snapped) && isFree(snapped, solids)) {
        nx = aligned;
      }
    }

    const moved = nx - block.x;
    if (moved === 0) return 0;
    block.x = nx;
    // Lo que va encima viaja con el bloque si puede; si choca con algo, se queda.
    for (const rider of riders) {
      const box: Rect = { x: rider.x + moved, y: rider.y, w: rider.w, h: rider.h };
      if (isFree(box, this.solidsFor(rider, box, { exclude: riders }))) rider.x += moved;
    }
    return moved;
  }

  /** La celda bajo un bloque alineado no es piedra entera (es aire o un charco). */
  private hasGapBelow(rect: Rect): boolean {
    const bottom = (rect.y + rect.h) / T;
    if (Math.abs(bottom - Math.round(bottom)) > EPS) return false;
    const col = Math.round(rect.x / T);
    const row = Math.round(bottom);
    const solid = tileSolidRect(tileAt(this.level, col, row), col, row, null);
    return !solid || solid.y > row * T + EPS;
  }

  /** Gravedad de un bloque: cae, se apoya en lo que encuentre y se hunde a medias en los charcos. */
  private stepBlock(block: Block, dt: number): void {
    const vy0 = block.vy;
    const vy1 = Math.min(vy0 + PHYSICS.gravity * dt, PHYSICS.maxFallSpeed);
    const dy = ((vy0 + vy1) / 2) * dt;
    const region: Rect = { x: block.x - 2, y: block.y - 2, w: block.w + 4, h: block.h + Math.abs(dy) + 4 };
    const result = moveBox(block.rect, 0, dy, this.solidsFor(block, region));
    const wasGrounded = block.grounded;
    block.y = result.y;
    block.grounded = result.landed;
    block.vy = result.landed ? 0 : vy1;
    if (result.landed && !wasGrounded) {
      this.events.push({ type: 'blockLand', x: block.x + block.w / 2, y: block.y + block.h, speed: vy1 });
    }
  }

  /**
   * Sólidos que afectan a un cuerpo en una región: baldosas (según quién sea),
   * plataformas, bloques y, para los bloques, también los personajes (se apoyan en ellos).
   */
  private solidsFor(body: Body, region: Rect, options: SolidOptions = {}): Rect[] {
    const id = body instanceof Player ? body.id : null;
    const solids = tileSolidsIn(this.level, region, id);
    for (const mover of this.movers) {
      if (mover !== options.ignoreMover && overlaps(mover.rect, region)) solids.push(mover.rect);
    }
    for (const block of this.blocks) {
      if (block !== body && !options.exclude?.has(block) && overlaps(block.rect, region)) solids.push(block.rect);
    }
    if (id === null) {
      for (const pid of PLAYER_IDS) {
        const p = this.players[pid];
        if (!options.exclude?.has(p) && overlaps(p.box, region)) solids.push(p.box);
      }
    }
    return solids;
  }

  private collectGems(): void {
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const p = this.players[gem.owner];
      if (!overlaps(p.box, gemRect([gem.col, gem.row]))) continue;
      gem.collected = true;
      this.events.push({
        type: 'gem',
        player: gem.owner,
        x: gem.col * T + T / 2,
        y: gem.row * T + T / 2,
      });
    }
  }
}

function hasInput(c: Controls): boolean {
  return c.left || c.right || c.jumpHeld || c.jumpPressed || c.actionPressed;
}
