import { describe, expect, it } from 'vitest';
import { PLACES, MIN_VISITS, demoVisitCount, filterByType, markerRadius, shownVisits, topShare, totalVisits, underVisited } from '../src/core/city';

describe('city panel', () => {
  it('hides any place with fewer than 20 visits', () => {
    expect(MIN_VISITS).toBe(20);
    const casa = PLACES.find((p) => p.id === 'casa')!;
    expect(casa.before).toBeLessThan(20);
    expect(shownVisits(casa, 'before')).toBeNull();
    expect(shownVisits(casa, 'after')).toBe(casa.after);
    expect(shownVisits({ ...casa, before: 19 }, 'before')).toBeNull();
    expect(shownVisits({ ...casa, before: 20 }, 'before')).toBe(20);
  });

  it('hidden places are left out of the totals', () => {
    const all = PLACES.reduce((n, p) => n + p.before, 0);
    expect(totalVisits(PLACES, 'before')).toBe(all - 14);
    expect(totalVisits(PLACES, 'after')).toBe(PLACES.reduce((n, p) => n + p.after, 0));
  });

  it('the campaign spreads the visits: the top 2 places hold a smaller share', () => {
    const before = topShare(PLACES, 'before');
    const after = topShare(PLACES, 'after');
    expect(before).toBeGreaterThan(0.75);
    expect(after).toBeLessThan(0.65);
    expect(after).toBeLessThan(before);
  });

  it('lists the under-visited places with their growth, biggest first', () => {
    const list = underVisited(PLACES);
    expect(list.map((x) => x.place.id)).not.toContain('zoo');
    expect(list[0].growthPct).toBeGreaterThan(100);
    expect(list.find((x) => x.place.id === 'casa')!.growthPct).toBeNull(); // hidden before: no percentage
  });

  it('filters by type and keeps "Todos"', () => {
    expect(filterByType(PLACES, 'Todos')).toHaveLength(6);
    expect(filterByType(PLACES, 'Cultura').map((p) => p.id)).toEqual(['biblioteca', 'casa']);
    expect(filterByType(PLACES, 'Museu')).toHaveLength(1);
  });

  it('marker size grows with the visits and hidden ones get a small fixed size', () => {
    expect(markerRadius(400)).toBeGreaterThan(markerRadius(100));
    expect(markerRadius(null)).toBe(9);
  });

  it('counts only the visits flagged DEMO, from every child', () => {
    const profiles = [{ visits: [{ demo: true }, { demo: false }] }, { visits: [{ demo: true }, { demo: true }] }];
    expect(demoVisitCount(profiles)).toBe(3);
    expect(demoVisitCount([])).toBe(0);
  });
});
