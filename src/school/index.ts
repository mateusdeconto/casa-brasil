// /escola: pick "Sou professor(a)" or "Sou aluno(a)". The role lives in the URL hash.
import '../ui/style.css';
import '../ui/pages.css';
import '../site/site.css';
import './school.css';
import { TITLE } from '../config';
import { el, itemUrl, toast } from '../ui/dom';
import { siteBar } from '../site/bar';
import { createCtx, type SchoolCtx } from './ctx';
import { mountStudent } from './student';
import { mountTeacher } from './teacher';

function chooser(ctx: SchoolCtx, host: HTMLElement): void {
  const box = el('section', 'chooser');
  box.append(
    el('h1', '', 'Modo Escola'),
    el('p', 'lead', 'Expedições digitais ligadas a visitas reais: a turma se prepara, visita e conta o que descobriu.'),
  );
  const cards = el('div', 'role-cards');
  const role = (icon: string, label: string, text: string, hash: string, id: string) => {
    const b = el('button', 'role-card parch', `<img src="${itemUrl(icon)}" alt=""><b>${label}</b><small>${text}</small>`);
    b.id = id;
    b.onclick = () => ctx.navigate(hash);
    return b;
  };
  cards.append(
    role('school', 'Sou professor(a)', 'Criar e acompanhar expedições da turma', '#professor', 'role-teacher'),
    role('notebook', 'Sou aluno(a)', 'Fazer a expedição no celular', '#aluno', 'role-student'),
  );
  box.append(cards, el('p', 'demo-note', 'Protótipo com dados fictícios da turma "7º ano B". Nada sai deste aparelho.'));
  host.appendChild(box);
}

export function mount(root: HTMLElement): void {
  document.title = `Modo Escola · ${TITLE}`;
  const frame = el('div', 'site-frame');
  const body = el('div', 'site-body');
  root.append(frame);
  frame.append(siteBar('escola'), body);
  const ctx = createCtx(body, (hash) => {
    location.hash = hash;
  });
  const render = () => {
    body.innerHTML = '';
    const role = location.hash.replace('#', '').split('/')[0];
    if (role === 'professor') mountTeacher(ctx, body);
    else if (role === 'aluno') mountStudent(ctx, body);
    else chooser(ctx, body);
  };
  window.addEventListener('hashchange', render);
  ctx.bus.on('toast', (t) => toast(root, t, 2600));
  render();
}
