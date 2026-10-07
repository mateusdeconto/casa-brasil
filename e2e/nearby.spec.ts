import { expect, test } from '@playwright/test';
import { expectNoErrors, trackErrors, waitScene } from './helpers';

test('perto de você: the Família tab opens a map and the nearest places first', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?demo=1&rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await waitScene(page, 'room');
  await page.locator('.nav button:has-text("Família")').click();
  await page.locator('.nearby-card').click();

  await expect(page.locator('.leaflet-container')).toBeVisible();
  const items = page.locator('.nearby-item');
  await expect(items).toHaveCount(7);
  await expect(items.first()).toContainText('MASP');
  await expect(items.first()).toContainText('min a pé');

  await items.first().click();
  await expect(page.locator('.leaflet-popup')).toContainText('Rotas no Google Maps');
  await page.getByRole('button', { name: 'Voltar' }).click();
  await expect(page.locator('.nearby-card')).toBeVisible();
  // a tile blocked by the CSP shows up as a console error, so this also guards the map images
  await expectNoErrors(errors);
});
