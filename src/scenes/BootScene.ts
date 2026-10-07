// Loads what every scene needs (avatars, coin, lock), reports progress for the loading bar, then signals readiness.
import Phaser from 'phaser';
import { loadGroup } from '../game/assets';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.on('progress', (p: number) => this.game.events.emit('load-progress', p));
    loadGroup(this, 'common');
  }

  create(): void {
    for (const key of this.textures.getTextureKeys()) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
    this.game.events.emit('assets-ready');
  }
}
