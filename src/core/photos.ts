// Visit photos live only on this device: IndexedDB, keyed by visit id. Falls back to memory if IDB fails.
import { PHOTO_MAX_SIDE, PHOTO_QUALITY } from '../config';

const DB = 'casa-brasil-photos';
const STORE = 'photos';
const memory = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;
export let photosInMemory = false;

function open(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => ((photosInMemory = true), resolve(null));
    } catch {
      photosInMemory = true;
      resolve(null);
    }
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  const db = await open();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export async function savePhoto(id: string, blob: Blob): Promise<void> {
  memory.set(id, blob); // always kept in memory for this session as well
  await run('readwrite', (s) => s.put(blob, id));
}

export async function getPhoto(id: string): Promise<Blob | null> {
  return memory.get(id) ?? ((await run('readonly', (s) => s.get(id))) as Blob | undefined) ?? null;
}

export async function deletePhoto(id: string): Promise<void> {
  memory.delete(id);
  await run('readwrite', (s) => s.delete(id));
}

export async function clearPhotos(): Promise<void> {
  memory.clear();
  await run('readwrite', (s) => s.clear());
}

/** Scale so the longest side is at most `max`, never enlarging. */
export function fitSize(w: number, h: number, max = PHOTO_MAX_SIDE): { w: number; h: number } {
  const k = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * k), h: Math.round(h * k) };
}

/** Shrink a camera/gallery file to 960 px JPEG 0.8 before it is stored. */
export async function shrinkImage(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { w, h } = fitSize(bmp.width, bmp.height);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', PHOTO_QUALITY));
}
