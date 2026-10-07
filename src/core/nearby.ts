// "Perto de você": places around a position, nearest first, with walking distance and a route link.
import { haversineM, type LatLng } from './geo';
import nearbyJson from '../data/nearby.json';

export interface NearbyPlace extends LatLng {
  id: string;
  name: string;
  kind: string;
  tip: string;
}

export interface NearbyOrigin extends LatLng {
  name: string;
  address: string;
}

export interface NearbyRow {
  place: NearbyPlace;
  meters: number;
}

export const NEARBY_ORIGIN = nearbyJson.origin as NearbyOrigin;
export const NEARBY_PLACES = nearbyJson.places as NearbyPlace[];

const WALK_M_PER_MIN = 80;

/** Places sorted by distance from `from` (never mutates the input). */
export function nearbyRows(from: LatLng, places: readonly NearbyPlace[] = NEARBY_PLACES): NearbyRow[] {
  return places.map((place) => ({ place, meters: haversineM(from, place) })).sort((a, b) => a.meters - b.meters);
}

export function distanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export const walkMinutes = (meters: number): number => Math.max(1, Math.round(meters / WALK_M_PER_MIN));

/** Walking is only worth saying for short trips. */
const WALKABLE_M = 3000;

/** Further than this from every place, the demo has nothing "nearby" to show. */
export const FAR_M = 15_000;

/** "650 m · 8 min a pé", or just the distance when it is too far to walk. */
export const walkLabel = (meters: number): string =>
  meters < WALKABLE_M ? `${distanceLabel(meters)} · ${walkMinutes(meters)} min a pé` : distanceLabel(meters);

/** Google Maps walking directions, opened by the phone's maps app. Needs no API key. */
export function routeUrl(from: LatLng, to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=walking`;
}
