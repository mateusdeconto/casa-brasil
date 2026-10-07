import { describe, expect, it } from 'vitest';
import { IsoGrid } from '../src/core/IsoGrid';

const grid = new IsoGrid({ cells: 4, back: [562, 655], right: [1100, 940], left: [25, 940] });

describe('IsoGrid', () => {
  it('maps the calibration corners', () => {
    expect(grid.toWorld(0, 0)).toEqual({ x: 562, y: 655 });
    expect(grid.toWorld(4, 0)).toEqual({ x: 1100, y: 940 });
    expect(grid.toWorld(0, 4)).toEqual({ x: 25, y: 940 });
  });

  it('round-trips grid -> world -> grid', () => {
    for (const [gx, gy] of [[0, 0], [1.5, 2.25], [3.9, 0.1], [2, 4]]) {
      const w = grid.toWorld(gx, gy);
      const g = grid.toGrid(w.x, w.y);
      expect(g.x).toBeCloseTo(gx, 9);
      expect(g.y).toBeCloseTo(gy, 9);
    }
  });

  it('finds the cell under a cell centre and rejects points off the floor', () => {
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
      const c = grid.cellCenter(x, y);
      expect(grid.cellAt(c.x, c.y)).toEqual({ x, y });
    }
    expect(grid.cellAt(0, 0)).toBeNull();
    expect(grid.cellAt(562, 600)).toBeNull();
  });

  it('orders depth by the front cell', () => {
    expect(IsoGrid.depth(3, 3)).toBeGreaterThan(IsoGrid.depth(2, 3));
  });
});
