// Runs a Python script with whichever launcher exists (py on Windows, python3 / python elsewhere).
import { spawnSync } from 'node:child_process';

const [script, ...args] = process.argv.slice(2);
for (const cmd of ['py', 'python3', 'python']) {
  const probe = spawnSync(cmd, ['--version'], { stdio: 'ignore' });
  if (probe.status !== 0) continue;
  const run = spawnSync(cmd, [script, ...args], { stdio: 'inherit' });
  process.exit(run.status ?? 1);
}
console.error('Python 3 not found. Install it from python.org (with Pillow and numpy: pip install pillow numpy qrcode).');
process.exit(1);
