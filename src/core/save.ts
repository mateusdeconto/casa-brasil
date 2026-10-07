// localStorage persistence (versioned key). Never throws.
import { SAVE_KEY } from '../config';
import { defaultSave, type SaveData } from './state';

export function loadSave(now = Date.now()): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave(now);
    const data = JSON.parse(raw) as SaveData;
    if (data.v !== 1) return defaultSave(now);
    return { ...defaultSave(now), ...data };
  } catch {
    return defaultSave(now);
  }
}

export function writeSave(data: SaveData, now = Date.now()): void {
  try {
    data.time = now;
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // storage blocked (private mode): the game keeps running without saving
  }
}

/** Save on every change and when the page is hidden or closed. */
export function autoSave(getData: () => SaveData, onChange: (fn: () => void) => void): void {
  const save = () => writeSave(getData());
  onChange(save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
  window.addEventListener('pagehide', save);
}
