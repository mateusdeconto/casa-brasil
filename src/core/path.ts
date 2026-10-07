// Breadth-first search on the floor grid, 4 directions.
import type { Vec } from './IsoGrid';

export function findPath(start: Vec, goal: Vec, size: number, blocked: (x: number, y: number) => boolean): Vec[] | null {
  const key = (p: Vec) => p.y * size + p.x;
  const prev = new Map<number, Vec | null>([[key(start), null]]);
  const queue: Vec[] = [start];
  const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === goal.x && cur.y === goal.y) {
      const path: Vec[] = [];
      for (let p: Vec | null = cur; p; p = prev.get(key(p)) ?? null) path.unshift(p);
      return path.slice(1);
    }
    for (const d of dirs) {
      const n = { x: cur.x + d.x, y: cur.y + d.y };
      if (n.x < 0 || n.y < 0 || n.x >= size || n.y >= size) continue;
      if (prev.has(key(n)) || blocked(n.x, n.y)) continue;
      prev.set(key(n), cur);
      queue.push(n);
    }
  }
  return null;
}
