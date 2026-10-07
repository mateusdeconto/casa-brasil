// House growth: build levels (visit projects + coins) that turn the 4x4 floor into 5x5 and 6x6. Pure rules.
import houseJson from '../data/house.json';
import type { SaveData, Store } from './state';

export interface HouseLevel {
  level: number;
  name: string;
  cells: number;
  projects: number;
  coins: number;
}

export const HOUSE_LEVELS = houseJson.levels as HouseLevel[];
export const HOUSE_START_CELLS = 4;

type Wallet = Pick<SaveData, 'houseLevel' | 'projects' | 'coins'>;

/** Cells per side of the floor the child has now. */
export const houseCells = (d: Pick<SaveData, 'houseLevel'>): number => HOUSE_LEVELS.find((l) => l.level === d.houseLevel)?.cells ?? HOUSE_START_CELLS;

/** Key of the room picture and calibration for the current size ('room', 'room5', 'room6'). */
export const roomKey = (d: Pick<SaveData, 'houseLevel'>): string => (d.houseLevel > 0 ? `room${houseCells(d)}` : 'room');

export const nextHouseLevel = (d: Pick<SaveData, 'houseLevel'>): HouseLevel | null => HOUSE_LEVELS.find((l) => l.level === d.houseLevel + 1) ?? null;

export function canBuildHouse(d: Wallet) {
  const level = nextHouseLevel(d);
  if (!level) return { ok: false, level: null, missingProjects: 0, missingCoins: 0 };
  const missingProjects = Math.max(0, level.projects - d.projects);
  const missingCoins = Math.max(0, level.coins - d.coins);
  return { ok: !missingProjects && !missingCoins, level, missingProjects, missingCoins };
}

/** Spend projects and coins and make the house one size bigger. */
export function buildHouse(store: Store): boolean {
  const check = canBuildHouse(store.data);
  if (!check.ok || !check.level) return false;
  store.data.projects -= check.level.projects;
  store.data.houseLevel = check.level.level;
  store.addCoins(-check.level.coins); // also commits
  store.bus.emit('houseBuilt', { level: check.level.level });
  return true;
}
