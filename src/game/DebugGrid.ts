// ?debug=1 overlay: grid lines, cell indices, calibration corners and the pointer's world coords.
import Phaser from 'phaser';
import { IsoGrid } from '../core/IsoGrid';

export const DEBUG = new URLSearchParams(location.search).has('debug');

export function drawDebugGrid(scene: Phaser.Scene, grid: IsoGrid): void {
  const g = scene.add.graphics().setDepth(5000);
  g.lineStyle(3, 0x00ffff, 0.9);
  for (let i = 0; i <= grid.cells; i++) {
    const a = grid.toWorld(i, 0), b = grid.toWorld(i, grid.cells);
    const c = grid.toWorld(0, i), d = grid.toWorld(grid.cells, i);
    g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineBetween(c.x, c.y, d.x, d.y);
  }
  const style = { fontFamily: 'monospace', fontSize: '22px', color: '#ffff00', backgroundColor: '#000a' };
  for (let x = 0; x < grid.cells; x++) {
    for (let y = 0; y < grid.cells; y++) {
      const p = grid.cellCenter(x, y);
      scene.add.text(p.x, p.y, `${x},${y}`, style).setOrigin(0.5).setDepth(5001);
    }
  }
  const n = grid.cells;
  for (const [gx, gy] of [[0, 0], [n, 0], [n, n], [0, n]]) {
    const p = grid.toWorld(gx, gy);
    g.fillStyle(0xff3030, 1).fillCircle(p.x, p.y, 8);
    scene.add.text(p.x + 10, p.y - 30, `(${Math.round(p.x)},${Math.round(p.y)})`, style).setDepth(5001);
  }
  const cursor = scene.add.text(0, 0, '', style).setDepth(5002);
  scene.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
    const w = ptr.positionToCamera(scene.cameras.main) as Phaser.Math.Vector2;
    cursor.setPosition(w.x + 12, w.y + 12).setText(`${Math.round(w.x)},${Math.round(w.y)}`);
  });
}
