// Formato de los niveles: un mapa ASCII de 18 × 32 y una lista de entidades.
// Las coordenadas son [columna, fila], contando desde la esquina superior izquierda.

export type Cell = [col: number, row: number];
export type Channel = 'green' | 'pink' | 'cyan' | 'white';
export type Zone = 'forest' | 'sanctuary' | 'observatory';

export interface LevelData {
  id: number;
  /** Nombre visible, en español. */
  name: string;
  zone: Zone;
  /** Segundos para la 3.ª estrella. */
  parTime: number;
  /** Nivel oscuro (zona 3). */
  dark?: boolean;
  /** 18 filas de 32 caracteres. */
  map: string[];
  entities: Entity[];
}

export type Entity =
  | { type: 'hint'; at: Cell; text: string }
  | { type: 'button'; at: Cell; channel: Channel }
  | { type: 'lever'; at: Cell; channel: Channel; startOn?: boolean }
  | {
      type: 'mover';
      at: Cell;
      size: [w: number, h: number];
      to: Cell;
      channel: Channel;
      speed?: number;
    };
