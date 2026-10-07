// "Pré-visualizar": the student's phone view of a draft, read-only.
import type { SchoolExpedition } from '../core/state';
import { el } from '../ui/dom';
import { expeditionHeader, checklistReadonly } from './studentParts';

export function previewExpedition(host: HTMLElement, exp: SchoolExpedition): void {
  const shade = el('div', 'shade preview-shade');
  const phone = el('div', 'phone-frame');
  const close = el('button', 'close', '✕ Fechar');
  close.setAttribute('aria-label', 'Fechar a pré-visualização');
  close.onclick = () => shade.remove();
  const screen = el('div', 'phone-screen');
  screen.append(expeditionHeader(exp), checklistReadonly(exp));
  phone.append(close, screen);
  shade.appendChild(phone);
  shade.onclick = (e) => e.target === shade && shade.remove();
  host.appendChild(shade);
}
