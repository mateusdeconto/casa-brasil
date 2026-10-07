import { expect, type Page } from '@playwright/test';

/** Fails the test on any uncaught error or console error. Returns the list so a test can inspect it. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // fonts come from Google: a blocked network must not fail the test
  page.on('console', (m) => m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text()) && errors.push(m.text()));
  return errors;
}

export const saveOf = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('jogocasa.save.v2') ?? 'null'));

export async function waitScene(page: Page, key: 'room' | 'garden' | 'gallery'): Promise<void> {
  await page.waitForFunction((k) => (window as unknown as { game?: { scene: { isActive(k: string): boolean } } }).game?.scene.isActive(k), key);
  await page.waitForTimeout(500);
}

type SceneWin = {
  game: {
    canvas: HTMLCanvasElement;
    scale: { width: number };
    scene: { getScene(k: string): any };
  };
};

/** Click the centre of a floor cell through the game's own grid. */
export async function tapCell(page: Page, cx: number, cy: number, key: 'room' | 'gallery' = 'room'): Promise<void> {
  const pt = await page.evaluate(([x, y, sceneKey]) => {
    const g = (window as unknown as SceneWin).game;
    const scene = g.scene.getScene(sceneKey as string);
    const w = scene.grid.cellCenter(x, y);
    const cam = scene.cameras.main;
    const r = g.canvas.getBoundingClientRect();
    const k = r.width / g.scale.width;
    return { x: r.left + (cam.x + (w.x - cam.worldView.x) * cam.zoom) * k, y: r.top + (cam.y + (w.y - cam.worldView.y) * cam.zoom) * k };
  }, [cx, cy, key] as const);
  await page.mouse.click(pt.x, pt.y);
}

/** Click an animal sprite in the garden. */
export async function tapAnimal(page: Page, id: string): Promise<void> {
  const pt = await page.evaluate((animal) => {
    const g = (window as unknown as SceneWin).game;
    const scene = g.scene.getScene('garden');
    const c = scene.views.get(animal).sprite.getCenter();
    const cam = scene.cameras.main;
    const r = g.canvas.getBoundingClientRect();
    const k = r.width / g.scale.width;
    return { x: r.left + (cam.x + (c.x - cam.worldView.x) * cam.zoom) * k, y: r.top + (cam.y + (c.y - cam.worldView.y) * cam.zoom) * k };
  }, id);
  await page.mouse.click(pt.x, pt.y);
}

export async function pressPin(page: Page, pin: string): Promise<void> {
  for (const k of pin) await page.click(`.pin-keys [data-key="${k}"]`);
}

export async function expectNoErrors(errors: string[]): Promise<void> {
  expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
}
