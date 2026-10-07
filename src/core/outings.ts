// Planned outings ("saída combinada") and the text shared with the family.
import { DEFAULT_OUTING_TIME } from '../config';
import { partnerById } from './catalog';
import { dayKey, parseDayKey, weekdayLong } from './dates';
import type { Outing, SaveData } from './state';

const SEED_RANGE = 997;

export function planOuting(d: SaveData, o: { partner: string; day: string; time?: string }, now: number): Outing {
  const outing: Outing = { partner: o.partner, day: o.day, time: o.time || DEFAULT_OUTING_TIME, agreedAt: now, seed: now % SEED_RANGE, swaps: {}, done: [] };
  // one outing per day: planning the same day again replaces it
  d.outings = d.outings.filter((x) => x.day !== o.day);
  d.outings.push(outing);
  d.outings.sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  return outing;
}

/** The soonest outing that is today or later. */
export function nextOuting(d: Pick<SaveData, 'outings'>, now: number): Outing | null {
  const today = dayKey(now);
  return d.outings.find((o) => o.day >= today) ?? null;
}

const hourLabel = (t: string) => (t.endsWith(':00') ? `${Number(t.slice(0, 2))}h` : t.replace(':', 'h'));

/** "sábado, 10h" */
export const outingLabel = (o: Outing): string => `${weekdayLong(o.day)}, ${hourLabel(o.time)}`;

export function shareText(o: Outing): string {
  const p = partnerById(o.partner);
  const d = parseDayKey(o.day);
  const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `Vamos ao ${p.name} no ${weekdayLong(o.day)} (${date}), às ${hourLabel(o.time)}! Combinado pelo Clube Família Passport.`;
}

/** A new roteiro for the same outing: another seed, no swaps, nothing ticked. */
export function regenerateRoteiro(o: Outing): void {
  o.seed = ((o.seed ?? 0) + 7) % SEED_RANGE;
  o.swaps = {};
  o.done = [];
}

/** Ask for another idea in one slot of the roteiro. */
export function swapSlot(o: Outing, slot: string): void {
  o.swaps = { ...o.swaps, [slot]: (o.swaps?.[slot] ?? 0) + 1 };
}

export function toggleDone(o: Outing, id: string): boolean {
  const done = new Set(o.done ?? []);
  const now = !done.has(id);
  if (now) done.add(id);
  else done.delete(id);
  o.done = [...done];
  return now;
}

export const shareOuting = (o: Outing) => sharePlain('Saída em família', shareText(o));

/** Native share sheet when available, otherwise copy the text. Returns which one worked. */
export async function sharePlain(title: string, text: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch {
    // user closed the sheet or share is blocked: fall back to copying
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
