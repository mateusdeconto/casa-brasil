// Opening screen: key art background, title, one "Jogar" button and two links.
// "Jogar" swaps the menu for three boxes: play, teacher, student.
import { TITLE } from '../config';
import { MANIFEST, assetUrl } from '../core/catalog';
import { el, itemUrl } from './dom';

const LINKS = [
  { label: 'Painel da cidade', href: '/cidade' },
  { label: 'Sobre o projeto', href: '/sobre' },
];

const CHOICES = [
  { id: 'choice-play', icon: 'family', label: 'Jogar', text: 'Em família, no celular', href: '' },
  { id: 'choice-teacher', icon: 'school', label: 'Sou professor(a)', text: 'Criar e acompanhar expedições', href: '/escola#professor' },
  { id: 'choice-student', icon: 'notebook', label: 'Sou aluno(a)', text: 'Fazer a expedição da turma', href: '/escola#aluno' },
];

export function showOpening(root: HTMLElement, onPlay: () => void): void {
  const s = el('div', 'screen opening');
  s.style.backgroundImage = `url(${assetUrl(MANIFEST.opening)})`;
  // the cover art already paints the game title: keep a text title only for screen readers
  s.setAttribute('role', 'main');
  s.appendChild(el('h1', 'sr-only', TITLE));
  const menu = el('div', 'entries');
  s.appendChild(menu);
  root.appendChild(s);

  const showMain = () => {
    menu.replaceChildren();
    const play = el('button', 'btn', 'Jogar');
    play.onclick = showChoices;
    menu.appendChild(play);
    const row = el('div', 'entry-links');
    for (const l of LINKS) {
      const a = el('a', 'btn secondary small', l.label);
      a.setAttribute('href', l.href);
      row.appendChild(a);
    }
    menu.appendChild(row);
  };

  const showChoices = () => {
    menu.replaceChildren();
    const cards = el('div', 'choice-cards');
    for (const c of CHOICES) {
      const b = el('button', 'role-card parch', `<img src="${itemUrl(c.icon)}" alt=""><span><b>${c.label}</b><small>${c.text}</small></span>`);
      b.id = c.id;
      b.onclick = c.href
        ? () => location.assign(c.href)
        : () => {
            s.remove();
            onPlay();
          };
      cards.appendChild(b);
    }
    const back = el('button', 'btn secondary small', 'Voltar');
    back.onclick = showMain;
    menu.append(cards, back);
  };

  showMain();
}
