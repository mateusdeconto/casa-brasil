// Distance between two coordinates (Haversine) and the "am I at the partner" check.
const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const isWithin = (a: LatLng, b: LatLng, radiusM: number): boolean => haversineM(a, b) <= radiusM;

export type GpsFix = LatLng & { accuracyM?: number };

export type GpsResult = { ok: true; pos: GpsFix } | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' };

/** One-shot position request with a friendly failure reason. */
export function getPosition(timeoutMs = 10_000): Promise<GpsResult> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve({ ok: false, reason: 'unavailable' });
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, pos: { lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: p.coords.accuracy } }),
      (e) => resolve({ ok: false, reason: e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
