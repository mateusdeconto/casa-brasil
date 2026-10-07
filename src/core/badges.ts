// Medals ("conquistas"): simple rules over the child's profile and the family.
import { FAMILY_BADGE_OUTINGS, FAMILY_BADGE_PROFILES } from '../config';
import type { RootSave, SaveData } from './state';

export interface BadgeDef {
  id: string;
  name: string;
  how: string;
  sprite: string;
  earned: (d: SaveData, root: RootSave) => boolean;
}

const visited = (d: SaveData, type: string) => d.stamps.includes(type);

export const BADGES: BadgeDef[] = [
  { id: 'primeira_visita', name: 'Primeira Visita', how: 'Faça a sua primeira visita a um parceiro.', sprite: 'badge_primeira_visita', earned: (d) => d.visits.length >= 1 },
  { id: 'arte', name: 'Detetive da Arte', how: 'Visite um museu e fotografe o lugar.', sprite: 'badge_arte', earned: (d) => visited(d, 'museu') },
  { id: 'parque', name: 'Guardião do Parque', how: 'Visite um parque da cidade.', sprite: 'badge_parque', earned: (d) => visited(d, 'parque') },
  { id: 'ciencia', name: 'Cientista Curioso', how: 'Visite um centro de ciências.', sprite: 'badge_ciencia', earned: (d) => visited(d, 'ciencia') },
  {
    id: 'biodiversidade', name: 'Explorador da Biodiversidade', how: 'Visite o zoológico e tenha 3 animais no jardim.', sprite: 'badge_biodiversidade',
    earned: (d) => visited(d, 'zoo') && d.animals.length >= 3,
  },
  {
    id: 'familia', name: 'Família Exploradora', sprite: 'badge_familia',
    how: `Tenha ${FAMILY_BADGE_PROFILES} perfis ativos ou combine ${FAMILY_BADGE_OUTINGS} saídas com a família.`,
    earned: (d, root) => root.profiles.filter((p) => p.started).length >= FAMILY_BADGE_PROFILES || d.outings.length >= FAMILY_BADGE_OUTINGS,
  },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)!;

/** Marks and returns the medals that just became earned. */
export function evaluateBadges(d: SaveData, root: RootSave, now: number): string[] {
  const fresh: string[] = [];
  for (const b of BADGES) {
    if (d.badges[b.id] || !b.earned(d, root)) continue;
    d.badges[b.id] = now;
    fresh.push(b.id);
  }
  return fresh;
}
