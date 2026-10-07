// Wires game events to missions and badges. Pure rules live in missions.ts and badges.ts.
import type { Emitter, GameEvents } from './events';
import { evaluateBadges } from './badges';
import { bumpMissions, ensureMissions, missionDef, type MissionKind } from './missions';
import type { Store } from './state';

export function attachProgress(bus: Emitter<GameEvents>, store: Store, now: () => number = Date.now): void {
  const bump = (kind: MissionKind) => {
    const r = bumpMissions(store.data, kind, now());
    r.completed.forEach((id) => bus.emit('toast', `Missão cumprida: ${missionDef(id).text}`));
    if (r.rewardGiven) {
      bus.emit('toast', 'As 3 missões da semana! Estrela liberada na loja.');
      bus.emit('unlocked', { key: 'semana' });
    }
    store.commit();
  };

  bus.on('visitCompleted', () => bump('visit'));
  bus.on('photoAdded', () => bump('photo'));
  bus.on('unlocked', ({ key }) => key !== 'semana' && bump('unlock'));
  bus.on('collected', () => bump('collect'));

  let checking = false;
  const check = () => {
    if (checking) return;
    checking = true;
    ensureMissions(store.data, now());
    const fresh = evaluateBadges(store.data, store.root, now());
    if (fresh.length) {
      fresh.forEach((id) => bus.emit('badgeEarned', { id }));
      store.commit();
    }
    checking = false;
  };
  bus.on('changed', check);
  bus.on('profileChanged', check);
  check();
}
