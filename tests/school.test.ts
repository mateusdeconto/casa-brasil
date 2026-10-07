import { describe, expect, it } from 'vitest';
import { checklistFor, expeditionDone, generateExpedition, newCard, THEMES } from '../src/core/expeditions';
import { classStats, classStudents, gardenAnimalIds, participated, reportCsv, untilNextAnimal } from '../src/core/school';
import { defaultProfile } from '../src/core/state';

describe('demo class', () => {
  it('has 25 students in fixed alphabetical order and 18 participants', () => {
    const list = classStudents();
    expect(list).toHaveLength(25);
    const names = list.map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt')));
    expect(classStats(list)).toMatchObject({ participants: 18, total: 25, completions: 19 });
  });

  it('absent students are simply not marked, never flagged', () => {
    const absent = classStudents().filter((s) => !participated(s));
    expect(absent).toHaveLength(7);
    expect(absent.every((s) => s.done === 0)).toBe(true);
  });

  it('the device student joins the count when an expedition is finished', () => {
    const me = defaultProfile('p1', 0);
    me.name = 'Ana';
    expect(classStats(classStudents(me)).participants).toBe(18);
    me.school.done.push('exp-1');
    me.school.diary['exp-1'] = { text: 'Vi uma onça', hasPhoto: false, ts: 1 };
    const list = classStudents(me);
    expect(classStats(list)).toMatchObject({ participants: 19, completions: 20 });
    expect(list.find((s) => s.self)).toMatchObject({ name: 'Ana', done: 1, diary: true });
  });
});

describe('class garden', () => {
  it('starts with one animal and gains one for every 5 completions', () => {
    expect(gardenAnimalIds(0)).toHaveLength(1);
    expect(gardenAnimalIds(4)).toHaveLength(1);
    expect(gardenAnimalIds(5)).toHaveLength(2);
    expect(gardenAnimalIds(19)).toHaveLength(4);
    expect(gardenAnimalIds(20)).toHaveLength(5);
    expect(gardenAnimalIds(20).slice(0, 2)).toEqual(['capybara', 'toucan']);
  });

  it('never grows past the available animals', () => {
    expect(gardenAnimalIds(10_000)).toHaveLength(7);
    expect(untilNextAnimal(10_000)).toBe(0);
  });

  it('says how many are missing for the next one', () => {
    expect(untilNextAnimal(19)).toBe(1);
    expect(untilNextAnimal(20)).toBe(5);
    expect(untilNextAnimal(0)).toBe(5);
  });
});

describe('CSV report', () => {
  const lines = reportCsv(classStudents()).replace('﻿', '').trim().split('\r\n');

  it('has a header and one row per student', () => {
    expect(lines[0]).toBe('aluno,expedições concluídas,diário entregue');
    expect(lines).toHaveLength(26);
  });

  it('reports finished expeditions and the diary as sim or não', () => {
    expect(lines).toContain('Alice,1,sim');
    expect(lines).toContain('Beatriz,0,não');
    expect(lines).toContain('Júlia,2,sim');
    expect(lines).toContain('Caio,1,não');
  });

  it('starts with a BOM so Excel reads the accents, and quotes odd names', () => {
    expect(reportCsv([]).charCodeAt(0)).toBe(0xfeff);
    const csv = reportCsv([{ id: 'x', name: 'Ana, "a" Silva', avatar: 'avatar_1', done: 1, diary: true }]);
    expect(csv).toContain('"Ana, ""a"" Silva",1,sim');
  });

  it('defuses names that would run as a spreadsheet formula', () => {
    const row = (name: string) => reportCsv([{ id: 'x', name, avatar: 'avatar_1', done: 0, diary: false }]).split('\r\n')[1];
    expect(row('=SOMA(A1)')).toBe("'=SOMA(A1),0,não");
    expect(row('+55 11')).toBe("'+55 11,0,não");
    expect(row('@ana')).toBe("'@ana,0,não");
    expect(row('-1')).toBe("'-1,0,não");
    expect(row('Ana')).toBe('Ana,0,não');
  });

  it('a diary without a finished expedition is not counted as handed in', () => {
    const csv = reportCsv([{ id: 'x', name: 'Zé', avatar: 'avatar_1', done: 0, diary: true }]);
    expect(csv).toContain('Zé,0,não');
  });
});

describe('expedition suggestions (templates, no API)', () => {
  it('every theme gives 3 phases with cards and ids that are unique', () => {
    for (const theme of THEMES) {
      const e = generateExpedition(theme, 0, 'exp-test');
      expect(e.theme).toBe(theme);
      expect(e.columns.antes.length).toBeGreaterThan(0);
      expect(e.columns.durante.length).toBeGreaterThan(0);
      expect(e.columns.depois.length).toBeGreaterThan(0);
      const ids = checklistFor(e).map((c) => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has the 5 themes asked for and a quiz with feedback and no score', () => {
    expect(THEMES).toEqual(['Biodiversidade', 'Arte', 'Ciências', 'Meio ambiente', 'História']);
    const quiz = generateExpedition('Arte').columns.antes.find((c) => c.kind === 'quiz')!;
    expect(quiz.quiz!.length).toBeGreaterThanOrEqual(3);
    for (const q of quiz.quiz!) {
      expect(q.options[q.answer]).toBeTruthy();
      expect(q.ok.length).toBeGreaterThan(5);
      expect(q.retry.length).toBeGreaterThan(5);
    }
  });

  it('a second suggestion rewords some cards', () => {
    const a = generateExpedition('Biodiversidade', 0, 'x');
    const b = generateExpedition('Biodiversidade', 1, 'x');
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it('the expedition is done only when every card is ticked', () => {
    const e = generateExpedition('Ciências', 0, 'e');
    const ids = checklistFor(e).map((c) => c.id);
    expect(expeditionDone(e, ids.slice(1))).toBe(false);
    expect(expeditionDone(e, ids)).toBe(true);
    expect(expeditionDone({ ...e, columns: { antes: [], durante: [], depois: [] } }, [])).toBe(false);
  });

  it('new cards get sensible defaults', () => {
    const c = newCard('foto', 'c1', 'Arte');
    expect(c.hint).toContain('sem pessoas');
    expect(newCard('quiz', 'c2', 'Arte').quiz!.length).toBeGreaterThan(0);
  });
});
