import { describe, expect, it } from 'vitest';
import { BADGES, evaluateBadges } from '../src/core/badges';
import { dayKey, weekKey } from '../src/core/dates';
import { Emitter, type GameEvents } from '../src/core/events';
import { allMissionsDone, bumpMissions, ensureMissions, featuredPartnerId, missionIdsForWeek } from '../src/core/missions';
import { nextOuting, outingLabel, planOuting, shareText } from '../src/core/outings';
import { attachProgress } from '../src/core/progress';
import { defaultRoot, Store } from '../src/core/state';
import { completeVisit } from '../src/core/visits';

// Wednesday 2026-10-07 at noon local time
const WED = new Date(2026, 9, 7, 12).getTime();
const NEXT_WED = new Date(2026, 9, 14, 12).getTime();
const DAY = 86_400_000;

describe('week keys', () => {
  it('the week starts on Monday', () => {
    expect(weekKey(WED)).toBe('2026-10-05');
    expect(weekKey(new Date(2026, 9, 11, 23).getTime())).toBe('2026-10-05'); // Sunday still belongs to it
    expect(weekKey(new Date(2026, 9, 12, 0, 5).getTime())).toBe('2026-10-12'); // Monday starts a new one
  });
});

describe('weekly missions', () => {
  it('start with 3 missions at zero', () => {
    const d = defaultRoot(WED).profiles[0];
    expect(ensureMissions(d, WED)).toBe(true);
    expect(d.missions!.items).toHaveLength(3);
    expect(d.missions!.items.every((m) => m.progress === 0)).toBe(true);
    expect(ensureMissions(d, WED + DAY)).toBe(false);
  });

  it('are renewed on Monday with a different set and zeroed progress', () => {
    const d = defaultRoot(WED).profiles[0];
    ensureMissions(d, WED);
    bumpMissions(d, 'visit', WED);
    const before = d.missions!.items.map((m) => m.id);
    expect(ensureMissions(d, NEXT_WED)).toBe(true);
    const after = d.missions!.items.map((m) => m.id);
    expect(after).not.toEqual(before);
    expect(d.missions!.week).toBe('2026-10-12');
    expect(d.missions!.items.every((m) => m.progress === 0)).toBe(true);
    expect(d.missions!.rewarded).toBe(false);
  });

  it('the set is the same all week and repeats every 4 weeks', () => {
    expect(missionIdsForWeek('2026-10-05')).toEqual(missionIdsForWeek(weekKey(WED)));
    expect(missionIdsForWeek('2026-10-05')).toEqual(missionIdsForWeek('2026-11-02'));
    expect(missionIdsForWeek('2026-10-05')).not.toEqual(missionIdsForWeek('2026-10-12'));
  });

  it('events advance only their own kind and the 3 together unlock the star once', () => {
    const d = defaultRoot(WED).profiles[0];
    ensureMissions(d, WED);
    d.missions!.items = [{ id: 'visit1', progress: 0 }, { id: 'photo1', progress: 0 }, { id: 'collect5', progress: 0 }];
    expect(bumpMissions(d, 'visit', WED).completed).toEqual(['visit1']);
    expect(d.missions!.items[1].progress).toBe(0);
    bumpMissions(d, 'photo', WED);
    for (let i = 0; i < 4; i++) expect(bumpMissions(d, 'collect', WED).rewardGiven).toBe(false);
    expect(d.unlocks.semana).toBe(false);
    const last = bumpMissions(d, 'collect', WED);
    expect(last.rewardGiven).toBe(true);
    expect(allMissionsDone(d.missions)).toBe(true);
    expect(d.unlocks.semana).toBe(true);
    expect(bumpMissions(d, 'collect', WED).rewardGiven).toBe(false);
  });

  it('the featured expedition rotates every week', () => {
    const ids = ['zoo', 'museu', 'parque', 'ciencia'];
    const a = featuredPartnerId('2026-10-05', ids);
    const b = featuredPartnerId('2026-10-12', ids);
    expect(a).not.toBe(b);
    expect(featuredPartnerId('2026-11-02', ids)).toBe(a);
  });
});

