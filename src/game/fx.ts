// Small visual effects shared by scenes.
import Phaser from 'phaser';

export function floatText(scene: Phaser.Scene, x: number, y: number, text: string, color = '#ffc36b'): void {
  const t = scene.add
    .text(x, y, text, { fontFamily: '"Fredoka", sans-serif', fontSize: '64px', fontStyle: 'bold', color, stroke: '#33231a', strokeThickness: 10 })
    .setOrigin(0.5)
    .setDepth(9500);
  scene.tweens.add({ targets: t, y: y - 140, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
}
