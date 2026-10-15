// Teclado compartido por los dos jugadores, y ratón para los menús.
// Se lee KeyboardEvent.code (posición física), no key, para que funcione con cualquier distribución.

import { KEYS, PREVENT_DEFAULT_KEYS } from '../config';
import type { Controls, PlayerId } from '../game/types';

export interface Point {
  x: number;
  y: number;
}

export class Input {
  private readonly down = new Set<string>();
  /** Recién pulsadas desde el último paso de lógica (aún sin consumir). */
  private pending = new Set<string>();
  /** Recién pulsadas visibles durante el paso actual. */
  private pressed = new Set<string>();

  /** Posición del ratón en coordenadas lógicas (null si está fuera del juego). */
  pointer: Point | null = null;
  private pendingClick: Point | null = null;
  private pendingMove = false;
  /** Clic de este paso, si lo hubo. */
  click: Point | null = null;
  /** El ratón se movió desde el paso anterior (si no, no debe pisar la selección del teclado). */
  pointerMoved = false;

  /** Se llama dentro del propio evento de teclado: útil para acciones que exigen un gesto del usuario. */
  onKeyDown?: (code: string) => void;
  /** Se llama dentro del propio evento de clic, por la misma razón. */
  onPointerDown?: () => void;
  /** Se llama al perder el foco o cambiar de pestaña. */
  onFocusLost?: () => void;

  keyDown(code: string, repeat = false): void {
    // La autorepetición del sistema no cuenta como pulsación nueva.
    if (repeat || this.down.has(code)) return;
    this.down.add(code);
    this.pending.add(code);
  }

  keyUp(code: string): void {
    this.down.delete(code);
  }

  /** Suelta todas las teclas (al perder el foco nadie debe quedarse corriendo). */
  releaseAll(): void {
    this.down.clear();
    this.pending.clear();
    this.pressed.clear();
  }

  pointerMove(point: Point | null): void {
    this.pointer = point;
    this.pendingMove = true;
  }

  pointerDown(point: Point): void {
    this.pointer = point;
    this.pendingClick = point;
  }

  /** Se llama al empezar cada paso de lógica: las pulsaciones pendientes pasan a ser visibles. */
  beginStep(): void {
    this.pressed = this.pending;
    this.pending = new Set();
    this.click = this.pendingClick;
    this.pendingClick = null;
    this.pointerMoved = this.pendingMove;
    this.pendingMove = false;
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  anyPressed(codes: readonly string[]): boolean {
    return codes.some((code) => this.pressed.has(code));
  }

  /** Controles de un jugador para el paso actual. */
  controlsFor(id: PlayerId): Controls {
    const keys = KEYS[id];
    return {
      left: this.isDown(keys.left),
      right: this.isDown(keys.right),
      jumpHeld: this.isDown(keys.jump),
      jumpPressed: this.wasPressed(keys.jump),
      actionPressed: this.wasPressed(keys.action),
    };
  }

  /** Conecta los eventos del navegador. */
  attach(target: Window): void {
    target.addEventListener('keydown', (event) => {
      if (PREVENT_DEFAULT_KEYS.includes(event.code)) event.preventDefault();
      this.keyDown(event.code, event.repeat);
      if (!event.repeat) this.onKeyDown?.(event.code);
    });
    target.addEventListener('keyup', (event) => {
      if (PREVENT_DEFAULT_KEYS.includes(event.code)) event.preventDefault();
      this.keyUp(event.code);
    });
    const lose = () => {
      this.releaseAll();
      this.onFocusLost?.();
    };
    target.addEventListener('blur', lose);
    target.document.addEventListener('visibilitychange', () => {
      if (target.document.hidden) lose();
    });
  }

  /** Conecta el ratón (o el dedo) sobre el canvas; toLogical pasa de la pantalla a 1280 × 720. */
  attachPointer(canvas: HTMLCanvasElement, toLogical: (clientX: number, clientY: number) => Point | null): void {
    canvas.addEventListener('pointermove', (event) => this.pointerMove(toLogical(event.clientX, event.clientY)));
    canvas.addEventListener('pointerleave', () => this.pointerMove(null));
    canvas.addEventListener('pointerdown', (event) => {
      const point = toLogical(event.clientX, event.clientY);
      if (point) this.pointerDown(point);
      this.onPointerDown?.();
    });
  }
}
