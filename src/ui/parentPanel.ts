// Parent panel: pick a child, weekly summary, minutes per day, and the safety options.
import { NAME_MAX } from '../config';
import { weekKey } from '../core/dates';
import type { Emitter, GameEvents } from '../core/events';
import type { SaveData, Store } from '../core/state';
import { activeDays, lastDays, LIMIT_CHOICES, limitLabel, minutesToday } from '../core/usage';
import { el, itemUrl } from './dom';
import { showAvatarPicker } from './avatarPicker';
import { askText, button, demoRibbon, icon, setFace, toggleRow } from './widgets';

export interface ParentPanelDeps {
  store: Store;
  bus: Emitter<GameEvents>;
  ui: HTMLElement;
  /** forget the PIN and ask for a new one */
  changePin: () => void;
}

const WEEKDAY_LETTER = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function summary(kid: SaveData, now: number): HTMLElement {
  const week = weekKey(now);
  const visits = kid.visits.filter((v) => weekKey(v.ts) === week).length;
  const tiles = [
    { n: visits, label: 'visitas', img: 'mappin' },
    { n: kid.stamps.length, label: 'selos', img: 'stamp_zoo' },
    { n: activeDays(kid, now), label: 'dias ativos', img: 'calendar' },
  ];
  const box = el('div', 'summary');
  for (const t of tiles) box.appendChild(el('div', 'parch tile', `<img src="${itemUrl(t.img)}" alt=""><b>${t.n}</b><small>${t.label}</small>`));
  return box;
}

function minutesChart(kid: SaveData, now: number): HTMLElement {
  const days = lastDays(kid, now);
  const max = Math.max(10, ...days.map((d) => d.minutes));
  const chart = el('div', 'bars');
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', `Minutos por dia: ${days.map((d) => d.minutes).join(', ')}`);
  for (const d of days) {
    const letter = WEEKDAY_LETTER[new Date(d.key + 'T12:00:00').getDay()];
    const bar = el('div', 'bar', `<span class="v">${d.minutes || ''}</span><i style="height:${Math.max(4, (d.minutes / max) * 100)}%"></i><span class="d">${letter}</span>`);
    chart.appendChild(bar);
  }
  return chart;
}

export function createParentPanel(d: ParentPanelDeps): HTMLElement {
  const { store } = d;
  const screen = el('div', 'screen parent');
  let selected = store.data.id;
  const close = () => screen.remove();

  const render = () => {
    const now = Date.now();
    screen.innerHTML = '';
    const head = el('header', 'page-head');
    const back = el('button', 'back', '←');
    back.setAttribute('aria-label', 'Fechar o painel');
    back.onclick = close;
    head.append(back, el('h2', '', 'Painel dos pais'), icon('shield_parent', 'head-ico'));
    const body = el('div', 'page-body');
    screen.append(head, body);

    const kidsLabel = el('h3', 'sec', 'Selecione a criança');
    const chips = el('div', 'kid-chips');
    for (const p of store.root.profiles) {
      const c = el('button', `kid-chip${p.id === selected ? ' on' : ''}`, `<span class="face"></span><b>${p.name || 'Sem nome'}</b>`);
      setFace(c.querySelector('.face') as HTMLElement, p.avatar);
      c.onclick = () => ((selected = p.id), render());
      chips.appendChild(c);
    }
    if (store.canAddProfile()) {
      const add = el('button', 'kid-chip add', '<span class="plus">+</span><b>Novo perfil</b>');
      add.onclick = () =>
        showAvatarPicker(d.ui, { avatar: 'avatar_1', name: '' }, (avatar, name) => {
          const p = store.addProfile(name, avatar);
          selected = p.id;
          render();
        });
      chips.appendChild(add);
    }

    const kid = store.root.profiles.find((p) => p.id === selected) ?? store.data;
    const actions = el('div', 'kid-actions');
    if (kid.id !== store.data.id) actions.appendChild(button(`Jogar como ${kid.name}`, () => (store.switchProfile(kid.id), close()), 'small'));
    else actions.appendChild(el('small', 'now', 'Jogando agora'));
    actions.appendChild(button('Renomear', () => askText(d.ui, 'Novo nome', kid.name, NAME_MAX, (v) => v && ((kid.name = v), store.commit(), d.bus.emit('profileChanged', store.data.id), render())), 'secondary small'));

    const demo = el('p', 'demo-line');
    demo.append(demoRibbon(), document.createTextNode(`${minutesToday(kid, now)} min hoje · dados só neste aparelho`));

    const s = store.settings;
    const limit = el('div', 'opt-row');
    limit.appendChild(el('div', 'opt-text', '<b>Tempo diário</b><small>Aviso amigável ao chegar no limite. Nunca bloqueia.</small>'));
    const pick = el('select');
    pick.setAttribute('aria-label', 'Tempo diário');
    LIMIT_CHOICES.forEach((m) => pick.appendChild(Object.assign(el('option'), { value: String(m), textContent: limitLabel(m), selected: m === s.dailyLimitMinutes })));
    pick.onchange = () => ((s.dailyLimitMinutes = Number(pick.value)), store.commit());
    limit.appendChild(pick);

    const opts = el('div', 'panel options');
    opts.append(
      toggleRow('Compras bloqueadas', 'Nenhuma compra com dinheiro de verdade.', s.purchasesBlocked, (v) => ((s.purchasesBlocked = v), store.commit())),
      limit,
      toggleRow('Círculo fechado de amigos', 'Só amigos aprovados, com reações prontas (visual).', s.friendsCircle, (v) => ((s.friendsCircle = v), store.commit())),
      toggleRow('Sem anúncios', 'O jogo não mostra anúncios.', s.noAds, (v) => ((s.noAds = v), store.commit())),
    );

    const chartPanel = el('div', 'panel');
    chartPanel.append(el('div', 'panel-title', '<span>Minutos por dia</span>'), minutesChart(kid, now));
    body.append(kidsLabel, chips, actions, demo, el('h3', 'sec', `Resumo da semana de ${kid.name || 'a criança'}`), summary(kid, now), chartPanel, opts, button('Trocar o PIN', d.changePin, 'secondary small'));
  };

  render();
  return screen;
}
