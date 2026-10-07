// What a student does in school mode: tick activities, write the diary, finish the expedition.
import { expeditionDone } from './expeditions';
import { classStats, classStudents, gardenAnimalIds } from './school';
import type { SchoolExpedition, Store } from './state';

export const progressOf = (store: Store, expId: string): string[] => store.data.school.progress[expId] ?? [];

export function setChecked(store: Store, expId: string, cardId: string, on = true): void {
  const list = progressOf(store, expId).filter((id) => id !== cardId);
  if (on) list.push(cardId);
  store.data.school.progress[expId] = list;
  store.commit();
}

export function saveDiary(store: Store, expId: string, text: string, hasPhoto: boolean, now = Date.now()): void {
  store.data.school.diary[expId] = { text: text.trim(), hasPhoto, ts: now };
  store.commit();
}

export interface Completion {
  ok: boolean;
  completionsBefore: number;
  completionsAfter: number;
  newAnimal: boolean;
}

/** Finishing counts for the class garden and gives the "historico" stamp. Repeating it does nothing. */
export function completeExpedition(store: Store, exp: SchoolExpedition): Completion {
  const d = store.data;
  const stats = () => classStats(classStudents(d)).completions;
  const before = stats();
  if (!expeditionDone(exp, progressOf(store, exp.id)) || d.school.done.includes(exp.id)) {
    return { ok: false, completionsBefore: before, completionsAfter: before, newAnimal: false };
  }
  d.school.done.push(exp.id);
  if (!d.stamps.includes('historico')) d.stamps.push('historico');
  store.commit();
  const after = stats();
  return { ok: true, completionsBefore: before, completionsAfter: after, newAnimal: gardenAnimalIds(after).length > gardenAnimalIds(before).length };
}
