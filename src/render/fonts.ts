// Fuente pixel (Pixelify Sans) empaquetada dentro del juego: funciona sin internet.

import pixel400 from '@fontsource/pixelify-sans/files/pixelify-sans-latin-400-normal.woff2';
import pixel700 from '@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2';

export const FONT_FAMILY = "'Pixelify Sans', 'Courier New', monospace";

export function font(size: number, weight: 500 | 700 = 500): string {
  return `${weight === 700 ? 700 : 400} ${size}px ${FONT_FAMILY}`;
}

/**
 * Pone la fuente en el contexto, sin ligaduras: la "fi" de Pixelify Sans junta las dos letras
 * en un solo glifo que en pantalla parece otra palabra.
 */
export function setFont(ctx: CanvasRenderingContext2D, size: number, weight: 500 | 700 = 500): void {
  ctx.font = font(size, weight);
  if ('textRendering' in ctx) ctx.textRendering = 'optimizeSpeed';
}

/** Carga la fuente antes de dibujar texto en el canvas. Si falla, se usa la de reserva. */
export async function loadFonts(): Promise<void> {
  if (typeof FontFace === 'undefined') return;
  try {
    const faces = [
      new FontFace('Pixelify Sans', `url(${pixel400})`, { weight: '400' }),
      new FontFace('Pixelify Sans', `url(${pixel700})`, { weight: '700' }),
    ];
    await Promise.all(faces.map((face) => face.load()));
    for (const face of faces) document.fonts.add(face);
  } catch {
    // Sin la fuente el juego sigue funcionando con la tipografía de reserva.
  }
}
