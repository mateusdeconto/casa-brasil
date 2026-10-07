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

/** Drag from one cell to another using real pointer moves. */
async function dragCell(page, from, to) {
  const a = await cellPoint(page, ...from);
  const b = await cellPoint(page, ...to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 8, a.y + ((b.y - a.y) * i) / 8);
  await page.mouse.up();
}

async function cellPoint(page, cx, cy) {
  return page.evaluate(([x, y]) => {
    const scene = window.game.scene.getScene('room');
    const w = scene.grid.cellCenter(x, y);
    const cam = scene.cameras.main;
    const r = window.game.canvas.getBoundingClientRect();
    const k = r.width / window.game.scale.width;
    return { x: r.left + (cam.x + (w.x - cam.worldView.x) * cam.zoom) * k, y: r.top + (cam.y + (w.y - cam.worldView.y) * cam.zoom) * k };
  }, [cx, cy]);
}

/** Start with a prepared save (skips the avatar picker). */
async function startWith(page, save) {
  // init script: runs before the page's own pagehide save can overwrite it
  await page.addInitScript((s) => {
    localStorage.removeItem('jogocasa.save.v2');
    localStorage.setItem('jogocasa.save.v1', JSON.stringify(s));
  }, save);
  await page.reload();
  await wait(page, 600);
  await page.click('text=Jogar');
  await page.waitForFunction(() => window.game?.scene.isActive('room'));
  await wait(page, 500);
}

const baseSave = (extra) => ({
  v: 1, avatar: 'avatar_1', name: 'Ana', coins: 200, started: true, time: Date.now(),
  furniture: [{ uid: 1, id: 'table', x: 0, y: 2 }], animals: [], unlocks: { zoo: false, museum: false }, ...extra,
});

/** Tap an animal in the garden scene by id. */
async function tapAnimal(page, id) {
  const pt = await page.evaluate((animal) => {
    const scene = window.game.scene.getScene('garden');
    const c = scene.views.get(animal).sprite.getCenter();
    const cam = scene.cameras.main;
    const r = window.game.canvas.getBoundingClientRect();
    const k = r.width / window.game.scale.width;
    return { x: r.left + (cam.x + (c.x - cam.worldView.x) * cam.zoom) * k, y: r.top + (cam.y + (c.y - cam.worldView.y) * cam.zoom) * k };
  }, id);
  await page.mouse.click(pt.x, pt.y);
}

async function openGarden(page) {
  await page.click('.nav >> text=Jardim');
  await page.waitForFunction(() => window.game.scene.isActive('garden'));
  await wait(page, 700);
}

