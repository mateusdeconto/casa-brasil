// Gallery wing screens: the "Acervo e obras" page (build the next level, see every benefit) and the corner chip.
import { furnitureById } from '../core/catalog';
import type { Emitter, GameEvents } from '../core/events';
import { HOUSE_LEVELS, buildHouse, canBuildHouse, houseCells } from '../core/house';
import { GALLERY_COLLECTIONS, GALLERY_LEVELS, GALLERY_TIERS, buildGallery, canBuild, galleryBonus, galleryBounds } from '../core/gallery';
import type { Store } from '../core/state';
import { el, esc, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { button } from './widgets';

export interface GalleryPageDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  /** back to the gallery floor */
  close: () => void;
  /** open the shop tab (pieces are sold there) */
  goShop: () => void;
}

const mark = (ok: boolean) => `<span class="gl-mark ${ok ? 'ok' : ''}">${ok ? '✓' : '·'}</span>`;

function houseCard(d: GalleryPageDeps): HTMLElement {
  const data = d.store.data;
  const card = el('div', 'panel gl-card');
  const check = canBuildHouse(data);
  if (!check.level) {
    card.append(el('div', 'panel-title', '<span>Obra da casa</span>'), el('p', 'gl-note', `A casa já está do tamanho máximo (${houseCells(data)} x ${houseCells(data)}).`));
    return card;
  }
  const lv = check.level;
  card.append(
    el('div', 'panel-title', `<span>Casa: ${houseCells(data)} x ${houseCells(data)}, próxima obra ${lv.level} de ${HOUSE_LEVELS.length}</span>`),
    el('p', 'gl-note', `${esc(lv.name)}: o piso passa para ${lv.cells} x ${lv.cells}. Seus móveis ficam onde estão.`),
    el(
      'ul',
      'gl-needs',
      `<li>${mark(data.projects >= lv.projects)} Projetos de obra: <b>${data.projects}</b> de ${lv.projects}</li><li>${mark(data.coins >= lv.coins)} Moedas: <b>${data.coins.toLocaleString('pt-BR')}</b> de ${lv.coins.toLocaleString('pt-BR')}</li>`,
    ),
  );
  const go = button('Ampliar a casa', () => buildHouse(d.store));
  go.disabled = !check.ok;
  card.appendChild(go);
  if (!check.ok) {
    const parts = [
      check.missingProjects ? `${check.missingProjects} ${check.missingProjects === 1 ? 'projeto' : 'projetos'} (faça uma visita)` : '',
      check.missingCoins ? `${check.missingCoins} moedas` : '',
    ].filter(Boolean);
    card.appendChild(el('p', 'gl-note small', `Falta: ${parts.join(' e ')}.`));
  }
  return card;
}

function buildCard(d: GalleryPageDeps, rerender: () => void): HTMLElement {
  const data = d.store.data;
  const card = el('div', 'panel gl-card');
  const check = canBuild(data);
  if (!check.level) {
    card.append(el('div', 'panel-title', '<span>Obras</span>'), el('p', 'gl-note', 'A galeria está do tamanho máximo. Agora é só montar o acervo!'));
    return card;
  }
  const lv = check.level;
  card.append(el('div', 'panel-title', `<span>Obra ${lv.level} de ${GALLERY_LEVELS.length}: ${esc(lv.name)}</span>`));
  card.append(
    el('p', 'gl-note', `Abre uma área de ${lv.bounds} x ${lv.bounds} no piso da galeria. Cada visita a um parceiro traz 1 projeto de obra.`),
    el(
      'ul',
      'gl-needs',
      `<li>${mark(data.projects >= lv.projects)} Projetos de obra: <b>${data.projects}</b> de ${lv.projects}</li><li>${mark(data.coins >= lv.coins)} Moedas: <b>${data.coins.toLocaleString('pt-BR')}</b> de ${lv.coins.toLocaleString('pt-BR')}</li>`,
    ),
  );
  const go = button(data.galleryLevel ? 'Ampliar a galeria' : 'Construir a galeria', () => {
    if (buildGallery(d.store)) {
      d.bus.emit('toast', `${lv.name} pronta! Agora é só expor as peças.`);
      rerender();
    }
  });
  go.disabled = !check.ok;
  card.appendChild(go);
  if (!check.ok) {
    const parts = [
      check.missingProjects ? `${check.missingProjects} ${check.missingProjects === 1 ? 'projeto' : 'projetos'} (faça uma visita)` : '',
      check.missingCoins ? `${check.missingCoins} moedas` : '',
    ].filter(Boolean);
    card.appendChild(el('p', 'gl-note small', `Falta: ${parts.join(' e ')}.`));
  }
  return card;
}

