// Dibujo de un nivel en pixel art. Detrás, el fondo de la zona en un lienzo de 640 × 360 que se
// amplía sin suavizar (píxel doble). Encima, a resolución lógica (un píxel por píxel del juego):
// las plataformas, la piedra (en caché), las rejas, los charcos, los mecanismos, las puertas, los
// bloques, las gemas y Lu y Mos. Delante, otro lienzo del arte con las partículas y la oscuridad.
// Por último, las pistas de texto y las cajas de depuración.

import { COLORS, RULES, WORLD } from '../config';
import type { Settings } from '../core/settings';
import { doorRect } from '../game/entities/door';
import { gemRect } from '../game/entities/gem';
import { liquidOf, tileAt } from '../game/level';
import { PLAYER_IDS, type PlayerId } from '../game/types';
import type { GameEvent, World } from '../game/world';
import type { Zone } from '../levels/types';
import { CharacterAnimator, type CharacterPose } from './animation';
import { drawBackgroundOverlay, renderBackground } from './background';
import { drawCharacter } from './characters';
import { Darkness, type Light } from './lighting';
import { drawLiquids, liquidRuns } from './liquids';
import { ZONE_STYLES, type ZoneStyle } from './palette';
import { ParticleSystem } from './particles';
import { ART_H, ART_W, ArtSurface, makeCanvas, pixelContext } from './pixel';
import { drawBlock, drawButton, drawDoor, drawGem, drawLever, drawMetalWall, drawMover } from './props';
import { drawText } from './shapes';
import { renderStoneLayer } from './tiles';

const T = WORLD.tile;
const W = WORLD.width;
const H = WORLD.height;
const ZONES: readonly Zone[] = ['forest', 'sanctuary', 'observatory'];

/** Un canvas que solo se vuelve a pintar si cambia su clave. */
class LayerCache {
  private canvas: HTMLCanvasElement | null = null;
  private key = '';

  constructor(
    private readonly w: number,
    private readonly h: number,
  ) {}

  get(key: string, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
    if (!this.canvas) this.canvas = makeCanvas(this.w, this.h);
    if (this.key !== key) {
      const ctx = pixelContext(this.canvas);
      ctx.clearRect(0, 0, this.w, this.h);
      paint(ctx);
      this.key = key;
    }
    return this.canvas;
  }
}

export interface RenderOptions {
  /** Fracción del siguiente paso, para interpolar posiciones. */
  alpha: number;
  showHitboxes: boolean;
}

export class LevelRenderer {
  readonly particles = new ParticleSystem();
  /** Zona del arte y oscuridad: las del nivel, o las que elija el modo depuración. */
  zone: Zone;
  dark: boolean;

  /** El fondo, detrás de todo. */
  private readonly surface = new ArtSurface();
  /** Partículas y oscuridad, por delante. */
  private readonly overlay = new ArtSurface();
  private readonly background = new LayerCache(ART_W, ART_H);
  /** La piedra, a resolución lógica. */
  private readonly stone = new LayerCache(W, H);
  private readonly darkness = new Darkness();
  private readonly animators: Record<PlayerId, CharacterAnimator> = {
    mos: new CharacterAnimator('mos'),
    lu: new CharacterAnimator('lu'),
  };
  private readonly runs: ReturnType<typeof liquidRuns>;
  private readonly leverAngles: number[];
  private clock = 0;
  private sinceTrail = 0;

  constructor(
    private readonly world: World,
    private readonly settings: Settings,
  ) {
    this.zone = world.data.zone;
    this.dark = world.data.dark ?? false;
    this.runs = liquidRuns(world.level);
    this.leverAngles = world.levers.map((l) => (l.on ? 0.6 : -0.6));
  }

  private get style(): ZoneStyle {
    return ZONE_STYLES[this.zone];
  }

  private get reduce(): boolean {
    return this.settings.reduceEffects;
  }

  /** Depuración: pasa a la siguiente zona del arte. */
  cycleZone(): void {
    this.zone = ZONES[(ZONES.indexOf(this.zone) + 1) % ZONES.length];
  }

  /** Un paso a 60 Hz: las animaciones y partículas reaccionan a lo que pasó en el mundo. */
  update(dt: number, events: readonly GameEvent[]): void {
    this.clock += dt;
    for (const id of PLAYER_IDS) this.animators[id].update(dt, this.world.players[id], events);
    this.emitEffects(events);
    this.emitTrail(dt);
    this.particles.update(dt);
    this.world.levers.forEach((lever, i) => {
      const target = lever.on ? 0.6 : -0.6;
      const step = 9 * dt;
      const angle = this.leverAngles[i];
      this.leverAngles[i] = angle + Math.max(-step, Math.min(step, target - angle));
    });
  }

