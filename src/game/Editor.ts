// Shop placement (ghost) and edit mode (select, drag, sell) for the room.
import Phaser from 'phaser';
import { COLORS, SELL_RATIO } from '../config';
import { furnitureById, type FurnitureDef } from '../core/catalog';
import type { EditorState } from '../core/events';
import type { Vec } from '../core/IsoGrid';
import { canPlace, firstFreeSpot } from '../core/placement';
import type { PlacedItem } from '../core/state';
import type { RoomScene } from '../scenes/RoomScene';
import { placeSprite } from './FurnitureLayer';
import { floatText } from './fx';

export type EditorMode = EditorState['mode'];

export class Editor {
  mode: EditorMode = 'none';
  private def: FurnitureDef | null = null;
  private pos: Vec = { x: 0, y: 0 };
  private ghost: Phaser.GameObjects.Image | null = null;
  private selected: PlacedItem | null = null;
  private drag: { grab: Vec; moved: boolean } | null = null;

  constructor(private room: RoomScene) {
    const input = room.input;
    input.on('pointerdown', this.onDown, this);
    input.on('pointermove', this.onMove, this);
    input.on('pointerup', this.onUp, this);
    room.tapHandler = (cell) => this.onTap(cell);
  }

  private get store() {
    return this.room.ctx.store;
  }

  private query(def: FurnitureDef, ignoreUid?: number) {
    return {
      def, gridSize: this.room.grid.cells, items: this.store.data.furniture,
      defOf: furnitureById, ignoreUid, reserved: [this.room.avatar.cell],
    };
  }

  private valid(): boolean {
    return !!this.def && canPlace({ ...this.query(this.def, this.selected?.uid), ...this.pos });
  }

  private emit(): void {
    const d = this.def;
    const price = this.mode === 'edit' && d ? Math.floor(d.price * SELL_RATIO) : d?.price;
    this.room.ctx.bus.emit('editor', { mode: this.mode, valid: this.valid(), name: d?.name, price, selected: !!this.selected });
  }

  startPlace(id: string): void {
    this.exit();
    this.mode = 'place';
    this.def = furnitureById(id);
    this.pos = firstFreeSpot(this.query(this.def)) ?? { x: 0, y: 0 };
    this.ghost = this.room.add.image(0, 0, this.def.sprite);
    this.drawGhost();
  }

  startEdit(): void {
    this.exit();
    this.mode = 'edit';
    this.emit();
  }

  exit(): void {
    this.revertSelected();
    this.ghost?.destroy();
    this.ghost = null;
    this.def = null;
    this.selected = null;
    this.drag = null;
    this.mode = 'none';
    this.emit();
  }

  confirm(): void {
    if (this.mode !== 'place' || !this.def || !this.valid()) return;
    const { store, bus } = this.room.ctx;
    if (store.data.coins < this.def.price) return bus.emit('toast', 'Moedas insuficientes');
    const item = { uid: store.nextUid(), id: this.def.id, ...this.pos };
    store.data.furniture.push(item);
    store.addCoins(-this.def.price);
    this.room.furniture.refresh();
    this.room.furniture.bounce(item.uid);
    const top = this.ghost!.getTopCenter();
    if (this.def.price) floatText(this.room, top.x!, top.y!, `-${this.def.price}`);
    this.exit();
  }

  sell(): void {
    const it = this.selected;
    if (!it) return;
    const value = Math.floor(furnitureById(it.id).price * SELL_RATIO);
    const img = this.room.furniture.sprites.get(it.uid)!;
    const top = img.getTopCenter();
    const { store } = this.room.ctx;
    store.data.furniture = store.data.furniture.filter((f) => f !== it);
    this.selected = null;
    this.def = null;
    store.addCoins(value);
    this.room.furniture.refresh();
    floatText(this.room, top.x!, top.y!, `+${value}`);
    this.emit();
  }

