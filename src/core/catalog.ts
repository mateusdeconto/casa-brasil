// Typed access to the JSON catalogs.
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
