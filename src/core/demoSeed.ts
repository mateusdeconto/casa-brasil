// Writes the demonstration save and its sample photos (drawn from the game's own art, no people).
import { MANIFEST, assetUrl } from './catalog';
import { buildDemoRoot, DEMO_VISITS } from './demo';
import { clearPhotos, savePhoto } from './photos';
import { clearSave, writeSave } from './save';

const SCENES: Record<string, string> = { zoo: 'toucan_idle1', parque: 'palm' };

const loadImage = (rel: string): Promise<HTMLImageElement> =>
  new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error(rel));
    img.src = assetUrl(rel);
  });

/** A "photo of the place": the garden picture with the partner's item in front. */
export async function makeSamplePhoto(partner: string): Promise<Blob> {
  const w = 960;
  const h = 720;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  const bg = await loadImage(MANIFEST.bases.garden.file);
  const k = Math.max(w / bg.width, h / bg.height);
  g.fillStyle = '#2a3a30';
  g.fillRect(0, 0, w, h);
  g.drawImage(bg, (w - bg.width * k) / 2, (h - bg.height * k) / 2 - 40, bg.width * k, bg.height * k);
  const item = MANIFEST.items[SCENES[partner] ?? 'palm'];
  if (item) {
    const img = await loadImage(item.file);
    const s = (h * 0.7) / img.height;
    g.drawImage(img, w * 0.55, h * 0.22, img.width * s, img.height * s);
  }
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('jpeg'))), 'image/jpeg', 0.8));
}

/** Replace everything saved on this device with the demonstration family. The page must reload after. */
export async function seedDemo(now = Date.now()): Promise<void> {
  const root = buildDemoRoot(now);
  await clearPhotos();
  const visits = root.profiles[0].visits;
  for (let i = 0; i < DEMO_VISITS.length; i++) {
    try {
      await savePhoto(visits[i].id, await makeSamplePhoto(DEMO_VISITS[i].partner));
    } catch {
      visits[i].hasPhoto = false; // photo could not be drawn: the album shows the place picture instead
    }
  }
  clearSave();
  writeSave(root, now);
}