  private drawGhost(): void {
    if (!this.ghost || !this.def) return;
    placeSprite(this.ghost, this.room.grid, this.def, this.pos.x, this.pos.y);
    const ok = this.valid();
    this.ghost.setDepth(9000).setAlpha(COLORS.ghostAlpha).setTint(ok ? COLORS.valid : COLORS.invalid);
    this.emit();
  }

  private moveTo(cell: Vec): void {
    const [w, h] = this.def!.size;
    const n = this.room.grid.cells;
    this.pos = { x: Math.min(Math.max(cell.x, 0), n - w), y: Math.min(Math.max(cell.y, 0), n - h) };
  }

  private onTap(cell: Vec | null): boolean {
    if (this.mode === 'none') return false;
    if (!cell) return true;
    if (this.mode === 'place') {
      if (cell.x === this.pos.x && cell.y === this.pos.y && this.valid()) this.confirm();
      else {
        this.moveTo(cell);
        this.drawGhost();
      }
      return true;
    }
    if (!this.drag?.moved) this.select(this.room.furniture.itemAt(cell.x, cell.y) ?? this.room.furniture.itemAt(cell.x, cell.y, true));
    return true;
  }

  private select(it: PlacedItem | undefined): void {
    this.revertSelected();
    this.selected = it ?? null;
    this.def = it ? furnitureById(it.id) : null;
    if (it) {
      this.pos = { x: it.x, y: it.y };
      this.room.furniture.sprites.get(it.uid)?.setTint(0xffe2a0);
      this.room.furniture.bounce(it.uid);
    }
    this.emit();
  }

  private revertSelected(): void {
    const it = this.selected;
    if (!it) return;
    const img = this.room.furniture.sprites.get(it.uid);
    if (img) {
      img.clearTint().setAlpha(1);
      placeSprite(img, this.room.grid, furnitureById(it.id), it.x, it.y);
    }
  }

  private cellOf(ptr: Phaser.Input.Pointer): Vec | null {
    const w = ptr.positionToCamera(this.room.cameras.main) as Phaser.Math.Vector2;
    const g = this.room.grid.toGrid(w.x, w.y);
    return { x: Math.floor(g.x), y: Math.floor(g.y) };
  }

  private onDown(ptr: Phaser.Input.Pointer): void {
    const c = this.cellOf(ptr);
    if (!c) return;
    if (this.mode === 'place') this.drag = { grab: { x: 0, y: 0 }, moved: false };
    const it = this.selected;
    if (this.mode === 'edit' && it && this.room.furniture.itemAt(c.x, c.y, true) === it) {
      this.drag = { grab: { x: c.x - it.x, y: c.y - it.y }, moved: false };
    }
  }

  private onMove(ptr: Phaser.Input.Pointer): void {
    if (!this.drag || !ptr.isDown || ptr.getDistance() < 12) return;
    const c = this.cellOf(ptr)!;
    this.drag.moved = true;
    this.moveTo({ x: c.x - this.drag.grab.x, y: c.y - this.drag.grab.y });
    if (this.mode === 'place') return this.drawGhost();
    const img = this.room.furniture.sprites.get(this.selected!.uid)!;
    placeSprite(img, this.room.grid, this.def!, this.pos.x, this.pos.y);
    img.setDepth(9000).setAlpha(COLORS.ghostAlpha).setTint(this.valid() ? COLORS.valid : COLORS.invalid);
  }

  private onUp(): void {
    const d = this.drag;
    this.drag = null;
    if (!d?.moved || this.mode !== 'edit' || !this.selected) return;
    const it = this.selected;
    if (this.valid()) {
      it.x = this.pos.x;
      it.y = this.pos.y;
      this.room.ctx.store.commit();
    }
    this.revertSelected();
    this.room.furniture.sprites.get(it.uid)?.setTint(0xffe2a0);
    this.room.furniture.bounce(it.uid);
    this.emit();
  }
}
