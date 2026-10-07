// Teacher: "Criar Expedição Digital" with Antes / Durante / Depois columns, editable cards and a template-based suggestion.
import { CARD_KINDS, PHASES, THEMES, generateExpedition, kindInfo, newCard } from '../core/expeditions';
import { CLASS_NAME } from '../core/school';
import type { CardKind, ExpeditionCard, Phase, SchoolExpedition } from '../core/state';
import { el, esc, itemUrl } from '../ui/dom';
import { button } from '../ui/widgets';
import type { SchoolCtx } from './ctx';
import { previewExpedition } from './preview';

export function mountBuilder(ctx: SchoolCtx, host: HTMLElement, onPublished: () => void): void {
  let theme = THEMES[0];
  let variant = 0;
  let draft: SchoolExpedition = generateExpedition(theme, variant);
  let editing = '';
  let adding: Phase | '' = '';
  let published = false;

  const select = (label: string, options: string[], value: string, onChange: (v: string) => void) => {
    const s = el('select');
    s.setAttribute('aria-label', label);
    options.forEach((o) => s.appendChild(Object.assign(el('option'), { value: o, textContent: o, selected: o === value })));
    s.onchange = () => onChange(s.value);
    return s;
  };

  const cardView = (phase: Phase, c: ExpeditionCard): HTMLElement => {
    const row = el('div', 'card-edit parch');
    row.dataset.card = c.id;
    const k = kindInfo(c.kind);
    row.appendChild(el('img', 'k-ico')).setAttribute('src', itemUrl(k.icon));
    const text = el('div', 'k-text');
    if (editing === c.id) {
      const t = el('input');
      t.value = c.title;
      t.setAttribute('aria-label', 'Título da atividade');
      const h = el('input');
      h.value = c.hint;
      h.setAttribute('aria-label', 'Descrição da atividade');
      const ok = button('Pronto', () => ((c.title = t.value.trim() || c.title), (c.hint = h.value.trim()), (editing = ''), render()), 'small');
      text.append(t, h, ok);
    } else {
      text.append(el('b', '', esc(c.title)), el('small', '', esc(c.hint)), el('em', '', k.label));
    }
    const actions = el('div', 'k-actions');
    const edit = el('button', 'icon-btn', '✎');
    edit.setAttribute('aria-label', `Editar ${c.title}`);
    edit.onclick = () => ((editing = editing === c.id ? '' : c.id), render());
    const del = el('button', 'icon-btn', '✕');
    del.setAttribute('aria-label', `Remover ${c.title}`);
    del.onclick = () => ((draft.columns[phase] = draft.columns[phase].filter((x) => x !== c)), render());
    actions.append(edit, del);
    row.append(text, actions);
    return row;
  };

  const column = (phase: Phase, label: string): HTMLElement => {
    const col = el('section', 'phase');
    col.dataset.phase = phase;
    col.appendChild(el('h3', '', esc(label)));
    draft.columns[phase].forEach((c) => col.appendChild(cardView(phase, c)));
    const add = button('+ Adicionar atividade', () => ((adding = adding === phase ? '' : phase), render()), 'secondary small add');
    col.appendChild(add);
    if (adding === phase) {
      const menu = el('div', 'kind-menu');
      CARD_KINDS.forEach((k) => {
        const b = el('button', 'kind-opt', esc(k.label));
        b.onclick = () => {
          draft.columns[phase].push(newCard(k.kind as CardKind, `${draft.id}-n${Date.now().toString(36)}`, draft.theme));
          adding = '';
          render();
        };
        menu.appendChild(b);
      });
      col.appendChild(menu);
    }
    return col;
  };

  const publish = () => {
    const exp: SchoolExpedition = JSON.parse(JSON.stringify(draft));
    const list = ctx.store.root.school.expeditions;
    const i = list.findIndex((x) => x.id === exp.id);
    if (i >= 0) list[i] = exp;
    else list.push(exp);
    ctx.store.commit();
    published = true;
    ctx.bus.emit('toast', `Expedição publicada para o ${CLASS_NAME}`);
    render();
  };

  const render = () => {
    host.innerHTML = '';
    const head = el('div', 'tmain-head', '<h1>Criar Expedição Digital</h1>');
    head.appendChild(select('Turma', [CLASS_NAME], CLASS_NAME, () => {}));
    const ai = el('div', 'ai-banner parch', '<span class="ai-tag">IA</span><b>Sugestão da IA, edite antes de publicar</b>');
    const themePick = select('Tema', THEMES, theme, (v) => ((theme = v), (variant = 0), (draft = generateExpedition(theme, variant)), (published = false), render()));
    ai.append(themePick, button('Nova sugestão', () => ((variant += 1), (draft = generateExpedition(theme, variant)), (published = false), render()), 'secondary small'));
    const title = el('input', 'exp-title');
    title.value = draft.title;
    title.setAttribute('aria-label', 'Título da expedição');
    title.onchange = () => (draft.title = title.value.trim() || draft.title);
    const cols = el('div', 'phases');
    PHASES.forEach((p) => cols.appendChild(column(p.id, p.label)));
    const foot = el('div', 'builder-foot');
    foot.append(button('Pré-visualizar', () => previewExpedition(host, draft), 'secondary'), button('Publicar para a turma', publish));
    host.append(head, ai, title, cols, foot);
    if (published) {
      const ok = el('div', 'panel published', `<p><b>Publicada!</b> Os alunos do ${esc(CLASS_NAME)} já veem esta expedição.</p>`);
      const link = el('a', 'btn small', 'Ver como aluno');
      link.setAttribute('href', '/escola#aluno');
      ok.append(link, button('Ver acompanhamento', onPublished, 'secondary small'));
      host.appendChild(ok);
    }
  };
  render();
}
