// Student (phone): expedition banner, checklist, quiz, field diary, class seal and class garden.
import { PHASES, expeditionDone, kindInfo, themeBadge } from '../core/expeditions';
import { CLASS_GOAL, CLASS_NAME, classStats, classStudents } from '../core/school';
import { completeExpedition, progressOf, saveDiary, setChecked } from '../core/schoolActions';
import type { ExpeditionCard } from '../core/state';
import { el, esc, itemUrl } from '../ui/dom';
import { stampKey, button } from '../ui/widgets';
import type { SchoolCtx } from './ctx';
import { renderClassGarden } from './garden';
import { expeditionHeader, taskRow } from './studentParts';
import { runDiary, runPhoto, runQuiz } from './studentTasks';

const PRIVACY = 'Privacidade: suas respostas, fotos e diário ficam só neste aparelho. Nada de fotos de pessoas.';

export function mountStudent(ctx: SchoolCtx, host: HTMLElement): void {
  const { store } = ctx;
  const exp = ctx.current();
  let justFinished = false;
  const page = el('div', 'student');
  host.appendChild(page);

  const finishTask = (c: ExpeditionCard) => {
    setChecked(store, exp.id, c.id, true);
    render();
  };

  const action = (c: ExpeditionCard): HTMLElement | null => {
    const label: Partial<Record<ExpeditionCard['kind'], string>> = { quiz: 'Fazer o quiz', diario: 'Escrever o diário', foto: 'Tirar a foto' };
    const run = () => {
      if (c.kind === 'quiz') runQuiz(page, c, () => finishTask(c));
      else if (c.kind === 'foto') runPhoto(page, store, c, () => finishTask(c));
      else if (c.kind === 'diario') runDiary(page, store, exp.id, c, (text, hasPhoto) => (saveDiary(store, exp.id, text, hasPhoto), finishTask(c)));
      else finishTask(c);
    };
    return button(label[c.kind] ?? 'Marcar como feito', run, 'small');
  };

  const render = () => {
    page.innerHTML = '';
    const d = store.data;
    const checked = progressOf(store, exp.id);
    const done = d.school.done.includes(exp.id);
    const students = classStudents(d);
    const stats = classStats(students);

    const head = el('header', 'page-head student-head');
    head.append(el('h2', '', esc(CLASS_NAME)), el('span', 'who', esc(d.name || 'Aluno(a)')));
    const privacy = el('p', 'privacy parch');
    privacy.innerHTML = `<img src="${itemUrl('shield_parent')}" alt=""><span>${PRIVACY}</span>`;
    page.append(head, privacy, expeditionHeader(exp));

    const list = el('div', 'checklist');
    list.appendChild(el('h3', '', 'Checklist de missões'));
    for (const p of PHASES) {
      const cards = exp.columns[p.id];
      if (!cards.length) continue;
      list.appendChild(el('h4', '', esc(p.label)));
      const ul = el('ul', 'tasks');
      for (const c of cards) {
        const isDone = checked.includes(c.id);
        const row = taskRow(c.title, `${kindInfo(c.kind).label}: ${c.hint}`, isDone ? 'done' : 'todo');
        row.dataset.card = c.id;
        if (!isDone && !done) row.appendChild(action(c)!);
        ul.appendChild(row);
      }
      list.appendChild(ul);
    }
    page.appendChild(list);

    const seal = el('div', 'class-seal parch');
    const got = done;
    seal.innerHTML = `<img src="${itemUrl(stampKey('parque', !got))}" alt="Selo da turma ${got ? 'conquistado' : 'bloqueado'}"><div><b>Selo da turma</b><span class="turma">Turma: ${stats.participants} de ${CLASS_GOAL} já fizeram</span><div class="bar-track"><i style="width:${Math.round((stats.participants / CLASS_GOAL) * 100)}%"></i></div></div>`;
    page.appendChild(seal);

    const all = expeditionDone(exp, checked);
    if (done) {
      const medal = el('div', 'panel medal');
      medal.innerHTML = `<img src="${itemUrl(themeBadge(exp.theme))}" alt=""><p><b>Expedição concluída!</b><br>Medalha da expedição liberada. Você ajudou o jardim da turma a crescer.</p>`;
      page.appendChild(medal);
    } else {
      const fin = button('Concluir expedição', () => {
        const r = completeExpedition(store, exp);
        if (!r.ok) return;
        justFinished = r.newAnimal;
        navigator.vibrate?.(60);
        ctx.bus.emit('toast', r.newAnimal ? 'Um novo bichinho chegou ao jardim da turma!' : 'Medalha da expedição liberada!');
        render();
      });
      fin.id = 'finish-expedition';
      fin.disabled = !all;
      page.appendChild(fin);
      if (!all) page.appendChild(el('p', 'hint', 'Faça todas as missões para concluir.'));
    }
    page.appendChild(renderClassGarden({ completions: stats.completions, goalText: `${stats.participants} de ${CLASS_GOAL} concluíram`, highlightNew: justFinished }));
    page.appendChild(el('a', 'back-link', 'Voltar')).setAttribute('href', '/escola');
  };
  render();
}
