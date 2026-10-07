// Avatar = one of the painted models plus optional colour picks for skin, hair and clothes.
// Stored as a string so saves stay compatible: "avatar_3" (original art) or "avatar_3~p2h4r1".
export type Sex = 'menina' | 'menino';
export type Part = 'skin' | 'hair' | 'cloth';

export interface AvatarSpec {
  base: string;
  skin?: number;
  hair?: number;
  cloth?: number;
}

/** Target look of one swatch: hue/saturation/lightness of the region's average colour. */
export interface Tone {
  name: string;
  h: number;
  s: number;
  l: number;
}

export const MODELS: Record<Sex, string[]> = {
  menina: ['avatar_1', 'avatar_3', 'avatar_5', 'avatar_7', 'avatar_8'],
  menino: ['avatar_2', 'avatar_4', 'avatar_6'],
};

export const SKINS: Tone[] = [
  { name: 'Clara', h: 26, s: 0.85, l: 0.8 },
  { name: 'Média', h: 26, s: 0.85, l: 0.66 },
  { name: 'Morena', h: 24, s: 0.75, l: 0.5 },
  { name: 'Parda', h: 22, s: 0.65, l: 0.37 },
  { name: 'Escura', h: 20, s: 0.55, l: 0.25 },
];

export const HAIRS: Tone[] = [
  { name: 'Preto', h: 20, s: 0.25, l: 0.12 },
  { name: 'Castanho', h: 24, s: 0.5, l: 0.24 },
  { name: 'Loiro', h: 44, s: 0.75, l: 0.55 },
  { name: 'Ruivo', h: 14, s: 0.8, l: 0.38 },
  { name: 'Rosa', h: 330, s: 0.6, l: 0.55 },
  { name: 'Azul', h: 210, s: 0.6, l: 0.4 },
];

export const CLOTHES: Tone[] = [
  { name: 'Amarelo', h: 40, s: 0.9, l: 0.56 },
  { name: 'Vermelho', h: 2, s: 0.7, l: 0.5 },
  { name: 'Rosa', h: 335, s: 0.65, l: 0.68 },
  { name: 'Roxo', h: 270, s: 0.45, l: 0.55 },
  { name: 'Azul', h: 210, s: 0.65, l: 0.5 },
  { name: 'Verde', h: 135, s: 0.5, l: 0.42 },
  { name: 'Branco', h: 40, s: 0.15, l: 0.9 },
];

export const PALETTES: Record<Part, Tone[]> = { skin: SKINS, hair: HAIRS, cloth: CLOTHES };

const CODE: Record<Part, string> = { skin: 'p', hair: 'h', cloth: 'r' };
const PARTS: Part[] = ['skin', 'hair', 'cloth'];

export function sexOf(base: string): Sex {
  return MODELS.menino.includes(base) ? 'menino' : 'menina';
}

export function parseAvatar(raw: string): AvatarSpec {
  const [base, picks = ''] = raw.split('~');
  const spec: AvatarSpec = { base };
  for (const part of PARTS) {
    const m = picks.match(new RegExp(`${CODE[part]}(\\d)`));
    const i = m ? Number(m[1]) : -1;
    if (i >= 0 && i < PALETTES[part].length) spec[part] = i;
  }
  return spec;
}

export function formatAvatar(spec: AvatarSpec): string {
  const picks = PARTS.map((p) => (spec[p] == null ? '' : `${CODE[p]}${spec[p]}`)).join('');
  return picks ? `${spec.base}~${picks}` : spec.base;
}

export const isPlain = (spec: AvatarSpec): boolean => PARTS.every((p) => spec[p] == null);

// ---- recolouring ----

type Region = Part | null;

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hn = (((h % 360) + 360) % 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t0: number) => {
    const t = t0 < 0 ? t0 + 1 : t0 > 1 ? t0 - 1 : t0;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return [ch(hn + 1 / 3), ch(hn), ch(hn - 1 / 3)];
}

/** Share of the sprite height (from the top) where hair can still be. */
const HAIR_MAX_Y = 0.68;

/** Which body region a painted pixel belongs to. The art is flat pixel art, so hue/saturation/lightness is enough. */
export function regionOf(h: number, s: number, l: number, y = 0): Region {
  if (l < 0.07) return null; // outline
  if (h >= 8 && h <= 32 && s >= 0.5 && l >= 0.12 && l <= 0.85) return 'skin';
  // hair only above the hips: dark trousers share its colours
  if ((h <= 40 || h >= 320) && s >= 0.18 && s < 0.5 && l < 0.3 && y < HAIR_MAX_Y) return 'hair';
  if (h >= 33 && h <= 60 && s >= 0.5) return 'cloth';
  if (h >= 20 && h <= 55 && s >= 0.16 && s < 0.5 && l >= 0.38 && l < 0.9) return 'cloth';
  return null;
}

/** `hsl(...)` string for a swatch button. */
export const toneCss = (t: Tone): string => `hsl(${t.h} ${Math.round(t.s * 100)}% ${Math.round(t.l * 100)}%)`;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Recolours RGBA pixels in place (pass your own copy). Each chosen region keeps its shading:
 * every pixel is moved to the swatch relative to the region's average lightness/saturation.
 */
export function recolorPixels(data: Uint8ClampedArray, spec: AvatarSpec, width: number): void {
  if (isPlain(spec)) return;
  const n = data.length / 4;
  const rows = n / width;
  const region = new Array<Region>(n).fill(null);
  const hsl = new Array<[number, number, number]>(n);
  const sum: Record<Part, { s: number; l: number; n: number }> = {
    skin: { s: 0, l: 0, n: 0 },
    hair: { s: 0, l: 0, n: 0 },
    cloth: { s: 0, l: 0, n: 0 },
  };
  for (let i = 0; i < n; i++) {
    if (data[i * 4 + 3] < 20) continue;
    const c = rgbToHsl(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    hsl[i] = c;
    const r = regionOf(c[0], c[1], c[2], Math.floor(i / width) / rows);
    region[i] = r;
    if (r) {
      sum[r].s += c[1];
      sum[r].l += c[2];
      sum[r].n++;
    }
  }
  for (let i = 0; i < n; i++) {
    const r = region[i];
    if (!r) continue;
    const pick = spec[r];
    if (pick == null || !sum[r].n) continue;
    const tone = PALETTES[r][pick];
    const [, s, l] = hsl[i];
    const avgS = sum[r].s / sum[r].n || 1;
    const avgL = sum[r].l / sum[r].n || 1;
    const ns = clamp(tone.s * clamp(s / avgS, 0.6, 1.5), 0, 1);
    const nl = clamp(tone.l * clamp(l / avgL, 0.5, 1.6), 0, 0.97);
    const [rr, gg, bb] = hslToRgb(tone.h, ns, nl);
    data[i * 4] = rr;
    data[i * 4 + 1] = gg;
    data[i * 4 + 2] = bb;
  }
}
