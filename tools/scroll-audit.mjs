// Debug helper: opens every screen of the game and reports content that is cut off with no way to scroll to it.
// Usage: node tools/scroll-audit.mjs [width] [height] [url]   (dev server on :5173 by default)
import { chromium } from 'playwright';

const W = Number(process.argv[2] ?? 1280);
const H = Number(process.argv[3] ?? 650);
const URL = process.argv[4] ?? 'http://localhost:5173';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
const problems = [];

/** Controls out of view that no scroller can bring in, and hidden-overflow boxes that cut their content. */
const audit = (label) =>
  p
    .evaluate(() => {
      const app = document.getElementById('app').getBoundingClientRect();
      const scrolls = (e) => {
        const s = getComputedStyle(e);
        return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 2;
      };
      const out = [];
      for (const e of document.querySelectorAll('#ui button, #ui input, #ui a, #ui select, #ui textarea')) {
        if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
        if (e.closest('.shop:not(.open)')) continue; // the closed shop panel waits below the screen on purpose
        const r = e.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.bottom <= app.bottom + 1 && r.top >= app.top - 1) continue;
        let reachable = false;
        for (let n = e.parentElement; n && n.id !== 'app'; n = n.parentElement) if (scrolls(n)) reachable = true;
        if (!reachable) out.push(`${e.tagName}.${e.className} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 28)}" bottom=${Math.round(r.bottom)} app=${Math.round(app.bottom)}`);
      }
      for (const e of document.querySelectorAll('#ui .page, #ui .screen, #ui .card-modal, #ui .panel, #ui .shade > *')) {
        const s = getComputedStyle(e);
        if ((s.overflowY === 'hidden' || s.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 4 && e.offsetParent) out.push(`CUT ${e.tagName}.${e.className} ${e.scrollHeight}>${e.clientHeight}`);
      }
      return out;
    })
    .then((list) => {
      if (list.length) problems.push({ label, list });
      console.log(list.length ? `PROBLEM  ${label}\n   ${list.join('\n   ')}` : `ok       ${label}`);
    });

const wheelTest = async (label, selector) => {
  const r = await p.evaluate((sel) => {
    const e = document.querySelector(sel);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    e.scrollTop = 0;
    return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 200), max: e.scrollHeight - e.clientHeight };
  }, selector);
  if (!r || r.max < 4) return;
  await p.mouse.move(r.x, r.y);
  await p.mouse.wheel(0, 200);
  await p.waitForTimeout(200);
  const top = await p.evaluate((sel) => document.querySelector(sel).scrollTop, selector);
  if (!top) problems.push({ label: `wheel ${label}`, list: ['wheel did not scroll'] });
  console.log(top ? `ok       wheel ${label} -> ${Math.round(top)}` : `PROBLEM  wheel ${label} did not scroll`);
};

const tab = async (name) => {
  await p.click(`.nav button[data-tab="${name}"]`);
  await p.waitForTimeout(700);
};

await p.goto(`${URL}/?demo=1`);
await p.click('.opening .btn');
await p.waitForTimeout(2500);
await audit('home');

await tab('family');
await audit('familia');
await wheelTest('familia', '.page-body');
// tiny deltas like a precision touchpad, with the pointer over the dark margin and over the page
for (const [label, x] of [['margem', 60], ['pagina', W / 2]]) {
  await p.evaluate(() => (document.querySelector('.page-body').scrollTop = 0));
  await p.mouse.move(x, 300);
  for (let i = 0; i < 40; i++) await p.mouse.wheel(0, 3);
  await p.waitForTimeout(400);
  const t = await p.evaluate(() => document.querySelector('.page-body').scrollTop);
  if (t < 60) problems.push({ label: `deltas pequenos (${label})`, list: [`scrollTop=${t}`] });
  console.log(t >= 60 ? `ok       deltas pequenos (${label}) -> ${Math.round(t)}` : `PROBLEM  deltas pequenos (${label}) -> ${t}`);
}
await p.getByRole('button', { name: 'Passaporte e carimbos' }).click();
await p.waitForTimeout(400);
await audit('passaporte');
await wheelTest('passaporte', '.page:not(.hidden) .page-body');
await p.locator('.page:not(.hidden) .back').click();
await p.getByRole('button', { name: 'Planejar visita' }).click();
await p.waitForTimeout(400);
await audit('planejar saida');
await wheelTest('planejar saida', '.page:not(.hidden) .page-body');
await p.locator('.partner-card[data-partner="zoo"] button').click();
await p.getByRole('button', { name: 'Combinar com a família' }).click();
await p.waitForTimeout(300);
await audit('saida combinada');
await p.getByRole('button', { name: 'Ver roteiro completo' }).click();
await p.waitForTimeout(400);
await audit('roteiro');
await wheelTest('roteiro', '.page:not(.hidden) .page-body');
await p.locator('.page.roteiro .back').click();
await p.locator('.page.planner .back').click();
await p.locator('.place-chip[data-partner="museu"]').click();
await p.waitForTimeout(500);
await audit('visita passo 1');
await p.getByRole('button', { name: 'Estou aqui' }).click();
await p.waitForTimeout(500);
await audit('visita passo local');
await p.locator('.page:not(.hidden) .back').first().click().catch(() => {});

await tab('album');
await audit('album');
await wheelTest('album', '.page-body');
await p.locator('.polaroid').first().click().catch(() => {});
await p.waitForTimeout(400);
await audit('album detalhe');
await p.getByRole('button', { name: 'Fechar' }).click().catch(() => {});

await tab('gallery');
await audit('galeria (obra)');
await wheelTest('galeria', '.page:not(.hidden) .page-body');
await tab('shop');
await audit('loja');
await wheelTest('loja', '.shop-list');
await tab('avatar');
await audit('avatar');
await wheelTest('avatar', '.picker .grid');
await p.fill('.picker input', 'Teste');
await p.getByRole('button', { name: 'Começar' }).click();
await p.waitForTimeout(1500);

await p.click('.hud-btn[aria-label="Configurações"]');
await p.waitForTimeout(500);
await audit('configuracoes');
await wheelTest('configuracoes', '.screen.settings .page-body');
await p.locator('.page:not(.hidden) .back, .card-modal .close').first().click().catch(() => {});
await p.reload();
await p.waitForTimeout(500);
await p.click('.opening .btn');
await p.waitForTimeout(2000);
await p.click('.hud-btn[aria-label="Painel dos pais"]');
await p.waitForTimeout(500);
await audit('painel dos pais: PIN');
for (let round = 0; round < 2; round++) for (const k of '1234') await p.click(`.pin-keys [data-key="${k}"]`);
await p.waitForTimeout(600);
await audit('painel dos pais');
await wheelTest('painel dos pais', '.screen.parent .page-body');


await b.close();
console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall screens ok');
process.exit(problems.length ? 1 : 0);
