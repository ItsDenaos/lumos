// Lista ordenada de niveles de la campaña: 3 zonas de 3 niveles.

import { level01 } from './01-el-despertar';
import { level02 } from './02-oro-y-plata';
import { level03 } from './03-la-piedra-que-sube';
import { level04 } from './04-palancas-del-recinto';
import { level05 } from './05-la-ofrenda';
import { level06 } from './06-muros-de-oro-y-plata';
import { level07 } from './07-penumbra';
import { level08 } from './08-la-escalera-del-cielo';
import { level09 } from './09-el-reloj-del-cielo';
import type { LevelData } from './types';

export const LEVELS: readonly LevelData[] = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
];
