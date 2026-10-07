// Daily play time (for the parent panel). The limit is a friendly reminder: it never blocks play.
import { dayKey, addDays } from './dates';
import type { SaveData, Settings } from './state';

export function addUsage(d: Pick<SaveData, 'usage'>, now: number, seconds: number): void {
  const key = dayKey(now);
  d.usage[key] = (d.usage[key] ?? 0) + seconds;
}

export const minutesToday = (d: Pick<SaveData, 'usage'>, now: number): number => Math.floor((d.usage[dayKey(now)] ?? 0) / 60);

/** limit 0 means "no limit" */
export const limitReached = (d: Pick<SaveData, 'usage'>, s: Pick<Settings, 'dailyLimitMinutes'>, now: number): boolean =>
  s.dailyLimitMinutes > 0 && minutesToday(d, now) >= s.dailyLimitMinutes;

/** Minutes played on each of the last `n` days, oldest first. */
export function lastDays(d: Pick<SaveData, 'usage'>, now: number, n = 7): { key: string; minutes: number }[] {
  const today = dayKey(now);
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(today, i - (n - 1));
    return { key, minutes: Math.round((d.usage[key] ?? 0) / 60) };
  });
}

/** Days in the last 7 with any play time. */
export const activeDays = (d: Pick<SaveData, 'usage'>, now: number): number => lastDays(d, now).filter((x) => x.minutes > 0 || (d.usage[x.key] ?? 0) > 0).length;

export const LIMIT_CHOICES = [15, 30, 45, 60, 90, 120, 0];

export const limitLabel = (min: number): string => (min === 0 ? 'Sem limite' : min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}` : `${min} min`);
