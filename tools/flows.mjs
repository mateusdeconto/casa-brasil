// Scripted play-throughs used by screenshots.mjs. Each flow: (page, shot, viewportName).
const wait = (page, ms) => page.waitForTimeout(ms);

/** Tap the centre of floor cell (cx, cy) through the game's own grid. */
export async function tapCell(page, cx, cy) {
  const pt = await page.evaluate(([x, y]) => {
    const scene = window.game.scene.getScene('room');
    const w = scene.grid.cellCenter(x, y);
    const cam = scene.cameras.main;
    const canvas = window.game.canvas.getBoundingClientRect();
    const k = canvas.width / window.game.scale.width;
    return { x: canvas.left + (cam.x + (w.x - cam.worldView.x) * cam.zoom) * k, y: canvas.top + (cam.y + (w.y - cam.worldView.y) * cam.zoom) * k };
  }, [cx, cy]);
  await page.mouse.click(pt.x, pt.y);
}

async function start(page, shot) {
  await wait(page, 800);
  await shot('1_opening');
  await page.click('text=Jogar');
  await wait(page, 300);
  await page.locator('.card').nth(0).click();
  await page.fill('.picker input', 'Ana');
  await shot('2_picker');
  await page.click('text=Começar');
  await page.waitForFunction(() => window.game?.scene.isActive('room'));
  await wait(page, 600);
}

export const FLOWS = {
  async basic(page, shot) {
    await start(page, shot);
    await shot('3_room');
    await tapCell(page, 1, 0);
    await wait(page, 450);
    await shot('4_walking');
    await wait(page, 1500);
    await shot('5_arrived');
  },
};
