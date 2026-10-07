// Weekly missions: 3 per week, renewed every Monday, advanced by game events.
import { MISSIONS_PER_WEEK } from '../config';
import missionsJson from '../data/missions.json';
import { DAY_MS, parseDayKey, weekKey } from './dates';
import type { SaveData, WeekMissions } from './state';

export type MissionKind = 'visit' | 'photo' | 'unlock' | 'collect';

export interface MissionDef {
  id: string;
  kind: MissionKind;
  goal: number;
  text: string;
}

const POOL = missionsJson.pool as Record<string, Omit<MissionDef, 'id'>>;
export const missionDef = (id: string): MissionDef => ({ id, ...POOL[id] });

/** Whole weeks since the epoch for a Monday day key: consecutive Mondays differ by exactly 1. */
export function weekIndex(monday: string): number {
  const d = parseDayKey(monday);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / (7 * DAY_MS));
}

export function missionIdsForWeek(monday: string): string[] {
  const combos = missionsJson.combos;
  return combos[weekIndex(monday) % combos.length].slice(0, MISSIONS_PER_WEEK);
}

/** Starts a fresh set when the week changed (or none exists). Returns true if it renewed. */
export function ensureMissions(d: SaveData, now: number): boolean {
  const week = weekKey(now);
  if (d.missions?.week === week) return false;
  d.missions = { week, items: missionIdsForWeek(week).map((id) => ({ id, progress: 0 })), rewarded: false };
  return true;
}

export const missionDone = (m: { id: string; progress: number }): boolean => m.progress >= POOL[m.id].goal;

export const allMissionsDone = (w: WeekMissions | null): boolean => !!w && w.items.length > 0 && w.items.every(missionDone);

export interface MissionResult {
  completed: string[];
  /** true the moment the third mission is done and the week's reward is given */
  rewardGiven: boolean;
}

/** Advance every mission of this kind. The first time all 3 are done, unlocks the star award. */
export function bumpMissions(d: SaveData, kind: MissionKind, now: number, by = 1): MissionResult {
  ensureMissions(d, now);
  const w = d.missions!;
  const completed: string[] = [];
  for (const m of w.items) {
    if (POOL[m.id].kind !== kind || missionDone(m)) continue;
    m.progress = Math.min(POOL[m.id].goal, m.progress + by);
    if (missionDone(m)) completed.push(m.id);
  }
  let rewardGiven = false;
  if (!w.rewarded && allMissionsDone(w)) {
    w.rewarded = true;
    d.unlocks.semana = true;
    rewardGiven = true;
  }
  return { completed, rewardGiven };
}

/** The partner featured as "Expedição da semana": rotates with the week number. */
export function featuredPartnerId(monday: string, partnerIds: string[]): string {
  return partnerIds[weekIndex(monday) % partnerIds.length];
}
