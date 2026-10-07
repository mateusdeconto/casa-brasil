import { describe, expect, it } from 'vitest';
import { furnitureById } from '../src/core/catalog';
import { buildDemoRoot, nextSaturday } from '../src/core/demo';
import { normalizeRoot } from '../src/core/migrate';
import { canPlace, cellsOf } from '../src/core/placement';
import { parseDayKey } from '../src/core/dates';

const NOW = new Date(2026, 9, 7, 12).getTime(); // Wednesday

describe('demonstration data', () => {
  const root = buildDemoRoot(NOW);
  const ana = root.profiles[0];

  it('is a family of 2 children with Ana active', () => {
    expect(root.profiles.map((p) => p.name)).toEqual(['Ana', 'Leo']);
    expect(root.activeId).toBe('p1');
    expect(root.settings.tutorialDone).toBe(true);
  });

  it('has 4 animals, 2 album visits flagged DEMO with photos, 3 of 6 stamps', () => {
    expect(ana.animals).toHaveLength(4);
    expect(ana.visits).toHaveLength(2);
    expect(ana.visits.every((v) => v.demo && v.hasPhoto)).toBe(true);
    expect(new Set(ana.visits.map((v) => v.id)).size).toBe(2);
    expect(ana.stamps).toHaveLength(3);
  });

  it('plans an outing for the coming Saturday and publishes one school expedition', () => {
    expect(ana.outings).toHaveLength(1);
    expect(parseDayKey(ana.outings[0].day).getDay()).toBe(6);
    expect(ana.outings[0].day).toBe(nextSaturday(NOW));
    expect(root.school.expeditions).toHaveLength(1);
  });

  it('the house is decorated without overlapping furniture', () => {
    expect(ana.furniture.length).toBeGreaterThanOrEqual(8);
    const placed: typeof ana.furniture = [];
    for (const it of ana.furniture) {
      const def = furnitureById(it.id);
      expect(canPlace({ def, x: it.x, y: it.y, gridSize: 4, items: placed, defOf: furnitureById })).toBe(true);
      placed.push(it);
      expect(cellsOf(it.x, it.y, def.size).every((c) => c.x < 4 && c.y < 4)).toBe(true);
    }
  });

  it('survives normalizeRoot unchanged (a valid v2 save)', () => {
    expect(normalizeRoot(JSON.parse(JSON.stringify(root)), NOW)).toEqual(root);
  });

  it('nextSaturday is today when today is Saturday', () => {
    const sat = new Date(2026, 9, 10, 9).getTime();
    expect(nextSaturday(sat)).toBe('2026-10-10');
    expect(nextSaturday(NOW)).toBe('2026-10-10');
  });
});
