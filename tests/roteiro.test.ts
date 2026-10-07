import { describe, expect, it } from 'vitest';
import { PLACE_PARTNERS } from '../src/core/catalog';
import { planOuting, regenerateRoteiro, swapSlot, toggleDone } from '../src/core/outings';
import { addMinutes, buildRoteiro, roteiroText, travelMinutes } from '../src/core/roteiro';
import { defaultProfile } from '../src/core/state';

const plan = { partner: 'zoo', day: '2026-10-10', time: '10:00', seed: 3 };

describe('roteiro timeline', () => {
  it('adds minutes across the hour and past midnight', () => {
    expect(addMinutes('10:50', 25)).toBe('11:15');
    expect(addMinutes('23:30', 45)).toBe('00:15');
    expect(travelMinutes(3.2)).toBe(20);
    expect(travelMinutes(0.1)).toBe(10);
  });

  it('starts at the chosen time, has no gaps and ends after the trip back', () => {
    const r = buildRoteiro(plan);
    expect(r.steps[0]).toMatchObject({ kind: 'saida', time: '10:00' });
    r.steps.forEach((s, i) => {
      if (i) expect(s.time).toBe(addMinutes(r.steps[i - 1].time, r.steps[i - 1].minutes));
    });
    const last = r.steps[r.steps.length - 1];
    expect(last.kind).toBe('volta');
    expect(r.end).toBe(addMinutes(last.time, last.minutes));
    expect(r.steps.map((s) => s.kind)).toEqual(['saida', 'trajeto', 'chegada', 'carimbo', 'visita', 'visita', 'lanche', 'visita', 'visita', 'volta']);
  });

  it('is complete for every place and always carries the place mission and the stamp step', () => {
    for (const p of PLACE_PARTNERS) {
      const r = buildRoteiro({ partner: p.id, day: '2026-10-10', time: '09:30', seed: 11 });
      expect(r.before).toHaveLength(2);
      expect(r.after).toHaveLength(2);
      expect(r.bring.length).toBeGreaterThanOrEqual(5);
      expect(r.steps.find((s) => s.id === 's-missao')?.detail).toBe(p.mission);
      expect(r.steps.find((s) => s.kind === 'carimbo')?.detail).toContain('sem pessoas');
      expect(JSON.stringify(r)).not.toMatch(/\{lugar\}|\{missao\}/);
    }
  });

  it('never asks for photos of people', () => {
    for (const p of PLACE_PARTNERS) {
      for (let seed = 0; seed < 12; seed++) {
        const text = roteiroText(buildRoteiro({ partner: p.id, day: '2026-10-10', time: '10:00', seed }));
        expect(text).not.toMatch(/foto d[eao]s? (pessoa|criança|família|voc)/i);
      }
    }
  });
});

describe('roteiro choices', () => {
  it('is the same for the same outing and different seeds change the ideas', () => {
    const a = buildRoteiro(plan);
    expect(buildRoteiro(plan)).toEqual(a);
    const titles = (seed: number) => buildRoteiro({ ...plan, seed }).steps.map((s) => s.title).join('|');
    expect(new Set([0, 1, 2, 3, 4].map(titles)).size).toBeGreaterThan(1);
  });

  it('swapping one slot changes only that slot and never repeats an idea', () => {
    const before = buildRoteiro(plan);
    const swapped = buildRoteiro({ ...plan, swaps: { v1: 1 } });
    const titles = (r: ReturnType<typeof buildRoteiro>) => r.steps.map((s) => s.title);
    const changed = titles(before).filter((t, i) => t !== titles(swapped)[i]);
    expect(changed).toHaveLength(1);
    const all = titles(swapped);
    expect(new Set(all).size).toBe(all.length);
    for (let n = 0; n < 8; n++) {
      const r = buildRoteiro({ ...plan, swaps: { v0: n, v1: n + 1, v2: n + 2, b0: n, b1: n } });
      const t = r.steps.map((s) => s.title);
      expect(new Set(t).size).toBe(t.length);
      expect(new Set(r.before.map((b) => b.title)).size).toBe(r.before.length);
    }
  });

  it('saves the seed, the swaps and the ticks on the outing', () => {
    const d = defaultProfile('p1', 1);
    const o = planOuting(d, { partner: 'museu', day: '2026-10-10', time: '10:00' }, 123_456);
    expect(o).toMatchObject({ seed: 123_456 % 997, swaps: {}, done: [] });
    swapSlot(o, 'v1');
    swapSlot(o, 'v1');
    expect(o.swaps).toEqual({ v1: 2 });
    expect(toggleDone(o, 's-saida')).toBe(true);
    expect(toggleDone(o, 'bring-0')).toBe(true);
    expect(toggleDone(o, 's-saida')).toBe(false);
    expect(o.done).toEqual(['bring-0']);
    regenerateRoteiro(o);
    expect(o).toMatchObject({ swaps: {}, done: [] });
    expect(o.seed).not.toBe(123_456 % 997);
  });
});

describe('roteiro text', () => {
  it('has every section for the family chat', () => {
    const text = roteiroText(buildRoteiro(plan));
    for (const part of ['Roteiro da expedição: Zoológico', 'Antes de sair:', 'O que levar:', 'No dia:', 'Depois, em casa:', 'Feito no Passport.']) expect(text).toContain(part);
    expect(text).toContain('10:00  Saída de casa');
  });
});
