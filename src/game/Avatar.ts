// Player avatar on an iso floor: walking by BFS, facing, breathing, poses.
import Phaser from 'phaser';
import { AVATAR_HEIGHT_CELLS, WALK_MS_PER_CELL } from '../config';
import { IsoGrid, type Vec } from '../core/IsoGrid';
import { findPath } from '../core/path';

const FULL_SET = 'avatar_1'; // the only avatar with walk/back/collect frames

export class Avatar {
  readonly cell: Vec;
  private pos: Vec; // fractional grid position of the feet
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private height: number;
  private flip = false;
  private back = false;
  private walking = false;
  private pose: string | null = null;
  private breath = 0;

  constructor(private scene: Phaser.Scene, private grid: IsoGrid, private id: string, start: Vec) {
    this.cell = { ...start };
    this.pos = { x: start.x + 0.5, y: start.y + 0.5 };
    this.height = grid.cellWidth * AVATAR_HEIGHT_CELLS;
    const cw = grid.cellWidth;
    this.shadow = scene.add.ellipse(0, 0, cw * 0.42, cw * 0.16, 0x000000, 0.28);
    this.sprite = scene.add.image(0, 0, this.textureFor(0)).setOrigin(0.5, 0.98);
    scene.tweens.add({ targets: this, breath: 1, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', () => scene.events.off('update', this.update, this));
  }

  get full(): boolean {
    return this.id === FULL_SET;
  }

  setAvatar(id: string): void {
    this.id = id;
  }

  /** Pose for a moment ('pose_collect', 'pose_celebrate'); only the full set has them. */
  playPose(key: string, ms: number): Promise<void> {
    return new Promise((done) => {
      this.pose = this.full ? key : null;
      this.scene.time.delayedCall(ms, () => {
        this.pose = null;
        done();
      });
    });
  }

  walkTo(goal: Vec, blocked: (x: number, y: number) => boolean): Promise<boolean> {
    const path = findPath(this.cell, goal, this.grid.cells, blocked);
    if (!path) return Promise.resolve(false);
    if (!path.length) return Promise.resolve(true);
    this.scene.tweens.killTweensOf(this.pos);
    this.walking = true;
    const steps = path.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5 }));
    return new Promise((done) => {
      const next = (i: number) => {
        if (i >= steps.length) {
          this.walking = false;
          return done(true);
        }
        const t = steps[i];
        const dx = t.x - this.pos.x;
        const dy = t.y - this.pos.y;
        this.back = dx < 0 || dy < 0;
        // +x and -y read as "toward screen right"; mirror the others
        this.flip = dy > 0 || dx < 0;
        this.scene.tweens.add({
          targets: this.pos, x: t.x, y: t.y, duration: WALK_MS_PER_CELL,
          onComplete: () => {
            this.cell.x = Math.floor(t.x);
            this.cell.y = Math.floor(t.y);
            next(i + 1);
          },
        });
      };
      next(0);
    });
  }

  /** Face toward a cell without moving. */
  faceCell(c: Vec): void {
    const dx = c.x + 0.5 - this.pos.x;
    const dy = c.y + 0.5 - this.pos.y;
    this.back = dx < 0 || dy < 0;
    this.flip = dy > 0 || dx < 0;
  }

  private textureFor(time: number): string {
    if (!this.full) return this.id;
    if (this.pose) return this.pose;
    if (this.back) return 'avatar_back';
    if (!this.walking) return 'pose_idle';
    return ['pose_walk1', 'pose_walk2', 'pose_walk3', 'pose_walk2'][Math.floor(time / 130) % 4];
  }

  /** Scale so that a standing frame of this sheet is `height` tall. */
  private scaleFor(key: string): number {
    const ref = key.startsWith('pose_') ? 'pose_idle' : key;
    return this.height / this.scene.textures.get(ref).getSourceImage().height;
  }

  private update(time: number): void {
    const p = this.grid.toWorld(this.pos.x, this.pos.y);
    const key = this.textureFor(time);
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
    const s = this.scaleFor(key);
    const bob = this.walking && (!this.full || this.back) ? -Math.abs(Math.sin(time / 110)) * this.height * 0.025 : 0;
    const breathe = this.walking ? 0 : this.breath * 0.012;
    this.sprite.setPosition(p.x, p.y + bob);
    this.sprite.setScale(s * (this.flip ? -1 : 1), s * (1 + breathe));
    this.shadow.setPosition(p.x, p.y);
    const depth = 10 + (IsoGrid.depth(this.pos.x - 0.5, this.pos.y - 0.5) + 0.5) * 10;
    this.sprite.setDepth(depth);
    this.shadow.setDepth(depth - 0.1);
  }

  get worldTop(): Vec {
    const p = this.grid.toWorld(this.pos.x, this.pos.y);
    return { x: p.x, y: p.y - this.height };
  }
}
