// Album: polaroids with a fixed slight tilt; detail view with "Apagar foto".
import { partnerById } from '../core/catalog';
import { formatDate } from '../core/dates';
import { deletePhoto } from '../core/photos';
import type { Store, Visit } from '../core/state';
import { removeVisitPhoto } from '../core/visits';
import { el, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { button, confirmBox, demoRibbon, loadPhoto } from './widgets';

const TILTS = [-3, 2.2, -1.4, 3, -2.4, 1.6, -3.2, 2.6];

export interface AlbumDeps {
  store: Store;
  ui: HTMLElement;
  goFamily: () => void;
}

function polaroid(v: Visit, i: number, cleanups: (() => void)[]): HTMLElement {
  const p = partnerById(v.partner);
  const card = el('button', 'polaroid');
  card.style.setProperty('--tilt', `${TILTS[i % TILTS.length]}deg`);
  const img = el('img', 'pol-img');
  img.alt = `Foto do ${p.name}`;
  if (v.hasPhoto) cleanups.push(loadPhoto(img, v.id));
  else img.src = itemUrl(p.image), img.classList.add('placeholder');
  card.append(img, el('div', 'pol-cap', `<b>${p.name}</b><small>${formatDate(v.ts)}</small>`));
  if (v.demo) card.appendChild(demoRibbon());
  return card;
}

export function createAlbumPage(deps: AlbumDeps): PageHandle {
  const { store } = deps;
  const page = makePage({ title: 'Álbum', className: 'album' });
  const cleanups: (() => void)[] = [];
  page.onClose = () => cleanups.forEach((c) => c());

  const render = () => {
    cleanups.splice(0).forEach((c) => c());
    page.body.innerHTML = '';
    const visits = [...store.data.visits].sort((a, b) => b.ts - a.ts);
    if (!visits.length) {
      const empty = el('div', 'empty', `<img src="${itemUrl('polaroid')}" alt=""><p>Sua primeira expedição começa no Clube Família</p>`);
      empty.appendChild(button('Ir para o Clube Família', deps.goFamily));
      return page.body.appendChild(empty);
    }
    const grid = el('div', 'polaroids');
    visits.forEach((v, i) => {
      const c = polaroid(v, i, cleanups);
      c.onclick = () => detail(v);
      grid.appendChild(c);
    });
    page.body.appendChild(grid);
  };

  const detail = (v: Visit) => {
    const p = partnerById(v.partner);
    const shade = el('div', 'shade');
    const card = el('div', 'panel card-modal detail');
    const body = el('div', 'card-body');
    const img = el('img', 'detail-img');
    img.alt = `Foto do ${p.name}`;
    let off = () => {};
    if (v.hasPhoto) off = loadPhoto(img, v.id);
    else img.src = itemUrl(p.image);
    body.append(img, el('p', '', `<b>${p.name}</b><br>${formatDate(v.ts)}${v.demo ? ' · DEMO' : ''}`));
    const close = () => (off(), shade.remove());
    if (v.hasPhoto) {
      body.appendChild(
        button('Apagar foto', () =>
          confirmBox(deps.ui, 'Apagar esta foto? Ela some deste aparelho e não dá para recuperar.', 'Apagar', async () => {
            await deletePhoto(v.id);
            removeVisitPhoto(store, v.id);
            close();
            render();
          }),
          'secondary',
        ),
      );
    }
    body.appendChild(button('Fechar', close));
    card.appendChild(body);
    shade.appendChild(card);
    shade.onclick = (e) => e.target === shade && close();
    deps.ui.appendChild(shade);
  };

  render();
  return page;
}
