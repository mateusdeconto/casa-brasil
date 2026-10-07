// The house: background, iso floor, furniture and the walking avatar. GalleryScene reuses it for the gallery wing.
import Phaser from 'phaser';
import calibration from '../data/calibration.json';
import { MANIFEST } from '../core/catalog';
import { IsoGrid } from '../core/IsoGrid';
import type { Emitter, GameEvents } from '../core/events';
import type { PlacedItem, Store } from '../core/state';
import { Avatar } from '../game/Avatar';
import { DEBUG, drawDebugGrid } from '../game/DebugGrid';
import { Editor } from '../game/Editor';
import { FurnitureLayer } from '../game/FurnitureLayer';
import { loadGroup } from '../game/assets';
import { keepFitted } from '../game/viewport';

export interface SceneCtx {
  bus: Emitter<GameEvents>;
  store: Store;
}

export class RoomScene extends Phaser.Scene {
  grid!: IsoGrid;
  avatar!: Avatar;
  furniture!: FurnitureLayer;
  ctx!: SceneCtx;
  editor!: Editor;
  /** When set (shop / edit modes), floor taps go here instead of walking. */
  tapHandler: ((cell: { x: number; y: number } | null, ptr: Phaser.Input.Pointer) => boolean) | null = null;

  constructor(key = 'room', protected readonly place: 'room' | 'gallery' = 'room') {
    super(key);
  }

  /** The list of pieces this room shows (the house furniture, or the gallery pieces). */
  get items(): PlacedItem[] {
    return this.place === 'room' ? this.ctx.store.data.furniture : this.ctx.store.data.gallery;
  }

  /** Cells per side that are open for placing and walking. */
  get bounds(): number {
    return this.grid.cells;
  }

  /** Walking and path planning: blocked by furniture or outside the open floor. */
  walkBlocked = (x: number, y: number): boolean => x >= this.bounds || y >= this.bounds || this.furniture.blocked(x, y);

  init(ctx: SceneCtx): void {
    this.ctx = ctx;
  }

  preload(): void {
    loadGroup(this, this.place);
  }

  create(): void {
    this.cameras.main.fadeIn(220, 28, 23, 48);
    const cal = calibration[this.place];
    const base = MANIFEST.bases[this.place];
    this.add.image(0, 0, this.place).setOrigin(0).setDisplaySize(base.srcW, base.srcH).setDepth(0);
    this.grid = new IsoGrid(cal as never);
    keepFitted(this, cal.view);

    this.furniture = new FurnitureLayer(this, this.grid, () => this.items);
    this.furniture.refresh();
    this.avatar = new Avatar(this, this.grid, this.ctx.store.data.avatar, this.freeStartCell());
    if (DEBUG) drawDebugGrid(this, this.grid);

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (ptr.getDistance() > 12) return; // a drag, not a tap
      const w = ptr.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const cell = this.grid.cellAt(w.x, w.y);
      if (this.tapHandler?.(cell, ptr)) return;
      const piece = over.find((o) => o.getData('piece'));
      if (piece) return this.ctx.bus.emit('pieceTap', { id: piece.getData('piece') as string });
      if (cell && !this.walkBlocked(cell.x, cell.y)) {
        this.avatar.walkTo(cell, this.walkBlocked);
        this.ctx.bus.emit('walked', undefined);
      }
    });
    this.editor = new Editor(this);
    this.events.emit('room-ready');
  }

  private freeStartCell() {
    const n = this.bounds;
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) if (!this.walkBlocked(x, y)) return { x, y };
    return { x: 0, y: 0 };
  }
}

