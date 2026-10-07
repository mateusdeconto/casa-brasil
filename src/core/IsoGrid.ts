// Isometric grid <-> world conversion and depth ordering.
// Grid x runs from the back corner toward the right corner, grid y toward the left corner.

export type Vec = { x: number; y: number };

export interface GridCalibration {
  cells: number;
  back: [number, number];
  right: [number, number];
  left: [number, number];
}

export class IsoGrid {
  readonly cells: number;
  private o: Vec;
  private ex: Vec;
  private ey: Vec;
  private det: number;

  constructor(cal: GridCalibration) {
    this.cells = cal.cells;
    const [bx, by] = cal.back;
    this.o = { x: bx, y: by };
    this.ex = { x: (cal.right[0] - bx) / cal.cells, y: (cal.right[1] - by) / cal.cells };
    this.ey = { x: (cal.left[0] - bx) / cal.cells, y: (cal.left[1] - by) / cal.cells };
    this.det = this.ex.x * this.ey.y - this.ex.y * this.ey.x;
  }

  /** Fractional grid coordinates -> world point (cell corner at integers). */
  toWorld(gx: number, gy: number): Vec {
    return { x: this.o.x + gx * this.ex.x + gy * this.ey.x, y: this.o.y + gx * this.ex.y + gy * this.ey.y };
  }

  /** World point -> fractional grid coordinates. */
  toGrid(wx: number, wy: number): Vec {
    const dx = wx - this.o.x;
    const dy = wy - this.o.y;
    return { x: (dx * this.ey.y - dy * this.ey.x) / this.det, y: (this.ex.x * dy - this.ex.y * dx) / this.det };
  }

  /** World point -> integer cell, or null when off the floor. */
  cellAt(wx: number, wy: number): Vec | null {
    const g = this.toGrid(wx, wy);
    const c = { x: Math.floor(g.x), y: Math.floor(g.y) };
    return this.inside(c.x, c.y) ? c : null;
  }

  inside(cx: number, cy: number): boolean {
    return cx >= 0 && cy >= 0 && cx < this.cells && cy < this.cells;
  }

  cellCenter(cx: number, cy: number): Vec {
    return this.toWorld(cx + 0.5, cy + 0.5);
  }

  /** Screen width of one cell (left corner to right corner). */
  get cellWidth(): number {
    return Math.abs(this.ex.x - this.ey.x);
  }

  /** Footprint of a w x h block at cell (cx, cy): corners and horizontal center. */
  footprint(cx: number, cy: number, w: number, h: number) {
    const left = this.toWorld(cx, cy + h);
    const right = this.toWorld(cx + w, cy);
    const front = this.toWorld(cx + w, cy + h);
    const back = this.toWorld(cx, cy);
    return { left, right, front, back, width: right.x - left.x, centerX: (left.x + right.x) / 2 };
  }

  /** Depth key: x + y of the frontmost cell. Fractional for moving actors. */
  static depth(frontX: number, frontY: number): number {
    return frontX + frontY;
  }
}
