// Full family itinerary ("roteiro") generated for a planned outing: what to do before, a timeline for the
// day (trip, stamp, activities, snack, way back) and what to do back home. Pure and deterministic:
// the same outing always gives the same roteiro; "trocar" changes one activity at a time.
import data from '../data/roteiros.json';
import { partnerById } from './catalog';
import { weekdayLong } from './dates';
import type { Outing } from './state';

interface PoolItem {
  title: string;
  detail: string;
  minutes?: number;
}
interface PlaceContent {
  outdoor: boolean;
  bring: string[];
  tip: string;
  before: PoolItem[];
  visit: PoolItem[];
  after: PoolItem[];
}

const COMMON = data.common;
const PLACES = data.places as Record<string, PlaceContent>;

export const BEFORE_SLOTS = 2;
export const VISIT_SLOTS = 3; // besides the place mission, which is always there
export const AFTER_SLOTS = 2;
const AVERAGE_KMH = 25;
const TRIP_EXTRA_MIN = 8;
const DEPARTURE_MIN = 5;
const STEP_ROUND = 5;

export interface RoteiroItem {
  id: string;
  title: string;
  detail: string;
  /** can be swapped for another idea of the same kind */
  slot?: string;
}

export type StepKind = 'saida' | 'trajeto' | 'chegada' | 'carimbo' | 'visita' | 'lanche' | 'volta';

export interface RoteiroStep extends RoteiroItem {
  kind: StepKind;
  /** HH:MM */
  time: string;
  minutes: number;
}

export interface Roteiro {
  partnerId: string;
  day: string;
  start: string;
  end: string;
  travelMin: number;
  before: RoteiroItem[];
  steps: RoteiroStep[];
  after: RoteiroItem[];
  bring: string[];
  tip: string;
}

type Plan = Pick<Outing, 'partner' | 'day' | 'time'> & Partial<Pick<Outing, 'seed' | 'swaps'>>;

