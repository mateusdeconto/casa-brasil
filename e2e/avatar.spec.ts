import { expect, test } from '@playwright/test';
import { expectNoErrors, saveOf, trackErrors, waitScene } from './helpers';

test('avatar builder: sex, style and colours end up in the save', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();

  // girls first; switching to boys swaps the style list
  await expect(page.locator('.pick-styles .card')).toHaveCount(5);
  await page.locator('[data-sex="menino"]').click();
  await expect(page.locator('.pick-styles .card')).toHaveCount(3);

  await page.locator('.pick-styles .card').nth(2).click(); // avatar_6
  await page.getByRole('button', { name: 'Escura' }).click();
  await page.getByRole('button', { name: 'Ruivo' }).click();
  await page.getByRole('button', { name: 'Azul', exact: true }).last().click(); // clothes swatch
  await page.fill('.picker input', 'Leo');
  await page.getByRole('button', { name: 'Começar' }).click();
  await waitScene(page, 'room');

  const save = await saveOf(page);
  expect(JSON.stringify(save)).toContain('avatar_6~p4h3r4');
  await expectNoErrors(errors);
});
