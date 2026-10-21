// Aleatoriedad estable para el arte: la misma entrada da siempre el mismo resultado,
// así cada nivel se dibuja igual en cada partida y al cambiar el tamaño de la ventana.

/** Número en [0, 1) a partir de unos enteros. */
export function hash(...values: number[]): number {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.floor(v) | 0;
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Generador de secuencias reproducible (mulberry32). */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