  render(ctx: CanvasRenderingContext2D, opts: RenderOptions): void {
    const world = this.world;
    const style = this.style;
    const zone = this.zone;
    const reduce = this.reduce;
    const lerp = (a: number, b: number) => a + (b - a) * opts.alpha;
    const art = this.surface.begin();
    art.drawImage(this.background.get(zone, (c) => renderBackground(c, zone, style)), 0, 0);
    drawBackgroundOverlay(art, zone, this.clock, reduce);
    this.surface.present(ctx);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Las plataformas van detrás de la piedra: así se esconden en los muros.
    const shapes = this.settings.channelShapes;
    for (const m of world.movers) drawMover(ctx, m, lerp(m.prevX, m.x), lerp(m.prevY, m.y), shapes);
    ctx.drawImage(
      this.stone.get(`${world.data.id}:${zone}`, (c) => renderStoneLayer(c, world.level, zone, style)),
      0,
      0,
      W,
      H,
    );
    this.drawMetalWalls(ctx);
    drawLiquids(ctx, this.runs, this.clock, reduce);
    for (const button of world.buttons) drawButton(ctx, button, shapes);
    world.levers.forEach((lever, i) => drawLever(ctx, lever, this.leverAngles[i], shapes));
    for (const id of PLAYER_IDS) drawDoor(ctx, id, world.level.doors[id], this.doorOpen());
    for (const b of world.blocks) drawBlock(ctx, lerp(b.prevX, b.x), lerp(b.prevY, b.y), zone);
    for (const gem of world.gems) if (!gem.collected) drawGem(ctx, gem, this.clock, reduce);
    ctx.restore();

    const poses = {
      mos: this.animators.mos.pose(world.players.mos, world, opts.alpha),
      lu: this.animators.lu.pose(world.players.lu, world, opts.alpha),
    };
    for (const id of PLAYER_IDS) drawCharacter(ctx, id, poses[id]);
    const front = this.overlay.begin();
    this.particles.draw(front);
    if (this.dark) this.darkness.draw(front, this.lights(poses));
    this.overlay.present(ctx);
    this.drawHints(ctx);
    if (opts.showHitboxes) this.drawHitboxes(ctx);
  }

  private doorOpen(): number {
    if (this.world.state === 'won') return 1;
    return Math.min(1, this.world.doorHold / RULES.doorHoldTime);
  }

  private drawMetalWalls(ctx: CanvasRenderingContext2D): void {
    for (let row = 0; row < WORLD.rows; row++) {
      for (let col = 0; col < WORLD.cols; col++) {
        const tile = tileAt(this.world.level, col, row);
        if (tile !== 'goldWall' && tile !== 'silverWall') continue;
        const openTop = tileAt(this.world.level, col, row - 1) !== tile;
        const openBottom = tileAt(this.world.level, col, row + 1) !== tile;
        drawMetalWall(ctx, col, row, tile === 'goldWall' ? 'gold' : 'silver', openTop, openBottom);
      }
    }
  }

  private drawHints(ctx: CanvasRenderingContext2D): void {
    for (const e of this.world.data.entities) {
      if (e.type === 'hint') drawText(ctx, e.text, e.at[0] * T, e.at[1] * T + T / 2, { size: 18 });
    }
  }

  // ── Efectos ──────────────────────────────────────────────────────────────

