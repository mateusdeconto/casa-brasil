import { describe, expect, it } from 'vitest';
import { Emitter, type GameEvents } from '../src/core/events';
import { sha256Hex } from '../src/core/hash';
import { checkPin, hashPin, isValidPin } from '../src/core/pin';
import { defaultRoot, Store } from '../src/core/state';
import { activeDays, addUsage, lastDays, limitLabel, limitReached, minutesToday } from '../src/core/usage';

const NOW = new Date(2026, 9, 7, 15).getTime();
const DAY = 86_400_000;

describe('sha256', () => {
  it('matches the standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('a'.repeat(100))).toBe('2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e');
  });
});

describe('PIN', () => {
  it('needs exactly 4 digits', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('stores only a hash and checks against it', () => {
    const h = hashPin('4821');
    expect(h).not.toContain('4821');
    expect(checkPin('4821', h)).toBe(true);
    expect(checkPin('4822', h)).toBe(false);
    expect(checkPin('4821', null)).toBe(false);
  });
});

describe('daily time limit', () => {
  it('counts the minutes played today', () => {
    const d = { usage: {} as Record<string, number> };
    addUsage(d, NOW, 15);
    addUsage(d, NOW + 1000, 45);
    expect(minutesToday(d, NOW)).toBe(1);
    addUsage(d, NOW, 3540);
    expect(minutesToday(d, NOW)).toBe(60);
    expect(minutesToday(d, NOW + DAY)).toBe(0);
  });

  it('is reached at the limit and never with "sem limite"', () => {
    const d = { usage: {} as Record<string, number> };
    addUsage(d, NOW, 29 * 60);
    expect(limitReached(d, { dailyLimitMinutes: 30 }, NOW)).toBe(false);
    addUsage(d, NOW, 60);
    expect(limitReached(d, { dailyLimitMinutes: 30 }, NOW)).toBe(true);
    expect(limitReached(d, { dailyLimitMinutes: 0 }, NOW)).toBe(false);
    expect(limitReached(d, { dailyLimitMinutes: 30 }, NOW + DAY)).toBe(false); // a new day starts fresh
  });

  it('lists the last 7 days and the active ones', () => {
    const d = { usage: {} as Record<string, number> };
    addUsage(d, NOW, 600);
    addUsage(d, NOW - 2 * DAY, 120);
    addUsage(d, NOW - 20 * DAY, 999);
    const days = lastDays(d, NOW);
    expect(days).toHaveLength(7);
    expect(days[6].minutes).toBe(10);
    expect(days[4].minutes).toBe(2);
    expect(activeDays(d, NOW)).toBe(2);
  });

  it('labels the choices', () => {
    expect([15, 60, 90, 120, 0].map(limitLabel)).toEqual(['15 min', '1h', '1h30', '2h', 'Sem limite']);
  });
});

describe('profiles are isolated', () => {
  const make = () => new Store(defaultRoot(NOW), new Emitter<GameEvents>());

  it('each child has own coins, house, garden, album and badges', () => {
    const store = make();
    store.data.name = 'Ana';
    const a = store.data;
    const b = store.addProfile('Leo', 'avatar_4', NOW);
    expect(b.id).not.toBe(a.id);
    a.coins = 999;
    a.furniture.push({ uid: 9, id: 'sofa', x: 2, y: 0 });
    a.visits.push({ id: 'v', partner: 'zoo', ts: NOW, demo: true, hasPhoto: false });
    a.badges.arte = NOW;
    expect(b.coins).toBe(200);
    expect(b.furniture).toHaveLength(1);
    expect(b.visits).toEqual([]);
    expect(b.badges).toEqual({});
    expect(b.animals).not.toBe(a.animals);
  });

  it('switching changes what store.data points at, without mixing saves', () => {
    const store = make();
    const seen: string[] = [];
    store.bus.on('profileChanged', (id) => seen.push(id));
    store.data.coins = 50;
    const b = store.addProfile('Leo', 'avatar_4', NOW);
    expect(store.switchProfile(b.id)).toBe(true);
    expect(store.data.name).toBe('Leo');
    store.addCoins(25);
    expect(store.data.coins).toBe(225);
    store.switchProfile('p1');
    expect(store.data.coins).toBe(50);
    expect(seen).toEqual([b.id, 'p1']);
    expect(store.switchProfile('nope')).toBe(false);
  });

  it('limits the number of profiles on one device', () => {
    const store = make();
    while (store.canAddProfile()) store.addProfile('x', 'avatar_1', NOW);
    expect(store.root.profiles.length).toBe(4);
  });
});
