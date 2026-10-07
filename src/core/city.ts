// City panel numbers: the minimum-visits privacy rule, totals and how concentrated the visits are.
import cityJson from '../data/city.json';

export interface Place {
  id: string;
  name: string;
  type: string;
  area: string;
  x: number;
  y: number;
  before: number;
  after: number;
}

export const MIN_VISITS: number = cityJson.minVisits;
export const PLACES = cityJson.places as Place[];
export const PLACE_TYPES = cityJson.types as string[];
export const CAMPAIGN = cityJson.campaign;

export type Period = 'before' | 'after';

/** The number to show, or null when the place is below the minimum (privacy rule). */
export const shownVisits = (p: Place, period: Period, min = MIN_VISITS): number | null => (p[period] >= min ? p[period] : null);

export const filterByType = (places: Place[], type: string): Place[] => (type === 'Todos' ? places : places.filter((p) => p.type === type));

/** Total of the places that may be shown. Hidden ones do not count, so they cannot be guessed. */
export const totalVisits = (places: Place[], period: Period, min = MIN_VISITS): number =>
  places.reduce((n, p) => n + (shownVisits(p, period, min) ?? 0), 0);

/** Share (0..1) of visits that go to the `n` most visited places. Lower means better spread. */
export function topShare(places: Place[], period: Period, n = 2, min = MIN_VISITS): number {
  const vals = places.map((p) => shownVisits(p, period, min)).filter((v): v is number => v !== null).sort((a, b) => b - a);
  const total = vals.reduce((a, b) => a + b, 0);
  return total ? vals.slice(0, n).reduce((a, b) => a + b, 0) / total : 0;
}

/** Places that were below the average before the campaign, with how much they grew (null if hidden before). */
export function underVisited(places: Place[]): { place: Place; growthPct: number | null }[] {
  const avg = totalVisits(places, 'before') / (places.filter((p) => shownVisits(p, 'before') !== null).length || 1);
  return places
    .filter((p) => p.before < avg)
    .map((p) => ({ place: p, growthPct: shownVisits(p, 'before') !== null && shownVisits(p, 'after') !== null ? Math.round(((p.after - p.before) / p.before) * 100) : null }))
    .sort((a, b) => (b.growthPct ?? -1) - (a.growthPct ?? -1));
}

/** Marker radius on the map, proportional to the square root of the visits. */
export const markerRadius = (visits: number | null): number => (visits === null ? 9 : 8 + Math.sqrt(visits) * 0.85);

/** Visits made in this prototype and flagged DEMO, across every child on the device. */
export const demoVisitCount = (profiles: { visits: { demo: boolean }[] }[]): number => profiles.reduce((n, p) => n + p.visits.filter((v) => v.demo).length, 0);
