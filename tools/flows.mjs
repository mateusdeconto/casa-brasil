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

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Same formula as src/core/qr.ts (token = sha256("secret:text")[:8]). */
function qrToken(text) {
  const secret = /EVENT_SECRET\s*=\s*'([^']*)'/.exec(readFileSync('src/config.ts', 'utf8'))[1];
  return createHash('sha256').update(`${secret}:${text}`).digest('hex').slice(0, 8);
}
const localDay = (offset = 0) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const goto = (page, path) => page.goto(new URL(path, page.url()).href);

/** Do every task of the student checklist (quiz, photo, diary, plain ticks). */
async function doTasks(page) {
  for (let guard = 0; guard < 20; guard++) {
    const btn = page.locator('.task button').first();
    if (!(await btn.count())) break;
    const label = (await btn.textContent()).trim();
    await btn.click();
    await wait(page, 150);
    if (label.includes('quiz')) {
      for (let i = 0; i < 3; i++) {
        await page.locator('.task-modal .opt').first().click();
        await page.locator('.task-modal .btn:visible').first().click();
      }
      await page.locator('.task-modal .btn:visible').first().click();
    } else if (label.includes('foto')) {
      await page.setInputFiles('[data-testid=school-photo]', 'public/assets/garden.png');
      await wait(page, 500);
      await page.click('.task-modal .btn:has-text("Concluir")');
    } else if (label.includes('diário')) {
      await page.fill('.task-modal textarea', 'Vi uma onça-pintada descansando e aprendi que ela se camufla.');
      await page.click('.task-modal .btn:has-text("Guardar diário")');
    }
    await wait(page, 150);
  }
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
  async school(page, shot) {
    await goto(page, '/escola');
    await wait(page, 700);
    await shot('1_chooser');
    await page.click('#role-teacher');
    await wait(page, 900);
    await shot('2_class');
    await page.locator('.student-chips').scrollIntoViewIfNeeded();
    await shot('2b_class_chips');
    await page.click('.side .menu:has-text("Expedições")');
    await wait(page, 500);
    await shot('3_builder');
    await page.locator('.card-edit').first().locator('.icon-btn').first().click();
    await page.click('.phase[data-phase=durante] .add');
    await shot('4_builder_edit');
    await page.click('.kind-opt:has-text("Reflexão")');
    await page.click('text=Pré-visualizar');
    await wait(page, 400);
    await shot('5_preview');
    await page.click('.phone-frame .close');
    await page.click('text=Publicar para a turma');
    await wait(page, 400);
    await shot('6_published');
    await page.click('.side .menu:has-text("Relatórios")');
    await wait(page, 300);
    await shot('7_reports');
    await goto(page, '/escola#aluno');
    await wait(page, 700);
    await shot('8_student');
    await doTasks(page);
    await shot('9_student_done_tasks');
    await page.click('#finish-expedition');
    await wait(page, 900);
    await page.locator('.class-garden').scrollIntoViewIfNeeded();
    await shot('10_student_finished');
    await goto(page, '/escola#professor');
    await wait(page, 600);
    await shot('11_class_after');
  },
  async qr(page, shot) {
    // fresh device: scanning the event QR asks for the avatar first, then gives the trophy
    await goto(page, `/?qr=${qrToken(`evento:${localDay()}`)}`);
    await wait(page, 900);
    await shot('1_avatar_first');
    await page.locator('.card').nth(2).click();
    await page.fill('.picker input', 'Ana');
    await page.click('text=Começar');
    await wait(page, 1500);
    await shot('2_celebration');
    await page.click('text=Colocar na minha casa');
    await wait(page, 700);
    await shot('3_ghost');
    await page.click('.actionbar button:has-text("Colocar")');
    await wait(page, 600);
    await shot('4_placed');
    await page.click('.nav >> text=Loja');
    await page.locator('.shop-list').evaluate((e) => (e.scrollTop = 9999));
    await wait(page, 400);
    await shot('5_shop_limited');
    // same code again: already redeemed
    await goto(page, `/?qr=${qrToken(`evento:${localDay(-1)}`)}`);
    await wait(page, 1200);
    await page.click('text=Jogar').catch(() => {});
    await wait(page, 600);
    await shot('6_already');
    await page.click('text=Fechar');
    await goto(page, '/?qr=00000000');
    await wait(page, 1200);
    await shot('7_expired');
    await page.click('text=Entendi');
    await goto(page, `/?qr=${qrToken('parceiro:museu')}`);
    await wait(page, 1200);
    await shot('8_partner_qr');
  },
  async city(page, shot) {
    await goto(page, '/cidade');
    await wait(page, 800);
    await shot('1_city');
    await page.locator('.maps').scrollIntoViewIfNeeded();
    await shot('2_maps');
    await page.click('.chip[data-type="Cultura"]');
    await wait(page, 300);
    await shot('3_filter_cultura');
    await page.click('.chip[data-type="Todos"]');
    await page.locator('.city-table').scrollIntoViewIfNeeded();
    await shot('4_table');
  },
  async about(page, shot) {
    await goto(page, '/sobre');
    await wait(page, 800);
    await shot('1_hero');
    await page.locator('#receita').scrollIntoViewIfNeeded();
    await shot('2_revenue');
    await page.locator('#seguranca').scrollIntoViewIfNeeded();
    await shot('3_safety');
    await page.locator('#links').scrollIntoViewIfNeeded();
    await shot('4_links');
  },
  async tutorial(page, shot) {
    await goto(page, '/?rapido=1');
    await start(page, shot);
    await shot('3_tut1_walk');
    await tapCell(page, 1, 0);
    await wait(page, 1500);
    await shot('4_tut2_buy');
    await page.click('.nav >> text=Loja');
    await wait(page, 600);
    await page.click('.shop-card:has-text("Sofá")');
    await wait(page, 300);
    await tapCell(page, 3, 2);
    await wait(page, 200);
    await tapCell(page, 3, 2);
    await wait(page, 1200);
    await shot('5_tut3_garden');
    await openGarden(page);
    await wait(page, 4500);
    await tapAnimal(page, 'capybara');
    await wait(page, 4000);
    await shot('6_tut4_visit');
    await demoVisit(page, 'zoo', null);
    await wait(page, 1500);
    await shot('7_tut_done');
    await page.click('.hud-btn[aria-label="Configurações"]');
    await wait(page, 300);
    await shot('8_settings');
    await page.click('.seg-btn:has-text("Grande")');
    await wait(page, 200);
    await shot('9_settings_large');
  },
  async demo(page, shot) {
    await goto(page, '/?demo=1&rapido=1');
    await wait(page, 1500);
    await shot('1_opening');
    await page.click('button:has-text("Jogar em família")');
    await page.waitForFunction(() => window.game?.scene.isActive('room'));
    await wait(page, 900);
    await shot('2_home');
    await openGarden(page);
    await wait(page, 600);
    await shot('3_garden');
    await page.click('.nav >> text=Álbum');
    await wait(page, 700);
    await shot('4_album');
    await page.click('.nav >> text=Família');
    await wait(page, 500);
    await shot('5_family');
    await page.locator('.family .page-body').evaluate((e) => (e.scrollTop = 9999));
    await shot('6_family_bottom');
    await page.click('text=Passaporte e carimbos');
    await wait(page, 400);
    await shot('7_passport');
  },
  async offline(page, shot) {
    const tenHours = Date.now() - 10 * 3600_000;
    await startWith(page, baseSave({ time: tenHours, animals: [{ id: 'capybara', since: tenHours }, { id: 'toucan', since: tenHours }] }));
    await openGarden(page);
    await shot('1_asleep');
  },
};
