// Valores ajustables del juego: tamaños, física, reglas, colores y teclas.
// Todo lo que afecta a la sensación de juego vive aquí para poder afinarlo sin tocar la lógica.

export const WORLD = {
  /** Lado de una baldosa, en píxeles lógicos. */
  tile: 40,
  cols: 32,
  rows: 18,
  /** Resolución lógica: 32 × 40 por 18 × 40. */
  width: 1280,
  height: 720,
} as const;

export const LOOP = {
  /** Paso fijo de la lógica: 60 Hz. */
  dt: 1 / 60,
  /** Tope de tiempo real por fotograma, para no dar saltos al volver de otra pestaña. */
  maxFrameTime: 0.25,
} as const;

export const PHYSICS = {
  gravity: 1600,
  /** Velocidad inicial del salto: altura ≈ 560² / (2 · 1600) = 98 px. */
  jumpVelocity: 560,
  /** Al soltar el salto mientras se sube, la velocidad vertical se multiplica por esto. */
  jumpCutMultiplier: 0.45,
  maxRunSpeed: 230,
  groundAccel: 2200,
  airAccel: 1500,
  groundDecel: 2600,
  /** 900 px/s = 15 px por paso: nunca atraviesa una baldosa de 40. */
  maxFallSpeed: 900,
  coyoteTime: 0.09,
  jumpBufferTime: 0.1,
  /** Escalón que se sube caminando, sin saltar: el borde de un charco (media baldosa). */
  stepHeight: 20,
  /** Velocidad máxima al empujar un bloque. */
  blockPushSpeed: 110,
} as const;

export const MECHANISMS = {
  /** Velocidad por defecto de las plataformas, en baldosas por segundo. */
  moverSpeed: 2,
  /** Placa de un botón: margen a cada lado y altura de la zona que detecta peso. */
  buttonInset: 4,
  buttonHeight: 8,
  /**
   * Un bloque empujado que queda a esta distancia o menos de alinearse sobre un hueco
   * o un charco se encaja en él para poder caer (es mayor que lo que avanza en un paso).
   */
  blockSnap: 3,
} as const;

export const PLAYER = {
  /** Caja de colisión; el dibujo puede ser más grande. */
  width: 24,
  height: 44,
} as const;

export const RULES = {
  /** Tiempo que ambos deben pasar frente a su puerta para ganar. */
  doorHoldTime: 0.5,
  /** Duración de la animación de muerte antes del reinicio. */
  deathTime: 1,
  /** Solape mínimo con un charco (en ambos ejes) para morir. */
  liquidKillOverlap: 4,
  /** Lado de la caja de recogida de una gema. */
  gemSize: 24,
  /** Duración del rótulo "Nivel N · Nombre" al entrar. */
  levelTitleTime: 1.5,
  /** Pausa tras entrar por las puertas antes de mostrar los resultados. */
  resultsDelay: 0.8,
} as const;

export const COLORS = {
  /** Mos, el sol: oro. */
  mos: { gold: '#F2B632', deep: '#C47F12', glow: '#FFE27A' },
  /** Lu, la luna: plata y azul. */
  lu: { silver: '#CFD9EA', blue: '#4A68C6', glow: '#E8EEF8' },
  channel: {
    green: '#4ADE80',
    pink: '#F472B6',
    cyan: '#22D3EE',
    white: '#F1F5F9',
  },
  ui: {
    text: '#FFF8EC',
    /** Contorno y sombra del texto. */
    shadow: '#140C1E',
    /** Paneles del HUD (dejan ver un poco el nivel). */
    panel: 'rgba(20, 14, 36, 0.86)',
    /** Paneles de pantallas superpuestas (opciones, cómo jugar): opacos. */
    solidPanel: '#1A1430',
    /** Borde de los paneles y su luz interior. */
    border: '#0B0815',
    bevel: '#3F3570',
    accent: '#FFD27A',
    dim: '#8C84A8',
  },
} as const;

/** Teclas por KeyboardEvent.code, así funcionan con cualquier distribución de teclado. */
export const KEYS = {
  lu: { left: 'KeyA', right: 'KeyD', jump: 'KeyW', action: 'KeyS' },
  mos: { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', action: 'ArrowDown' },
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  fullscreen: ['KeyF'],
  confirm: ['Enter', 'NumpadEnter'],
  /** Navegación por menús: sirven las flechas y WASD. */
  menu: {
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    confirm: ['Enter', 'NumpadEnter', 'Space'],
    back: ['Escape', 'Backspace'],
  },
} as const;

/** Teclas cuyo comportamiento por defecto (desplazar la página) hay que anular. */
export const PREVENT_DEFAULT_KEYS: readonly string[] = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Space',
];

/** Teclas exclusivas del modo depuración (?debug). */
export const DEBUG_KEYS = {
  hitboxes: 'KeyH',
  nextLevel: 'KeyN',
  invincible: 'KeyG',
  /** Cambia la zona del arte (para ver los tres escenarios en cualquier nivel). */
  zone: 'KeyZ',
  /** Alterna la oscuridad de los niveles de la zona 3. */
  dark: 'KeyL',
} as const;

export const EFFECTS = {
  /** Máximo de partículas vivas a la vez. */
  maxParticles: 400,
} as const;
