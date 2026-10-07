// Small shared UI pieces: buttons, the DEMO ribbon, stamps, photos from IndexedDB.
import { partnerById, PARTNERS } from '../core/catalog';
import { getPhoto } from '../core/photos';
import { el, itemUrl } from './dom';

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', `btn ${cls}`.trim(), label);
  b.onclick = onClick;
  return b;
}

export const demoRibbon = (): HTMLImageElement => {
  const i = el('img', 'ribbon-demo');
  i.src = itemUrl('ribbon_demo');
  i.alt = 'DEMO';
  return i;
};

export const icon = (key: string, cls = 'ico'): HTMLImageElement => {
  const i = el('img', cls);
  i.src = itemUrl(key);
  i.alt = '';
  return i;
};

/** Stamp image for a partner type (coloured or locked). */
export function stampKey(type: string, locked: boolean): string {
  const p = PARTNERS.find((x) => x.type === type);
  const base = p?.stamp ?? `stamp_${type}`;
  return locked ? `${base}_locked` : base;
}

export const partnerName = (id: string): string => partnerById(id).name;

/** Put a stored photo into an <img>; returns a cleanup that revokes the object URL. */
export function loadPhoto(img: HTMLImageElement, visitId: string): () => void {
  let url = '';
  let dead = false;
  getPhoto(visitId).then((blob) => {
    if (dead || !blob) return;
    url = URL.createObjectURL(blob);
    img.src = url;
  });
  return () => {
    dead = true;
    if (url) URL.revokeObjectURL(url);
  };
}

/** Modal "are you sure": calls onYes only on confirmation. */
export function confirmBox(root: HTMLElement, text: string, yesLabel: string, onYes: () => void): void {
  const shade = el('div', 'shade');
  const card = el('div', 'panel card-modal', `<div class="card-body"><p>${text}</p></div>`);
  const body = card.querySelector('.card-body')!;
  const no = button('Voltar', () => shade.remove(), 'secondary');
  const yes = button(yesLabel, () => (shade.remove(), onYes()));
  body.append(yes, no);
  shade.appendChild(card);
  root.appendChild(shade);
}
