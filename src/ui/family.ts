// Clube Família page (bloco D version: partner list + passport). Extended in bloco E.
import { PARTNERS } from '../core/catalog';
import type { Emitter, GameEvents } from '../core/events';
import type { Store } from '../core/state';
import { el } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { partnerCard } from './partnerCards';
import { button } from './widgets';

export interface FamilyDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  openPassport: () => void;
}

export function createFamilyPage(d: FamilyDeps): PageHandle {
  const page = makePage({ title: 'Clube Família', className: 'family' });
  const list = el('div', 'partner-list');
  for (const p of PARTNERS) list.appendChild(partnerCard(p, { label: 'Visitar', onPick: () => d.bus.emit('startVisit', { partner: p.id }) }));
  page.body.append(list, button('Passaporte', d.openPassport, 'secondary'));
  return page;
}