  private emitEffects(events: readonly GameEvent[]): void {
    const world = this.world;
    const amount = this.reduce ? 0.5 : 1;
    const n = (count: number) => Math.max(1, Math.round(count * amount));
    const dust = this.style.stoneLight;
    for (const e of events) {
      switch (e.type) {
        case 'jump': {
          const p = world.players[e.player];
          this.dust(p.centerX, p.y + p.h, n(4), dust, 40);
          break;
        }
        case 'land': {
          if (e.speed < 220) break;
          const p = world.players[e.player];
          const feetX = p.centerX;
          const feetY = p.y + p.h;
          this.dust(feetX, feetY, n(4 + Math.min(6, e.speed / 150)), dust, e.speed * 0.12);
          if (e.player === 'mos') {
            // Mos suelta chispas al aterrizar.
            this.particles.burst(n(7), (_, r) => ({
              x: feetX + (r() - 0.5) * 16,
              y: feetY - 2,
              vx: (r() - 0.5) * 220,
              vy: -120 - r() * 160,
              gravity: 900,
              life: 0.35 + r() * 0.25,
              size: 1.8,
              color: r() < 0.5 ? COLORS.mos.gold : COLORS.mos.glow,
              shape: 'spark',
              additive: true,
            }));
          }
          break;
        }
        case 'gem': {
          const color = e.player === 'mos' ? COLORS.mos.glow : COLORS.lu.glow;
          this.particles.burst(n(14), (i, r) => {
            const a = (i / 14) * Math.PI * 2;
            const speed = 60 + r() * 90;
            return {
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              drag: 3,
              life: 0.5 + r() * 0.3,
              size: 3.5,
              sizeEnd: 0.5,
              color,
              shape: 'glint',
              additive: true,
            };
          });
          if (!this.reduce) {
            this.particles.emit({ x: e.x, y: e.y, life: 0.4, size: 6, sizeEnd: 30, color, shape: 'ring', alpha: 0.8 });
          }
          break;
        }
        case 'death':
          if (e.player === 'mos') {
            // Mos se apaga en una nube de humo.
            this.particles.burst(n(22), (_, r) => ({
              x: e.x + (r() - 0.5) * 20,
              y: e.y + (r() - 0.5) * 30,
              vx: (r() - 0.5) * 50,
              vy: -30 - r() * 70,
              gravity: -20,
              drag: 1.2,
              life: 0.8 + r() * 0.5,
              size: 4,
              sizeEnd: 13,
              color: r() < 0.7 ? '#5E5560' : '#3A3340',
              alpha: 0.7,
            }));
          } else {
            // Lu se evapora en bruma plateada.
            this.particles.burst(n(26), (_, r) => ({
              x: e.x + (r() - 0.5) * 18,
              y: e.y + (r() - 0.3) * 34,
              vx: (r() - 0.5) * 40,
              vy: -50 - r() * 90,
              gravity: -30,
              drag: 1,
              life: 0.7 + r() * 0.6,
              size: 3,
              sizeEnd: 10,
              color: r() < 0.6 ? COLORS.lu.silver : COLORS.lu.blue,
              alpha: 0.6,
              additive: true,
            }));
          }
          break;
        case 'lever': {
          // Lu lanza un hechizo desde la media luna del báculo; Mos suelta chispas del espadazo.
          const p = world.players[e.player];
          const tipX = p.centerX + p.facing * 16;
          const tipY = p.y - 12;
          const colors = e.player === 'mos' ? [COLORS.mos.glow, COLORS.mos.gold] : [COLORS.lu.glow, '#A9C8FF'];
          this.particles.burst(n(10), (i, r) => {
            const a = (i / 10) * Math.PI * 2;
            const speed = 50 + r() * 70;
            return {
              x: tipX,
              y: tipY,
              vx: Math.cos(a) * speed,
              vy: Math.sin(a) * speed,
              drag: 3,
              life: 0.35 + r() * 0.25,
              size: 4,
              sizeEnd: 1,
              color: colors[i % 2],
              shape: 'glint',
              additive: true,
            };
          });
          break;
        }
        case 'blockLand':
          if (e.speed > 150) this.dust(e.x, e.y, n(8), dust, 70);
          break;
        case 'doorsOpen':
          for (const id of PLAYER_IDS) {
            const door = doorRect(world.level.doors[id]);
            const color = id === 'mos' ? COLORS.mos.glow : COLORS.lu.glow;
            this.particles.burst(n(16), (_, r) => ({
              x: door.x + 6 + r() * (door.w - 12),
              y: door.y + door.h - r() * 60,
              vy: -40 - r() * 60,
              vx: (r() - 0.5) * 20,
              life: 0.7 + r() * 0.5,
              size: 3,
              sizeEnd: 0.5,
              color,
              shape: 'glint',
              additive: true,
            }));
          }
          break;
        default:
          break;
      }
    }
  }

  private dust(x: number, y: number, count: number, color: string, spread: number): void {
    this.particles.burst(count, (_, r) => ({
      x: x + (r() - 0.5) * 14,
      y: y - 2,
      vx: (r() - 0.5) * spread * 2,
      vy: -10 - r() * 30,
      gravity: 40,
      drag: 4,
      life: 0.35 + r() * 0.3,
      size: 2,
      sizeEnd: 5,
      color,
      alpha: 0.6,
    }));
  }

