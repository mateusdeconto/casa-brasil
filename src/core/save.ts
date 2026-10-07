// localStorage persistence (versioned key). Never throws; falls back to memory when storage is blocked.
import { SAVE_KEY, SAVE_KEY_V1 } from '../config';
import { migrateV1, normalizeRoot, type SaveV1 } from './migrate';
import { defaultRoot, type RootSave } from './state';

let storageOk = true;
let frozen = false;
/** After a reset or demo load the page reloads: nothing may overwrite the new save on the way out. */
export const freezeSaves = (): void => {
  frozen = true;
};
export const storageWorks = () => storageOk;

export function loadSave(now = Date.now()): RootSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as RootSave;
      if (data.v === 2) return normalizeRoot(data, now);
    }
    const old = localStorage.getItem(SAVE_KEY_V1);
    if (old) {
      const v1 = JSON.parse(old) as SaveV1;
      if (v1.v === 1) return migrateV1(v1, now);
    }
  } catch {
    storageOk = false;
  }
  return defaultRoot(now);
}

export function writeSave(data: RootSave, now = Date.now()): void {
  if (frozen) return;
  try {
    data.time = now;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    storageOk = false; // storage blocked (private mode): the game keeps running without saving
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_V1);
  } catch {
    // nothing to clear
  }
}

/** Save on every change and when the page is hidden or closed. */
export function autoSave(getData: () => RootSave, onChange: (fn: () => void) => void): void {
  const save = () => writeSave(getData());
  onChange(save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
}
