import { describe, expect, it } from 'vitest';
import { collectAnimal, pendingFor } from '../src/core/actions';
import { Emitter, type GameEvents } from '../src/core/events';
import { GALLERY_LEVELS, buildGallery, canBuild, galleryBonus, galleryBounds, galleryCellOk, galleryMultiplier, grantProject, nextLevel, offlineCapHours } from '../src/core/gallery';
import { normalizeRoot } from '../src/core/migrate';
import { canPlace } from '../src/core/placement';
import { Store, defaultRoot } from '../src/core/state';
import { completeVisit } from '../src/core/visits';

const piece = (id: string, x = 0, y = 0, uid = Math.random()) => ({ uid, id, x, y });
const newStore = () => new Store(defaultRoot(1000), new Emitter<GameEvents>());

describe('gallery build levels', () => {
  it('starts unbuilt and needs both projects and coins', () => {
    const s = newStore();
    expect(galleryBounds(s.data)).toBe(0);
    const first = GALLERY_LEVELS[0];
    s.data.coins = first.coins;
    expect(canBuild(s.data)).toMatchObject({ ok: false, missingProjects: first.projects });
    s.data.projects = first.projects;
    s.data.coins = first.coins - 1;
    expect(canBuild(s.data)).toMatchObject({ ok: false, missingCoins: 1 });
    expect(buildGallery(s)).toBe(false);
    expect(s.data.galleryLevel).toBe(0);
  });

  it('spends projects and coins and opens the first area', () => {
    const s = newStore();
    const first = GALLERY_LEVELS[0];
    s.data.projects = first.projects + 1;
    s.data.coins = first.coins + 50;
    expect(buildGallery(s)).toBe(true);
    expect(s.data).toMatchObject({ galleryLevel: 1, projects: 1, coins: 50 });
    expect(galleryBounds(s.data)).toBe(first.bounds);
    expect(nextLevel(s.data)?.level).toBe(2);
  });

  it('stops after the last level', () => {
    const s = newStore();
    s.data.galleryLevel = GALLERY_LEVELS.length;
    s.data.projects = 99;
    s.data.coins = 99999;
    expect(nextLevel(s.data)).toBeNull();
    expect(buildGallery(s)).toBe(false);
  });

  it('every real or demo visit brings one project, the event QR does not', () => {
    const s = newStore();
    completeVisit(s, { partnerId: 'zoo', demo: true, hasPhoto: false });
    completeVisit(s, { partnerId: 'museu', demo: false, hasPhoto: false });
    completeVisit(s, { partnerId: 'evento', demo: false, hasPhoto: false });
    expect(s.data.projects).toBe(2);
    grantProject(s.data, 3);
    expect(s.data.projects).toBe(5);
  });
});

describe('gallery benefits', () => {
  it('counts only different pieces on display and picks the best tier', () => {
    expect(galleryBonus({ gallery: [] })).toMatchObject({ pieces: 0, coinsPct: 0, tier: null });
    const two = galleryBonus({ gallery: [piece('fossil'), piece('vase')] });
    expect(two).toMatchObject({ pieces: 2, coinsPct: 10 });
    expect(two.nextTier?.pieces).toBe(4);
    const copies = galleryBonus({ gallery: [piece('fossil'), piece('fossil', 1, 0)] });
    expect(copies.pieces).toBe(1);
  });

  it('adds a collection bonus when the set is complete, and extra offline hours at higher tiers', () => {
    const dinos = ['dino_raptor', 'dino_trice', 'dino_trex'].map((id) => piece(id));
    const b = galleryBonus({ gallery: dinos });
    expect(b.collections.find((c) => c.def.id === 'dinos')?.done).toBe(true);
    expect(b.coinsPct).toBe(10 + 5); // 3 pieces = first tier, plus the dinosaur set
    const many = ['fossil', 'vase', 'meteorite', 'dino_raptor', 'dino_trice', 'dino_trex', 'painting_dama'].map((id) => piece(id));
    expect(galleryBonus({ gallery: many })).toMatchObject({ offlineHours: 4 });
    expect(offlineCapHours({ gallery: many })).toBe(8 + 4);
    expect(galleryMultiplier({ gallery: [] })).toBe(1);
  });

  it('raises what the garden pays', () => {
    const s = newStore();
    const now = 2_000_000;
    s.data.animals = [{ id: 'capybara', since: now - 31_000 }]; // one cycle of 5 coins
    const base = pendingFor(s, 'capybara', now);
    expect(base).toBe(5);
    s.data.gallery = [piece('fossil'), piece('vase')]; // +10%
    expect(pendingFor(s, 'capybara', now)).toBe(Math.round(5 * 1.1));
    s.data.gallery = ['fossil', 'vase', 'meteorite', 'dino_raptor'].map((id) => piece(id)); // +20%
    expect(collectAnimal(s, 'capybara', now)).toBe(6);
  });
});

describe('gallery placement', () => {
  const dino = { size: [2, 2] as [number, number], floor: false, blocks: true, wall: false };
  const painting = { size: [1, 1] as [number, number], floor: false, blocks: false, wall: true };
  const defOf = (id: string) => (id === 'p' ? painting : dino);

  it('stays inside the built area', () => {
    const q = { def: dino, gridSize: 6, bounds: 3, items: [], defOf };
    expect(canPlace({ ...q, x: 1, y: 1 })).toBe(true);
    expect(canPlace({ ...q, x: 2, y: 2 })).toBe(false);
    expect(canPlace({ ...q, x: 0, y: 0, bounds: 0 })).toBe(false);
  });

  it('paintings hang only on the back wall row and do not take floor space', () => {
    const q = { def: painting, gridSize: 6, bounds: 3, items: [{ uid: 1, id: 'd', x: 0, y: 0 }], defOf };
    expect(canPlace({ ...q, x: 0, y: 0 })).toBe(true); // the dinosaur stands on the floor of that cell
    expect(canPlace({ ...q, x: 1, y: 1 })).toBe(false);
    expect(galleryCellOk(painting, 2, 0, 3)).toBe(true);
    expect(galleryCellOk(painting, 2, 1, 3)).toBe(false);
    expect(canPlace({ ...q, x: 0, y: 0, items: [{ uid: 2, id: 'p', x: 0, y: 0 }] })).toBe(false);
  });
});

describe('saves from before the gallery', () => {
  it('fills the new fields and moves museum pieces out of the house with a refund', () => {
    const root = defaultRoot(5);
    const p = root.profiles[0] as unknown as Record<string, unknown>;
    delete p.gallery;
    delete p.galleryLevel;
    delete p.projects;
    root.profiles[0].furniture.push({ uid: 9, id: 'fossil', x: 3, y: 3 });
    const coins = root.profiles[0].coins;
    const fixed = normalizeRoot(root, 5).profiles[0];
    expect(fixed).toMatchObject({ gallery: [], galleryLevel: 0, projects: 0 });
    expect(fixed.furniture.some((f) => f.id === 'fossil')).toBe(false);
    expect(fixed.coins).toBe(coins + 100);
  });
});
