// 4-step tutorial: walk in the house, buy a piece of furniture, collect in the garden, make a visit.
// Each step finishes by itself when the child does it; "Próximo" and "Pular" are always there.
import type { Emitter, GameEvents, Tab } from '../core/events';
import type { Store } from '../core/state';
import { el } from './dom';
import { button } from './widgets';

interface Step {
  text: string;
  /** nav tab to light up */
  tab: Tab;
}

const STEPS: Step[] = [
  { text: 'Toque no chão da casa para o seu personagem andar.', tab: 'home' },
  { text: 'Abra a Loja e compre um móvel. Você já começa com moedas!', tab: 'shop' },
  { text: 'Vá ao Jardim e toque num bicho com moedas para coletar.', tab: 'garden' },
  { text: 'Abra a Família, escolha um lugar e faça uma visita (pode ser em modo demonstração).', tab: 'family' },
];

export interface Tutorial {
  start(from?: number): void;
  stop(): void;
}

export function createTutorial(ui: HTMLElement, bus: Emitter<GameEvents>, store: Store): Tutorial {
  let step = 0;
  let box: HTMLElement | null = null;
  let furnitureAtStart = 0;
  const offs: (() => void)[] = [];

  /** pages and the Editar button slide down so the banner never covers them */
  const setOffset = (px: number) => document.getElementById('app')?.style.setProperty('--tut-h', `${px}px`);
  const clearHint = () => document.querySelectorAll('.nav button.tut').forEach((b) => b.classList.remove('tut'));
  const stop = () => {
    offs.splice(0).forEach((f) => f());
    box?.remove();
    box = null;
    clearHint();
    setOffset(0);
  };
  const finish = () => {
    stop();
    store.settings.tutorialDone = true;
    store.settings.tutorialStep = 0;
    store.commit();
    bus.emit('toast', 'Tutorial concluído! Você pode rever em Configurações.');
  };
  const next = () => {
    step += 1;
    store.settings.tutorialStep = step;
    store.commit();
    if (step >= STEPS.length) return finish();
    render();
  };

  const watch = () => {
    offs.splice(0).forEach((f) => f());
    furnitureAtStart = store.data.furniture.length;
    if (step === 0) offs.push(bus.on('walked', () => setTimeout(next, 700)));
    if (step === 1) offs.push(bus.on('changed', () => store.data.furniture.length > furnitureAtStart && (stop2(), setTimeout(next, 500))));
    if (step === 2) offs.push(bus.on('collected', () => setTimeout(next, 900)));
    if (step === 3) offs.push(bus.on('visitCompleted', () => setTimeout(next, 600)));
  };
  const stop2 = () => offs.splice(0).forEach((f) => f());

  const render = () => {
    box?.remove();
    clearHint();
    document.querySelector(`.nav button[data-tab="${STEPS[step].tab}"]`)?.classList.add('tut');
    box = el('div', 'panel tutorial');
    box.setAttribute('role', 'status');
    box.append(
      el('div', 'tut-title', `<b>Passo ${step + 1} de ${STEPS.length}</b>`),
      el('p', '', STEPS[step].text),
    );
    const row = el('div', 'tut-actions');
    row.append(button('Pular tutorial', finish, 'secondary small'), button(step + 1 === STEPS.length ? 'Terminar' : 'Próximo', next, 'small'));
    box.appendChild(row);
    ui.appendChild(box);
    setOffset(box.offsetHeight + 8);
    watch();
  };

  return {
    start(from = 0) {
      stop();
      step = Math.min(Math.max(from, 0), STEPS.length - 1);
      render();
    },
    stop,
  };
}
