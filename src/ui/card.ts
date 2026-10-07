// Modal card (wood panel) with a picture, text and buttons. Tapping outside closes it.
import { el, itemUrl } from './dom';

export interface CardButton {
  label: string;
  secondary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function showCard(root: HTMLElement, opts: { title: string; image?: string; text: string; buttons: CardButton[] }): () => void {
  const shade = el('div', 'shade');
  const card = el('div', 'panel card-modal');
  const title = el('div', 'panel-title', `<span>${opts.title}</span>`);
  const x = el('button', 'close', '✕');
  title.appendChild(x);
  const body = el('div', 'card-body');
  if (opts.image) body.appendChild(el('img', 'card-img')).setAttribute('src', itemUrl(opts.image));
  body.appendChild(el('p', '', opts.text));
  for (const b of opts.buttons) {
    const btn = el('button', 'btn' + (b.secondary ? ' secondary' : ''), b.label);
    btn.disabled = !!b.disabled;
    btn.onclick = () => {
      close();
      b.onClick();
    };
    body.appendChild(btn);
  }
  card.append(title, body);
  shade.appendChild(card);
  root.appendChild(shade);
  const close = () => shade.remove();
  x.onclick = close;
  shade.onclick = (e) => e.target === shade && close();
  return close;
}
