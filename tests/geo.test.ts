import { describe, expect, it } from 'vitest';
import { haversineM, isWithin } from '../src/core/geo';
import { fitSize } from '../src/core/photos';

describe('haversine', () => {
  it('is zero for the same point', () => {
    expect(haversineM({ lat: -23.5, lng: -46.6 }, { lat: -23.5, lng: -46.6 })).toBe(0);
  });

  it('matches a known distance (Sao Paulo to Rio is about 357 km)', () => {
    const km = haversineM({ lat: -23.5505, lng: -46.6333 }, { lat: -22.9068, lng: -43.1729 }) / 1000;
    expect(km).toBeGreaterThan(352);
    expect(km).toBeLessThan(362);
  });

  it('one degree of latitude is about 111 km', () => {
    expect(haversineM({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -2);
  });

  it('respects the 200 m radius edge', () => {
    const p = { lat: -23.6513, lng: -46.6208 };
    const near = { lat: p.lat + 0.0017, lng: p.lng }; // ~189 m
    const far = { lat: p.lat + 0.0023, lng: p.lng }; // ~256 m
    expect(isWithin(near, p, 200)).toBe(true);
    expect(isWithin(far, p, 200)).toBe(false);
  });
});

describe('photo sizing', () => {
  it('shrinks the longest side to 960 and keeps the ratio', () => {
    expect(fitSize(4000, 3000)).toEqual({ w: 960, h: 720 });
    expect(fitSize(3000, 4000)).toEqual({ w: 720, h: 960 });
  });

  it('never enlarges small photos', () => {
    expect(fitSize(640, 480)).toEqual({ w: 640, h: 480 });
  });
});
