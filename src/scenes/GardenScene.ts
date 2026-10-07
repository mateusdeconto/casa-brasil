// The garden: animals produce coins; tapping one sends the avatar to collect.
import Phaser from 'phaser';
import { AWAY_SLEEP_MS, MAX_CYCLES } from '../config';
import calibration from '../data/calibration.json';
import { collectAnimal, owns, pendingFor } from '../core/actions';
import { ANIMALS, GARDEN_BLOCKED, GARDEN_START, MANIFEST, animalCell } from '../core/catalog';
import { IsoGrid, type Vec } from '../core/IsoGrid';
import { readyCycles } from '../core/production';
import { AnimalView } from '../game/AnimalView';
import { Avatar } from '../game/Avatar';
import { DEBUG, drawDebugGrid } from '../game/DebugGrid';
import { floatText } from '../game/fx';
import { keepFitted, worldToClient } from '../game/viewport';
import type { SceneCtx } from './RoomScene';

export class GardenScene extends Phaser.Scene {
  grid!: IsoGrid;
  avatar!: Avatar;
  ctx!: SceneCtx & { asleep?: boolean };
  views = new Map<string, AnimalView>();
  private lastInput = 0;
  private busy = false;

  constructor() {
    super('garden');
  }

  init(ctx: SceneCtx & { asleep?: boolean }): void {
    this.ctx = ctx;
  }

  create(): void {
    const cal = calibration.garden;
    const base = MANIFEST.bases.garden;
    this.add.image(0, 0, 'garden').setOrigin(0).setDisplaySize(base.srcW, base.srcH).setDepth(0);
    this.grid = new IsoGrid(cal as never);
    keepFitted(this, cal.view);
    this.views = new Map();
    this.buildAnimals();
    this.avatar = new Avatar(this, this.grid, this.ctx.store.data.avatar, { x: GARDEN_START[0], y: GARDEN_START[1] });
    if (DEBUG) drawDebugGrid(this, this.grid);
    // came back after being away: animals start asleep until the first touch
    this.lastInput = this.ctx.asleep ? 0 : Date.now();

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      this.lastInput = Date.now();
      if (ptr.getDistance() > 12) return;
      const hit = over.find((o) => o.getData('animal'));
      if (hit) return this.tapAnimal(hit.getData('animal'));
      const w = ptr.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const cell = this.grid.cellAt(w.x, w.y);
      if (cell && !this.blocked(cell.x, cell.y) && !this.busy) this.avatar.walkTo(cell, this.blocked);
    });
    const off = this.ctx.bus.on('gardenChanged', () => this.buildAnimals());
    this.events.once('shutdown', off);
    this.time.addEvent({ delay: 250, loop: true, callback: () => this.tick() });
    const animate = (time: number) => this.views.forEach((v) => v.update(time));
    this.events.on('update', animate);
    this.events.once('shutdown', () => this.events.off('update', animate));
    this.tick();
  }

  private buildAnimals(): void {
    this.views.forEach((v) => v.destroy());
    this.views.clear();
    const { store } = this.ctx;
    for (const def of ANIMALS) {
      const look = owns(store, def.id) ? 'owned' : def.exclusive ? 'locked' : 'forSale';
      this.views.set(def.id, new AnimalView(this, this.grid, def, look));
    }
    this.tick();
  }

  blocked = (x: number, y: number): boolean =>
    ANIMALS.some((a) => animalCell(a)[0] === x && animalCell(a)[1] === y) || GARDEN_BLOCKED.some(([bx, by]) => bx === x && by === y);

  private tick(): void {
    const now = Date.now();
    const asleep = document.hidden || now - this.lastInput > AWAY_SLEEP_MS;
    for (const v of this.views.values()) {
      v.setPending(pendingFor(this.ctx.store, v.def.id, now));
      v.setAsleep(asleep);
    }
  }

  private tapAnimal(id: string): void {
    const v = this.views.get(id)!;
    if (v.look !== 'owned') return this.ctx.bus.emit('animalTap', { id, look: v.look });
    const st = this.ctx.store.data.animals.find((a) => a.id === id)!;
    if (!readyCycles(v.def, st, Date.now(), MAX_CYCLES)) {
      const left = Math.ceil(v.def.periodSec - ((Date.now() - st.since) / 1000) % v.def.periodSec);
      return this.ctx.bus.emit('toast', `${v.def.name}: moedas em ${left}s`);
    }
    this.collectFrom(v);
  }

  private nearestSide(cell: [number, number]): Vec | null {
    const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([dx, dy]) => ({ x: cell[0] + dx, y: cell[1] + dy }))
      .filter((c) => this.grid.inside(c.x, c.y) && !this.blocked(c.x, c.y));
    const a = this.avatar.cell;
    sides.sort((p, q) => Math.abs(p.x - a.x) + Math.abs(p.y - a.y) - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y)));
    return sides[0] ?? null;
  }

  private async collectFrom(v: AnimalView): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    const side = this.nearestSide(v.cell);
    if (side) await this.avatar.walkTo(side, this.blocked);
    this.avatar.faceCell({ x: v.cell[0], y: v.cell[1] });
    await this.avatar.playPose('pose_collect', 450);
    const coins = collectAnimal(this.ctx.store, v.def.id);
    if (coins) {
      const top = v.sprite.getTopCenter();
      floatText(this, top.x!, top.y!, `+${coins}`);
      this.ctx.bus.emit('coinsFly', { ...worldToClient(this, top.x!, top.y!), amount: coins });
      this.tick();
      await this.avatar.playPose('pose_celebrate', 600);
    }
    this.busy = false;
  }
}
