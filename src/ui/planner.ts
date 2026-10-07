// "Planejar saída": pick one of the next 7 days and a partner, agree with the family, share.
import { PARTNERS, PLACE_PARTNERS } from '../core/catalog';
import { nextDays } from '../core/dates';
import type { Emitter, GameEvents } from '../core/events';
import { outingLabel, planOuting, shareOuting } from '../core/outings';
import type { Outing, Store } from '../core/state';
import { DEFAULT_OUTING_TIME } from '../config';
import { el } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { partnerCard } from './partnerCards';
import { button } from './widgets';

export interface PlannerDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  back: () => void;
  /** the full day plan for the outing just agreed */
  openRoteiro: (o: Outing) => void;
}

export function createPlannerPage(d: PlannerDeps, preselect?: string): PageHandle {
  const page = makePage({ title: 'Planejar saída', className: 'planner', back: d.back });
  const now = Date.now();
  const days = nextDays(now);
  let day = (days.find((x) => x.weekday === 'Sáb') ?? days[0]).key;
  let partner = preselect ?? '';
  let time = DEFAULT_OUTING_TIME;

  const strip = el('div', 'day-strip');
  const list = el('div', 'partner-list');
  const timeInput = el('input');
  timeInput.type = 'time';
  timeInput.value = time;
  timeInput.setAttribute('aria-label', 'Horário da saída');
  timeInput.onchange = () => (time = timeInput.value || DEFAULT_OUTING_TIME);
  const agree = button('Combinar com a família', () => confirm());
  const done = el('div', 'panel agreed hidden');

  const render = () => {
    strip.innerHTML = '';
    days.forEach((x) => {
      const b = el('button', `day${x.key === day ? ' on' : ''}`, `<small>${x.weekday}</small><b>${x.day}</b>`);
      b.setAttribute('aria-label', `${x.weekday} ${x.day}`);
      b.onclick = () => ((day = x.key), render());
      strip.appendChild(b);
    });
    list.innerHTML = '';
    for (const p of PLACE_PARTNERS) {
      list.appendChild(partnerCard(p, { label: p.id === partner ? 'Escolhido' : 'Escolher', selected: p.id === partner, onPick: () => ((partner = p.id), render()) }));
    }
    agree.disabled = !partner;
  };

  const confirm = () => {
    time = timeInput.value || DEFAULT_OUTING_TIME;
    const o = planOuting(d.store.data, { partner, day, time }, Date.now());
    d.store.commit();
    done.classList.remove('hidden');
    done.innerHTML = '';
    done.append(el('div', 'panel-title', '<span>Saída combinada!</span>'), el('p', '', `${partner ? PARTNERS.find((p) => p.id === partner)!.name : ''}: ${outingLabel(o)}`));
    done.appendChild(button('Ver roteiro completo', () => d.openRoteiro(o)));
    done.appendChild(
      button('Compartilhar convite', async () => {
        const r = await shareOuting(o);
        d.bus.emit('toast', r === 'copied' ? 'Texto copiado. É só colar na conversa!' : r === 'shared' ? 'Convite enviado!' : 'Não deu para compartilhar agora.');
      }),
    );
    done.scrollIntoView?.({ block: 'nearest' });
  };

  const row = el('div', 'time-row', '<label>Horário</label>');
  row.appendChild(timeInput);
  page.body.append(strip, list, row, agree, done);
  render();
  return page;
}
