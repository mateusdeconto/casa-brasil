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

export type Tab = 'home' | 'garden' | 'shop' | 'edit' | 'avatar';

export interface EditorState {
  mode: 'none' | 'place' | 'edit';
  valid: boolean;
  name?: string;
  price?: number;
  selected?: boolean;
}

export interface GameEvents extends Record<string, unknown> {
  changed: void; // state changed, should be saved
  coins: number; // new coin total
  tab: Tab; // nav bar selection
  avatarChosen: { avatar: string; name: string };
  shopPick: string; // furniture id chosen in the shop
  toast: string;
  editor: EditorState;
  [key: string]: unknown;
}
