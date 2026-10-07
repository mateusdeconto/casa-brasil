// Opening screen: key art background, title and the 4 ways in.
import { TITLE } from '../config';
import { MANIFEST, assetUrl } from '../core/catalog';
import { el } from './dom';

const LINKS = [
  { label: 'Sou professor(a)', href: '/escola' },
  { label: 'Painel da cidade', href: '/cidade' },
  { label: 'Sobre o projeto', href: '/sobre' },
];

export function showOpening(root: HTMLElement, onPlay: () => void): void {
  const s = el('div', 'screen opening');
  s.style.backgroundImage = `url(${assetUrl(MANIFEST.opening)})`;
  // the cover art already paints the game title: keep a text title only for screen readers
  s.setAttribute('role', 'main');
  s.appendChild(el('h1', 'sr-only', TITLE));
  const menu = el('div', 'entries');
  const play = el('button', 'btn', 'Jogar em família');
  play.onclick = () => {
    s.remove();
    onPlay();
  };
  menu.appendChild(play);
  const row = el('div', 'entry-links');
  for (const l of LINKS) {
    const a = el('a', 'btn secondary small', l.label);
    a.setAttribute('href', l.href);
    row.appendChild(a);
  }
  menu.appendChild(row);
  s.appendChild(menu);
  root.appendChild(s);
}
