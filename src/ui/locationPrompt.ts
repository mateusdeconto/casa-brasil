// Asks, in plain words, before the browser's own GPS dialog: "use your location to see places near you?"
import { getPosition, type GpsFix } from '../core/geo';
import { el } from './dom';
import { button } from './widgets';

export interface LocationPromptOpts {
  question: string;
  /** called with the position once the browser grants it */
  onPosition: (pos: GpsFix) => void;
  /** called when the child says "Agora não" */
  onSkip?: () => void;
}

const FAIL_TEXT = {
  denied: 'Sem permissão de localização. Ative a localização do navegador para este site e tente de novo.',
  timeout: 'Demorou demais para achar sua posição. Tente de novo, de preferência ao ar livre.',
  unavailable: 'Não consegui achar sua posição agora.',
} as const;

export function locationPrompt(o: LocationPromptOpts): HTMLElement {
  const box = el('div', 'panel location-prompt');
  const q = el('p', 'lp-question');
  q.textContent = o.question;
  const note = el('small', 'lp-note');
  note.textContent = 'Sua posição só é usada neste aparelho, para calcular a distância. Nada é enviado nem guardado.';
  const status = el('p', 'lp-status hidden');
  status.setAttribute('role', 'status');

  const use = button('Usar minha localização', async () => {
    use.disabled = true;
    status.classList.remove('hidden');
    status.textContent = 'Procurando você...';
    const r = await getPosition();
    use.disabled = false;
    if (r.ok) return o.onPosition(r.pos);
    status.textContent = FAIL_TEXT[r.reason];
  });
  const row = el('div', 'lp-actions');
  row.appendChild(use);
  if (o.onSkip) row.appendChild(button('Agora não', o.onSkip, 'secondary small'));
  box.append(q, note, row, status);
  return box;
}
