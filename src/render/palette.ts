// Paletas en pixel art de cada zona de Lumos.

import type { Zone } from '../levels/types';

export interface ZoneStyle {
  /** Bandas del cielo de la zona, de arriba a abajo (para el final, el mapa y si falta su fondo). */
  sky: readonly string[];
  /** Piedra de las baldosas. */
  stone: string;
  stoneLight: string;
  stoneDark: string;
  mortar: string;
  /** Remate del borde superior: pasto, moldura de oro o de latón. */
  rim: string;
  rimLight: string;
  rimDark: string;
}

export const ZONE_STYLES: Record<Zone, ZoneStyle> = {
  // Bosque del Alba: amanecer, piedra terrosa y pasto.
  forest: {
    sky: ['#3b2d5c', '#5b3d72', '#8c4f80', '#c66e86', '#ee9a7e', '#f9c784'],
    stone: '#7a6a58',
    stoneLight: '#9c8a72',
    stoneDark: '#54473a',
    mortar: '#3a3029',
    rim: '#4e9a2f',
    rimLight: '#86cf4a',
    rimDark: '#2e6a22',
  },
  // Santuario de los Astros: interior violáceo con moldura de oro.
  sanctuary: {
    sky: ['#1a1429', '#221a36', '#2a2142', '#32284e'],
    stone: '#8a7ea6',
    stoneLight: '#ab9fc7',
    stoneDark: '#5e5378',
    mortar: '#3a3152',
    rim: '#e9c46a',
    rimLight: '#fff0b0',
    rimDark: '#a8822e',
  },
  // Observatorio: noche, piedra fría y latón.
  observatory: {
    sky: ['#0b0a1c', '#110f28', '#171436', '#1e1844', '#262052'],
    stone: '#3c4468',
    stoneLight: '#566092',
    stoneDark: '#262c48',
    mortar: '#181c32',
    rim: '#c9a24a',
    rimLight: '#f0d58a',
    rimDark: '#7d6224',
  },
};

/** Colores de los personajes, del oro, la plata y la sombra. */
export const PIXEL_COLORS = {
  gold: { base: '#f2b632', light: '#ffe27a', dark: '#c47f12', deep: '#9a5c08' },
  silver: { base: '#cfd9ea', light: '#ffffff', dark: '#9fb0cc', deep: '#71809e' },
  shadow: { base: '#2a0e3a', light: '#7b2cbf', dark: '#1a0826', glow: '#c08bff' },
} as const;
