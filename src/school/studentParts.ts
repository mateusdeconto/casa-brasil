// Pieces of the student screen that the teacher's preview reuses.
import { PHASES, kindInfo, themeBanner } from '../core/expeditions';
import type { SchoolExpedition } from '../core/state';
import { el, esc, itemUrl } from '../ui/dom';

export function expeditionHeader(exp: SchoolExpedition): HTMLElement {
  const box = el('div', 'exp-banner');
  box.innerHTML = `<div class="art"><img src="${itemUrl(themeBanner(exp.theme))}" alt=""></div><div class="txt"><small>Expedição</small><h2>${esc(exp.title)}</h2><span class="theme-tag">${esc(exp.theme)}</span></div>`;
  return box;
}

export function taskRow(title: string, hint: string, state: 'todo' | 'done'): HTMLElement {
  const row = el('li', `task${state === 'done' ? ' done' : ''}`);
  const box = el('span', 'tick', state === 'done' ? `<img src="${itemUrl('check')}" alt="Feito">` : '');
  const text = el('span', 'tt');
  text.append(el('b', '', esc(title)), el('small', '', esc(hint)));
  row.append(box, text);
  return row;
}

/** Non-interactive list: what the student will see, grouped by phase. */
export function checklistReadonly(exp: SchoolExpedition): HTMLElement {
  const wrap = el('div', 'checklist');
  for (const p of PHASES) {
    const cards = exp.columns[p.id];
    if (!cards.length) continue;
    wrap.appendChild(el('h3', '', esc(p.label)));
    const list = el('ul', 'tasks');
    cards.forEach((c) => list.appendChild(taskRow(c.title, `${kindInfo(c.kind).label}: ${c.hint}`, 'todo')));
    wrap.appendChild(list);
  }
  return wrap;
}
