// What happens when the page opens with ?qr=<token>: event trophy, partner card, or "expirado".
import { EVENT_NAME, EVENT_TROPHY_TEXT } from '../config';
import type { Emitter, GameEvents } from '../core/events';
import { EVENT_ITEM, hasRedeemed, redeemEvent, resolveQr } from '../core/qr';
import type { Store } from '../core/state';
import { showCard } from './card';
import { el, esc, itemUrl } from './dom';
import { button } from './widgets';

export interface QrDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  ui: HTMLElement;
}

const EXPIRED = 'QR expirado, peça o QR de hoje no evento.';

function placeOnHome(d: QrDeps): void {
  d.bus.emit('shopPick', EVENT_ITEM);
}

function celebrate(d: QrDeps): void {
  const shade = el('div', 'shade');
  const card = el('div', 'panel card-modal celebrate');
  card.appendChild(el('div', 'panel-title', '<span>Prêmio do evento!</span>'));
  const body = el('div', 'card-body');
  body.append(
    el('div', 'trophy', `<img class="big" src="${itemUrl('trophy_owl')}" alt="Troféu Coruja"><img class="ribbon-limited" src="${itemUrl('ribbon_limited')}" alt="Edição limitada">`),
    el('h3', '', esc(EVENT_TROPHY_TEXT)),
    el('p', 'event-line', `Evento: ${esc(EVENT_NAME)}`),
    button('Colocar na minha casa', () => (shade.remove(), placeOnHome(d))),
    button('Fechar', () => shade.remove(), 'secondary'),
  );
  card.appendChild(body);
  shade.appendChild(card);
  d.ui.appendChild(shade);
  navigator.vibrate?.(80);
}

/** Opens the right screen for a scanned token. The caller already made sure the child has an avatar. */
export function handleQr(d: QrDeps, token: string, now = Date.now()): void {
  const r = resolveQr(token, now);
  if (r.kind === 'partner') return d.bus.emit('startVisit', { partner: r.partnerId, preGps: true });
  if (r.kind === 'expired') return void showCard(d.ui, { title: 'QR', image: 'lock', text: EXPIRED, buttons: [{ label: 'Entendi', onClick: () => {} }] });
  if (hasRedeemed(d.store)) {
    const placed = d.store.data.furniture.some((f) => f.id === EVENT_ITEM);
    return void showCard(d.ui, {
      title: 'Troféu Coruja',
      image: 'trophy_owl',
      text: 'Você já resgatou este item.',
      buttons: placed ? [{ label: 'Fechar', onClick: () => {} }] : [{ label: 'Colocar na minha casa', onClick: () => placeOnHome(d) }, { label: 'Fechar', secondary: true, onClick: () => {} }],
    });
  }
  if (redeemEvent(d.store, now) === 'ok') celebrate(d);
}
