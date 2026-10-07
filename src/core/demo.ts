// Demonstration data for the presentation: a family with 2 children, a decorated house, album, stamps...
// Pure: builds a RootSave. The sample photos are made separately (demoSeed.ts) because they need a canvas.
import { DAY_MS, addDays, dayKey } from './dates';
import { generateExpedition } from './expeditions';
import { makeVisitId } from './visits';
import { defaultProfile, defaultRoot, type RootSave, type SaveData, type Visit } from './state';

export const DEMO_VISITS: { partner: string; daysAgo: number }[] = [
  { partner: 'zoo', daysAgo: 4 },
  { partner: 'parque', daysAgo: 1 },
];

const HOUSE = [
  { id: 'table', x: 0, y: 2 }, { id: 'rug', x: 1, y: 1 }, { id: 'sofa', x: 3, y: 0 }, { id: 'bookshelf', x: 1, y: 0 },
  { id: 'plant', x: 0, y: 0 }, { id: 'guitar', x: 0, y: 1 }, { id: 'lamp', x: 3, y: 3 }, { id: 'vitrine', x: 2, y: 3 }, { id: 'palm', x: 1, y: 3 }, { id: 'trophy_owl', x: 2, y: 0 },
];

/** The coming Saturday (or today when it is Saturday), as a day key. */
export function nextSaturday(now: number): string {
  const wd = new Date(now).getDay();
  return addDays(dayKey(now), (6 - wd + 7) % 7);
}

function ana(now: number): SaveData {
  const p = defaultProfile('p1', now);
  const visits: Visit[] = DEMO_VISITS.map((v) => {
    const ts = now - v.daysAgo * DAY_MS;
    return { id: makeVisitId('p1', v.partner, ts), partner: v.partner, ts, demo: true, hasPhoto: true };
  });
  return {
    ...p,
    name: 'Ana',
    avatar: 'avatar_1',
    coins: 480,
    started: true,
    furniture: HOUSE.map((f, i) => ({ uid: i + 1, ...f })),
    animals: ['capybara', 'toucan', 'tamarin', 'jaguar'].map((id) => ({ id, since: now - 5 * 60_000 })),
    unlocks: { ...p.unlocks, zoo: true, parque: true, evento: true },
    visits,
    stamps: ['zoo', 'parque', 'evento'],
    redeemed: ['trophy_owl'],
    boostUntil: now + 3 * DAY_MS,
    outings: [{ partner: 'museu', day: nextSaturday(now), time: '10:00', agreedAt: now - DAY_MS }],
  };
}

function leo(now: number): SaveData {
  return { ...defaultProfile('p2', now), name: 'Leo', avatar: 'avatar_5', coins: 150, started: true, animals: [{ id: 'capybara', since: now - 60_000 }] };
}

export function buildDemoRoot(now = Date.now()): RootSave {
  const root = defaultRoot(now);
  root.profiles = [ana(now), leo(now)];
  root.activeId = 'p1';
  root.settings.tutorialDone = true;
  root.school.expeditions = [generateExpedition('Biodiversidade', 0, 'demo-turma-biodiversidade')];
  return root;
}
