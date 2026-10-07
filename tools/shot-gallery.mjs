// Debug helper: screenshot the gallery wing. Usage: node tools/shot-gallery.mjs [--debug] [--level=3] [--pieces]
// Needs the dev server on :5173. Rewrites the demo save (level, unlocks, a few exhibits) before looking.
import { chromium } from 'playwright';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const debug = process.argv.includes('--debug');
const level = Number(arg('level', '3'));
const pieces = process.argv.includes('--pieces');

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
p.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await p.goto('http://localhost:5173/?demo=1');
await p.waitForSelector('.opening .btn');
await p.waitForTimeout(500);
await p.addInitScript(
  ({ level, pieces }) => {
    const raw = localStorage.getItem('jogocasa.save.v2');
    if (!raw) return;
    const root = JSON.parse(raw);
    const me = root.profiles[0];
    me.galleryLevel = level;
    me.coins = 5000;
    me.unlocks.museu = true;
    me.unlocks.ciencia = true;
    me.gallery = pieces
      ? [
          { uid: 101, id: 'dino_trex', x: 0, y: 1 },
          { uid: 102, id: 'dino_raptor', x: 2, y: 1 },
          { uid: 103, id: 'painting_dama', x: 0, y: 0 },
          { uid: 104, id: 'painting_noite', x: 1, y: 0 },
          { uid: 105, id: 'fossil', x: 2, y: 3 },
          { uid: 106, id: 'vase', x: 3, y: 3 },
        ]
      : [];
    localStorage.setItem('jogocasa.save.v2', JSON.stringify(root));
  },
  { level, pieces },
);
await p.goto(`http://localhost:5173/${debug ? '?debug=1' : ''}`);
await p.click('.opening .btn');
await p.waitForTimeout(2500);
await p.click('.nav button[data-tab="gallery"]');
await p.waitForTimeout(3000);
await p.screenshot({ path: `debug/shot-gallery${debug ? '-grid' : ''}-L${level}.png` });
await b.close();
