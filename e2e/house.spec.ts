import { expect, test } from '@playwright/test';
import { expectNoErrors, saveOf, tapCell, trackErrors, waitScene } from './helpers';

test('house: building the works makes the floor bigger and the furniture stays', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?demo=1');
  await page.waitForSelector('.opening .btn');
  await page.waitForTimeout(500);
  // enough projects and coins for both sizes
  await page.addInitScript(() => {
    const raw = localStorage.getItem('jogocasa.save.v2');
    if (!raw) return;
    const root = JSON.parse(raw);
    root.profiles[0].projects = 9;
    root.profiles[0].coins = 3000;
    localStorage.setItem('jogocasa.save.v2', JSON.stringify(root));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await waitScene(page, 'room');
  const furniture = (await saveOf(page)).profiles[0].furniture.length;
  const cells = () => page.evaluate(() => (window as unknown as { game: { scene: { getScene(k: string): { grid: { cells: number } } } } }).game.scene.getScene('room').grid.cells);
  expect(await cells()).toBe(4);
  await expect(page.locator('.gallery-chip')).toContainText('Casa 4 x 4');

  await page.locator('.gallery-chip').click();
  await expect(page.getByText('Casa: 4 x 4, próxima obra 1 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Ampliar a casa' }).click();
  await waitScene(page, 'room');
  await expect.poll(cells).toBe(5);
  await expect(page.locator('.gallery-chip')).toContainText('Casa 5 x 5');

  await page.locator('.gallery-chip').click();
  await page.getByRole('button', { name: 'Ampliar a casa' }).click();
  await expect.poll(cells).toBe(6);
  const after = (await saveOf(page)).profiles[0];
  expect(after).toMatchObject({ houseLevel: 2, projects: 0, coins: 1000 });
  expect(after.furniture).toHaveLength(furniture);

  // the new floor takes furniture: buy a plant and put it on a cell that did not exist before (5,4; the avatar stands on 5,5)
  await page.locator('.nav button[data-tab="shop"]').click();
  await page.waitForTimeout(500);
  await page.locator('.shop-card:has-text("Planta")').first().click();
  await page.waitForTimeout(400); // the shop panel slides away first
  await tapCell(page, 5, 4);
  await page.waitForTimeout(200);
  await tapCell(page, 5, 4);
  expect((await saveOf(page)).profiles[0].furniture.some((f: { x: number; y: number }) => f.x === 5 && f.y === 4)).toBe(true);
  await expectNoErrors(errors);
});
