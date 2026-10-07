import { expect, test } from '@playwright/test';
import { expectNoErrors, saveOf, tapCell, trackErrors, waitScene } from './helpers';

const TEST_PHOTO = 'public/assets/garden.png'; // a place, no people

test('gallery: a visit brings a project, the wing is built, an exhibit is bought and shows its benefit', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?demo=1');
  await page.waitForSelector('.opening .btn');
  await page.getByRole('button', { name: 'Jogar em família' }).click();
  await waitScene(page, 'room');
  expect((await saveOf(page)).profiles[0]).toMatchObject({ projects: 2, galleryLevel: 0, coins: 480 });

  // a museum visit (demonstration mode) unlocks the paintings and the fossil and adds a project
  await page.locator('.nav button[data-tab="family"]').click();
  await page.locator('.place-chip[data-partner="museu"]').click();
  await page.getByRole('button', { name: 'Estou aqui' }).click();
  await page.getByRole('button', { name: 'Modo demonstração' }).click();
  await page.setInputFiles('[data-testid="photo-input"]', TEST_PHOTO);
  await page.locator('.flow-actions').getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('+1 projeto de obra para a Galeria (você tem 3)')).toBeVisible();
  expect((await saveOf(page)).profiles[0].projects).toBe(3);
  await page.locator('.nav button[data-tab="gallery"]').click();

  // the wing is not built yet: the page opens by itself with the cost and every benefit
  await expect(page.locator('.gallery-page')).toBeVisible();
  await expect(page.getByText('Obra 1 de 3: Galeria pequena')).toBeVisible();
  await expect(page.getByText('Benefícios do acervo: +0% moedas')).toBeVisible();
  await page.getByRole('button', { name: 'Construir a galeria' }).click();
  await expect(page.getByText('Nível 1 de 3')).toBeVisible();
  const built = (await saveOf(page)).profiles[0];
  expect(built).toMatchObject({ galleryLevel: 1, projects: 1, coins: 180 });
  await page.getByRole('button', { name: 'Ver a galeria' }).click();
  await waitScene(page, 'gallery');
  await expect(page.locator('.gallery-chip')).toContainText('Acervo 0');

  // buy the fossil in the shop: it goes to the gallery, not to the house
  await page.locator('.nav button[data-tab="shop"]').click();
  await page.waitForTimeout(500);
  await page.locator('.shop-card:has-text("Fóssil")').click();
  await waitScene(page, 'gallery');
  await tapCell(page, 1, 1, 'gallery');
  await page.waitForTimeout(200);
  await tapCell(page, 1, 1, 'gallery');
  await expect(page.locator('.gallery-chip')).toContainText('Acervo 1');
  const placed = (await saveOf(page)).profiles[0];
  expect(placed.gallery).toHaveLength(1);
  expect(placed.gallery[0].id).toBe('fossil');
  expect(placed.furniture.some((f: { id: string }) => f.id === 'fossil')).toBe(false);
  expect(placed.coins).toBe(120);

  // the chip opens the page again with the benefit the piece gave
  await page.locator('.gallery-chip').click();
  await expect(page.getByText('Benefícios do acervo: +0% moedas')).toBeVisible();
  await expectNoErrors(errors);
});
