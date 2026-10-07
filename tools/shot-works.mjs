// Debug helper: the works page (house + gallery builds). Needs the dev server on :5173.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto('http://localhost:5173/?demo=1');
await p.click('.opening .btn');
await p.waitForTimeout(2500);
await p.locator('.gallery-chip').click();
await p.waitForTimeout(500);
await p.screenshot({ path: 'debug/shot-works.png' });
await b.close();
