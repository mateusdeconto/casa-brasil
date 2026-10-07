import { expect, test, type Page } from '@playwright/test';
import { expectNoErrors, trackErrors, waitScene } from './helpers';

// Standing next to the MASP (Av. Paulista)
const MASP = { latitude: -23.5614, longitude: -46.656 };

async function openFamily(page: Page): Promise<void> {
  await page.goto('/?demo=1&rapido=1');
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await waitScene(page, 'room');
  await page.locator('.nav button:has-text("Família")').click();
}

test.describe('with location allowed', () => {
  test.use({ permissions: ['geolocation'], geolocation: MASP });

  test('Perto de você: one tap swaps the simulation for the real position', async ({ page }) => {
    const errors = trackErrors(page);
    await openFamily(page);
    await page.locator('.nearby-card').click();
    await expect(page.locator('.nearby-here')).toContainText('Simulação');

    await page.getByRole('button', { name: 'Usar minha localização' }).click();
    await expect(page.locator('.nearby-here')).toContainText('Usando a localização do seu aparelho');
    await expect(page.locator('.nearby-item').first()).toContainText('MASP');

    await page.getByRole('button', { name: /Voltar à simulação/ }).click();
    await expect(page.locator('.nearby-here')).toContainText('Simulação');
    await expectNoErrors(errors);
  });

  test('Planejar saída: no distance until the child asks for "Perto de mim"', async ({ page }) => {
    const errors = trackErrors(page);
    await openFamily(page);
    await page.locator('.next-trip:not(.nearby-card)').click();

    const cards = page.locator('.partner-card');
    await expect(cards).toHaveCount(4);
    await expect(page.locator('.partner-list')).not.toContainText('km');
    await expect(page.locator('.partner-list')).not.toContainText('de você');

    await page.getByRole('button', { name: 'Perto de mim' }).click();
    await expect(page.getByText('Usar sua localização para ver os lugares perto de você?')).toBeVisible();
    await page.getByRole('button', { name: 'Usar minha localização' }).click();
    await expect(page.locator('.partner-list')).toContainText('de você');
    // the museum in the demo data is the closest to the Paulista
    await expect(cards.first()).toContainText('Museu');

    await page.getByRole('button', { name: 'Parar de usar minha localização' }).click();
    await expect(page.locator('.partner-list')).not.toContainText('de você');
    await expectNoErrors(errors);
  });

  test('Planejar saída: "Agora não" closes the question and shows nothing new', async ({ page }) => {
    await openFamily(page);
    await page.locator('.next-trip:not(.nearby-card)').click();
    await page.getByRole('button', { name: 'Perto de mim' }).click();
    await page.getByRole('button', { name: 'Agora não' }).click();
    await expect(page.getByRole('button', { name: 'Perto de mim' })).toBeVisible();
    await expect(page.locator('.partner-list')).not.toContainText('de você');
  });
});

test('location refused: says so in plain words and keeps working', async ({ page }) => {
  await openFamily(page);
  await page.locator('.nearby-card').click();
  await page.getByRole('button', { name: 'Usar minha localização' }).click();
  await expect(page.locator('.lp-status')).toContainText('Sem permissão de localização');
  await expect(page.locator('.nearby-here')).toContainText('Simulação');
});
