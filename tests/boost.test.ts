import { describe, expect, it } from 'vitest';
import { boostActive, boostDaysLeft, grantBoost, multiplierAt } from '../src/core/boost';
import { DAY_MS } from '../src/core/dates';

const NOW = 1_700_000_000_000;

describe('7 day 2x boost', () => {
  it('is off until a visit grants it', () => {
    const d = { boostUntil: 0 };
    expect(boostActive(d, NOW)).toBe(false);
    expect(multiplierAt(d, NOW)).toBe(1);
    expect(boostDaysLeft(d, NOW)).toBe(0);
  });

  it('doubles production for exactly 7 days', () => {
    const d = { boostUntil: 0 };
    grantBoost(d, NOW);
    expect(multiplierAt(d, NOW)).toBe(2);
    expect(boostDaysLeft(d, NOW)).toBe(7);
    expect(multiplierAt(d, NOW + 7 * DAY_MS - 1)).toBe(2);
    expect(multiplierAt(d, NOW + 7 * DAY_MS)).toBe(1);
  });

  it('counts the days left, rounding up', () => {
    const d = { boostUntil: 0 };
    grantBoost(d, NOW);
    expect(boostDaysLeft(d, NOW + 3 * DAY_MS)).toBe(4);
    expect(boostDaysLeft(d, NOW + 6.5 * DAY_MS)).toBe(1);
  });

  it('a second visit restarts the 7 days but never shortens them', () => {
    const d = { boostUntil: 0 };
    grantBoost(d, NOW);
    grantBoost(d, NOW + 2 * DAY_MS);
    expect(boostDaysLeft(d, NOW + 2 * DAY_MS)).toBe(7);
    const long = { boostUntil: NOW + 30 * DAY_MS };
    grantBoost(long, NOW);
    expect(long.boostUntil).toBe(NOW + 30 * DAY_MS);
  });
});
