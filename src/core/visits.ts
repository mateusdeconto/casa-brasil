// Finishing a visit: stamp, reward, 2x boost, event for missions and badges.
import { partnerById } from './catalog';
import { grantBoost } from './boost';
import { owns } from './actions';
import type { Store, Visit } from './state';

export const makeVisitId = (profileId: string, partnerId: string, now: number) => `${profileId}-${partnerId}-${now}`;

export interface VisitInput {
  partnerId: string;
  demo: boolean;
  hasPhoto: boolean;
  id?: string;
}

export function completeVisit(store: Store, input: VisitInput, now = Date.now()): { visit: Visit; firstStamp: boolean } {
  const partner = partnerById(input.partnerId);
  const d = store.data;
  const visit: Visit = {
    id: input.id ?? makeVisitId(d.id, partner.id, now),
    partner: partner.id,
    ts: now,
    demo: input.demo,
    hasPhoto: input.hasPhoto,
  };
  d.visits.push(visit);
  const firstStamp = !d.stamps.includes(partner.type);
  if (firstStamp) d.stamps.push(partner.type);

  const wasUnlocked = !!d.unlocks[partner.reward.unlock];
  d.unlocks[partner.reward.unlock] = true;
  if (partner.reward.animal && !owns(store, partner.reward.animal)) d.animals.push({ id: partner.reward.animal, since: now });
  if (partner.boost !== false) grantBoost(d, now);
  store.commit();
  if (!wasUnlocked) store.bus.emit('unlocked', { key: partner.reward.unlock });
  store.bus.emit('visitCompleted', { visit });
  if (input.hasPhoto) store.bus.emit('photoAdded', { visitId: visit.id });
  return { visit, firstStamp };
}

/** Delete a visit's photo flag (the album entry stays, with no picture). */
export function removeVisitPhoto(store: Store, visitId: string): void {
  const v = store.data.visits.find((x) => x.id === visitId);
  if (v) v.hasPhoto = false;
  store.commit();
}
