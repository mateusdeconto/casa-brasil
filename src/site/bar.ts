// Top bar shared by /escola, /cidade and /sobre.
import { TITLE } from '../config';
import { el } from '../ui/dom';

const LINKS = [
  { id: 'jogo', href: '/', label: 'Jogo' },
  { id: 'escola', href: '/escola', label: 'Escola' },
  { id: 'cidade', href: '/cidade', label: 'Cidade' },
  { id: 'sobre', href: '/sobre', label: 'Sobre' },
];

export function siteBar(active: string): HTMLElement {
  const bar = el('header', 'site-bar');
  bar.appendChild(el('a', 'brand', TITLE)).setAttribute('href', '/');
  const nav = el('nav');
  nav.setAttribute('aria-label', 'Páginas');
  for (const l of LINKS) {
    const a = el('a', l.id === active ? 'on' : '', l.label);
    a.setAttribute('href', l.href);
    nav.appendChild(a);
  }
  bar.appendChild(nav);
  return bar;
}
