// /cidade: city panel with fictional data. Maps, before/after, redistribution, privacy rule.
import '../ui/style.css';
import '../ui/pages.css';
import './site.css';
import './city.css';
import { TITLE } from '../config';
import { CAMPAIGN, MIN_VISITS, PLACES, PLACE_TYPES, demoVisitCount, filterByType, shownVisits, topShare, totalVisits, underVisited } from '../core/city';
import { loadSave } from '../core/save';
import { el, esc, itemUrl } from '../ui/dom';
import { siteBar } from './bar';
import { TYPE_COLOR, cityMapSvg } from './cityMap';

const pct = (v: number) => `${Math.round(v * 100)}%`;

function kpi(label: string, value: string, note: string, extra = ''): HTMLElement {
  return el('div', 'parch kpi', `<small>${label}</small><b>${value}</b><span>${note}</span>${extra}`);
}

function table(places: typeof PLACES): HTMLElement {
  const max = Math.max(...places.map((p) => p.after), 1);
  const rows = places
    .map((p) => {
      const b = shownVisits(p, 'before');
      const a = shownVisits(p, 'after');
      const delta = b !== null && a !== null ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : '—';
      const bar = a === null ? '' : `<i style="width:${(a / max) * 100}%;background:${TYPE_COLOR[p.type]}"></i>`;
      return `<tr><td><b>${esc(p.name)}</b><small>${esc(p.type)} · ${esc(p.area)}</small></td><td>${b ?? '<span class="hid">dados ocultos</span>'}</td><td>${a ?? '<span class="hid">dados ocultos</span>'}</td><td>${delta}</td><td class="barcell">${bar}</td></tr>`;
    })
    .join('');
  const t = el('table', 'report city-table');
  t.innerHTML = `<thead><tr><th>Equipamento</th><th>Antes</th><th>Depois</th><th>Variação</th><th></th></tr></thead><tbody>${rows}</tbody>`;
  return t;
}

export function mount(root: HTMLElement): void {
  document.title = `Painel da cidade · ${TITLE}`;
  const frame = el('div', 'site-frame');
  const page = el('div', 'site-body city');
  frame.append(siteBar('cidade'), page);
  root.appendChild(frame);
  let type = 'Todos';

  const render = () => {
    page.innerHTML = '';
    const places = filterByType(PLACES, type);
    const tb = totalVisits(places, 'before');
    const ta = totalVisits(places, 'after');
    const sb = topShare(PLACES, 'before');
    const sa = topShare(PLACES, 'after');
    const demo = demoVisitCount(loadSave().profiles);

    const head = el('div', 'city-head');
    head.innerHTML = `<div><h1>Painel da cidade</h1><p>Como as famílias estão usando museus, parques e centros da cidade. Sem nomes, sem rostos: só números por lugar.</p></div><img src="${itemUrl('ribbon_demo')}" alt="DEMO: dados fictícios" class="big-demo">`;
    const rule = el('p', 'rule parch', `<img src="${itemUrl('shield_parent')}" alt=""><span><b>Dados exibidos somente com mínimo de ${MIN_VISITS} visitas por local.</b> Abaixo disso o lugar aparece como "dados ocultos", para ninguém ser identificado.</span>`);

    const chips = el('div', 'type-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', 'Filtrar por tipo');
    ['Todos', ...PLACE_TYPES].forEach((t) => {
      const c = el('button', `chip${t === type ? ' on' : ''}`, esc(t));
      c.dataset.type = t;
      c.onclick = () => ((type = t), render());
      chips.appendChild(c);
    });

    const kpis = el('div', 'kpis');
    kpis.append(
      kpi('Visitas antes da campanha', String(tb), `${places.length} ${places.length === 1 ? 'local' : 'locais'}`),
      kpi('Visitas depois', String(ta), tb ? `${ta >= tb ? '+' : ''}${Math.round(((ta - tb) / tb) * 100)}% em relação ao antes` : ''),
      kpi('Redistribuição', `${pct(sb)} → ${pct(sa)}`, 'das visitas nos 2 locais mais visitados'),
      kpi('Visitas deste protótipo', String(demo), 'feitas em modo demonstração neste aparelho', `<img src="${itemUrl('ribbon_demo')}" alt="DEMO" class="ribbon-demo">`),
    );

    const maps = el('div', 'maps');
    for (const [period, label] of [['before', 'Antes da campanha'], ['after', 'Depois da campanha']] as const) {
      const fig = el('figure', 'map-card panel');
      fig.dataset.period = period;
      fig.innerHTML = `<div class="panel-title"><span>${label}</span></div>${cityMapSvg(places, period)}`;
      maps.appendChild(fig);
    }

    const legend = el('p', 'legend-types', Object.entries(TYPE_COLOR).map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join('') + '<span class="hint">Tamanho do ponto = visitas</span>');

    const under = el('div', 'panel under');
    under.appendChild(el('div', 'panel-title', '<span>Locais pouco visitados: o que mudou</span>'));
    const ul = el('ul');
    underVisited(PLACES).forEach(({ place, growthPct }) => ul.appendChild(el('li', '', `<b>${esc(place.name)}</b><span>${growthPct === null ? 'passou a ter dados para mostrar' : `+${growthPct}% de visitas`}</span>`)));
    under.appendChild(ul);

    const camp = el('p', 'campaign parch', `<b>Campanha "${esc(CAMPAIGN.name)}".</b> ${esc(CAMPAIGN.text)} <em>Dados fictícios de demonstração.</em>`);
    const wrap = el('div', 'table-wrap');
    wrap.appendChild(table(places));
    page.append(head, rule, chips, kpis, maps, legend, el('h2', '', 'Visitas por equipamento'), wrap, under, camp);
  };
  render();
}
