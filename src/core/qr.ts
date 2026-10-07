// QR codes: a daily token for the event trophy and a fixed token per partner place.
//
// DEMO ONLY. The secret is in the public bundle, so anyone can compute a token. A real launch must
// validate the token on a server (signed, rate limited, one use per child). tools/make_event_qr.py
// uses the same formula to print the codes.
import { EVENT_SECRET, QR_BASE_URL } from '../config';
import { PLACE_PARTNERS } from './catalog';
import { addDays, dayKey } from './dates';
import { sha256Hex } from './hash';
import type { Store } from './state';
import { completeVisit } from './visits';

export const TOKEN_LENGTH = 8;
export const EVENT_ITEM = 'trophy_owl';
export const EVENT_PARTNER = 'evento';

const token = (text: string) => sha256Hex(`${EVENT_SECRET}:${text}`).slice(0, TOKEN_LENGTH);

/** Event token of a given day (YYYY-MM-DD). */
export const eventToken = (day: string): string => token(`evento:${day}`);

/** Fixed token of a partner place (the printed sign at the entrance). */
export const partnerToken = (partnerId: string): string => token(`parceiro:${partnerId}`);

/** Event tokens accepted at `now`: today and yesterday, so a late scan after midnight still works. */
export const validEventTokens = (now: number): string[] => {
  const today = dayKey(now);
  return [eventToken(today), eventToken(addDays(today, -1))];
};

export type QrResult = { kind: 'event' } | { kind: 'partner'; partnerId: string } | { kind: 'expired' };

export function resolveQr(raw: string, now: number): QrResult {
  const t = raw.trim().toLowerCase();
  const partner = PLACE_PARTNERS.find((p) => partnerToken(p.id) === t);
  if (partner) return { kind: 'partner', partnerId: partner.id };
  if (validEventTokens(now).includes(t)) return { kind: 'event' };
  return { kind: 'expired' };
}

/** The address that goes inside a QR code. Base is config, or this site's origin. */
export const qrUrl = (tk: string, base: string = QR_BASE_URL || (typeof location !== 'undefined' ? location.origin : '')): string =>
  `${base.replace(/\/$/, '')}/?qr=${tk}`;

export const hasRedeemed = (store: Store): boolean => store.data.redeemed.includes(EVENT_ITEM);

/** One trophy per child. A second scan changes nothing. */
export function redeemEvent(store: Store, now = Date.now()): 'ok' | 'already' {
  if (hasRedeemed(store)) return 'already';
  store.data.redeemed.push(EVENT_ITEM);
  completeVisit(store, { partnerId: EVENT_PARTNER, demo: false, hasPhoto: false }, now);
  return 'ok';
}
