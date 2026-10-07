// Game state shape, defaults and the Store that owns it.
import { DEFAULT_AVATAR, START_COINS } from '../config';
import { START_FURNITURE } from './catalog';
import type { Emitter, GameEvents } from './events';

export interface PlacedItem {
  uid: number;
  id: string;
  x: number;
  y: number;
}

export interface AnimalState {
  id: string;
  /** timestamp (ms) from which production accumulates */
  since: number;
}

export interface SaveData {
  v: 1;
  avatar: string;
  name: string;
  coins: number;
  furniture: PlacedItem[];
  animals: AnimalState[];
  unlocks: { zoo: boolean; museum: boolean };
  time: number;
  started: boolean;
}

export function defaultSave(now = Date.now()): SaveData {
  return {
    v: 1,
    avatar: DEFAULT_AVATAR,
    name: '',
    coins: START_COINS,
    furniture: START_FURNITURE.map((f, i) => ({ uid: i + 1, ...f })),
    animals: [{ id: 'capybara', since: now }],
    unlocks: { zoo: false, museum: false },
    time: now,
    started: false,
  };
}

export class Store {
  constructor(public data: SaveData, private bus: Emitter<GameEvents>) {}

  commit(): void {
    this.bus.emit('changed', undefined);
  }

  addCoins(delta: number): void {
    this.data.coins = Math.max(0, this.data.coins + delta);
    this.bus.emit('coins', this.data.coins);
    this.commit();
  }

  nextUid(): number {
    return this.data.furniture.reduce((m, f) => Math.max(m, f.uid), 0) + 1;
  }
}
