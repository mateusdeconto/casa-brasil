import { describe, expect, it } from 'vitest';
import { migrateV1, normalizeRoot, type SaveV1 } from '../src/core/migrate';

const v1: SaveV1 = {
  v: 1,
  avatar: 'avatar_3',
  name: 'Ana',
  coins: 777,
  furniture: [{ uid: 1, id: 'table', x: 0, y: 2 }, { uid: 2, id: 'sofa', x: 2, y: 0 }],
  animals: [{ id: 'capybara', since: 1000 }, { id: 'jaguar', since: 2000 }],
  unlocks: { zoo: true, museum: true },
  time: 123456,
  started: true,
};

describe('save v1 -> v2', () => {
  const root = migrateV1(v1, 999_999);
  const p = root.profiles[0];

  it('keeps everything the child had', () => {
    expect(root.v).toBe(2);
    expect(root.profiles).toHaveLength(1);
    expect(root.activeId).toBe(p.id);
    expect(p).toMatchObject({ avatar: 'avatar_3', name: 'Ana', coins: 777, started: true, time: 123456 });
    expect(p.furniture).toEqual(v1.furniture);
    expect(p.animals).toEqual(v1.animals);
  });

  it('renames museum to museu and keeps zoo', () => {
    expect(p.unlocks).toMatchObject({ zoo: true, museu: true, parque: false, ciencia: false });
  });

  it('adds every v2 field with safe defaults', () => {
    expect(p.visits).toEqual([]);
    expect(p.stamps).toEqual([]);
    expect(p.badges).toEqual({});
    expect(p.missions).toBeNull();
    expect(p.outings).toEqual([]);
    expect(p.boostUntil).toBe(0);
    expect(p.redeemed).toEqual([]);
    expect(root.pinHash).toBeNull();
    expect(root.settings.purchasesBlocked).toBe(true);
    expect(root.settings.noAds).toBe(true);
    expect(root.school.expeditions).toEqual([]);
  });

  it('does not mutate the old save', () => {
    expect(v1.unlocks).toEqual({ zoo: true, museum: true });
  });
});

describe('normalizeRoot', () => {
  it('fills fields missing from an older v2 save without touching the rest', () => {
    const half = { v: 2 as const, activeId: 'p2', profiles: [{ id: 'p2', name: 'Leo', coins: 5 }] };
    const root = normalizeRoot(half as never, 1);
    expect(root.profiles[0]).toMatchObject({ id: 'p2', name: 'Leo', coins: 5 });
    expect(root.profiles[0].visits).toEqual([]);
    expect(root.activeId).toBe('p2');
    expect(root.settings.dailyLimitMinutes).toBeGreaterThan(0);
  });

  it('falls back to the first profile when the active id is gone', () => {
    const root = normalizeRoot({ activeId: 'zzz', profiles: [{ id: 'p1' }] } as never, 1);
    expect(root.activeId).toBe('p1');
  });
});
