// Garden actions that change the save: buy animals, collect coins.
import { MAX_CYCLES } from '../config';
import { multiplierAt } from './boost';
import { animalById } from './catalog';
import { collect, pendingCoins } from './production';
import type { Store } from './state';

export const owns = (store: Store, id: string) => store.data.animals.some((a) => a.id === id);

export function buyAnimal(store: Store, id: string, now = Date.now()): boolean {
  const def = animalById(id);
  if (owns(store, id) || def.exclusive || store.data.coins < def.price) return false;
  store.data.animals.push({ id, since: now });
  store.addCoins(-def.price);
  return true;
}

/** Coins ready to collect, including the 2x boost if a visit granted one. */
export function pendingFor(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  return st ? pendingCoins(animalById(id), st, now, MAX_CYCLES) * multiplierAt(store.data, now) : 0;
}

export function collectAnimal(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  if (!st) return 0;
  const coins = collect(animalById(id), st, now, MAX_CYCLES) * multiplierAt(store.data, now);
  if (coins) {
    store.addCoins(coins);
    store.bus.emit('collected', { animal: id, coins });
  }
  return coins;
}
