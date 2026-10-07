// Shop panel that slides up from the nav bar: icon, name, price per card.
import { FURNITURE } from '../core/catalog';
import type { Emitter, GameEvents } from '../core/events';
import type { SaveData } from '../core/state';
import { el, itemUrl } from './dom';

export interface Shop {
  open(): void;
  close(): void;
}

export function createShop(root: HTMLElement, bus: Emitter<GameEvents>, data: () => SaveData): Shop {
  const panel = el('div', 'panel shop');
  const title = el('div', 'panel-title', '<span>Loja</span>');
  const close = el('button', 'close', '✕');
  title.appendChild(close);
  const list = el('div', 'shop-list');
  panel.append(title, list);
  root.appendChild(panel);

  const render = () => {
    list.innerHTML = '';
    const d = data();
    for (const f of FURNITURE) {
      const locked = f.exclusive === 'museum' && !d.unlocks.museum;
      const poor = d.coins < f.price;
      const card = el('button', 'shop-card' + (locked ? ' locked' : poor ? ' poor' : ''));
      const price = locked
        ? `<img src="${itemUrl('lock')}" alt="">Museu`
        : f.price ? `<img src="${itemUrl('coin')}" alt="">${f.price}` : 'Grátis';
      card.innerHTML = `<div class="icon"><img src="${itemUrl(f.sprite)}" alt=""></div><div class="nm">${f.name}</div><div class="pr">${price}</div>`;
      card.onclick = () => {
        if (locked) return bus.emit('toast', 'Exclusivo: só com visita real a um museu parceiro');
        if (poor) return bus.emit('toast', 'Moedas insuficientes');
        shop.close();
        bus.emit('shopPick', f.id);
      };
      list.appendChild(card);
    }
  };

  const shop: Shop = {
    open() {
      render();
      panel.classList.add('open');
    },
    close() {
      panel.classList.remove('open');
    },
  };
  close.onclick = () => {
    shop.close();
    bus.emit('tab', 'home');
  };
  return shop;
}
