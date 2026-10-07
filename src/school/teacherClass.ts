// Teacher: class follow-up (weekly heat map, student chips, class goal and garden) and the reports page.
import { CLASS_GOAL, CLASS_NAME, HEAT, classStats, classStudents, participated, reportCsv, type ClassStudent } from '../core/school';
import { el, esc } from '../ui/dom';
import { button, setFace } from '../ui/widgets';
import type { SchoolCtx } from './ctx';
import { renderClassGarden } from './garden';

const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

function heatMap(): HTMLElement {
  const box = el('div', 'panel heat');
  box.appendChild(el('div', 'panel-title', '<span>Participação ao longo das semanas</span>'));
  const grid = el('div', 'heat-grid');
  grid.setAttribute('role', 'img');
  grid.setAttribute('aria-label', 'Mapa de calor: dias da semana por semana, mais verde significa mais atividade');
  HEAT.forEach((row, i) => {
    grid.appendChild(el('span', 'day', DAYS[i]));
    row.forEach((v) => grid.appendChild(el('i', `h${v}`)));
  });
  box.append(grid, el('p', 'legend', '<span>menos</span><i class="h0"></i><i class="h1"></i><i class="h2"></i><i class="h3"></i><i class="h4"></i><span>mais atividade</span>'));
  return box;
}

function chips(students: ClassStudent[]): HTMLElement {
  const box = el('div', 'panel');
  box.appendChild(el('div', 'panel-title', '<span>Alunos da turma</span>'));
  box.appendChild(el('p', 'chips-legend', '<span class="ok">✔</span> participou · <span>–</span> ainda não participou'));
  const list = el('ul', 'student-chips');
  for (const s of students) {
    const li = el('li', `student-chip${participated(s) ? ' did' : ''}`, `<span class="face"></span><b>${esc(s.name)}</b><span class="mark" aria-hidden="true">${participated(s) ? '✔' : '–'}</span>`);
    li.setAttribute('aria-label', `${s.name}: ${participated(s) ? 'participou' : 'ainda não participou'}`);
    setFace(li.querySelector('.face') as HTMLElement, s.avatar);
    list.appendChild(li);
  }
  box.appendChild(list);
  return box;
}

export function downloadCsv(students: ClassStudent[]): void {
  const blob = new Blob([reportCsv(students)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = `relatorio-${CLASS_NAME.replace(/[^\w]+/g, '-').toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountClassView(ctx: SchoolCtx, host: HTMLElement): void {
  const students = classStudents(ctx.store.data);
  const stats = classStats(students);
  const head = el('div', 'tmain-head', `<h1>Acompanhamento da turma</h1><span class="class-tag">${esc(CLASS_NAME)}</span>`);
  const exp = button('Exportar relatório', () => (downloadCsv(students), ctx.bus.emit('toast', 'Relatório baixado (CSV).')), 'small');
  exp.id = 'export-csv';
  head.appendChild(exp);
  const goal = el('div', 'panel goal');
  goal.append(
    el('div', 'panel-title', '<span>Meta coletiva</span>'),
    el('p', '', `<b>${stats.participants} de ${CLASS_GOAL}</b> alunos já participaram`),
    el('div', 'bar-track', `<i style="width:${Math.round((stats.participants / CLASS_GOAL) * 100)}%"></i>`),
  );
  const garden = renderClassGarden({ completions: stats.completions, goalText: `${stats.participants} de ${CLASS_GOAL} alunos concluíram` });
  const cols = el('div', 'two-cols');
  cols.append(el('div', 'col', ''), el('div', 'col', ''));
  cols.children[0].append(heatMap(), goal, chips(students));
  cols.children[1].append(garden);
  host.append(head, cols);
}

export function mountReports(ctx: SchoolCtx, host: HTMLElement): void {
  const students = classStudents(ctx.store.data);
  const stats = classStats(students);
  const diaries = students.filter((s) => s.done > 0 && s.diary).length;
  const head = el('div', 'tmain-head', `<h1>Relatórios</h1><span class="class-tag">${esc(CLASS_NAME)}</span>`);
  const exp = button('Exportar relatório', () => downloadCsv(students), 'small');
  exp.id = 'export-csv';
  head.appendChild(exp);
  const cards = el('div', 'summary');
  cards.append(
    el('div', 'parch tile', `<b>${stats.participants}/${stats.total}</b><small>participaram</small>`),
    el('div', 'parch tile', `<b>${stats.completions}</b><small>expedições concluídas</small>`),
    el('div', 'parch tile', `<b>${diaries}</b><small>diários entregues</small>`),
  );
  const table = el('table', 'report');
  table.innerHTML = '<thead><tr><th>Aluno</th><th>Expedições concluídas</th><th>Diário entregue</th></tr></thead>';
  const tbody = el('tbody');
  for (const s of students) tbody.appendChild(el('tr', '', `<td>${esc(s.name)}</td><td>${s.done}</td><td>${s.done > 0 && s.diary ? 'sim' : 'não'}</td>`));
  table.appendChild(tbody);
  host.append(head, cards, el('div', 'table-wrap'));
  host.lastElementChild!.appendChild(table);
}