describe('badges', () => {
  const make = () => defaultRoot(WED);

  it('unlock by simple rules', () => {
    const root = make();
    const d = root.profiles[0];
    expect(evaluateBadges(d, root, WED)).toEqual([]);
    d.visits.push({ id: 'v1', partner: 'museu', ts: WED, demo: true, hasPhoto: false });
    d.stamps.push('museu');
    expect(evaluateBadges(d, root, WED).sort()).toEqual(['arte', 'primeira_visita']);
    expect(evaluateBadges(d, root, WED)).toEqual([]); // never twice
    expect(d.badges.arte).toBe(WED);
  });

  it('biodiversity needs the zoo plus 3 animals', () => {
    const root = make();
    const d = root.profiles[0];
    d.stamps.push('zoo');
    d.animals = [{ id: 'capybara', since: 0 }, { id: 'jaguar', since: 0 }];
    expect(evaluateBadges(d, root, WED)).not.toContain('biodiversidade');
    d.animals.push({ id: 'toucan', since: 0 });
    expect(evaluateBadges(d, root, WED)).toContain('biodiversidade');
  });

  it('family badge: 3 active profiles or 3 planned outings', () => {
    const root = make();
    const d = root.profiles[0];
    expect(BADGES.find((b) => b.id === 'familia')!.earned(d, root)).toBe(false);
    for (const day of ['2026-10-10', '2026-10-11', '2026-10-12']) planOuting(d, { partner: 'zoo', day }, WED);
    expect(BADGES.find((b) => b.id === 'familia')!.earned(d, root)).toBe(true);

    const root2 = make();
    root2.profiles.push({ ...root2.profiles[0], id: 'p2', started: true }, { ...root2.profiles[0], id: 'p3', started: true });
    root2.profiles[0].started = true;
    expect(BADGES.find((b) => b.id === 'familia')!.earned(root2.profiles[0], root2)).toBe(true);
  });
});

describe('progress wiring', () => {
  it('a demo visit moves the visit, photo and unlock missions and grants the first medal', () => {
    const bus = new Emitter<GameEvents>();
    const store = new Store(defaultRoot(WED), bus);
    attachProgress(bus, store, () => WED);
    const badges: string[] = [];
    bus.on('badgeEarned', ({ id }) => badges.push(id));
    store.data.missions = { week: weekKey(WED), rewarded: false, items: [{ id: 'visit1', progress: 0 }, { id: 'photo1', progress: 0 }, { id: 'unlock1', progress: 0 }] };
    completeVisit(store, { partnerId: 'zoo', demo: true, hasPhoto: true }, WED);
    expect(store.data.missions!.items.map((m) => m.progress)).toEqual([1, 1, 1]);
    expect(store.data.unlocks.semana).toBe(true);
    expect(badges).toContain('primeira_visita');
  });
});

describe('outings', () => {
  it('keeps the soonest one and formats it', () => {
    const d = defaultRoot(WED).profiles[0];
    planOuting(d, { partner: 'museu', day: '2026-10-17', time: '14:30' }, WED);
    planOuting(d, { partner: 'zoo', day: '2026-10-10' }, WED);
    expect(nextOuting(d, WED)!.partner).toBe('zoo');
    expect(outingLabel(nextOuting(d, WED)!)).toBe('sábado, 10h');
    expect(outingLabel(d.outings[1])).toBe('sábado, 14h30');
    expect(nextOuting(d, new Date(2026, 9, 11, 12).getTime())!.partner).toBe('museu');
    expect(nextOuting(d, new Date(2026, 9, 18, 12).getTime())).toBeNull();
  });

  it('planning the same day again replaces it', () => {
    const d = defaultRoot(WED).profiles[0];
    planOuting(d, { partner: 'zoo', day: '2026-10-10' }, WED);
    planOuting(d, { partner: 'parque', day: '2026-10-10', time: '09:00' }, WED);
    expect(d.outings).toHaveLength(1);
    expect(d.outings[0].partner).toBe('parque');
  });

  it('share text names the place, day and hour', () => {
    const t = shareText({ partner: 'zoo', day: '2026-10-10', time: '10:00', agreedAt: 0 });
    expect(t).toContain('Zoológico');
    expect(t).toContain('sábado');
    expect(t).toContain('10/10');
    expect(t).toContain('10h');
  });

  it('dayKey is the local calendar day', () => {
    expect(dayKey(WED)).toBe('2026-10-07');
  });
});
