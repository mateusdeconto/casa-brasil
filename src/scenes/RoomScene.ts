// The house: background, iso floor, furniture and the walking avatar.
import Phaser from 'phaser';
import calibration from '../data/calibration.json';
import { MANIFEST } from '../core/catalog';
import { IsoGrid } from '../core/IsoGrid';
import type { Emitter, GameEvents } from '../core/events';
import type { Store } from '../core/state';
import { Avatar } from '../game/Avatar';
import { DEBUG, drawDebugGrid } from '../game/DebugGrid';
import { FurnitureLayer } from '../game/FurnitureLayer';
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
  /** When set (shop / edit modes), floor taps go here instead of walking. */
  tapHandler: ((cell: { x: number; y: number } | null, ptr: Phaser.Input.Pointer) => boolean) | null = null;

  constructor() {
    super('room');
  }

  init(ctx: SceneCtx): void {
    this.ctx = ctx;
  }

  create(): void {
    const cal = calibration.room;
    const base = MANIFEST.bases.room;
    this.add.image(0, 0, 'room').setOrigin(0).setDisplaySize(base.srcW, base.srcH).setDepth(0);
    this.grid = new IsoGrid(cal as never);
    keepFitted(this, cal.view);

    this.furniture = new FurnitureLayer(this, this.grid, () => this.ctx.store.data.furniture);
    this.furniture.refresh();
    this.avatar = new Avatar(this, this.grid, this.ctx.store.data.avatar, this.freeStartCell());
    if (DEBUG) drawDebugGrid(this, this.grid);

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (ptr.getDistance() > 12) return; // a drag, not a tap
      const w = ptr.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const cell = this.grid.cellAt(w.x, w.y);
      if (this.tapHandler?.(cell, ptr)) return;
      if (cell && !this.furniture.blocked(cell.x, cell.y)) this.avatar.walkTo(cell, this.furniture.blocked);
    });
    this.events.emit('room-ready');
  }

  private freeStartCell() {
    const n = this.grid.cells;
    for (let y = n - 1; y >= 0; y--) for (let x = n - 1; x >= 0; x--) if (!this.furniture.blocked(x, y)) return { x, y };
    return { x: 0, y: 0 };
  }
}
