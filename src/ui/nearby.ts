// "Perto de você": a map and a list of places around the child (simulated at FGV EAESP for now).
import { NEARBY_ORIGIN, nearbyRows, walkLabel } from '../core/nearby';
import { el } from './dom';
import { makePage, type PageHandle } from './pageHost';
import type { NearbyMap } from './nearbyMap';

export interface NearbyDeps {
  back: () => void;
}

const text = <T extends HTMLElement>(node: T, value: string): T => {
  node.textContent = value;
  return node;
};

export function createNearbyPage(d: NearbyDeps): PageHandle {
  const page = makePage({ title: 'Perto de você', className: 'nearby', back: d.back });
  const rows = nearbyRows(NEARBY_ORIGIN);

  const here = el('p', 'nearby-here');
  here.append('Simulação: você está em ', text(el('b'), NEARBY_ORIGIN.name), ` (${NEARBY_ORIGIN.address}).`);
  const mapBox = el('div', 'nearby-map');
  mapBox.setAttribute('role', 'region');
  mapBox.setAttribute('aria-label', 'Mapa dos lugares perto de você');
  const list = el('ul', 'nearby-list');

  let map: NearbyMap | null = null;
  let closed = false;
  rows.forEach(({ place, meters }, i) => {
    const li = el('li');
    const b = el('button', `nearby-item kind-${place.kind.toLowerCase()}`);
    b.dataset.place = place.id;
    b.append(
      text(el('span', 'num'), String(i + 1)),
      text(el('span', 'name'), place.name),
      text(el('small', 'dist'), `${place.kind} · ${walkLabel(meters)}`),
      text(el('small', 'tip'), place.tip),
    );
    b.onclick = () => {
      mapBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      map?.focus(place.id);
    };
    li.appendChild(b);
    list.appendChild(li);
  });

  page.body.append(here, mapBox, text(el('h3', 'nearby-title'), 'Lugares por perto'), list);

  void import('./nearbyMap')
    .then((m) => {
      if (!closed) map = m.mountNearbyMap(mapBox, NEARBY_ORIGIN, rows);
    })
    .catch(() => {
      text(mapBox, 'Não consegui carregar o mapa agora. A lista abaixo continua valendo.').classList.add('failed');
    });
  page.onClose = () => {
    closed = true;
    map?.destroy();
    map = null;
  };
  return page;
}
