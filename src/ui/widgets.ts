// Small shared UI pieces: buttons, the DEMO ribbon, stamps, photos from IndexedDB.
import { partnerById, PARTNERS } from '../core/catalog';
import { getPhoto } from '../core/photos';
import { el, itemUrl } from './dom';

export function button(label: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', `btn ${cls}`.trim());
  b.textContent = label; // plain text: names typed by children never become markup
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
  const card = el('div', 'panel card-modal', '<div class="card-body"><p></p></div>');
  card.querySelector('p')!.textContent = text; // plain text only
  const body = card.querySelector('.card-body')!;
  const no = button('Voltar', () => shade.remove(), 'secondary');
  const yes = button(yesLabel, () => (shade.remove(), onYes()));
  body.append(yes, no);
  shade.appendChild(card);
  root.appendChild(shade);
}

/** Avatar head crop used by the HUD and the profile chips. */
export function setFace(node: HTMLElement, avatar: string): void {
  node.style.backgroundImage = `url(${itemUrl(avatar)})`;
}

/** On/off switch with a text label. */
export function toggleRow(label: string, hint: string, on: boolean, onChange: (v: boolean) => void): HTMLElement {
  const row = el('div', 'opt-row');
  const text = el('div', 'opt-text');
  text.append(el('b'), el('small'));
  text.firstElementChild!.textContent = label;
  text.lastElementChild!.textContent = hint;
  const sw = el('button', `switch${on ? ' on' : ''}`, '<i></i>');
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-checked', String(on));
  sw.setAttribute('aria-label', label);
  sw.onclick = () => {
    const v = !sw.classList.contains('on');
    sw.classList.toggle('on', v);
    sw.setAttribute('aria-checked', String(v));
    onChange(v);
  };
  row.append(text, sw);
  return row;
}

/** Modal asking for one line of text. */
export function askText(root: HTMLElement, title: string, initial: string, max: number, onOk: (v: string) => void): void {
  const shade = el('div', 'shade');
  const card = el('div', 'panel card-modal', '<div class="panel-title"><span></span></div>');
  card.querySelector('span')!.textContent = title;
  const body = el('div', 'card-body');
  const input = el('input');
  input.maxLength = max;
  input.value = initial;
  input.setAttribute('aria-label', title);
  body.append(input, button('Salvar', () => (shade.remove(), onOk(input.value.trim().slice(0, max))), ''), button('Voltar', () => shade.remove(), 'secondary'));
  card.appendChild(body);
  shade.appendChild(card);
  root.appendChild(shade);
  input.focus();
}