  /** Lu deja un rastro de destellos al moverse. */
  private emitTrail(dt: number): void {
    const lu = this.world.players.lu;
    if (this.world.state !== 'playing') return;
    const moving = Math.abs(lu.vx) > 60 || (!lu.grounded && Math.abs(lu.vy) > 60);
    this.sinceTrail += dt;
    const every = this.reduce ? 0.15 : 0.05;
    if (!moving || this.sinceTrail < every) return;
    this.sinceTrail = 0;
    this.particles.emit({
      x: lu.centerX - lu.facing * 8 + (Math.random() - 0.5) * 10,
      y: lu.y + 10 + Math.random() * 28,
      vy: -15,
      life: 0.5,
      size: 2.6,
      sizeEnd: 0.3,
      color: COLORS.lu.glow,
      shape: 'glint',
      additive: true,
    });
  }

  // ── Luces de los niveles oscuros ───────────────────────────────────────
  // Solo los personajes tiñen su luz; gemas, puertas y mecanismos ya dibujan su propio halo.

  private lights(poses: Record<PlayerId, CharacterPose>): Light[] {
    const world = this.world;
    const lights: Light[] = [
      {
        x: poses.mos.x,
        y: poses.mos.y - 26 - poses.mos.lift,
        radius: 210,
        strength: poses.mos.alpha,
        tint: 'rgba(255, 170, 80, 0.07)',
      },
      {
        x: poses.lu.x,
        y: poses.lu.y - 26 - poses.lu.lift,
        radius: 165,
        strength: poses.lu.alpha,
        tint: 'rgba(140, 170, 255, 0.07)',
      },
    ];
    for (const gem of world.gems) {
      if (gem.collected) continue;
      const r = gemRect([gem.col, gem.row]);
      lights.push({ x: r.x + r.w / 2, y: r.y + r.h / 2, radius: 50, strength: 0.8 });
    }
    for (let row = 0; row < WORLD.rows; row++) {
      for (let col = 0; col < WORLD.cols; col++) {
        if (!liquidOf(tileAt(world.level, col, row))) continue;
        lights.push({ x: col * T + T / 2, y: row * T + 8, radius: 46, strength: 0.55 });
      }
    }
    for (const id of PLAYER_IDS) {
      const door = doorRect(world.level.doors[id]);
      lights.push({ x: door.x + door.w / 2, y: door.y + door.h / 2, radius: 80, strength: 0.7 });
    }
    for (const b of world.buttons) {
      lights.push({ x: b.col * T + T / 2, y: (b.row + 1) * T - 6, radius: 40, strength: 0.6 });
    }
    for (const l of world.levers) {
      lights.push({ x: l.col * T + T / 2, y: l.row * T + T / 2, radius: 40, strength: 0.6 });
    }
    for (const m of world.movers) {
      lights.push({ x: m.x + m.w / 2, y: m.y + m.h / 2, radius: Math.max(m.w, m.h) / 2 + 30, strength: 0.45 });
    }
    return lights;
  }

  // ── Depuración ─────────────────────────────────────────────────────────

  private drawHitboxes(ctx: CanvasRenderingContext2D): void {
    const world = this.world;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let col = 0; col <= WORLD.cols; col++) {
      ctx.moveTo(col * T + 0.5, 0);
      ctx.lineTo(col * T + 0.5, H);
    }
    for (let row = 0; row <= WORLD.rows; row++) {
      ctx.moveTo(0, row * T + 0.5);
      ctx.lineTo(W, row * T + 0.5);
    }
    ctx.stroke();
    ctx.lineWidth = 2;
    for (const id of PLAYER_IDS) {
      const p = world.players[id];
      ctx.strokeStyle = id === 'mos' ? '#ff5050' : '#50c8ff';
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      const door = doorRect(world.level.doors[id]);
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(door.x, door.y, door.w, door.h);
      ctx.setLineDash([]);
    }
    for (const mover of world.movers) {
      ctx.strokeStyle = COLORS.channel[mover.channel];
      ctx.strokeRect(mover.x, mover.y, mover.w, mover.h);
    }
    ctx.strokeStyle = '#ffffff';
    for (const block of world.blocks) ctx.strokeRect(block.x, block.y, block.w, block.h);
    for (const button of world.buttons) {
      ctx.strokeStyle = COLORS.channel[button.channel];
      ctx.strokeRect(button.zone.x, button.zone.y, button.zone.w, button.zone.h);
    }
    for (const lever of world.levers) {
      ctx.strokeStyle = COLORS.channel[lever.channel];
      ctx.setLineDash([2, 3]);
      ctx.strokeRect(lever.rect.x, lever.rect.y, lever.rect.w, lever.rect.h);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = 'rgba(255, 230, 120, 0.8)';
    for (const gem of world.gems) {
      if (gem.collected) continue;
      const r = gemRect([gem.col, gem.row]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }
}
