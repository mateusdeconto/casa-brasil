// Clube Família: weekly expedition, next outing, weekly missions and latest medals.
import { PLACE_PARTNERS, partnerById } from '../core/catalog';
import { weekKey } from '../core/dates';
import { BADGES } from '../core/badges';
import type { Emitter, GameEvents } from '../core/events';
import { ensureMissions, featuredPartnerId, missionDef, missionDone } from '../core/missions';
import { nextOuting, outingLabel } from '../core/outings';
import type { Outing, Store } from '../core/state';
import { showBadgeDetail } from './badgeDetail';
import { el, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { button } from './widgets';

export interface FamilyDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  ui: HTMLElement;
  openPassport: () => void;
  openPlanner: (partner?: string) => void;
  openRoteiro: (o: Outing) => void;
  startVisit: (partner: string) => void;
}

/** The expedition's 3 seals: outing planned, place visited this week, photo taken. */
export function expeditionSeals(store: Store, partnerId: string, now: number): boolean[] {
  const d = store.data;
  const week = weekKey(now);
  const visits = d.visits.filter((v) => v.partner === partnerId && weekKey(v.ts) === week);
  return [d.outings.some((o) => o.partner === partnerId && o.day >= week), visits.length > 0, visits.some((v) => v.hasPhoto)];
}

function header(): HTMLElement {
  const h = el('div', 'club-head');
  h.append(el('div', 'sign', `<img src="${itemUrl('signboard')}" alt=""><h1>Clube Família</h1>`), el('img', 'club-family'));
  (h.lastElementChild as HTMLImageElement).src = itemUrl('family');
  return h;
}

function expeditionCard(d: FamilyDeps, now: number): HTMLElement {
  const partner = partnerById(featuredPartnerId(weekKey(now), PLACE_PARTNERS.map((p) => p.id)));
  const seals = expeditionSeals(d.store, partner.id, now);
  const card = el('div', 'parch expedition');
  card.append(
    el('h3', '', `Expedição da semana<br><b>${partner.name}</b>`),
    el('div', 'banner', `<img src="${itemUrl(partner.image)}" alt="">`),
  );
  const row = el('div', 'seals', seals.map((s, i) => `<span class="seal ${s ? 'on' : ''}" aria-label="Selo ${i + 1} ${s ? 'conquistado' : 'a conquistar'}">${s ? `<img src="${itemUrl('check')}" alt="">` : i + 1}</span>`).join(''));
  row.appendChild(el('small', '', `${seals.filter(Boolean).length} de 3 selos`));
  card.append(row, button('Planejar visita', () => d.openPlanner(partner.id)));
  return card;
}

function nextTrip(d: FamilyDeps, now: number): HTMLElement {
  const o = nextOuting(d.store.data, now);
  const wrap = el('div', 'next-trip-wrap');
  const row = el('button', 'parch next-trip');
  row.innerHTML = `<img src="${itemUrl('calendar')}" alt=""><span>${o ? `Próxima saída:<br><b>${outingLabel(o)}</b>` : 'Próxima saída:<br><b>combinar agora</b>'}</span><i>›</i>`;
  row.onclick = () => d.openPlanner(o?.partner);
  wrap.appendChild(row);
  if (o) wrap.appendChild(button('Ver roteiro da saída', () => d.openRoteiro(o), 'secondary small'));
  return wrap;
}

function visitNow(d: FamilyDeps): HTMLElement {
  const box = el('div', 'visit-now');
  box.appendChild(el('h3', '', 'Já está em um destes lugares?'));
  const row = el('div', 'chips');
  for (const p of PLACE_PARTNERS) {
    const chip = el('button', 'place-chip', `<img src="${itemUrl(p.image)}" alt=""><span>${p.name}</span>`);
    chip.dataset.partner = p.id;
    chip.onclick = () => d.startVisit(p.id);
    row.appendChild(chip);
  }
  box.appendChild(row);
  return box;
}

function missionsPanel(d: FamilyDeps, now: number): HTMLElement {
  ensureMissions(d.store.data, now);
  const panel = el('div', 'panel missions');
  panel.appendChild(el('div', 'panel-title', '<span>Missões da semana</span>'));
  const list = el('ul', 'mission-list');
  for (const m of d.store.data.missions!.items) {
    const def = missionDef(m.id);
    const done = missionDone(m);
    list.appendChild(el('li', done ? 'done' : '', `<span class="box">${done ? `<img src="${itemUrl('check')}" alt="Cumprida">` : ''}</span><span>${def.text}</span><small>${Math.min(m.progress, def.goal)}/${def.goal}</small>`));
  }
  panel.appendChild(list);
  const w = d.store.data.missions!;
  panel.appendChild(el('p', 'mission-reward', w.rewarded ? 'Estrela da semana liberada na loja!' : 'As 3 cumpridas liberam a Estrela da semana.'));
  return panel;
}

function badgesPanel(d: FamilyDeps): HTMLElement {
  const panel = el('div', 'panel');
  panel.appendChild(el('div', 'panel-title', '<span>Últimas conquistas</span>'));
  const row = el('div', 'badge-row');
  const earned = d.store.data.badges;
  [...BADGES].sort((a, b) => (earned[b.id] ?? 0) - (earned[a.id] ?? 0)).forEach((b) => {
    const on = !!earned[b.id];
    const chip = el('button', `badge-chip ${on ? '' : 'off'}`, `<img src="${itemUrl(b.sprite)}" alt=""><small>${b.name}</small>`);
    chip.setAttribute('aria-label', `${b.name}${on ? '' : ' (ainda não conquistada)'}`);
    chip.onclick = () => showBadgeDetail(d.ui, b.id, earned[b.id]);
    row.appendChild(chip);
  });
  panel.appendChild(row);
  return panel;
}

export function createFamilyPage(d: FamilyDeps): PageHandle {
  const page = makePage({ title: '', className: 'family', bare: true });
  const now = Date.now();
  page.body.append(
    header(),
    expeditionCard(d, now),
    nextTrip(d, now),
    visitNow(d),
    missionsPanel(d, now),
    badgesPanel(d),
    button('Passaporte e carimbos', d.openPassport, 'secondary'),
  );
  return page;
}
