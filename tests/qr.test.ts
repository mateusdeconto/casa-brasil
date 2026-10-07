import { describe, expect, it } from 'vitest';
import { Emitter, type GameEvents } from '../src/core/events';
import { eventToken, hasRedeemed, partnerToken, qrUrl, redeemEvent, resolveQr, validEventTokens } from '../src/core/qr';
import { defaultRoot, Store } from '../src/core/state';

const NOW = new Date(2026, 9, 7, 12).getTime(); // 2026-10-07
const DAY = 86_400_000;
const make = () => new Store(defaultRoot(NOW), new Emitter<GameEvents>());

describe('QR tokens', () => {
  it('are 8 hex characters and match the Python tool (same formula)', () => {
    expect(eventToken('2026-10-07')).toBe('456ecbbb');
    expect(eventToken('2026-10-06')).toBe('0d93d4e0');
    expect(partnerToken('zoo')).toBe('7cf033d1');
    expect(partnerToken('museu')).toBe('5eb79798');
    expect(eventToken('2026-10-07')).toMatch(/^[0-9a-f]{8}$/);
  });

  it('change every day', () => {
    expect(eventToken('2026-10-07')).not.toBe(eventToken('2026-10-08'));
  });

  it('today and yesterday are accepted', () => {
    expect(validEventTokens(NOW)).toEqual(['456ecbbb', '0d93d4e0']);
    expect(resolveQr('456ecbbb', NOW)).toEqual({ kind: 'event' });
    expect(resolveQr('0d93d4e0', NOW)).toEqual({ kind: 'event' });
  });

  it('older, future or made-up tokens are expired', () => {
    expect(resolveQr(eventToken('2026-10-05'), NOW)).toEqual({ kind: 'expired' });
    expect(resolveQr(eventToken('2026-10-08'), NOW)).toEqual({ kind: 'expired' });
    expect(resolveQr('00000000', NOW)).toEqual({ kind: 'expired' });
    expect(resolveQr('', NOW)).toEqual({ kind: 'expired' });
  });

  it('yesterday stops working the day after', () => {
    expect(resolveQr('0d93d4e0', NOW + DAY)).toEqual({ kind: 'expired' });
    expect(resolveQr('456ecbbb', NOW + DAY)).toEqual({ kind: 'event' });
  });

  it('partner tokens open the partner and never expire', () => {
    expect(resolveQr('7cf033d1', NOW)).toEqual({ kind: 'partner', partnerId: 'zoo' });
    expect(resolveQr('7CF033D1', NOW + 400 * DAY)).toEqual({ kind: 'partner', partnerId: 'zoo' });
  });

  it('builds the link with the configured base or the given one', () => {
    expect(qrUrl('456ecbbb', 'https://exemplo.app/')).toBe('https://exemplo.app/?qr=456ecbbb');
  });
});

describe('event trophy redeem', () => {
  it('gives the trophy, the event stamp and a visit, once per profile', () => {
    const store = make();
    expect(hasRedeemed(store)).toBe(false);
    expect(redeemEvent(store, NOW)).toBe('ok');
    expect(store.data.unlocks.evento).toBe(true);
    expect(store.data.stamps).toContain('evento');
    expect(store.data.visits.map((v) => v.partner)).toEqual(['evento']);
    expect(store.data.boostUntil).toBe(0); // the event gives no garden boost
    expect(redeemEvent(store, NOW)).toBe('already');
    expect(store.data.visits).toHaveLength(1);
  });

  it('another child on the same device can redeem their own', () => {
    const store = make();
    redeemEvent(store, NOW);
    const b = store.addProfile('Leo', 'avatar_3', NOW);
    store.switchProfile(b.id);
    expect(hasRedeemed(store)).toBe(false);
    expect(redeemEvent(store, NOW)).toBe('ok');
    expect(store.root.profiles.filter((p) => p.redeemed.includes('trophy_owl'))).toHaveLength(2);
  });
});
