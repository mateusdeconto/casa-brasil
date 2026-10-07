// Save migration: v1 (single child) -> v2 (profiles, visits, badges...). Nothing from v1 is lost.
import { defaultProfile, defaultRoot, defaultSettings, type RootSave, type SaveData } from './state';

export interface SaveV1 {
  v: 1;
  avatar: string;
  name: string;
  coins: number;
  furniture: SaveData['furniture'];
  animals: SaveData['animals'];
  unlocks: { zoo?: boolean; museum?: boolean };
  time: number;
  started: boolean;
}

export function migrateV1(old: SaveV1, now = Date.now()): RootSave {
  const base = defaultProfile('p1', old.time ?? now);
  const profile: SaveData = {
    ...base,
    avatar: old.avatar ?? base.avatar,
    name: old.name ?? '',
    coins: old.coins ?? base.coins,
    furniture: old.furniture ?? base.furniture,
    animals: old.animals ?? base.animals,
    unlocks: { ...base.unlocks, zoo: !!old.unlocks?.zoo, museu: !!old.unlocks?.museum },
    time: old.time ?? now,
    started: !!old.started,
  };
  return { ...defaultRoot(now), profiles: [profile], time: old.time ?? now };
}

/** Fill any field a partial/older v2 save lacks, keeping what is there. */
export function normalizeRoot(raw: Partial<RootSave>, now = Date.now()): RootSave {
  const root = defaultRoot(now);
  const profiles = (raw.profiles?.length ? raw.profiles : root.profiles).map((p, i) => ({
    ...defaultProfile(p.id ?? `p${i + 1}`, now),
    ...p,
    unlocks: { ...defaultProfile().unlocks, ...p.unlocks },
    school: { done: p.school?.done ?? [], diary: p.school?.diary ?? {} },
  }));
  const activeId = profiles.some((p) => p.id === raw.activeId) ? (raw.activeId as string) : profiles[0].id;
  return {
    ...root,
    ...raw,
    v: 2,
    profiles,
    activeId,
    settings: { ...defaultSettings(), ...raw.settings },
    school: { expeditions: raw.school?.expeditions ?? [], localDone: raw.school?.localDone ?? [] },
  };
}
