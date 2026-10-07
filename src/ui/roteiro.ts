// "Roteiro da expedição": the full day plan the family gets for a planned outing (before, timeline, after).
import { partnerById } from '../core/catalog';
import type { Emitter, GameEvents } from '../core/events';
import { outingLabel, regenerateRoteiro, sharePlain, swapSlot, toggleDone } from '../core/outings';
import { bringId, buildRoteiro, roteiroText, type Roteiro, type RoteiroItem, type RoteiroStep } from '../core/roteiro';
import type { Outing, Store } from '../core/state';
import { el, esc, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { button } from './widgets';

export interface RoteiroDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  outing: Outing;
  back: () => void;
}

export function createRoteiroPage(d: RoteiroDeps): PageHandle {
  const page = makePage({ title: 'Roteiro da expedição', className: 'roteiro', back: d.back });
  const o = d.outing;

  const row = (id: string, title: string, detail: string, opts: { time?: string; slot?: string } = {}) => {
    const done = (o.done ?? []).includes(id);
    const r = el('div', `rt-row${done ? ' done' : ''}`);
    const box = el('button', 'rt-box', done ? `<img src="${itemUrl('check')}" alt="Feito">` : '');
    box.setAttribute('aria-label', `${done ? 'Desmarcar' : 'Marcar como feito'}: ${title}`);
    box.onclick = () => {
      toggleDone(o, id);
      d.store.commit();
      render();
    };
    const text = el('div', 'rt-text', `<b>${esc(title)}</b><span>${esc(detail)}</span>`);
    if (opts.time) r.appendChild(el('time', 'rt-time', opts.time));
    r.append(box, text);
    if (opts.slot) {
      const swap = el('button', 'rt-swap', 'Trocar');
      swap.setAttribute('aria-label', `Trocar a atividade: ${title}`);
      swap.onclick = () => {
        swapSlot(o, opts.slot!);
        d.store.commit();
        render();
      };
      r.appendChild(swap);
    }
    return r;
  };

  const section = (title: string, rows: HTMLElement[], cls = '') => {
    const s = el('div', `panel rt-section ${cls}`.trim(), `<div class="panel-title"><span>${esc(title)}</span></div>`);
    const list = el('div', 'rt-list');
    list.append(...rows);
    s.appendChild(list);
    return s;
  };

  const items = (list: RoteiroItem[]) => list.map((i) => row(i.id, i.title, i.detail, { slot: i.slot }));
  const stepRow = (s: RoteiroStep) => row(s.id, s.title, s.detail, { time: s.time, slot: s.slot });

  const render = () => {
    const r: Roteiro = buildRoteiro(o);
    const p = partnerById(r.partnerId);
    const ticks = [...r.before.map((i) => i.id), ...r.bring.map((_, i) => bringId(i)), ...r.steps.map((s) => s.id), ...r.after.map((i) => i.id)];
    const doneCount = ticks.filter((id) => (o.done ?? []).includes(id)).length;
    page.body.innerHTML = '';
    page.body.appendChild(
      el(
        'div',
        'parch rt-head',
        `<img src="${itemUrl(p.image)}" alt=""><div><h3>${esc(p.name)}</h3><p>${outingLabel(o)} até ${r.end.replace(':', 'h')}</p><small>${doneCount} de ${ticks.length} itens feitos</small></div>`,
      ),
    );
    page.body.append(
      section('Antes de sair', items(r.before)),
      section('O que levar', r.bring.map((b, i) => row(bringId(i), b, ''))),
      section(`No dia (${r.steps.length} etapas)`, r.steps.map(stepRow), 'rt-timeline'),
      section('Depois, em casa', items(r.after)),
      el('p', 'rt-tip', `<b>Dica:</b> ${esc(r.tip)} Fotografe só o lugar, sem pessoas.`),
    );
    const actions = el('div', 'rt-actions');
    actions.append(
      button('Compartilhar roteiro', async () => {
        const res = await sharePlain('Roteiro da expedição', roteiroText(buildRoteiro(o)));
        d.bus.emit('toast', res === 'copied' ? 'Roteiro copiado. É só colar na conversa!' : res === 'shared' ? 'Roteiro enviado!' : 'Não deu para compartilhar agora.');
      }),
      button('Gerar outro roteiro', () => {
        regenerateRoteiro(o);
        d.store.commit();
        render();
        d.bus.emit('toast', 'Novo roteiro pronto!');
      }, 'secondary'),
    );
    page.body.appendChild(actions);
  };

  render();
  return page;
}
