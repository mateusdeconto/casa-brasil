// Typed access to the JSON catalogs.
import animalsJson from '../data/animals.json';
import furnitureJson from '../data/furniture.json';
import manifestJson from '../data/manifest.json';
import partnersJson from '../data/partners.json';

export interface FurnitureDef {
  id: string;
  name: string;
  sprite: string;
  size: [number, number];
  price: number;
  scale: number;
  anchor: [number, number];
  blocks: boolean;
  floor?: boolean;
  provisorio?: boolean;
  /** unlock key (partner type, 'semana' or 'evento'); the item is locked in the shop until set */
  exclusive?: string;
  noSell?: boolean;
  /** shows the "edição limitada" ribbon */
  limited?: boolean;
  /** only one copy per house */
  unique?: boolean;
  /** museum piece: lives in the gallery wing, not in the house */
  gallery?: boolean;
  /** hangs on the back wall of the gallery (cells along the right wall) */
  wall?: boolean;
  /** the "você sabia?" line shown when the piece is tapped in the gallery */
  blurb?: string;
}

export interface ManifestEntry {
  file: string;
  w: number;
  h: number;
}

export const FURNITURE = furnitureJson.items as FurnitureDef[];
export const START_FURNITURE = furnitureJson.start;
export const furnitureById = (id: string) => FURNITURE.find((f) => f.id === id)!;

export const MANIFEST = manifestJson as {
  bases: Record<string, ManifestEntry & { srcW: number; srcH: number }>;
  items: Record<string, ManifestEntry & { sheet: number }>;
  opening: string;
};

/** WebP when the browser can decode it; the small PNG fallback otherwise. */
const SUPPORTS_WEBP = (() => {
  try {
    return document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false; // no document (tests) or blocked canvas
  }
})();

export const assetUrl = (rel: string) => `${import.meta.env.BASE_URL}${SUPPORTS_WEBP ? rel : rel.replace(/\.webp$/, '.png')}`;

export interface AnimalDef {
  id: string;
  name: string;
  price: number;
  coins: number;
  periodSec: number;
  at: [number, number];
  lift: number;
  width: number;
  exclusive?: 'zoo';
}

export const ANIMALS = animalsJson.animals as AnimalDef[];
/** Grid cell an animal stands on (blocks walking, target for collecting). */
export const animalCell = (a: AnimalDef): [number, number] => [Math.floor(a.at[0]), Math.floor(a.at[1])];
export const GARDEN_BLOCKED = animalsJson.blocked as [number, number][];
export const GARDEN_START = animalsJson.avatarStart as [number, number];
export const animalById = (id: string) => ANIMALS.find((a) => a.id === id)!;

export interface PartnerDef {
  id: string;
  type: string;
  name: string;
  kind: string;
  lat: number;
  lng: number;
  mission: string;
  photoTip: string;
  reward: { unlock: string; animal?: string; items?: string[]; text: string };
  stamp: string;
  ageRange: string;
  distanceKm: number;
  image: string;
  /** event partners have no GPS step and an optional photo */
  gps?: boolean;
  photoOptional?: boolean;
  /** the event partner: reached by QR, not listed with the places to visit */
  event?: boolean;
  /** false = this partner does not grant the 2x garden boost */
  boost?: boolean;
}

export const PARTNERS = partnersJson.partners as PartnerDef[];
/** Partners with a real place (zoo, museum...), without the event. */
export const PLACE_PARTNERS = PARTNERS.filter((p) => !p.event);
export const partnerById = (id: string) => PARTNERS.find((p) => p.id === id)!;
