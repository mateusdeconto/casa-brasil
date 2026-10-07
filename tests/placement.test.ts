import { describe, expect, it } from 'vitest';
import { canPlace, firstFreeSpot } from '../src/core/placement';

const defs: Record<string, { size: [number, number]; floor?: boolean; blocks: boolean }> = {
  table: { size: [1, 2], blocks: true },
  bed: { size: [2, 2], blocks: true },
  rug: { size: [2, 2], floor: true, blocks: false },
  lamp: { size: [1, 1], blocks: true },
};
const base = { gridSize: 4, defOf: (id: string) => defs[id], items: [{ uid: 1, id: 'table', x: 0, y: 2 }] };

describe('canPlace', () => {
  it('rejects items leaving the floor', () => {
    expect(canPlace({ ...base, def: defs.bed, x: 3, y: 0 })).toBe(false);
    expect(canPlace({ ...base, def: defs.bed, x: 0, y: -1 })).toBe(false);
    expect(canPlace({ ...base, def: defs.bed, x: 2, y: 2 })).toBe(true);
  });

  it('rejects overlap with furniture', () => {
    expect(canPlace({ ...base, def: defs.lamp, x: 0, y: 3 })).toBe(false);
    expect(canPlace({ ...base, def: defs.bed, x: 0, y: 1 })).toBe(false);
    expect(canPlace({ ...base, def: defs.lamp, x: 1, y: 3 })).toBe(true);
  });

  it('lets rugs sit under furniture but not on other rugs', () => {
    expect(canPlace({ ...base, def: defs.rug, x: 0, y: 2 })).toBe(true);
    const withRug = { ...base, items: [...base.items, { uid: 2, id: 'rug', x: 1, y: 1 }] };
    expect(canPlace({ ...withRug, def: defs.rug, x: 2, y: 2 })).toBe(false);
    expect(canPlace({ ...withRug, def: defs.lamp, x: 1, y: 1 })).toBe(true);
  });

  it('ignores the item being moved and respects reserved cells', () => {
    expect(canPlace({ ...base, def: defs.table, x: 0, y: 1, ignoreUid: 1 })).toBe(true);
    expect(canPlace({ ...base, def: defs.lamp, x: 3, y: 3, reserved: [{ x: 3, y: 3 }] })).toBe(false);
    expect(canPlace({ ...base, def: defs.rug, x: 2, y: 2, reserved: [{ x: 3, y: 3 }] })).toBe(true);
  });

  it('finds a free spot', () => {
    const spot = firstFreeSpot({ ...base, def: defs.bed })!;
    expect(canPlace({ ...base, def: defs.bed, ...spot })).toBe(true);
  });
});
