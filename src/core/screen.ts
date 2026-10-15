// Escalado del canvas: resolución lógica 1280 × 720 ajustada a la ventana con bandas negras.
// El búfer del canvas usa la resolución real de la pantalla para que todo se vea nítido, y si
// cabe sin perder mucho tamaño, cada píxel del arte (640 × 360) ocupa un número entero de
// píxeles de la pantalla: así todos miden lo mismo.

import { WORLD } from '../config';

/** Píxeles del arte: la mitad de la resolución lógica. */
const ART_W = WORLD.width / 2;
/** Se acepta encoger hasta este tanto para que el escalado sea entero. */
const INTEGER_FIT = 0.85;

/**
 * Píxeles de pantalla por píxel del arte: entero si se pierde poco tamaño; si no, el que llene.
 * fit es la escala lógica que llena la ventana y dpr la densidad de la pantalla.
 */
export function artPixelSize(fit: number, dpr: number): number {
  const exact = fit * dpr * 2;
  const whole = Math.floor(exact);
  return whole >= 1 && whole / exact >= INTEGER_FIT ? whole : exact;
}

export class Screen {
  readonly ctx: CanvasRenderingContext2D;
  /** Píxeles reales por píxel lógico. */
  scale = 1;
  onResize?: () => void;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const fit = Math.min(window.innerWidth / WORLD.width, window.innerHeight / WORLD.height);
    const dpr = window.devicePixelRatio || 1;
    const pixel = artPixelSize(fit, dpr);
    const deviceWidth = Math.max(1, Math.round(ART_W * pixel));
    const deviceHeight = Math.max(1, Math.round((deviceWidth * WORLD.height) / WORLD.width));
    this.canvas.style.width = `${deviceWidth / dpr}px`;
    this.canvas.style.height = `${deviceHeight / dpr}px`;
    this.canvas.width = deviceWidth;
    this.canvas.height = deviceHeight;
    this.scale = this.canvas.width / WORLD.width;
    this.onResize?.();
  }

  /** Pasa de coordenadas de la ventana a las lógicas (1280 × 720); null si cae en las bandas. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * WORLD.width;
    const y = ((clientY - rect.top) / rect.height) * WORLD.height;
    if (x < 0 || y < 0 || x > WORLD.width || y > WORLD.height) return null;
    return { x, y };
  }

  /** Prepara el contexto para dibujar en coordenadas lógicas. */
  beginFrame(): CanvasRenderingContext2D {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    return this.ctx;
  }
}

/** Alterna la pantalla completa (debe llamarse desde un evento del usuario). */
export function toggleFullscreen(): void {
  const doc = document;
  if (doc.fullscreenElement) {
    void doc.exitFullscreen().catch(() => undefined);
  } else {
    void doc.documentElement.requestFullscreen?.().catch(() => undefined);
  }
}
