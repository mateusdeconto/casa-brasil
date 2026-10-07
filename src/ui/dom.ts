// Small DOM helpers for the HTML interface layer.
import { MANIFEST, assetUrl } from '../core/catalog';

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export const itemUrl = (key: string) => assetUrl(MANIFEST.items[key].file);

export function toast(root: HTMLElement, text: string, ms = 1800): void {
  const t = el('div', 'toast', text);
  root.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
