// Counts play time while the game is visible and shows a friendly reminder at the daily limit.
import { USAGE_TICK_MS } from '../config';
import { dayKey } from '../core/dates';
import type { Store } from '../core/state';
import { addUsage, limitReached, minutesToday } from '../core/usage';
import { showCard } from './card';

export function startUsageTimer(store: Store, ui: HTMLElement, now: () => number = Date.now): () => void {
  const reminded = new Set<string>();
  const id = setInterval(() => {
    if (document.hidden || !store.data.started) return;
    const t = now();
    addUsage(store.data, t, USAGE_TICK_MS / 1000);
    store.commit();
    const key = `${store.data.id}:${dayKey(t)}`;
    if (reminded.has(key) || !limitReached(store.data, store.settings, t)) return;
    reminded.add(key);
    showCard(ui, {
      title: 'Hora de uma pausa?',
      text: `Você já brincou ${minutesToday(store.data, t)} minutos hoje. Que tal tomar água, olhar para longe ou chamar a família? Você pode continuar quando quiser.`,
      buttons: [{ label: 'Continuar brincando', onClick: () => {} }],
    });
  }, USAGE_TICK_MS);
  return () => clearInterval(id);
}
