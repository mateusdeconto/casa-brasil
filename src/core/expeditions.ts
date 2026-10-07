// Digital expeditions: template-based suggestions (the "IA", no external API) and card helpers.
import templates from '../data/expeditionTemplates.json';
import type { CardKind, ExpeditionCard, Phase, QuizQuestion, SchoolExpedition } from './state';

export const PHASES: { id: Phase; label: string }[] = [
  { id: 'antes', label: 'Antes da visita' },
  { id: 'durante', label: 'Durante a visita' },
  { id: 'depois', label: 'Depois da visita' },
];

export const THEMES = Object.keys(templates.themes);

export const CARD_KINDS: { kind: CardKind; label: string; icon: string }[] = [
  { kind: 'quiz', label: 'Quiz', icon: 'clipboard' },
  { kind: 'leitura', label: 'Leitura', icon: 'notebook' },
  { kind: 'video', label: 'Vídeo', icon: 'camera' },
  { kind: 'missoes', label: 'Missões no local', icon: 'mappin' },
  { kind: 'foto', label: 'Foto do local', icon: 'camera' },
  { kind: 'diario', label: 'Diário de campo', icon: 'notebook' },
  { kind: 'reflexao', label: 'Reflexão em grupo', icon: 'family' },
  { kind: 'criativa', label: 'Produção criativa', icon: 'star' },
];

export const kindInfo = (k: CardKind) => CARD_KINDS.find((c) => c.kind === k)!;

interface TemplateCard {
  kind: CardKind;
  title: string;
  hint: string;
  alt?: { kind: CardKind; title: string; hint: string };
}
interface Theme {
  title: string;
  banner: string;
  badge: string;
  antes: TemplateCard[];
  durante: TemplateCard[];
  depois: TemplateCard[];
  quiz: QuizQuestion[];
}
const THEME = templates.themes as unknown as Record<string, Theme>;

export const themeBanner = (theme: string): string => THEME[theme]?.banner ?? 'jaguar';
export const themeBadge = (theme: string): string => THEME[theme]?.badge ?? 'badge_biodiversidade';

/** A fresh suggestion. `variant` (0, 1, 2...) swaps in the alternative wording on odd values. */
export function generateExpedition(theme: string, variant = 0, id = `exp-${Date.now()}`): SchoolExpedition {
  const t = THEME[theme] ?? THEME[THEMES[0]];
  const pick = (c: TemplateCard) => (variant % 2 && c.alt ? c.alt : c);
  const column = (phase: Phase): ExpeditionCard[] =>
    t[phase].map((c, i) => {
      const p = pick(c);
      return { id: `${id}-${phase}${i}`, kind: p.kind, title: p.title, hint: p.hint, ...(p.kind === 'quiz' ? { quiz: t.quiz } : {}) };
    });
  return { id, theme: THEMES.includes(theme) ? theme : THEMES[0], title: t.title, columns: { antes: column('antes'), durante: column('durante'), depois: column('depois') } };
}

const DEFAULT_TEXT: Record<CardKind, { title: string; hint: string }> = {
  quiz: { title: 'Novo quiz', hint: 'Perguntas rápidas, sem nota' },
  leitura: { title: 'Nova leitura', hint: 'Um texto curto sobre o tema' },
  video: { title: 'Novo vídeo', hint: 'Um vídeo para contextualizar' },
  missoes: { title: 'Nova missão no local', hint: 'Observar e registrar' },
  foto: { title: 'Foto do local', hint: 'Fotografe o lugar, sem pessoas' },
  diario: { title: 'Diário de campo', hint: 'Reflexão sobre a experiência' },
  reflexao: { title: 'Reflexão em grupo', hint: 'Compartilhar com a turma' },
  criativa: { title: 'Produção criativa', hint: 'Desenho, texto ou colagem' },
};

export function newCard(kind: CardKind, id: string, theme: string): ExpeditionCard {
  return { id, kind, ...DEFAULT_TEXT[kind], ...(kind === 'quiz' ? { quiz: THEME[theme]?.quiz ?? [] } : {}) };
}

export const allCards = (e: SchoolExpedition): ExpeditionCard[] => [...e.columns.antes, ...e.columns.durante, ...e.columns.depois];

/** Cards the student must tick off (every card of the expedition). */
export const checklistFor = (e: SchoolExpedition): ExpeditionCard[] => allCards(e);

export const expeditionDone = (e: SchoolExpedition, checked: string[]): boolean => {
  const cards = checklistFor(e);
  return cards.length > 0 && cards.every((c) => checked.includes(c.id));
};
