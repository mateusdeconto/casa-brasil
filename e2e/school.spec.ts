import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { expectNoErrors, saveOf, trackErrors } from './helpers';

test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false, deviceScaleFactor: 1 });

test('school journey: teacher publishes, student finishes, the class panel updates, CSV exports', async ({ page }) => {
  const errors = trackErrors(page);

  // chooser
  await page.goto('/escola');
  await expect(page.getByRole('button', { name: /Sou professor/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Sou aluno/ })).toBeVisible();

  // teacher: class panel before
  await page.locator('#role-teacher').click();
  await expect(page.getByText('18 de 25 alunos já participaram')).toBeVisible();
  await expect(page.locator('.student-chip')).toHaveCount(25);
  await expect(page.locator('.student-chip.did')).toHaveCount(18);

  // teacher: create and publish an expedition
  await page.locator('.side .menu:has-text("Expedições")').click();
  await expect(page.getByText('Sugestão da IA, edite antes de publicar')).toBeVisible();
  await page.selectOption('select[aria-label="Tema"]', 'Arte');
  await expect(page.locator('.exp-title')).toHaveValue('Olhar de Artista');
  await page.locator('.card-edit').first().getByRole('button', { name: /Editar/ }).click();
  await page.locator('.card-edit input[aria-label="Título da atividade"]').fill('Quiz de cores');
  await page.getByRole('button', { name: 'Pronto' }).click();
  await page.locator('.phase[data-phase="durante"] .add').click();
  await page.locator('.kind-opt:has-text("Reflexão")').click();
  await page.getByRole('button', { name: 'Pré-visualizar' }).click();
  await expect(page.locator('.phone-frame')).toContainText('Quiz de cores');
  await page.locator('.phone-frame .close').click();
  await page.getByRole('button', { name: 'Publicar para a turma' }).click();
  await expect(page.getByText('Publicada!')).toBeVisible();
  expect((await saveOf(page)).school.expeditions).toHaveLength(1);

  // student: sees the published expedition, the privacy notice, finishes every task
  await page.goto('/escola#aluno');
  await expect(page.locator('.exp-banner')).toContainText('Olhar de Artista');
  await expect(page.locator('.privacy')).toContainText('Nada de fotos de pessoas');
  await expect(page.locator('.class-seal')).toContainText('18 de 25 já fizeram');
  await expect(page.locator('#finish-expedition')).toBeDisabled();
  for (let i = 0; i < 20 && (await page.locator('.task button').count()); i++) {
    const btn = page.locator('.task button').first();
    const label = (await btn.textContent()) ?? '';
    await btn.click();
    if (label.includes('quiz')) {
      for (let q = 0; q < 3; q++) {
        await page.locator('.task-modal .opt').first().click();
        await expect(page.locator('.task-modal .feedback')).not.toBeEmpty(); // feedback, never a score
        await page.locator('.task-modal .btn:visible').first().click();
      }
      await page.locator('.task-modal .btn:visible').first().click();
    } else if (label.includes('foto')) {
      await page.setInputFiles('[data-testid="school-photo"]', 'public/assets/garden.png');
      await page.locator('.task-modal .btn:has-text("Concluir"):not([disabled])').click();
    } else if (label.includes('diário')) {
      await page.fill('.task-modal textarea', 'Vi cores quentes e frias na obra.');
      await page.getByRole('button', { name: 'Guardar diário' }).click();
    }
  }
  await expect(page.locator('#finish-expedition')).toBeEnabled();
  await page.locator('#finish-expedition').click();
  await expect(page.locator('.medal')).toContainText('Expedição concluída');
  await expect(page.locator('.class-seal')).toContainText('19 de 25 já fizeram');
  await expect(page.locator('.cg-animal')).toHaveCount(5); // 20 completions: one new animal arrived

  // teacher: the panel counts the student, the CSV has the right rows
  await page.goto('/escola#professor');
  await expect(page.getByText('19 de 25 alunos já participaram')).toBeVisible();
  await expect(page.locator('.student-chip.did')).toHaveCount(19);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#export-csv').click()]);
  expect(download.suggestedFilename()).toMatch(/^relatorio-.*\.csv$/);
  const csv = (await readFile((await download.path())!, 'utf8')).replace('﻿', '');
  const lines = csv.trim().split('\r\n');
  expect(lines[0]).toBe('aluno,expedições concluídas,diário entregue');
  expect(lines).toHaveLength(26);
  expect(lines).toContain('Alice,1,sim');
  expect(lines).toContain('Beatriz,0,não');
  expect(lines.find((l) => l.startsWith('Você'))).toBe('Você,1,sim');
  await expectNoErrors(errors);
});

test('city and about pages open and respect the 20-visit rule', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/cidade');
  await expect(page.getByText('Dados exibidos somente com mínimo de 20 visitas por local.')).toBeVisible();
  await expect(page.locator('.map-card')).toHaveCount(2);
  await expect(page.locator('.city-table')).toContainText('dados ocultos');
  await page.locator('.chip[data-type="Museu"]').click();
  await expect(page.locator('.city-table tbody tr')).toHaveCount(1);
  await page.goto('/sobre');
  for (const t of ['O problema', 'Modelo de receita', 'Regras de segurança de menores', 'Próximos passos']) {
    await expect(page.getByRole('heading', { name: t })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'QR do evento (tela cheia)' })).toHaveAttribute('href', '/qr-evento.html');
  await expectNoErrors(errors);
});
