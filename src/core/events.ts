// Tiny typed event emitter. One instance is created in main.ts and passed around.
type Handler<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private handlers: { [K in keyof Events]?: Handler<Events[K]>[] } = {};

  on<K extends keyof Events>(name: K, fn: Handler<Events[K]>): () => void {
    (this.handlers[name] ??= []).push(fn);
    return () => {
      this.handlers[name] = this.handlers[name]?.filter((h) => h !== fn);
    };
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    this.handlers[name]?.forEach((fn) => fn(payload));
  }
}

import type { Visit } from './state';

export type Tab = 'home' | 'garden' | 'shop' | 'edit' | 'avatar' | 'family' | 'album' | 'gallery' | 'galleryEdit';

export interface EditorState {
  mode: 'none' | 'place' | 'edit';
  valid: boolean;
  name?: string;
  price?: number;
  selected?: boolean;
  /** prize items (trophy, star) cannot be sold */
  noSell?: boolean;
}

export interface GameEvents extends Record<string, unknown> {
  changed: void; // state changed, should be saved
  coins: number; // new coin total
  tab: Tab; // nav bar selection
  avatarChosen: { avatar: string; name: string };
  shopPick: string; // furniture id chosen in the shop
  toast: string;
  editor: EditorState;
  animalTap: { id: string; look: 'forSale' | 'locked' };
  gardenChanged: void;
  visitCard: { unlock?: string };
  profileChanged: string;
  /** a real or demo visit finished (stamp given, reward applied) */
  visitCompleted: { visit: Visit };
  /** coins collected from an animal in the garden */
  collected: { animal: string; coins: number };
  /** a shop item or animal became available */
  unlocked: { key: string };
  photoAdded: { visitId: string };
  badgeEarned: { id: string };
  /** open the 3-step visit flow, optionally for a given partner */
  startVisit: { partner?: string; preGps?: boolean };
  openPage: { page: string; arg?: string };
  openParent: void;
  /** the avatar was sent walking in the house (tutorial step 1) */
  walked: void;
  openSettings: void;
  openGallery: void;
  /** a gallery wing level was built */
  galleryBuilt: { level: number };
  /** the house grew: the room scene restarts with the bigger picture */
  houseBuilt: { level: number };
  /** a gallery exhibit was tapped (show its "você sabia?") */
  pieceTap: { id: string };
  coinsFly: { x: number; y: number; amount: number };
  [key: string]: unknown;
}
