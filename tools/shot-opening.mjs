// Debug helper: opening cover, the shop with gallery pieces and the about page. Needs the dev server on :5173.
import { chromium } from 'playwright';

const b = await chromium.launch();
const phone = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
phone.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await phone.goto('http://localhost:5173/');
await phone.waitForSelector('.opening .btn');
await phone.waitForTimeout(1200);
await phone.screenshot({ path: 'debug/shot-opening.png' });

await phone.goto('http://localhost:5173/?demo=1');
await phone.click('.opening .btn');
await phone.waitForTimeout(2500);
await phone.click('.nav button[data-tab="shop"]');
await phone.waitForTimeout(800);
await phone.evaluate(() => document.querySelector('.shop-list').scrollTo(0, 500));
await phone.waitForTimeout(300);
await phone.screenshot({ path: 'debug/shot-shop.png' });

const wide = await b.newPage({ viewport: { width: 1280, height: 800 } });
await wide.goto('http://localhost:5173/sobre');
await wide.waitForTimeout(1500);
await wide.screenshot({ path: 'debug/shot-sobre.png' });
await wide.goto('http://localhost:5173/');
await wide.waitForTimeout(1500);
await wide.screenshot({ path: 'debug/shot-opening-wide.png' });
await b.close();
