import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { expectNoErrors, pressPin, saveOf, tapAnimal, tapCell, trackErrors, waitScene } from './helpers';

const TEST_PHOTO = 'public/assets/garden.png'; // the garden picture: a place, no people

const todayToken = (): string => {
  const secret = /EVENT_SECRET\s*=\s*'([^']*)'/.exec(readFileSync('src/config.ts', 'utf8'))![1];
  const d = new Date();
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return createHash('sha256').update(`${secret}:evento:${day}`).digest('hex').slice(0, 8);
};

test('family journey: opening, avatar, buy, collect, visit, stamp, album, parent panel', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/?rapido=1');

  // opening with the 4 ways in
  await expect(page.locator('.opening')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Painel da cidade' })).toHaveAttribute('href', '/cidade');
  await expect(page.getByRole('link', { name: 'Sobre o projeto' })).toHaveAttribute('href', '/sobre');

  // avatar
  await page.getByRole('button', { name: 'Jogar', exact: true }).click();
  await page.locator('#choice-play').click();
  await page.locator('.picker .card').nth(1).click();
  await page.fill('.picker input', 'Ana');
  await page.getByRole('button', { name: 'Começar' }).click();
  await waitScene(page, 'room');
  await expect(page.locator('.hud .name')).toHaveText('Ana');
  await expect(page.locator('.tutorial')).toBeVisible();
  await page.getByRole('button', { name: 'Pular tutorial' }).click();
  await expect(page.locator('.tutorial')).toHaveCount(0);

  // buy a piece of furniture
  await page.locator('.nav button[data-tab="shop"]').click();
  await page.waitForTimeout(500);
  await page.locator('.shop-card:has-text("Sofá")').click();
  await page.waitForTimeout(300);
  await tapCell(page, 2, 0);
  await page.waitForTimeout(200);
  await tapCell(page, 2, 0);
  await expect(page.locator('.hud .coins span')).toHaveText('80');
  expect((await saveOf(page)).profiles[0].furniture).toHaveLength(2);

  // collect in the garden (?rapido=1: a cycle takes 3 s)
  await page.locator('.nav button[data-tab="garden"]').click();
  await waitScene(page, 'garden');
  await page.waitForTimeout(3500);
  await tapAnimal(page, 'capybara');
  await expect.poll(async () => (await saveOf(page)).profiles[0].coins, { timeout: 8000 }).toBeGreaterThan(80);

  // real visit in demonstration mode with a test photo
  await page.locator('.nav button[data-tab="family"]').click();
  await page.locator('.place-chip[data-partner="zoo"]').click();
  await page.getByRole('button', { name: 'Estou aqui' }).click();
  await page.getByRole('button', { name: 'Modo demonstração' }).click();
  await page.setInputFiles('[data-testid="photo-input"]', TEST_PHOTO);
  await expect(page.locator('.photo-img')).toBeVisible();
  await page.locator('.flow-actions').getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.stamp-press')).toBeVisible();
  await expect(page.getByText('Onça-pintada liberada!')).toBeVisible();
  await expect(page.locator('.boost')).toContainText('restam 7 dias');
  await expect(page.locator('.stamp-paper .ribbon-demo')).toBeVisible();

  // passport
  await page.getByRole('button', { name: 'Ver passaporte' }).click();
  await expect(page.locator('.stamp-count')).toHaveText('1 de 6');
  await page.locator('.page-head .back').click();

  // album: DEMO polaroid, delete the photo with confirmation
  await page.locator('.nav button[data-tab="album"]').click();
  await expect(page.locator('.polaroid')).toHaveCount(1);
  await expect(page.locator('.polaroid .ribbon-demo')).toBeVisible();
  await page.locator('.polaroid').click();
  await page.getByRole('button', { name: 'Apagar foto' }).click();
  await expect(page.getByText('Apagar esta foto?')).toBeVisible();
  await page.getByRole('button', { name: 'Apagar', exact: true }).click();
  await expect(page.locator('.polaroid .pol-img.placeholder')).toBeVisible();

  // parent panel: create the PIN, then a wrong PIN is refused and the right one opens
  await page.locator('.hud-btn[aria-label="Painel dos pais"]').click();
  await pressPin(page, '1234');
  await pressPin(page, '1234');
  await expect(page.locator('.screen.parent')).toContainText('Resumo da semana de Ana');
  await expect(page.locator('.screen.parent')).toContainText('Compras bloqueadas');
  await page.locator('.screen.parent .back').click();
  await page.locator('.hud-btn[aria-label="Painel dos pais"]').click();
  await pressPin(page, '9999');
  await expect(page.getByText('PIN incorreto')).toBeVisible();
  await pressPin(page, '1234');
  await expect(page.locator('.screen.parent')).toBeVisible();

  const save = await saveOf(page);
  expect(save.v).toBe(2);
  expect(save.profiles[0].visits).toHaveLength(1);
  expect(save.profiles[0].stamps).toEqual(['zoo']);
  expect(save.pinHash).toMatch(/^[0-9a-f]{64}$/);
  expect(JSON.stringify(save)).not.toContain('1234');
  await expectNoErrors(errors);
});

test('a scanned event QR asks for the avatar first, gives one trophy and refuses a repeat', async ({ page }) => {
  const errors = trackErrors(page);
  const token = todayToken();

  await page.goto(`/?qr=${token}`);
  await page.locator('.picker .card').nth(2).click();
  await page.fill('.picker input', 'Leo');
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByText('Troféu Coruja, Edição Hackathon 2026')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();
  expect((await saveOf(page)).profiles[0].redeemed).toEqual(['trophy_owl']);

  await page.goto(`/?qr=${token}`); // the opening is skipped when a QR is present
  await expect(page.getByText('Você já resgatou este item.')).toBeVisible();

  await page.goto('/?qr=00000000');
  await expect(page.getByText('QR expirado, peça o QR de hoje no evento.')).toBeVisible();
  await expectNoErrors(errors);
});
