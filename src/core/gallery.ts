// The gallery wing: build levels (visit projects + coins) and the benefits of pieces on display. Pure rules.
import galleryJson from '../data/gallery.json';
import { OFFLINE_CAP_HOURS } from '../config';
import type { SaveData, Store } from './state';

export interface GalleryLevel {
  level: number;
  name: string;
  bounds: number;
  projects: number;
  coins: number;
}
export interface GalleryTier {
  pieces: number;
  coinsPct: number;
  offlineHours: number;
}
export interface GalleryCollection {
  id: string;
  name: string;
  items: string[];
  coinsPct: number;
}

export const GALLERY_LEVELS = galleryJson.levels as GalleryLevel[];
export const GALLERY_TIERS = galleryJson.tiers as GalleryTier[];
export const GALLERY_COLLECTIONS = galleryJson.collections as GalleryCollection[];
export const GALLERY_CELLS = 6;

type Gal = Pick<SaveData, 'gallery' | 'galleryLevel' | 'projects' | 'coins'>;

/** Cells per side that can hold pieces (0 = the wing is not built yet). */
export const galleryBounds = (d: Pick<SaveData, 'galleryLevel'>): number => GALLERY_LEVELS.find((l) => l.level === d.galleryLevel)?.bounds ?? 0;

export const nextLevel = (d: Pick<SaveData, 'galleryLevel'>): GalleryLevel | null => GALLERY_LEVELS.find((l) => l.level === d.galleryLevel + 1) ?? null;

export interface BuildCheck {
  ok: boolean;
  level: GalleryLevel | null;
  missingProjects: number;
  missingCoins: number;
}

export function canBuild(d: Gal): BuildCheck {
  const level = nextLevel(d);
  if (!level) return { ok: false, level: null, missingProjects: 0, missingCoins: 0 };
  const missingProjects = Math.max(0, level.projects - d.projects);
  const missingCoins = Math.max(0, level.coins - d.coins);
  return { ok: !missingProjects && !missingCoins, level, missingProjects, missingCoins };
}

/** Spend the projects and coins and open the next part of the gallery. */
export function buildGallery(store: Store): boolean {
  const check = canBuild(store.data);
  if (!check.ok || !check.level) return false;
  store.data.projects -= check.level.projects;
  store.data.galleryLevel = check.level.level;
  store.addCoins(-check.level.coins); // also commits
  store.bus.emit('galleryBuilt', { level: check.level.level });
  return true;
}

/** One project per visit (real or demo). */
export function grantProject(d: Pick<SaveData, 'projects'>, amount = 1): void {
  d.projects += amount;
}

export interface GalleryBonus {
  pieces: number;
  coinsPct: number;
  offlineHours: number;
  tier: GalleryTier | null;
  nextTier: GalleryTier | null;
  collections: { def: GalleryCollection; have: number; done: boolean }[];
}

/** Benefits earned by what is on display right now (only pieces placed in the gallery count). */
export function galleryBonus(d: Pick<SaveData, 'gallery'>): GalleryBonus {
  const shown = new Set(d.gallery.map((p) => p.id));
  const pieces = shown.size;
  const tier = [...GALLERY_TIERS].reverse().find((t) => pieces >= t.pieces) ?? null;
  const nextTier = GALLERY_TIERS.find((t) => pieces < t.pieces) ?? null;
  const collections = GALLERY_COLLECTIONS.map((def) => {
    const have = def.items.filter((i) => shown.has(i)).length;
    return { def, have, done: have === def.items.length };
  });
  const coinsPct = (tier?.coinsPct ?? 0) + collections.filter((c) => c.done).reduce((n, c) => n + c.def.coinsPct, 0);
  return { pieces, coinsPct, offlineHours: tier?.offlineHours ?? 0, tier, nextTier, collections };
}

/** Garden multiplier from the gallery (1.2 = +20%). */
export const galleryMultiplier = (d: Pick<SaveData, 'gallery'>): number => 1 + galleryBonus(d).coinsPct / 100;

/** Hours of time away that still count for the garden. */
export const offlineCapHours = (d: Pick<SaveData, 'gallery'>): number => OFFLINE_CAP_HOURS + galleryBonus(d).offlineHours;

/** Cells (per side) a piece may use at the current level; wall pieces only on the right wall row. */
export function galleryCellOk(def: { size: [number, number]; wall?: boolean }, x: number, y: number, bounds: number): boolean {
  if (x < 0 || y < 0 || x + def.size[0] > bounds || y + def.size[1] > bounds) return false;
  return def.wall ? y === 0 : true;
}
