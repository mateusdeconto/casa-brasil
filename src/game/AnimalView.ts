// One garden animal: idle frames, sleeping with code-drawn "zzz", coin bubble, sale/locked looks.
import Phaser from 'phaser';
import { animalCell, type AnimalDef } from '../core/catalog';
import { IsoGrid } from '../core/IsoGrid';

/** keeps the coin bubble of animals near the right fence inside the garden picture */
const BUBBLE_MAX_X = 1000;

export type AnimalLook = 'owned' | 'forSale' | 'locked';

export class AnimalView {
  readonly sprite: Phaser.GameObjects.Image;
  private bubble: Phaser.GameObjects.Container;
  private bubbleText: Phaser.GameObjects.Text;
  private extras: Phaser.GameObjects.GameObject[] = [];
  private asleep = false;
  private zzzTimer = 0;
  private base: { x: number; y: number };
  private scale: number;

  constructor(private scene: Phaser.Scene, grid: IsoGrid, readonly def: AnimalDef, readonly look: AnimalLook) {
    const [cx, cy] = animalCell(def);
    const p = grid.toWorld(def.at[0], def.at[1]);
    this.base = { x: p.x, y: p.y - def.lift };
    const key = look === 'locked' ? 'jaguar_silhouette' : this.frame('idle1');
    this.sprite = scene.add.image(this.base.x, this.base.y, key).setOrigin(0.5, 0.88);
    this.scale = (grid.cellWidth * def.width) / this.sprite.width;
    this.sprite.setScale(this.scale).setDepth(10 + (IsoGrid.depth(cx, cy) + 0.4) * 10);
    this.sprite.setData('animal', def.id).setInteractive({ useHandCursor: true });

    const top = this.top();
    const font = { fontFamily: '"Fredoka", sans-serif', fontStyle: 'bold', color: '#3a2414' };
    if (look === 'forSale') {
      // clean look: the animal in its real colors (no tint), the price tag says it is for sale
      this.sprite.setAlpha(0.92);
      this.extras.push(this.tag(String(def.price), top.y));
    }
    if (look === 'locked') {
      this.extras.push(scene.add.image(this.base.x, this.base.y - this.sprite.displayHeight * 0.45, 'lock').setScale(0.55).setDepth(this.sprite.depth + 1));
    }
    const img = scene.add.image(0, 0, 'coin_bubble').setScale(0.75);
    this.bubbleText = scene.add
      .text(img.displayWidth / 2 - 10, -8, '', { ...font, fontSize: '50px', color: '#ffc36b', stroke: '#33231a', strokeThickness: 10 })
      .setOrigin(0, 0.5);
    this.bubble = scene.add.container(Math.min(top.x + 60, BUBBLE_MAX_X), top.y - 70, [img, this.bubbleText]).setDepth(9000).setVisible(false);
    img.setInteractive({ useHandCursor: true }).setData('animal', def.id);
    scene.tweens.add({ targets: this.bubble, y: this.bubble.y - 14, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get cell(): [number, number] {
    return animalCell(this.def);
  }

  private frame(kind: 'idle1' | 'idle2' | 'sleep'): string {
    const key = `${this.def.id}_${kind}`;
    return this.scene.textures.exists(key) ? key : this.def.id;
  }

  private top() {
    return { x: this.base.x, y: this.base.y - this.sprite.displayHeight * 0.88 };
  }

  private tag(text: string, y: number) {
    const label = this.scene.add
      .text(18, 0, text, { fontFamily: '"Fredoka", sans-serif', fontSize: '46px', color: '#ffc36b', backgroundColor: '#2a2233', padding: { left: 44, right: 14, y: 6 } })
      .setOrigin(0.5);
    const coin = this.scene.add.image(label.x - label.width / 2 + 26, 0, 'coin').setScale(0.2);
    return this.scene.add.container(this.base.x, y - 20, [label, coin]).setDepth(9000);
  }

  setPending(coins: number): void {
    this.bubble.setVisible(this.look === 'owned' && coins > 0);
    this.bubbleText.setText(`+${coins}`);
  }

  setAsleep(asleep: boolean): void {
    this.asleep = asleep && this.look === 'owned';
  }

  update(time: number): void {
    if (this.look !== 'owned') return;
    const frame = this.asleep ? 'sleep' : Math.floor(time / 700) % 2 ? 'idle2' : 'idle1';
    const key = this.frame(frame);
    if (this.sprite.texture.key !== key) this.sprite.setTexture(key);
    const breathe = this.asleep ? Math.sin(time / 600) * 0.02 : Math.sin(time / 350) * 0.012;
    this.sprite.setScale(this.scale, this.scale * (1 + breathe));
    this.sprite.y = this.base.y - (this.asleep ? 0 : Math.abs(Math.sin(time / 350)) * 4);
    if (this.asleep && time - this.zzzTimer > 900) {
      this.zzzTimer = time;
      this.zzz();
    }
  }

  /** A small "z" that drifts up and fades: drawn in code, not from the art. */
  private zzz(): void {
    const t = this.top();
    const z = this.scene.add
      .text(t.x + 40, t.y + 30, 'z', { fontFamily: '"Fredoka", sans-serif', fontSize: '52px', fontStyle: 'bold', color: '#f1ddb0', stroke: '#2a2233', strokeThickness: 8 })
      .setDepth(9000)
      .setAlpha(0);
    this.scene.tweens.add({ targets: z, x: t.x + 110, y: t.y - 90, alpha: { from: 1, to: 0 }, scale: { from: 0.6, to: 1.3 }, duration: 1800, onComplete: () => z.destroy() });
  }

  destroy(): void {
    this.sprite.destroy();
    this.bubble.destroy();
    this.extras.forEach((e) => e.destroy());
  }
}
