// Garden actions that change the save: buy animals, collect coins.
import { MAX_CYCLES } from '../config';
import { multiplierAt } from './boost';
import { galleryMultiplier } from './gallery';
import { animalById } from './catalog';
import { collect, pendingCoins } from './production';
import type { Store } from './state';

/** Everything that multiplies garden coins: the visit boost and the gallery display bonus. */
export const gardenMultiplier = (d: Store['data'], now: number): number => multiplierAt(d, now) * galleryMultiplier(d);

export const owns = (store: Store, id: string) => store.data.animals.some((a) => a.id === id);

export function buyAnimal(store: Store, id: string, now = Date.now()): boolean {
  const def = animalById(id);
  if (owns(store, id) || def.exclusive || store.data.coins < def.price) return false;
  store.data.animals.push({ id, since: now });
  store.addCoins(-def.price);
  return true;
}

/** Coins ready to collect, including the visit boost and the gallery bonus. */
export function pendingFor(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  return st ? Math.round(pendingCoins(animalById(id), st, now, MAX_CYCLES) * gardenMultiplier(store.data, now)) : 0;
}

export function collectAnimal(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  if (!st) return 0;
  const coins = Math.round(collect(animalById(id), st, now, MAX_CYCLES) * gardenMultiplier(store.data, now));
  if (coins) {
    store.addCoins(coins);
    store.bus.emit('collected', { animal: id, coins });
  }
  return coins;
}
