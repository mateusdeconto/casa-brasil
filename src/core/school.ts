// Class view for the school mode: demo students plus the student on this device, class garden and CSV.
import schoolJson from '../data/school.json';
import type { SaveData } from './state';

export interface ClassStudent {
  id: string;
  name: string;
  avatar: string;
  done: number;
  diary: boolean;
  self?: boolean;
}

export const CLASS_NAME = schoolJson.className;
export const CLASS_GOAL = schoolJson.goal;
export const HEAT = schoolJson.heat as number[][];
export const ANIMALS_EVERY = schoolJson.animalsEvery;
const GARDEN_ORDER = schoolJson.gardenOrder;

/** The fixed alphabetical roster. The slot "Você" carries this device's student. */
export function classStudents(self?: Pick<SaveData, 'name' | 'avatar' | 'school'>): ClassStudent[] {
  return (schoolJson.students as ClassStudent[]).map((s) => {
    if (!s.self || !self) return { ...s };
    const done = self.school.done.length;
    const diary = self.school.done.some((id) => !!self.school.diary[id]);
    return { ...s, name: self.name || s.name, avatar: self.avatar || s.avatar, done, diary };
  });
}

export const participated = (s: ClassStudent): boolean => s.done > 0;

export function classStats(students: ClassStudent[]): { participants: number; total: number; completions: number } {
  return { participants: students.filter(participated).length, total: students.length, completions: students.reduce((n, s) => n + s.done, 0) };
}

/** One animal at the start, then a new one for every `every` completions. */
export function gardenAnimalIds(completions: number, every = ANIMALS_EVERY, order = GARDEN_ORDER): string[] {
  return order.slice(0, Math.min(order.length, 1 + Math.floor(completions / every)));
}

/** How many more completions until the next animal arrives (0 when the garden is full). */
export function untilNextAnimal(completions: number, every = ANIMALS_EVERY, order = GARDEN_ORDER): number {
  if (gardenAnimalIds(completions, every, order).length >= order.length) return 0;
  return every - (completions % every);
}

const csvCell = (v: string | number): string => {
  // a name that starts with = + - @ would run as a formula in Excel or Sheets: defuse it
  const s = typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Teacher report: student, expeditions finished, field diary handed in. */
export function reportCsv(students: ClassStudent[]): string {
  const rows = [['aluno', 'expedições concluídas', 'diário entregue'], ...students.map((s) => [s.name, s.done, s.done > 0 && s.diary ? 'sim' : 'não'])];
  return `﻿${rows.map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
