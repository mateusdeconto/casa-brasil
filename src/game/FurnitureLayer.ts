// Draws placed furniture on the iso floor and answers occupancy questions.
import Phaser from 'phaser';
import { furnitureById, type FurnitureDef } from '../core/catalog';
import { IsoGrid } from '../core/IsoGrid';
import type { PlacedItem } from '../core/state';

/** Place a furniture image so its footprint matches cells (x, y). */
export function placeSprite(img: Phaser.GameObjects.Image, grid: IsoGrid, def: FurnitureDef, x: number, y: number): void {
  const [w, h] = def.size;
  const fp = grid.footprint(x, y, w, h);
  const src = img.texture.getSourceImage();
  const s = (fp.width * def.scale) / src.width;
  img.setOrigin(def.anchor[0], def.anchor[1]);
  img.setScale(s);
  img.setPosition(fp.centerX, fp.front.y);
  img.setDepth(def.floor ? 1 : 10 + IsoGrid.depth(x + w - 1, y + h - 1) * 10);
}

export class FurnitureLayer {
  readonly sprites = new Map<number, Phaser.GameObjects.Image>();

  constructor(private scene: Phaser.Scene, private grid: IsoGrid, private items: () => PlacedItem[]) {}

  refresh(): void {
    const live = new Set<number>();
    for (const it of this.items()) {
      live.add(it.uid);
      const def = furnitureById(it.id);
      let img = this.sprites.get(it.uid);
      if (!img) {
        img = this.scene.add.image(0, 0, def.sprite);
        this.sprites.set(it.uid, img);
      }
      placeSprite(img, this.grid, def, it.x, it.y);
    }
    for (const [uid, img] of this.sprites) {
      if (!live.has(uid)) {
        img.destroy();
        this.sprites.delete(uid);
      }
    }
  }

  /** Placed item covering a cell (ignores floor items unless asked). */
  itemAt(cx: number, cy: number, includeFloor = false): PlacedItem | undefined {
    const hits = this.items().filter((it) => {
      const def = furnitureById(it.id);
      if (def.floor && !includeFloor) return false;
      return cx >= it.x && cy >= it.y && cx < it.x + def.size[0] && cy < it.y + def.size[1];
    });
    return hits[hits.length - 1];
  }

  blocked = (cx: number, cy: number): boolean => {
    const it = this.itemAt(cx, cy);
    return !!it && furnitureById(it.id).blocks;
  };

  bounce(uid: number): void {
    const img = this.sprites.get(uid);
    if (!img) return;
    const sy = img.scaleY;
    this.scene.tweens.add({ targets: img, scaleY: sy * 1.12, scaleX: img.scaleX * 0.94, duration: 110, yoyo: true, ease: 'Quad.easeOut' });
  }
}
