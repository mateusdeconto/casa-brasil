// Game state shape (save v2), defaults and the Store that owns it.
// One RootSave holds every child profile plus device-wide settings; `store.data` is the active profile.
import { DEFAULT_AVATAR, DEFAULT_DAILY_MINUTES, MAX_PROFILES, START_COINS } from '../config';
import { START_FURNITURE } from './catalog';
import type { Emitter, GameEvents } from './events';

export interface PlacedItem {
  uid: number;
  id: string;
  x: number;
  y: number;
}

export interface AnimalState {
  id: string;
  /** timestamp (ms) from which production accumulates */
  since: number;
}

export interface Visit {
  id: string;
  partner: string;
  ts: number;
  demo: boolean;
  hasPhoto: boolean;
}

export interface MissionState {
  id: string;
  progress: number;
}

export interface WeekMissions {
  /** Monday of the week (day key) */
  week: string;
  items: MissionState[];
  rewarded: boolean;
}

export interface Outing {
  partner: string;
  day: string;
  time: string;
  agreedAt: number;
}

export interface DiaryEntry {
  text: string;
  hasPhoto: boolean;
  ts: number;
}

/** Everything that belongs to one child. */
export interface SaveData {
  id: string;
  avatar: string;
  name: string;
  coins: number;
  furniture: PlacedItem[];
  animals: AnimalState[];
  /** partner type or special key (zoo, museu, parque, ciencia, semana, evento) -> unlocked */
  unlocks: Record<string, boolean>;
  time: number;
  started: boolean;
  visits: Visit[];
  /** partner types stamped in the passport */
  stamps: string[];
  /** badge id -> unlocked at */
  badges: Record<string, number>;
  missions: WeekMissions | null;
  outings: Outing[];
  /** 2x garden production until this timestamp */
  boostUntil: number;
  /** event item ids already redeemed (one per profile) */
  redeemed: string[];
  /** day key -> seconds played */
  usage: Record<string, number>;
  /** school mode, per child */
  school: { done: string[]; diary: Record<string, DiaryEntry>; progress: Record<string, string[]> };
}

export interface Settings {
  sound: boolean;
  textSize: 'normal' | 'grande';
  tutorialDone: boolean;
  /** step to resume the tutorial from (0-3) */
  tutorialStep: number;
  purchasesBlocked: boolean;
  noAds: boolean;
  friendsCircle: boolean;
  dailyLimitMinutes: number;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  ok: string;
  retry: string;
}

export type CardKind = 'quiz' | 'leitura' | 'video' | 'missoes' | 'foto' | 'diario' | 'reflexao' | 'criativa';

export interface ExpeditionCard {
  id: string;
  kind: CardKind;
  title: string;
  hint: string;
  quiz?: QuizQuestion[];
}

export type Phase = 'antes' | 'durante' | 'depois';

export interface SchoolExpedition {
  id: string;
  theme: string;
  title: string;
  columns: Record<Phase, ExpeditionCard[]>;
}

export interface SchoolState {
  /** expeditions the teacher published for the class, newest last */
  expeditions: SchoolExpedition[];
}

export interface RootSave {
  v: 2;
  activeId: string;
  profiles: SaveData[];
  settings: Settings;
  /** PIN stored as a salted hash, only on this device (demo) */
  pinHash: string | null;
  /** wrong PIN tries in a row, and the time until which the keypad stays locked */
  pinFails: number;
  pinLockUntil: number;
  school: SchoolState;
  time: number;
}

export const defaultSettings = (): Settings => ({
  sound: true,
  textSize: 'normal',
  tutorialDone: false,
  tutorialStep: 0,
  purchasesBlocked: true,
  noAds: true,
  friendsCircle: false,
  dailyLimitMinutes: DEFAULT_DAILY_MINUTES,
});

export function defaultProfile(id = 'p1', now = Date.now()): SaveData {
  return {
    id,
    avatar: DEFAULT_AVATAR,
    name: '',
    coins: START_COINS,
    furniture: START_FURNITURE.map((f, i) => ({ uid: i + 1, ...f })),
    animals: [{ id: 'capybara', since: now }],
    unlocks: { zoo: false, museu: false, parque: false, ciencia: false, semana: false, evento: false },
    time: now,
    started: false,
    visits: [],
    stamps: [],
    badges: {},
    missions: null,
    outings: [],
    boostUntil: 0,
    redeemed: [],
    usage: {},
    school: { done: [], diary: {}, progress: {} },
  };
}

export function defaultRoot(now = Date.now()): RootSave {
  return {
    v: 2,
    activeId: 'p1',
    profiles: [defaultProfile('p1', now)],
    settings: defaultSettings(),
    pinHash: null,
    pinFails: 0,
    pinLockUntil: 0,
    school: { expeditions: [] },
    time: now,
  };
}

export class Store {
  constructor(public root: RootSave, readonly bus: Emitter<GameEvents>) {}

  /** The active child's data. */
  get data(): SaveData {
    return this.root.profiles.find((p) => p.id === this.root.activeId) ?? this.root.profiles[0];
  }

  get settings(): Settings {
    return this.root.settings;
  }

  commit(): void {
    this.bus.emit('changed', undefined);
  }

  addCoins(delta: number): void {
    this.data.coins = Math.max(0, this.data.coins + delta);
    this.bus.emit('coins', this.data.coins);
    this.commit();
  }

  nextUid(): number {
    return this.data.furniture.reduce((m, f) => Math.max(m, f.uid), 0) + 1;
  }

  canAddProfile(): boolean {
    return this.root.profiles.length < MAX_PROFILES;
  }

  addProfile(name: string, avatar: string, now = Date.now()): SaveData {
    const n = this.root.profiles.reduce((m, p) => Math.max(m, Number(p.id.slice(1)) || 0), 0) + 1;
    const p = { ...defaultProfile(`p${n}`, now), name, avatar, started: true };
    this.root.profiles.push(p);
    this.commit();
    return p;
  }

  switchProfile(id: string): boolean {
    if (!this.root.profiles.some((p) => p.id === id)) return false;
    this.root.activeId = id;
    this.bus.emit('profileChanged', id);
    this.commit();
    return true;
  }
}
