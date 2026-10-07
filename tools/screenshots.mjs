// Screenshots with Playwright at 390x844 and 1280x800. Starts its own Vite server.
// Usage: node tools/screenshots.mjs [flow] [--debug]   flows: tools/flows.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { FLOWS } from './flows.mjs';

const args = process.argv.slice(2);
const flowName = args.find((a) => !a.startsWith('--')) ?? 'basic';
const debug = args.includes('--debug');
const OUT = 'screenshots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { name: 'desktop', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
];

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
await server.listen();
const base = server.resolvedUrls.local[0] + (debug ? '?debug=1' : '');
const browser = await chromium.launch();
const errors = [];
let lastPage = null;
try {
  for (const vp of VIEWPORTS) {
    const { name, ...opts } = vp;
    const ctx = await browser.newContext(opts);
    const page = (lastPage = await ctx.newPage());
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
    await page.goto(base);
    const shot = (label) => page.screenshot({ path: `${OUT}/${flowName}_${label}_${name}.png` });
    await FLOWS[flowName](page, shot, name);
    await ctx.close();
  }
} catch (e) {
  await lastPage?.screenshot({ path: `${OUT}/_fail.png` });
  throw e;
} finally {
  console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
  await browser.close();
  await server.close();
}