export const addMinutes = (hhmm: string, min: number): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (((h * 60 + m + min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Minutes of travel for a distance, by car or bus, rounded up to 5. */
export const travelMinutes = (km: number): number => Math.max(10, Math.ceil(((km / AVERAGE_KMH) * 60 + TRIP_EXTRA_MIN) / STEP_ROUND) * STEP_ROUND);

const fill = (text: string, lugar: string, missao: string): string => text.split('{lugar}').join(lugar).split('{missao}').join(missao);

/**
 * Choose `count` different ideas from a pool. The base choice is a rotation starting at the seed;
 * `swaps[slot]` moves one slot to the next idea nobody else uses.
 */
function pickSlots(pool: PoolItem[], from: number, count: number, seed: number, prefix: string, swaps: Record<string, number>): { item: PoolItem; slot: string }[] {
  const len = pool.length - from;
  const start = seed % len;
  const base = Array.from({ length: count }, (_, i) => (start + i) % len);
  const spare = Array.from({ length: len }, (_, i) => (start + count + i) % len).filter((i) => !base.includes(i));
  const used = new Set<number>();
  return base.map((b, i) => {
    const slot = `${prefix}${i}`;
    const options = [b, ...spare].filter((o) => !used.has(o));
    const idx = options[(swaps[slot] ?? 0) % options.length];
    used.add(idx);
    return { item: pool[from + idx], slot };
  });
}

export function buildRoteiro(plan: Plan): Roteiro {
  const partner = partnerById(plan.partner);
  const place = PLACES[partner.type] ?? PLACES.parque;
  const seed = plan.seed ?? 0;
  const swaps = plan.swaps ?? {};
  const lugar = partner.name;
  const t = (s: string) => fill(s, lugar, partner.mission);
  const travelMin = travelMinutes(partner.distanceKm);

  const before = pickSlots(place.before, 0, BEFORE_SLOTS, seed, 'b', swaps).map(({ item, slot }) => ({ id: slot, slot, title: t(item.title), detail: t(item.detail) }));
  const after = pickSlots(place.after, 0, AFTER_SLOTS, seed, 'a', swaps).map(({ item, slot }) => ({ id: slot, slot, title: t(item.title), detail: t(item.detail) }));
  // the first idea of the visit pool is always the place mission
  const mission = place.visit[0];
  const visits = pickSlots(place.visit, 1, VISIT_SLOTS, seed, 'v', swaps);

  const raw: Omit<RoteiroStep, 'time'>[] = [
    { id: 's-saida', kind: 'saida', minutes: DEPARTURE_MIN, title: 'Saída de casa', detail: 'Conferir a lista do que levar e combinar o ponto de encontro.' },
    { id: 's-trajeto', kind: 'trajeto', minutes: travelMin, title: `A caminho: ${lugar}`, detail: t(COMMON.ride[seed % COMMON.ride.length]) },
    { id: 's-chegada', kind: 'chegada', minutes: COMMON.arrivalMinutes, title: `Chegada ao ${lugar}`, detail: 'Olhem o mapa do lugar e escolham por onde começar.' },
    { id: 's-carimbo', kind: 'carimbo', minutes: COMMON.stampMinutes, title: 'Carimbo no Passport', detail: 'Abram o Passport, toquem em "Estou aqui" na aba Família e sigam: Local, Foto (sem pessoas) e Carimbo.' },
    { id: 's-missao', kind: 'visita', minutes: mission.minutes ?? 30, title: t(mission.title), detail: t(mission.detail) },
    { id: 's-v0', kind: 'visita', slot: 'v0', minutes: visits[0].item.minutes ?? 20, title: t(visits[0].item.title), detail: t(visits[0].item.detail) },
    { id: 's-lanche', kind: 'lanche', minutes: COMMON.snackMinutes, title: 'Pausa para o lanche', detail: COMMON.snack },
    ...visits.slice(1).map((v, i) => ({ id: `s-v${i + 1}`, kind: 'visita' as const, slot: v.slot, minutes: v.item.minutes ?? 20, title: t(v.item.title), detail: t(v.item.detail) })),
    { id: 's-volta', kind: 'volta', minutes: travelMin, title: 'Volta para casa', detail: 'Cada um conta, em uma frase, a melhor parte do dia.' },
  ];

  let clock = plan.time;
  const steps = raw.map((s) => {
    const step = { ...s, time: clock };
    clock = addMinutes(clock, s.minutes);
    return step;
  });

  return {
    partnerId: partner.id,
    day: plan.day,
    start: plan.time,
    end: clock,
    travelMin,
    before,
    steps,
    after,
    bring: [...new Set([...COMMON.bring, ...place.bring])],
    tip: place.tip,
  };
}

const hourLabel = (t: string) => (t.endsWith(':00') ? `${Number(t.slice(0, 2))}h` : t.replace(':', 'h'));

/** Plain text of the whole roteiro, to send in a family chat. */
export function roteiroText(r: Roteiro): string {
  const p = partnerById(r.partnerId);
  const lines = [`Roteiro da expedição: ${p.name}`, `${weekdayLong(r.day)}, ${hourLabel(r.start)} até ${hourLabel(r.end)}`, ''];
  lines.push('Antes de sair:', ...r.before.map((b) => `- ${b.title}: ${b.detail}`), '');
  lines.push('O que levar:', ...r.bring.map((b) => `- ${b}`), '');
  lines.push('No dia:', ...r.steps.map((s) => `${s.time}  ${s.title}: ${s.detail}`), '');
  lines.push('Depois, em casa:', ...r.after.map((a) => `- ${a.title}: ${a.detail}`), '', r.tip, 'Feito no Passport.');
  return lines.join('\n');
}

/** Ids the family can tick: the before and after ideas, the bring list items and the steps. */
export const bringId = (i: number): string => `bring-${i}`;
