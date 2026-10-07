// Partner cards shared by the outing planner and the Clube Família page.
import type { PartnerDef } from '../core/catalog';
import { el, itemUrl } from './dom';
import { button } from './widgets';

export interface PartnerCardOpts {
  label: string;
  onPick: () => void;
  selected?: boolean;
  disabled?: boolean;
}

export function partnerCard(p: PartnerDef, o: PartnerCardOpts): HTMLElement {
  const km = `${p.distanceKm.toFixed(1).replace('.', ',')} km`;
  const card = el('div', `partner-card${o.selected ? ' on' : ''}`);
  card.dataset.partner = p.id;
  card.append(
    el('div', 'thumb', `<img src="${itemUrl(p.image)}" alt="">`),
    el('div', 'info', `<b>${p.name}</b><span>${km}</span><small>Recomendado para ${p.ageRange}</small>`),
  );
  const b = button(o.label, o.onPick, 'small');
  b.disabled = !!o.disabled;
  card.appendChild(b);
  return card;
}
