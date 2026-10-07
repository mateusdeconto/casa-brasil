import { describe, expect, it } from 'vitest';
import { applyOffline, collect, pendingCoins } from '../src/core/production';

const capybara = { coins: 5, periodSec: 30 };
const MAX = 10;
const HOUR = 3600_000;

describe('production', () => {
  it('accumulates whole cycles up to the cap', () => {
    expect(pendingCoins(capybara, { since: 0 }, 29_999, MAX)).toBe(0);
    expect(pendingCoins(capybara, { since: 0 }, 95_000, MAX)).toBe(15);
    expect(pendingCoins(capybara, { since: 0 }, HOUR, MAX)).toBe(50);
  });

  it('collect keeps the partial cycle, or restarts after the cap', () => {
    const p = { since: 0 };
    expect(collect(capybara, p, 95_000, MAX)).toBe(15);
    expect(p.since).toBe(90_000);
    expect(collect(capybara, p, 95_000, MAX)).toBe(0);
    const capped = { since: 0 };
    expect(collect(capybara, capped, HOUR, MAX)).toBe(50);
    expect(capped.since).toBe(HOUR);
  });
});

describe('offline production', () => {
  const slow = { coins: 60, periodSec: 3600 }; // one cycle per hour, so the 8 h cap is visible
  const BIG = 1000;

  it('credits all the time away when under 8 hours', () => {
    const p = { since: 0 };
    applyOffline([p], 0, 5 * HOUR, 8 * HOUR);
    expect(pendingCoins(slow, p, 5 * HOUR, BIG)).toBe(5 * 60);
  });

  it('credits at most 8 hours when away longer', () => {
    const p = { since: 0 };
    const excess = applyOffline([p], 0, 30 * HOUR, 8 * HOUR);
    expect(excess).toBe(22 * HOUR);
    expect(pendingCoins(slow, p, 30 * HOUR, BIG)).toBe(8 * 60);
  });

  it('never takes coins away', () => {
    const p = { since: 10 * HOUR };
    applyOffline([p], 10 * HOUR, 10 * HOUR + 1000, 8 * HOUR);
    expect(p.since).toBe(10 * HOUR);
    expect(pendingCoins(slow, p, 10 * HOUR + 1000, BIG)).toBe(0);
  });
});
