// Top HUD (avatar face, name, coins) and bottom nav bar.
import type { Emitter, GameEvents, Tab } from '../core/events';
import { paintAvatar } from './avatarImage';
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
  const tool = (key: string, label: string, event: 'openParent' | 'openSettings') => {
    const b = el('button', 'hud-btn', `<img src="${itemUrl(key)}" alt="">`);
    b.setAttribute('aria-label', label);
    b.onclick = () => bus.emit(event, undefined);
    return b;
  };
  bar.append(face, name, coins, tool('shield_parent', 'Painel dos pais', 'openParent'), tool('gear', 'Configurações', 'openSettings'));
  root.appendChild(bar);
  const label = coins.querySelector('span')!;
  bus.on('coins', (n) => (label.textContent = n.toLocaleString('pt-BR')));
  return {
    setPlayer(avatar, n) {
      paintAvatar(face, avatar);
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
  { tab: 'gallery', label: 'Galeria', icon: 'vitrine', wood: true },
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
  return (tab) => buttons.forEach((b) => b.classList.toggle('on', b.dataset.tab === (tab === 'edit' ? 'home' : tab === 'galleryEdit' ? 'gallery' : tab)));
}

/** "Editar" button that lives on the Casa and Galeria screens; it edits whichever room is open. */
export function createEditFab(root: HTMLElement, bus: Emitter<GameEvents>, canEditGallery: () => boolean): (tab: Tab) => void {
  let current: Tab = 'home';
  const fab = el('button', 'edit-fab hidden', `<img src="${itemUrl('nav_edit')}" alt=""><span>Editar</span>`);
  fab.setAttribute('aria-label', 'Editar');
  fab.onclick = () => bus.emit('tab', current === 'gallery' ? 'galleryEdit' : 'edit');
  root.appendChild(fab);
  return (tab) => {
    current = tab;
    fab.classList.toggle('hidden', !(tab === 'home' || (tab === 'gallery' && canEditGallery())));
  };
}
