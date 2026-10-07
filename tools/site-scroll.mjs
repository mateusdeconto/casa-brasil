// Debug helper: wheel over the light pages (/escola, /cidade, /sobre) and report how far the page moved.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 650 } });
for (const [label, path, pre] of [['sobre', '/sobre'], ['cidade', '/cidade'], ['escola professor', '/escola#professor'], ['escola aluno', '/escola#aluno']]) {
  await p.goto(`http://localhost:5173${path}`);
  await p.waitForTimeout(1200);
  const max = await p.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
  await p.mouse.move(640, 300);
  for (let i = 0; i < 30; i++) await p.mouse.wheel(0, 40);
  await p.waitForTimeout(500);
  const y = await p.evaluate(() => Math.round(scrollY));
  console.log(`${max < 20 ? 'short  ' : y > 0 ? 'ok     ' : 'PROBLEM'} ${label}: scrolled ${y} of ${max}`);
}
await b.close();
