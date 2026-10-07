// Fit a world rectangle into the canvas area left free by the HTML HUD and nav bar.
import Phaser from 'phaser';
import { HUD_HEIGHT, NAV_HEIGHT } from '../config';

export function fitCamera(scene: Phaser.Scene, view: number[]): void {
  const [x0, y0, x1, y1] = view;
  const cam = scene.cameras.main;
  const k = scene.scale.displayScale.y || 1; // game px per CSS px
  const top = HUD_HEIGHT * k;
  const h = scene.scale.height - (HUD_HEIGHT + NAV_HEIGHT) * k;
  const w = scene.scale.width;
  cam.setViewport(0, top, w, h);
  cam.setZoom(Math.min(w / (x1 - x0), h / (y1 - y0)));
  cam.centerOn((x0 + x1) / 2, (y0 + y1) / 2);
}

/** Refit on canvas resize; returns a cleanup function. */
export function keepFitted(scene: Phaser.Scene, view: number[]): void {
  fitCamera(scene, view);
  const refit = () => fitCamera(scene, view);
  scene.scale.on('resize', refit);
  scene.events.once('shutdown', () => scene.scale.off('resize', refit));
}
