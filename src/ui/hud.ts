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

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: 'home', label: 'Casa', icon: 'nav_home' },
  { tab: 'garden', label: 'Jardim', icon: 'nav_garden' },
  { tab: 'shop', label: 'Loja', icon: 'nav_shop' },
  { tab: 'edit', label: 'Editar', icon: 'nav_edit' },
  { tab: 'avatar', label: 'Avatar', icon: 'nav_avatar' },
];

export function createNav(root: HTMLElement, bus: Emitter<GameEvents>): (tab: Tab) => void {
  const nav = el('nav', 'nav');
  const buttons = TABS.map(({ tab, label, icon }) => {
    const b = el('button', '', `<img src="${itemUrl(icon)}" alt=""><span>${label}</span>`);
    b.dataset.tab = tab;
    b.onclick = () => bus.emit('tab', tab);
    nav.appendChild(b);
    return b;
  });
  root.appendChild(nav);
  return (tab) => buttons.forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
}
