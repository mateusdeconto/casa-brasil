// Teacher shell: side menu (Turmas, Expedições, Relatórios) and the view that goes with it.
import { el, itemUrl } from '../ui/dom';
import { mountBuilder } from './builder';
import type { SchoolCtx } from './ctx';
import { mountClassView, mountReports } from './teacherClass';

type View = 'turmas' | 'expedicoes' | 'relatorios';

const MENU: { id: View; label: string; icon: string }[] = [
  { id: 'turmas', label: 'Turmas', icon: 'school' },
  { id: 'expedicoes', label: 'Expedições', icon: 'notebook' },
  { id: 'relatorios', label: 'Relatórios', icon: 'clipboard' },
];

const viewFromHash = (): View => {
  const v = location.hash.split('/')[1];
  return MENU.some((m) => m.id === v) ? (v as View) : 'turmas';
};

export function mountTeacher(ctx: SchoolCtx, host: HTMLElement): void {
  const shell = el('div', 'teacher');
  const side = el('aside', 'side');
  side.setAttribute('aria-label', 'Menu do professor');
  const main = el('div', 'tmain');
  shell.append(side, main);
  host.appendChild(shell);

  const show = (view: View) => {
    main.innerHTML = '';
    side.querySelectorAll('button.menu').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.view === view));
    if (view === 'turmas') mountClassView(ctx, main);
    else if (view === 'expedicoes') mountBuilder(ctx, main, () => show('turmas'));
    else mountReports(ctx, main);
  };

  side.appendChild(el('div', 'side-title', `<img src="${itemUrl('school')}" alt=""><span>Professor(a)</span>`));
  for (const m of MENU) {
    const b = el('button', 'menu', `<img src="${itemUrl(m.icon)}" alt=""><span>${m.label}</span>`);
    b.dataset.view = m.id;
    b.onclick = () => {
      history.replaceState(null, '', `#professor/${m.id}`);
      show(m.id);
    };
    side.appendChild(b);
  }
  const back = el('a', 'side-link', 'Trocar de perfil');
  back.setAttribute('href', '/escola');
  side.appendChild(back);
  show(viewFromHash());
}
