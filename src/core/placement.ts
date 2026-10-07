// Pure placement rules: stay on the floor, no overlap within the same layer.
import type { FurnitureDef } from './catalog';
import type { PlacedItem } from './state';

export interface PlaceQuery {
  def: Pick<FurnitureDef, 'size' | 'floor' | 'blocks'>;
  x: number;
  y: number;
  gridSize: number;
  items: PlacedItem[];
  defOf: (id: string) => Pick<FurnitureDef, 'size' | 'floor'>;
  ignoreUid?: number;
  /** cells that must stay free for blocking items (e.g. where the avatar stands) */
  reserved?: { x: number; y: number }[];
}

export function cellsOf(x: number, y: number, size: [number, number]): { x: number; y: number }[] {
  const out = [];
  for (let i = 0; i < size[0]; i++) for (let j = 0; j < size[1]; j++) out.push({ x: x + i, y: y + j });
  return out;
}

export function canPlace(q: PlaceQuery): boolean {
  const cells = cellsOf(q.x, q.y, q.def.size);
  if (cells.some((c) => c.x < 0 || c.y < 0 || c.x >= q.gridSize || c.y >= q.gridSize)) return false;
  const taken = new Set<string>();
  for (const it of q.items) {
    if (it.uid === q.ignoreUid) continue;
    const d = q.defOf(it.id);
    if (!!d.floor !== !!q.def.floor) continue; // rugs sit under furniture
    for (const c of cellsOf(it.x, it.y, d.size)) taken.add(`${c.x},${c.y}`);
  }
  if (q.def.blocks) for (const c of q.reserved ?? []) taken.add(`${c.x},${c.y}`);
  return cells.every((c) => !taken.has(`${c.x},${c.y}`));
}

/** First valid cell scanning from the front of the room. */
export function firstFreeSpot(q: Omit<PlaceQuery, 'x' | 'y'>): { x: number; y: number } | null {
  for (let s = 2 * q.gridSize; s >= 0; s--) {
    for (let x = 0; x < q.gridSize; x++) {
      const y = s - x;
      if (y >= 0 && y < q.gridSize && canPlace({ ...q, x, y })) return { x, y };
    }
  }
  return null;
}
