// Passport: 6 stamps (coloured or locked), "N de 6", and the special rewards row.
import { FURNITURE, PLACE_PARTNERS } from '../core/catalog';
import type { Store } from '../core/state';
import { el, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { stampKey } from './widgets';

export const STAMP_TYPES = ['zoo', 'museu', 'parque', 'ciencia', 'evento', 'historico'] as const;

const STAMP_HINT: Record<string, string> = {
  zoo: 'Zoológico', museu: 'Museu', parque: 'Parque', ciencia: 'Centro de ciências', evento: 'Evento', historico: 'Expedição da escola',
};

const REWARDS: { key: string; sprite: string; unlock: string }[] = [
  { key: 'jaguar', sprite: 'jaguar', unlock: 'zoo' },
  ...PLACE_PARTNERS.flatMap((p) => (p.reward.items ?? []).map((id) => ({ key: id, sprite: FURNITURE.find((f) => f.id === id)!.sprite, unlock: p.reward.unlock }))),
  { key: 'star_award', sprite: 'star_award', unlock: 'semana' },
  { key: 'trophy_owl', sprite: 'trophy_owl', unlock: 'evento' },
];

export function createPassportPage(store: Store, back: () => void): PageHandle {
  const page = makePage({ title: 'Passaporte', className: 'passport', back });
  const d = store.data;
  const board = el('div', 'stamp-board');
  for (const t of STAMP_TYPES) {
    const got = d.stamps.includes(t);
    const cell = el('div', `stamp-cell ${got ? 'got' : ''}`, `<img src="${itemUrl(stampKey(t, !got))}" alt="${got ? 'Carimbo' : 'Carimbo bloqueado'}: ${STAMP_HINT[t]}"><small>${STAMP_HINT[t]}</small>`);
    board.appendChild(cell);
  }
  page.body.append(board, el('div', 'stamp-count', `${d.stamps.length} de ${STAMP_TYPES.length}`));
  const row = el('div', 'rewards-row');
  for (const r of REWARDS) {
    const got = d.unlocks[r.unlock];
    const src = r.key === 'jaguar' && !got ? 'jaguar_silhouette' : r.sprite;
    row.appendChild(el('div', `reward-chip ${got ? '' : 'off'}`, `<img src="${itemUrl(src)}" alt="">`));
  }
  const panel = el('div', 'panel rewards');
  panel.append(el('div', 'panel-title', '<span>Recompensas especiais</span>'), row);
  page.body.appendChild(panel);
  return page;
}
