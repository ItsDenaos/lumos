// Canales de color: enlazan botones y palancas con plataformas.
// Un canal está activo si cualquiera de sus botones está pisado o cualquiera de sus palancas encendida.

import type { Channel } from '../levels/types';
import type { Button } from './entities/button';
import type { Lever } from './entities/lever';

export const CHANNELS: readonly Channel[] = ['green', 'pink', 'cyan', 'white'];

export type ChannelState = Record<Channel, boolean>;

export function computeChannels(buttons: readonly Button[], levers: readonly Lever[]): ChannelState {
  const state: ChannelState = { green: false, pink: false, cyan: false, white: false };
  for (const button of buttons) if (button.pressed) state[button.channel] = true;
  for (const lever of levers) if (lever.on) state[lever.channel] = true;
  return state;
}
