// Loads every image listed in the manifest, then signals readiness.
import Phaser from 'phaser';
import { MANIFEST, assetUrl } from '../core/catalog';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    for (const [key, e] of Object.entries(MANIFEST.bases)) this.load.image(key, assetUrl(e.file));
    for (const [key, e] of Object.entries(MANIFEST.items)) this.load.image(key, assetUrl(e.file));
  }

  create(): void {
    for (const key of this.textures.getTextureKeys()) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.game.events.emit('assets-ready');
  }
}
