// Shared state for the school pages: the same save as the game (this device = one class demo).
import { Emitter, type GameEvents } from '../core/events';
import { attachProgress } from '../core/progress';
import { autoSave, loadSave } from '../core/save';
import { Store, type SchoolExpedition } from '../core/state';
import { generateExpedition } from '../core/expeditions';

export interface SchoolCtx {
  store: Store;
  bus: Emitter<GameEvents>;
  root: HTMLElement;
  /** the expedition students see: the last one the teacher published, or the demo one */
  current(): SchoolExpedition;
  navigate(hash: string): void;
}

export const DEMO_EXPEDITION_ID = 'demo-biodiversidade';

export function createCtx(root: HTMLElement, navigate: (hash: string) => void): SchoolCtx {
  const bus = new Emitter<GameEvents>();
  const store = new Store(loadSave(), bus);
  autoSave(() => store.root, (fn) => bus.on('changed', fn));
  attachProgress(bus, store);
  const demo = generateExpedition('Biodiversidade', 0, DEMO_EXPEDITION_ID);
  return {
    store,
    bus,
    root,
    current: () => store.root.school.expeditions[store.root.school.expeditions.length - 1] ?? demo,
    navigate,
  };
}