/** Demo-mode visit to a partner, with the garden picture as the test photo (no people). */
export async function demoVisit(page, partnerId, shot, label = '') {
  await page.click('.nav >> text=Família');
  await wait(page, 300);
  await page.click(`.place-chip[data-partner=${partnerId}]`);
  await wait(page, 300);
  if (shot) await shot(`${label}1_local`);
  await page.click('button:has-text("Estou aqui")');
  await page.click('button:has-text("Modo demonstração")');
  await wait(page, 300);
  await page.setInputFiles('[data-testid=photo-input]', 'public/assets/garden.png');
  await wait(page, 600);
  if (shot) await shot(`${label}2_photo`);
  await page.click('.flow-actions >> text=Continuar');
  await wait(page, 1000);
  if (shot) await shot(`${label}3_stamp`);
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
  async shop(page, shot) {
    await start(page, shot);
    await page.click('.nav >> text=Loja');
    await wait(page, 400);
    await shot('3_shop');
    await page.click('.shop-card >> text=Sofá');
    await wait(page, 300);
    await shot('4_ghost');
    await tapCell(page, 0, 3);
    await wait(page, 200);
    await shot('5_ghost_invalid');
    await tapCell(page, 2, 0);
    await wait(page, 200);
    await tapCell(page, 2, 0);
    await wait(page, 400);
    await shot('6_bought');
    await page.click('.nav >> text=Editar');
    await tapCell(page, 2, 0);
    await wait(page, 300);
    await shot('7_selected');
    await dragCell(page, [2, 0], [3, 1]);
    await wait(page, 300);
    await shot('8_moved');
    await page.click('text=Vender');
    await wait(page, 300);
    await shot('9_sold');
    await page.reload();
    await wait(page, 600);
    await page.click('text=Jogar');
    await wait(page, 900);
    await shot('10_reloaded');
  },
  async catalog(page, shot) {
    const f = (uid, id, x, y) => ({ uid, id, x, y });
    await startWith(page, baseSave({ furniture: [
      f(1, 'rug', 1, 1), f(2, 'bed', 2, 0), f(3, 'bookshelf', 0, 0), f(4, 'armchair', 1, 1),
      f(5, 'sofa', 0, 2), f(6, 'plant', 3, 3), f(7, 'lamp', 1, 0), f(8, 'dresser', 3, 2),
    ] }));
    await shot('a');
    await startWith(page, baseSave({ furniture: [
      f(1, 'hammock', 0, 0), f(2, 'cobogo', 1, 0), f(3, 'palm', 3, 0), f(4, 'guitar', 2, 0),
      f(5, 'vitrine', 0, 3), f(6, 'fossil', 1, 3), f(7, 'vase', 2, 3), f(8, 'meteorite', 3, 3), f(9, 'table', 0, 2),
    ] }));
    await shot('b');
  },
  async garden(page, shot) {
    const hourAgo = Date.now() - 3600_000;
    await startWith(page, baseSave({ coins: 400, animals: [{ id: 'capybara', since: hourAgo }] }));
    await openGarden(page);
    await shot('1_garden');
    await tapAnimal(page, 'capybara');
    await wait(page, 1300);
    await shot('2_collecting');
    await wait(page, 1500);
    await shot('3_collected');
    await tapAnimal(page, 'toucan');
    await wait(page, 300);
    await shot('4_buy_card');
    await page.click('text=Comprar por');
    await wait(page, 400);
    await tapAnimal(page, 'jaguar');
    await wait(page, 300);
    await shot('5_locked_card');
    await page.click('text=Fazer uma visita');
    await wait(page, 300);
    await shot('6_flow_local');
    await page.click('.page-head .back');
    await demoVisit(page, 'zoo');
    await page.click('text=Ver no jardim');
    await wait(page, 900);
    await shot('7_jaguar');
    await demoVisit(page, 'museu');
    await page.click('.nav >> text=Loja');
    await wait(page, 500);
    await page.locator('.shop-list').evaluate((e) => (e.scrollTop = 9999));
    await shot('8_museum_shop');
  },
  async visit(page, shot) {
    await startWith(page, baseSave({}));
    await page.click('.nav >> text=Álbum');
    await wait(page, 300);
    await shot('0_album_empty');
    await page.click('.nav >> text=Família');
    await wait(page, 300);
    await shot('1_family');
    await demoVisit(page, 'zoo', shot);
    await page.click('text=Ver passaporte');
    await wait(page, 400);
    await shot('4_passport');
    await page.click('.page-head .back');
    await demoVisit(page, 'parque', null);
    await page.click('.nav >> text=Álbum');
    await wait(page, 500);
    await shot('5_album');
    await page.locator('.polaroid').first().click();
    await wait(page, 500);
    await shot('6_album_detail');
  },
  async zoo(page, shot) {
    const ago = Date.now() - 3600_000;
    const all = ['capybara', 'toucan', 'tamarin', 'jaguar', 'arara', 'jabuti', 'lobo'].map((id) => ({ id, since: ago }));
    await startWith(page, baseSave({ coins: 900, animals: all, unlocks: { zoo: true, museum: false } }));
    await openGarden(page);
    await shot('1_all');
    await startWith(page, baseSave({ coins: 900, animals: [{ id: 'capybara', since: ago }] }));
    await openGarden(page);
    await shot('2_for_sale');
  },
  async family(page, shot) {
    await startWith(page, baseSave({}));
    await page.click('.nav >> text=Família');
    await wait(page, 400);
    await shot('1_family');
    await page.locator('.page-body').evaluate((e) => (e.scrollTop = 9999));
    await wait(page, 200);
    await shot('2_family_bottom');
    await page.locator('.page-body').evaluate((e) => (e.scrollTop = 0));
    await page.click('text=Planejar visita');
    await wait(page, 300);
    await page.locator('.partner-card[data-partner=museu] button').click();
    await shot('3_planner');
    await page.click('text=Combinar com a família');
    await wait(page, 300);
    await page.locator('.planner .page-body').evaluate((e) => (e.scrollTop = 9999));
    await shot('4_agreed');
    await page.click('.page-head .back');
    await wait(page, 400);
    await shot('5_family_after');
    await demoVisit(page, 'zoo', null);
    await page.click('text=Ver passaporte');
    await page.click('.page-head .back');
    await wait(page, 300);
    await shot('6_family_visited');
    await page.locator('.badge-chip').first().click();
    await wait(page, 300);
    await shot('7_badge_detail');
  },
  async parent(page, shot) {
    await startWith(page, baseSave({}));
    await page.click('.hud-btn[aria-label="Painel dos pais"]');
    await wait(page, 300);
    await shot('1_pin_create');
    for (const k of '1234') await page.click(`.pin-keys [data-key="${k}"]`);
    await wait(page, 300);
    for (const k of '1234') await page.click(`.pin-keys [data-key="${k}"]`);
    await wait(page, 500);
    await shot('2_panel');
    await page.locator('.parent .page-body').evaluate((e) => (e.scrollTop = 9999));
    await shot('3_panel_options');
    await page.locator('.parent .page-body').evaluate((e) => (e.scrollTop = 0));
    await page.click('text=Novo perfil');
    await wait(page, 300);
    await page.locator('.picker .card').nth(3).click();
    await page.fill('.picker input', 'Leo');
    await page.click('.picker >> text=Começar');
    await wait(page, 400);
    await shot('4_new_profile');
    await page.click('text=Jogar como Leo');
    await wait(page, 900);
    await shot('5_playing_as_leo');
    await page.click('.hud-btn[aria-label="Painel dos pais"]');
    for (const k of '1111') await page.click(`.pin-keys [data-key="${k}"]`);
    await wait(page, 300);
    await shot('6_wrong_pin');
  },
  async offline(page, shot) {
    const tenHours = Date.now() - 10 * 3600_000;
    await startWith(page, baseSave({ time: tenHours, animals: [{ id: 'capybara', since: tenHours }, { id: 'toucan', since: tenHours }] }));
    await openGarden(page);
    await shot('1_asleep');
  },
};
