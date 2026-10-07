import { describe, expect, it } from 'vitest';
import { NEARBY_ORIGIN, NEARBY_PLACES, distanceLabel, nearbyRows, routeUrl, walkLabel, walkMinutes } from '../src/core/nearby';

describe('nearby places', () => {
  it('lists the nearest place first and does not reorder the source list', () => {
    const before = NEARBY_PLACES.map((p) => p.id);
    const rows = nearbyRows(NEARBY_ORIGIN);
    expect(rows[0].place.id).toBe('masp');
    expect(rows.map((r) => r.meters)).toEqual([...rows.map((r) => r.meters)].sort((a, b) => a - b));
    expect(NEARBY_PLACES.map((p) => p.id)).toEqual(before);
  });

  it('keeps every place within a walkable area of the origin', () => {
    for (const r of nearbyRows(NEARBY_ORIGIN)) expect(r.meters).toBeLessThan(3000);
  });

  it('formats metres and kilometres in Portuguese', () => {
    expect(distanceLabel(347)).toBe('350 m');
    expect(distanceLabel(1432)).toBe('1,4 km');
    expect(walkMinutes(10)).toBe(1);
    expect(walkLabel(800)).toBe('800 m · 10 min a pé');
  });

  it('builds a walking route link', () => {
    const url = routeUrl({ lat: 1, lng: 2 }, { lat: 3, lng: 4 });
    expect(url).toContain('origin=1,2');
    expect(url).toContain('destination=3,4');
    expect(url).toContain('travelmode=walking');
  });
});
