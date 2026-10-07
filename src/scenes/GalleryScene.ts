// The gallery wing: the museum floor where exhibits (fossils, dinosaurs, paintings) are put on display.
// Only the part of the floor already built is open; the rest is shaded.
import Phaser from 'phaser';
import { galleryBounds } from '../core/gallery';
import { RoomScene } from './RoomScene';

const SHADE = 0x1c1730;
const SHADE_ALPHA = 0.62;

export class GalleryScene extends RoomScene {
  private shade!: Phaser.GameObjects.Graphics;

  constructor() {
    super('gallery', 'gallery');
  }

  get bounds(): number {
    return galleryBounds(this.ctx.store.data);
  }

  create(): void {
    super.create();
    this.shade = this.add.graphics().setDepth(4);
    this.drawShade();
    const off = this.ctx.bus.on('galleryBuilt', () => {
      this.drawShade();
      this.furniture.refresh();
    });
    this.events.once('shutdown', off);
  }

  /** Dark diamonds over every cell that is not built yet. */
  private drawShade(): void {
    const n = this.grid.cells;
    const open = this.bounds;
    this.shade.clear().fillStyle(SHADE, SHADE_ALPHA);
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        if (x < open && y < open) continue;
        const a = this.grid.toWorld(x, y), b = this.grid.toWorld(x + 1, y), c = this.grid.toWorld(x + 1, y + 1), d = this.grid.toWorld(x, y + 1);
        this.shade.fillPoints([a, b, c, d], true);
      }
    }
  }
}
