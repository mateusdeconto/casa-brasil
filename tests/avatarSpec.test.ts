import { describe, expect, it } from 'vitest';
import {
  CLOTHES, HAIRS, MODELS, SKINS, formatAvatar, isPlain, parseAvatar, recolorPixels, regionOf, sexOf,
} from '../src/core/avatarSpec';

const px = (...rgba: number[]) => new Uint8ClampedArray(rgba);

describe('avatar spec string', () => {
  it('keeps legacy ids as plain originals', () => {
    expect(parseAvatar('avatar_5')).toEqual({ base: 'avatar_5' });
    expect(isPlain(parseAvatar('avatar_5'))).toBe(true);
  });

  it('round-trips colour picks', () => {
    const spec = { base: 'avatar_3', skin: 2, hair: 4, cloth: 1 };
    expect(formatAvatar(spec)).toBe('avatar_3~p2h4r1');
    expect(parseAvatar('avatar_3~p2h4r1')).toEqual(spec);
  });

  it('drops picks outside the palette instead of crashing', () => {
    expect(parseAvatar('avatar_1~p9h9r9')).toEqual({ base: 'avatar_1' });
    expect(formatAvatar({ base: 'avatar_1' })).toBe('avatar_1');
  });

  it('knows each model sex and lists every model once', () => {
    expect(sexOf('avatar_6')).toBe('menino');
    expect(sexOf('avatar_1')).toBe('menina');
    const all = [...MODELS.menina, ...MODELS.menino].sort();
    expect(all).toEqual(Array.from({ length: 8 }, (_, i) => `avatar_${i + 1}`).sort());
  });
});

describe('recolorPixels', () => {
  const SKIN = [246, 155, 80, 255]; // face of avatar_1
  const TEE = [243, 167, 43, 255];
  const HAIR = [37, 27, 22, 255];
  const LINE = [10, 8, 8, 255];
  const JEANS = [45, 72, 112, 255];

  it('does nothing for the original art', () => {
    const d = px(...SKIN, ...TEE);
    const before = Array.from(d);
    recolorPixels(d, { base: 'avatar_1' }, 1);
    expect(Array.from(d)).toEqual(before);
  });

  it('sorts pixels into regions', () => {
    expect(regionOf(27, 0.9, 0.66)).toBe('skin');
    expect(regionOf(37, 0.89, 0.56)).toBe('cloth');
    expect(regionOf(20, 0.25, 0.12)).toBe('hair');
    expect(regionOf(216, 0.43, 0.31)).toBeNull();
    expect(regionOf(0, 0, 0.02)).toBeNull();
  });

  it('recolours only the chosen region and leaves outlines, jeans and transparency alone', () => {
    const d = px(...SKIN, ...TEE, ...HAIR, ...LINE, ...JEANS, 200, 100, 50, 0);
    const before = Array.from(d);
    recolorPixels(d, { base: 'avatar_1', hair: HAIRS.findIndex((h) => h.name === 'Loiro') }, 1);
    const after = Array.from(d);
    expect(after.slice(0, 8)).toEqual(before.slice(0, 8)); // skin + tee unchanged
    expect(after.slice(8, 11)).not.toEqual(before.slice(8, 11)); // hair changed
    expect(after.slice(12)).toEqual(before.slice(12)); // outline, jeans, transparent
  });

  it('keeps dark trousers low in the sprite out of the hair region', () => {
    expect(regionOf(30, 0.2, 0.2, 0.2)).toBe('hair');
    expect(regionOf(30, 0.2, 0.2, 0.8)).toBeNull();
    expect(regionOf(30, 0.08, 0.2, 0.2)).toBeNull(); // grey, not hair
  });

  it('makes the skin lighter or darker as asked', () => {
    const light = px(...SKIN);
    const dark = px(...SKIN);
    recolorPixels(light, { base: 'avatar_1', skin: SKINS.findIndex((s) => s.name === 'Clara') }, 1);
    recolorPixels(dark, { base: 'avatar_1', skin: SKINS.findIndex((s) => s.name === 'Escura') }, 1);
    const sum = (a: Uint8ClampedArray) => a[0] + a[1] + a[2];
    expect(sum(light)).toBeGreaterThan(sum(px(...SKIN)));
    expect(sum(dark)).toBeLessThan(sum(px(...SKIN)));
  });

  it('recolours clothes to the chosen swatch', () => {
    const d = px(...TEE);
    recolorPixels(d, { base: 'avatar_1', cloth: CLOTHES.findIndex((c) => c.name === 'Azul') }, 1);
    expect(d[2]).toBeGreaterThan(d[0]); // blue channel beats red
  });
});
