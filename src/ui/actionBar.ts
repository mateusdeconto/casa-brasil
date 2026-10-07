// Contextual bar above the nav: confirm/cancel a purchase, sell/finish in edit mode.
import type { EditorState } from '../core/events';
import { el, itemUrl } from './dom';

export interface ActionHandlers {
  buy(): void;
  cancel(): void;
  sell(): void;
  done(): void;
}

export function createActionBar(root: HTMLElement, h: ActionHandlers): (s: EditorState) => void {
  const bar = el('div', 'panel actionbar hidden');
  root.appendChild(bar);
  const coin = `<img class="c" src="${itemUrl('coin')}" alt="">`;

  const button = (label: string, cls: string, fn: () => void, disabled = false) => {
    const b = el('button', `btn ${cls}`, label);
    b.disabled = disabled;
    b.onclick = fn;
    return b;
  };

  return (s) => {
    bar.classList.toggle('hidden', s.mode === 'none');
    bar.innerHTML = '';
    const info = el('div', 'info');
    if (s.mode === 'place') {
      info.innerHTML = `<span>${s.name} ${coin}${s.price}</span><small>${s.valid ? 'Toque de novo para colocar' : 'Lugar ocupado'}</small>`;
      bar.append(info, button('Cancelar', 'secondary', h.cancel), button('Comprar', '', h.buy, !s.valid));
    } else if (s.mode === 'edit') {
      info.innerHTML = s.selected ? `${s.name}<small>Arraste para mover</small>` : 'Editar<small>Toque num móvel</small>';
      if (s.selected) bar.append(info, button(`Vender +${s.price}`, 'secondary', h.sell), button('Pronto', '', h.done));
      else bar.append(info, button('Pronto', '', h.done));
    }
  };
}
