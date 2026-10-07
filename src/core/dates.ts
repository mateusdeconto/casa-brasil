// Local-time date helpers. Keys are YYYY-MM-DD strings so they sort and compare as text.
export const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Monday (local) of the week that contains `ts`, as a day key. */
export function weekKey(ts: number): string {
  const d = new Date(ts);
  const back = (d.getDay() + 6) % 7; // Monday = 0
  return dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - back, 12).getTime());
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d.getTime());
}

/** The 7 days starting at `ts`'s day, for the outing planner. */
export function nextDays(ts: number, n = 7): { key: string; weekday: string; day: number }[] {
  const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const start = dayKey(ts);
  return Array.from({ length: n }, (_, i) => {
    const key = addDays(start, i);
    const d = parseDayKey(key);
    return { key, weekday: names[d.getDay()], day: d.getDate() };
  });
}

export function weekdayLong(key: string): string {
  return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][parseDayKey(key).getDay()];
}

export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
