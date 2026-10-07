import { expect, test } from '@playwright/test';
import { expectNoErrors, saveOf, trackErrors } from './helpers';

test('roteiro: the family plans an outing, gets the whole day, swaps an idea and ticks items', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?demo=1');
  await page.waitForSelector('.opening .btn');
  await page.getByRole('button', { name: 'Jogar em família' }).click();
  await page.locator('.nav button[data-tab="family"]').click();

  // plan a new outing to the zoo and open the generated roteiro right from the "agreed" card
  await page.getByRole('button', { name: 'Planejar visita' }).click();
  await page.locator('.partner-card[data-partner="zoo"] button').click();
  await page.getByRole('button', { name: 'Combinar com a família' }).click();
  await expect(page.getByText('Saída combinada!')).toBeVisible();
  await page.getByRole('button', { name: 'Ver roteiro completo' }).click();

  await expect(page.locator('.page.roteiro')).toBeVisible();
  for (const section of ['Antes de sair', 'O que levar', 'No dia (10 etapas)', 'Depois, em casa']) await expect(page.getByText(section, { exact: true })).toBeVisible();
  await expect(page.locator('.rt-time').first()).toHaveText('10:00');
  await expect(page.getByText('Pausa para o lanche')).toBeVisible();
  await expect(page.getByText('Carimbo no Passport')).toBeVisible();

  // swap one visit idea: only that title changes and the choice is saved on the outing
  const swapBtn = page.locator('.rt-swap').nth(2);
  const row = swapBtn.locator('xpath=ancestor::div[contains(@class,"rt-row")]');
  const before = await row.locator('b').innerText();
  await swapBtn.click();
  await expect(page.locator('.rt-row').filter({ hasText: before })).toHaveCount(0);

  // tick the first item and the progress counter moves
  await page.locator('.rt-box').first().click();
  await expect(page.getByText(/1 de \d+ itens feitos/)).toBeVisible();
  const outing = (await saveOf(page)).profiles[0].outings.find((o: { partner: string }) => o.partner === 'zoo');
  expect(outing.done).toHaveLength(1);
  expect(Object.keys(outing.swaps)).toHaveLength(1);

  // a new roteiro starts clean
  await page.getByRole('button', { name: 'Gerar outro roteiro' }).click();
  await expect(page.getByText(/0 de \d+ itens feitos/)).toBeVisible();

  // the Clube Família page links straight to it
  await page.locator('.page.roteiro .back').click();
  await page.locator('.page.planner .back').click();
  await expect(page.getByRole('button', { name: 'Ver roteiro da saída' })).toBeVisible();
  await expectNoErrors(errors);
});
