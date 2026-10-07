// "Perto de você": a map and a list of places around the child.
// Starts as a simulation at FGV EAESP; one tap switches to the device's real position.
import type { GpsFix } from '../core/geo';
import { FAR_M, NEARBY_ORIGIN, distanceLabel, nearbyRows, walkLabel, type NearbyOrigin } from '../core/nearby';
import { el } from './dom';
import { locationPrompt } from './locationPrompt';
import { makePage, type PageHandle } from './pageHost';
import type { NearbyMap } from './nearbyMap';
import { button } from './widgets';

export interface NearbyDeps {
  back: () => void;
}

const text = <T extends HTMLElement>(node: T, value: string): T => {
  node.textContent = value;
  return node;
};

export function createNearbyPage(d: NearbyDeps): PageHandle {
  const page = makePage({ title: 'Perto de você', className: 'nearby', back: d.back });

  let origin: NearbyOrigin = NEARBY_ORIGIN;
  let accuracyM: number | undefined;
  let live = false;
  let map: NearbyMap | null = null;
  let closed = false;

  const where = el('div', 'nearby-where');
  const mapBox = el('div', 'nearby-map');
  mapBox.setAttribute('role', 'region');
  mapBox.setAttribute('aria-label', 'Mapa dos lugares perto de você');
  const list = el('ul', 'nearby-list');

  const useGps = (pos: GpsFix) => {
    origin = { name: 'Você', address: 'localização do aparelho', lat: pos.lat, lng: pos.lng };
    accuracyM = pos.accuracyM;
    live = true;
    render();
  };
  const useSimulation = () => {
    origin = NEARBY_ORIGIN;
    accuracyM = undefined;
    live = false;
    render();
  };

  function renderWhere(nearest: number): void {
    where.replaceChildren();
    if (!live) {
      const p = el('p', 'nearby-here');
      p.append('Simulação: você está em ', text(el('b'), NEARBY_ORIGIN.name), ` (${NEARBY_ORIGIN.address}).`);
      where.append(p, locationPrompt({ question: 'Quer ver o que está perto de você agora?', onPosition: useGps }));
      return;
    }
    const acc = accuracyM ? ` (precisão de cerca de ${Math.max(5, Math.round(accuracyM / 5) * 5)} m)` : '';
    const p = el('p', 'nearby-here');
    p.append(text(el('b'), 'Usando a localização do seu aparelho'), acc);
    where.appendChild(p);
    if (nearest > FAR_M) {
      where.appendChild(text(el('p', 'nearby-far'), `Os lugares desta demonstração ficam em São Paulo: o mais perto está a ${distanceLabel(nearest)} de você.`));
    }
    where.appendChild(button('Voltar à simulação (FGV EAESP)', useSimulation, 'secondary small'));
  }

  function render(): void {
    const rows = nearbyRows(origin);
    renderWhere(rows[0].meters);
    list.replaceChildren();
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
    map?.update(origin, rows, accuracyM);
  }

  page.body.append(where, mapBox, text(el('h3', 'nearby-title'), 'Lugares por perto'), list);
  render();

  void import('./nearbyMap')
    .then((m) => {
      if (!closed) map = m.mountNearbyMap(mapBox, origin, nearbyRows(origin), accuracyM);
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