function benefitsCard(d: GalleryPageDeps): HTMLElement {
  const b = galleryBonus(d.store.data);
  const card = el('div', 'panel gl-card');
  card.appendChild(el('div', 'panel-title', `<span>Benefícios do acervo: +${b.coinsPct}% moedas</span>`));
  card.appendChild(el('p', 'gl-note', `Peças diferentes expostas: <b>${b.pieces}</b>. Só conta o que está em exposição na galeria.`));
  const tiers = el('ul', 'gl-needs');
  for (const t of GALLERY_TIERS) {
    const extra = t.offlineHours ? ` e +${t.offlineHours} h de produção enquanto você está fora` : '';
    tiers.appendChild(el('li', '', `${mark(b.pieces >= t.pieces)} ${t.pieces} peças: <b>+${t.coinsPct}%</b> de moedas no jardim${extra}`));
  }
  card.appendChild(tiers);
  card.appendChild(el('p', 'gl-sub', 'Coleções completas (bônus extra)'));
  const cols = el('ul', 'gl-needs');
  for (const c of b.collections) {
    cols.appendChild(el('li', '', `${mark(c.done)} ${esc(c.def.name)}: ${c.have} de ${c.def.items.length} <b>+${c.def.coinsPct}%</b>`));
  }
  card.appendChild(cols);
  return card;
}

function piecesCard(d: GalleryPageDeps): HTMLElement {
  const data = d.store.data;
  const card = el('div', 'panel gl-card');
  card.appendChild(el('div', 'panel-title', '<span>Peças da galeria</span>'));
  const shown = new Set(data.gallery.map((p) => p.id));
  const grid = el('div', 'gl-pieces');
  for (const id of GALLERY_COLLECTIONS.flatMap((c) => c.items)) {
    const def = furnitureById(id);
    const owned = shown.has(id);
    const locked = !!def.exclusive && !data.unlocks[def.exclusive];
    const status = owned ? 'Exposta' : locked ? 'Falta visita' : `${def.price} moedas`;
    const name = def.name.replace(/^Quadro: |^Esqueleto de /, '');
    grid.appendChild(el('div', `gl-piece${owned ? ' on' : ''}`, `<img src="${itemUrl(def.sprite)}" alt=""><small>${esc(name)}</small><i>${status}</i>`));
  }
  card.append(grid, button('Ver peças na loja', d.goShop, 'secondary'));
  return card;
}

export function createGalleryPage(d: GalleryPageDeps): PageHandle {
  const page = makePage({ title: 'Obras e acervo', className: 'gallery-page', back: d.close });
  const render = () => {
    page.body.innerHTML = '';
    const data = d.store.data;
    const head = el('div', 'gl-head', `<span><b>${data.projects}</b> projetos de obra</span><span>Casa <b>${houseCells(data)}x${houseCells(data)}</b> · Galeria nível <b>${data.galleryLevel}</b> de ${GALLERY_LEVELS.length}</span>`);
    page.body.append(head, houseCard(d), buildCard(d, render), benefitsCard(d), piecesCard(d));
    if (galleryBounds(data)) page.body.appendChild(button('Ver a galeria', d.close));
  };
  render();
  return page;
}

/** Small button under the HUD: on the gallery tab it shows the bonus, on the house tab the floor size. Opens the works page. */
export function createGalleryChip(root: HTMLElement, bus: Emitter<GameEvents>, store: Store): (tab: string) => void {
  const chip = el('button', 'gallery-chip hidden');
  chip.setAttribute('aria-label', 'Obras e acervo');
  root.appendChild(chip);
  let current = 'home';
  const paint = () => {
    const b = galleryBonus(store.data);
    const n = houseCells(store.data);
    chip.innerHTML =
      current === 'gallery'
        ? `<img src="${itemUrl('vitrine')}" alt=""><span><b>Acervo ${b.pieces}</b><small>+${b.coinsPct}% moedas · obras</small></span>`
        : `<img src="${itemUrl('clipboard')}" alt=""><span><b>Casa ${n} x ${n}</b><small>${store.data.projects} projetos · obras</small></span>`;
  };
  chip.onclick = () => bus.emit('openGallery', undefined);
  bus.on('changed', paint);
  paint();
  return (tab) => {
    current = tab;
    paint();
    chip.classList.toggle('hidden', tab !== 'gallery' && tab !== 'home');
  };
}
