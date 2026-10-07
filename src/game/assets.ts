// Scene by scene loading: the boot loads what every scene needs, the house and the garden load their own pictures.
import Phaser from 'phaser';
import { ANIMALS, FURNITURE, MANIFEST, assetUrl } from '../core/catalog';

export type AssetGroup = 'common' | 'room' | 'garden';

const COMMON = /^(avatar_|pose_|coin|lock$|jaguar_silhouette$)/;
const furnitureSprites = new Set(FURNITURE.map((f) => f.sprite));
const animalKey = (key: string) => ANIMALS.some((a) => key === a.id || key.startsWith(`${a.id}_`));

/** Image keys (bases and items) that belong to a group. Everything else is shown with plain <img> tags. */
export function keysOf(group: AssetGroup): { key: string; file: string }[] {
  const out: { key: string; file: string }[] = [];
  if (group === 'room') out.push({ key: 'room', file: MANIFEST.bases.room.file });
  if (group === 'garden') out.push({ key: 'garden', file: MANIFEST.bases.garden.file });
  for (const [key, e] of Object.entries(MANIFEST.items)) {
    const inGroup = COMMON.test(key) ? 'common' : furnitureSprites.has(key) ? 'room' : animalKey(key) ? 'garden' : null;
    if (inGroup === group) out.push({ key, file: e.file });
  }
  return out;
}

/** Queue the group's images that are not loaded yet (call from a scene's preload). */
export function loadGroup(scene: Phaser.Scene, group: AssetGroup): void {
  for (const { key, file } of keysOf(group)) if (!scene.textures.exists(key)) scene.load.image(key, assetUrl(file));
}
