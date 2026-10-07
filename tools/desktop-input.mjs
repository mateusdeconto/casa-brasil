// Debug helper: types a name with the real keyboard on a desktop-sized window (no touch).
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5173/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto(url);
await p.click('.opening .btn');
await p.waitForSelector('.picker input');
await p.click('.picker input');
await p.keyboard.type('Mateus', { delay: 60 });
console.log('value:', JSON.stringify(await p.inputValue('.picker input')));
console.log('active:', await p.evaluate(() => document.activeElement?.tagName + '.' + document.activeElement?.className));
const info = await p.evaluate(() => {
  const i = document.querySelector('.picker input');
  const cs = getComputedStyle(i);
  const r = i.getBoundingClientRect();
  const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return { userSelect: cs.userSelect, pe: cs.pointerEvents, topIsInput: top === i, top: top?.tagName + '.' + top?.className };
});
console.log(info);
await b.close();
