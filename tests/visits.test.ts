import { describe, expect, it } from 'vitest';
import { collectAnimal, pendingFor } from '../src/core/actions';
import { DAY_MS } from '../src/core/dates';
import { Emitter, type GameEvents } from '../src/core/events';
import { defaultRoot, Store } from '../src/core/state';
import { completeVisit } from '../src/core/visits';

const NOW = 1_700_000_000_000;
const make = () => new Store(defaultRoot(NOW), new Emitter<GameEvents>());

describe('completeVisit', () => {
  it('stamps, unlocks the reward, starts the boost and emits visitCompleted', () => {
    const store = make();
    const seen: string[] = [];
    store.bus.on('visitCompleted', ({ visit }) => seen.push(visit.partner));
    const { visit, firstStamp } = completeVisit(store, { partnerId: 'zoo', demo: true, hasPhoto: false }, NOW);
    expect(firstStamp).toBe(true);
    expect(visit.demo).toBe(true);
    expect(store.data.stamps).toEqual(['zoo']);
    expect(store.data.unlocks.zoo).toBe(true);
    expect(store.data.animals.some((a) => a.id === 'jaguar')).toBe(true);
    expect(store.data.boostUntil).toBe(NOW + 7 * DAY_MS);
    expect(seen).toEqual(['zoo']);
  });

  it('a repeat visit adds an album entry but not a second stamp or jaguar', () => {
    const store = make();
    completeVisit(store, { partnerId: 'zoo', demo: false, hasPhoto: true }, NOW);
    completeVisit(store, { partnerId: 'zoo', demo: false, hasPhoto: true }, NOW + 1000);
    expect(store.data.visits).toHaveLength(2);
    expect(store.data.stamps).toEqual(['zoo']);
    expect(store.data.animals.filter((a) => a.id === 'jaguar')).toHaveLength(1);
  });

  it('the museum unlocks its shop key', () => {
    const store = make();
    completeVisit(store, { partnerId: 'museu', demo: false, hasPhoto: false }, NOW);
    expect(store.data.unlocks.museu).toBe(true);
  });
});

describe('garden production with the boost', () => {
  it('pays double while the boost is active and normal after it ends', () => {
    const store = make();
    store.data.animals = [{ id: 'capybara', since: NOW }];
    expect(pendingFor(store, 'capybara', NOW + 60_000)).toBe(10); // 2 cycles x 5 coins
    completeVisit(store, { partnerId: 'zoo', demo: true, hasPhoto: false }, NOW);
    expect(pendingFor(store, 'capybara', NOW + 60_000)).toBe(20);
    expect(collectAnimal(store, 'capybara', NOW + 60_000)).toBe(20);
    const later = NOW + 8 * DAY_MS;
    store.data.animals = [{ id: 'capybara', since: later - 60_000 }];
    expect(pendingFor(store, 'capybara', later)).toBe(10);
  });
});
