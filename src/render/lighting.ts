// Niveles oscuros: una capa casi negra con círculos de luz recortados en anillos escalonados,
// al estilo pixel art. Se calcula a 320 × 180 y se amplía sin suavizar sobre el arte.

import { WORLD } from '../config';
import { ART_H, ART_W } from './pixel';

export interface Light {
  /** Centro y radio en coordenadas lógicas. */
  x: number;
  y: number;
  radius: number;
  /** Cuánto aclara en el centro (0..1). */
  strength: number;
  /** Tinte opcional que se suma encima (cálido para Mos, frío para Lu). */
  tint?: string;
}

const DARKNESS = 'rgba(5, 3, 14, 0.94)';
/** Píxeles lógicos por píxel de la capa de oscuridad. */
const CELL = 4;
/** Anillos de cada luz, de fuera a dentro: radio relativo y cuánto aclara cada uno. */
const BANDS = [
  [1, 0.4],
  [0.72, 0.35],
  [0.45, 0.25],
] as const;

export class Darkness {
  private canvas: HTMLCanvasElement | null = null;

  /** Dibuja la oscuridad con sus luces sobre el lienzo del arte. */
  draw(ctx: CanvasRenderingContext2D, lights: readonly Light[]): void {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = Math.ceil(WORLD.width / CELL);
      this.canvas.height = Math.ceil(WORLD.height / CELL);
    }
    const canvas = this.canvas;
    const layer = canvas.getContext('2d');
    if (!layer) return;
    layer.globalCompositeOperation = 'source-over';
    layer.clearRect(0, 0, canvas.width, canvas.height);
    layer.fillStyle = DARKNESS;
    layer.fillRect(0, 0, canvas.width, canvas.height);
    // Cada luz borra la oscuridad en anillos: más luz cuanto más cerca del centro.
    layer.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
      for (const [r, amount] of BANDS) {
        layer.fillStyle = `rgba(0, 0, 0, ${Math.min(1, amount * light.strength * 1.15)})`;
        layer.beginPath();
        layer.arc(Math.round(light.x / CELL), Math.round(light.y / CELL), Math.round((light.radius * r) / CELL), 0, Math.PI * 2);
        layer.fill();
      }
    }
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, ART_W, ART_H);

    // Tintes de color sumados encima, también escalonados.
    ctx.globalCompositeOperation = 'lighter';
    const toArt = WORLD.width / ART_W;
    for (const light of lights) {
      if (!light.tint) continue;
      ctx.fillStyle = light.tint;
      for (const r of [0.75, 0.45]) {
        ctx.beginPath();
        ctx.arc(Math.round(light.x / toArt), Math.round(light.y / toArt), Math.round((light.radius * r) / toArt), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
