// Garden actions that change the save: buy animals, simulated partner visits, collecting.
import { MAX_CYCLES } from '../config';
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

/** Demo stand-in for a real visit to a partner zoo or museum. */
export function simulateVisit(store: Store, kind: 'zoo' | 'museum', now = Date.now()): void {
  store.data.unlocks[kind] = true;
  if (kind === 'zoo' && !owns(store, 'jaguar')) store.data.animals.push({ id: 'jaguar', since: now });
  store.commit();
}

export function pendingFor(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  return st ? pendingCoins(animalById(id), st, now, MAX_CYCLES) : 0;
}

export function collectAnimal(store: Store, id: string, now = Date.now()): number {
  const st = store.data.animals.find((a) => a.id === id);
  if (!st) return 0;
  const coins = collect(animalById(id), st, now, MAX_CYCLES);
  if (coins) store.addCoins(coins);
  return coins;
}
