// Debug helper: screenshots of the roteiro page (needs the dev server on :5173). Saves debug/shot-roteiro-*.png
import { chromium } from 'playwright';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto('http://localhost:5173/?demo=1');
await p.click('.opening .btn');
await p.waitForTimeout(2500);
await p.click('.nav button[data-tab="family"]');
await p.waitForTimeout(600);
await p.getByRole('button', { name: 'Ver roteiro da saída' }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: 'debug/shot-roteiro-1.png' });
await p.evaluate(() => document.querySelector('.page.roteiro .page-body').scrollTo(0, 700));
await p.waitForTimeout(300);
await p.screenshot({ path: 'debug/shot-roteiro-2.png' });
await b.close();
