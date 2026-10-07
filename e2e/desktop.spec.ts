import { expect, test } from '@playwright/test';
import { expectNoErrors, trackErrors } from './helpers';

// A computer: big window, mouse and keyboard, no touch.
test.use({ viewport: { width: 1280, height: 650 }, hasTouch: false, deviceScaleFactor: 1 });

test('desktop: the name can be typed with the keyboard (Enter starts the game)', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await page.locator('.picker .card').nth(1).click();
  await page.locator('.picker input').click();
  await page.keyboard.type('Mateus', { delay: 40 });
  await expect(page.locator('.picker input')).toHaveValue('Mateus');
  await page.keyboard.press('Enter');
  await expect(page.locator('.hud .name')).toHaveText('Mateus');
  await expectNoErrors(errors);
});

const scrolled = (page: import('@playwright/test').Page) => page.evaluate(() => Math.round(scrollY));

test('desktop: the mouse wheel scrolls the light pages (sobre, cidade, escola)', async ({ page }) => {
  for (const path of ['/sobre', '/cidade', '/escola#aluno']) {
    await page.goto(path);
    await page.waitForTimeout(600);
    await page.mouse.move(640, 300);
    for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 40);
    await page.waitForTimeout(300);
    expect(await scrolled(page), `${path} did not scroll`).toBeGreaterThan(100);
  }
  await page.goto('/escola');
  await page.locator('#role-teacher').click();
  await page.locator('.side .menu:has-text("Expedições")').click();
  await page.waitForTimeout(400);
  await page.mouse.move(640, 350);
  for (let i = 0; i < 20; i++) await page.mouse.wheel(0, 40);
  await page.waitForTimeout(300);
  expect(await scrolled(page), 'the expeditions tab did not scroll').toBeGreaterThan(50);
});

test('desktop: the game pages scroll with small touchpad-like steps, over the page or over the margin', async ({ page }) => {
  await page.goto('/?demo=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await page.locator('.nav button[data-tab="family"]').click();
  await page.waitForTimeout(600);
  for (const x of [640, 80]) {
    await page.evaluate(() => (document.querySelector('.page-body') as HTMLElement).scrollTo(0, 0));
    await page.mouse.move(x, 300);
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 3);
    await page.waitForTimeout(400);
    const top = await page.evaluate(() => (document.querySelector('.page-body') as HTMLElement).scrollTop);
    expect(top, `family page at x=${x}`).toBeGreaterThan(60);
  }
});
