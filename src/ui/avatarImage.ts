// Turns an avatar spec into pixels: the painted model recoloured by the child's picks.
import { formatAvatar, isPlain, parseAvatar, recolorPixels, type AvatarSpec } from '../core/avatarSpec';
import { itemUrl } from './dom';

type Source = HTMLImageElement | HTMLCanvasElement;

/** Recoloured copy of `source`. The original is never touched. */
export function recolorCanvas(source: Source, spec: AvatarSpec): HTMLCanvasElement {
  const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
  const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const pixels = ctx.getImageData(0, 0, w, h);
  recolorPixels(pixels.data, spec, w);
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

const images = new Map<string, Promise<HTMLImageElement>>();
const urls = new Map<string, string>();

function loadModel(base: string): Promise<HTMLImageElement> {
  let p = images.get(base);
  if (!p) {
    const img = new Image();
    img.src = itemUrl(base);
    p = img.decode().then(() => img);
    images.set(base, p);
  }
  return p;
}

/** Image URL for a spec; the plain original resolves at once, a recoloured one once drawn (cached). */
export async function avatarUrl(raw: string): Promise<string> {
  const spec = parseAvatar(raw);
  if (isPlain(spec)) return itemUrl(spec.base);
  const key = formatAvatar(spec);
  const hit = urls.get(key);
  if (hit) return hit;
  const url = recolorCanvas(await loadModel(spec.base), spec).toDataURL();
  urls.set(key, url);
  return url;
}

/** Sets a CSS background to the avatar: the original art right away, the recoloured one when ready. */
export function paintAvatar(node: HTMLElement, raw: string): void {
  const spec = parseAvatar(raw);
  node.style.backgroundImage = `url(${itemUrl(spec.base)})`;
  if (isPlain(spec)) return;
  void avatarUrl(raw)
    .then((url) => {
      node.style.backgroundImage = `url(${url})`;
    })
    .catch(() => undefined); // keep the original art if the image cannot be read
}
