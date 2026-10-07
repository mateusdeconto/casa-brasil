// The "2x in the garden for 7 days" reward that a visit grants. Pure functions over the profile.
import { BOOST_DAYS, BOOST_MULTIPLIER } from '../config';
import { DAY_MS } from './dates';
import type { SaveData } from './state';

export const boostActive = (d: Pick<SaveData, 'boostUntil'>, now: number): boolean => d.boostUntil > now;

export const multiplierAt = (d: Pick<SaveData, 'boostUntil'>, now: number): number => (boostActive(d, now) ? BOOST_MULTIPLIER : 1);

/** Whole days left, rounded up (a boost that ends in 3 hours still says "1 dia"). */
export const boostDaysLeft = (d: Pick<SaveData, 'boostUntil'>, now: number): number =>
  boostActive(d, now) ? Math.ceil((d.boostUntil - now) / DAY_MS) : 0;

/** Starts (or restarts) the 7 days; a new visit never shortens an active boost. */
export function grantBoost(d: Pick<SaveData, 'boostUntil'>, now: number): void {
  d.boostUntil = Math.max(d.boostUntil, now + BOOST_DAYS * DAY_MS);
}
