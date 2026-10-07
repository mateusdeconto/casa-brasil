// Top HUD (avatar face, name, coins) and bottom nav bar.
import type { Emitter, GameEvents, Tab } from '../core/events';
import { el, itemUrl } from './dom';

export interface Hud {
  setPlayer(avatar: string, name: string): void;
  setCoins(n: number): void;
  coinTarget(): DOMRect;
}

export function createHud(root: HTMLElement, bus: Emitter<GameEvents>): Hud {
  const bar = el('div', 'hud');
  const face = el('div', 'face');
  const name = el('div', 'name');
  const coins = el('div', 'coins', `<img src="${itemUrl('coin')}" alt=""><span>0</span>`);
  bar.append(face, name, coins);
  root.appendChild(bar);
  const label = coins.querySelector('span')!;
  bus.on('coins', (n) => (label.textContent = n.toLocaleString('pt-BR')));
  return {
    setPlayer(avatar, n) {
      face.style.backgroundImage = `url(${itemUrl(avatar)})`;
      name.textContent = n;
    },
    setCoins: (n) => (label.textContent = n.toLocaleString('pt-BR')),
    coinTarget: () => coins.querySelector('img')!.getBoundingClientRect(),
  };
}

/** `wood` icons are plain art drawn on a CSS wood button to match the painted ones. */
const TABS: { tab: Tab; label: string; icon: string; wood?: boolean }[] = [
  { tab: 'home', label: 'Casa', icon: 'nav_home' },
  { tab: 'garden', label: 'Jardim', icon: 'nav_garden' },
  { tab: 'shop', label: 'Loja', icon: 'nav_shop' },
  { tab: 'avatar', label: 'Avatar', icon: 'nav_avatar' },
  { tab: 'family', label: 'Família', icon: 'family', wood: true },
  { tab: 'album', label: 'Álbum', icon: 'polaroid', wood: true },
];

export function createNav(root: HTMLElement, bus: Emitter<GameEvents>): (tab: Tab) => void {
  const nav = el('nav', 'nav');
  const buttons = TABS.map(({ tab, label, icon, wood }) => {
    const img = `<img src="${itemUrl(icon)}" alt="">`;
    const b = el('button', '', `${wood ? `<span class="wood">${img}</span>` : img}<span>${label}</span>`);
    b.setAttribute('aria-label', label);
    b.dataset.tab = tab;
    b.onclick = () => bus.emit('tab', tab);
    nav.appendChild(b);
    return b;
  });
  root.appendChild(nav);
  // editing the room still counts as being on the Casa tab
  return (tab) => buttons.forEach((b) => b.classList.toggle('on', b.dataset.tab === (tab === 'edit' ? 'home' : tab)));
}

/** "Editar" button that lives on the Casa screen; shown only on the home tab. */
export function createEditFab(root: HTMLElement, bus: Emitter<GameEvents>): (tab: Tab) => void {
  const fab = el('button', 'edit-fab hidden', `<img src="${itemUrl('nav_edit')}" alt=""><span>Editar</span>`);
  fab.setAttribute('aria-label', 'Editar a casa');
  fab.onclick = () => bus.emit('tab', 'edit');
  root.appendChild(fab);
  return (tab) => fab.classList.toggle('hidden', tab !== 'home');
}
