// Debug helper: screenshot the garden (add --debug for the grid) at phone size.
import { chromium } from 'playwright';
const debug = process.argv.includes('--debug');
const tab = process.argv.find((a) => a.startsWith('--tab='))?.slice(6) ?? 'garden';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await p.goto(`http://localhost:5173/?demo=1&rapido=1${debug ? '&debug=1' : ''}`);
await p.click('.opening .btn'); await p.waitForTimeout(2500);
const t = p.locator(`.nav button[data-tab="${tab}"]`);
if (await t.count()) await t.click();
await p.waitForTimeout(3500);
await p.screenshot({ path: `debug/shot-${tab}${debug ? '-grid' : ''}.png` });
await b.close();
