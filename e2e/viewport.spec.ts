import { expect, test } from '@playwright/test';
import { expectNoErrors, trackErrors, waitScene } from './helpers';

// Phone browsers change the page height as their bars move. The canvas must always follow,
// otherwise the house and the avatar look far away inside a smaller box.
test.use({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

test('the game canvas keeps covering the screen when the page height changes', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await page.fill('.picker input', 'Ana');
  await page.getByRole('button', { name: 'Começar' }).click();
  await waitScene(page, 'room');

  const covered = () =>
    page.evaluate(() => {
      const r = (window as unknown as { game: Phaser.Game }).game.canvas.getBoundingClientRect();
      return { dw: Math.abs(r.width - innerWidth), dh: Math.abs(r.height - innerHeight) };
    });

  for (const [width, height] of [[375, 700], [375, 812], [375, 640], [412, 915], [375, 812]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400); // the page settles a moment after the browser bars move
    const d = await covered();
    expect(d.dw, `${width}x${height} width`).toBeLessThan(2);
    expect(d.dh, `${width}x${height} height`).toBeLessThan(2);
  }
  await expectNoErrors(errors);
});

test('settings: "Voltar à tela inicial" shows the start screen again and keeps the save', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await page.fill('.picker input', 'Ana');
  await page.getByRole('button', { name: 'Começar' }).click();
  await waitScene(page, 'room');

  await page.getByRole('button', { name: 'Configurações' }).click();
  await page.getByRole('button', { name: 'Voltar à tela inicial' }).click();
  await expect(page.locator('.opening')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jogar', exact: true })).toBeVisible();

  // the child is still there: playing again goes straight into the house, no new avatar
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await waitScene(page, 'room');
  await expect(page.locator('.hud')).toContainText('Ana');
  await expectNoErrors(errors);
});
