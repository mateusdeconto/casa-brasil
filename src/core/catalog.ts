// Typed access to the JSON catalogs.
import animalsJson from '../data/animals.json';
import furnitureJson from '../data/furniture.json';
import manifestJson from '../data/manifest.json';

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
  exclusive?: 'museum';
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

export const assetUrl = (rel: string) => `${import.meta.env.BASE_URL}${rel}`;

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
