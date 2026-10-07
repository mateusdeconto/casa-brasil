// Leaflet map for "Perto de você". Loaded on demand so the game itself stays light.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeUrl, walkLabel, type NearbyOrigin, type NearbyRow } from '../core/nearby';
import { esc } from './dom';

export interface NearbyMap {
  /** redraws "you" and the places (the position can change when the GPS answers) */
  update(origin: NearbyOrigin, rows: NearbyRow[], accuracyM?: number): void;
  focus(id: string): void;
  destroy(): void;
}

/** Beyond this many places the map would zoom out to the whole country: frame only the closest ones. */
const FRAMED_WHEN_FAR = 1;
const FAR_FRAME_M = 15_000;

const pin = (cls: string, html: string) =>
  L.divIcon({ className: '', html: `<span class="map-pin ${cls}">${html}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });

export function mountNearbyMap(host: HTMLElement, origin: NearbyOrigin, rows: NearbyRow[], accuracyM?: number): NearbyMap {
  const map = L.map(host, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  // Safari/iPhone: the site sends no referrer, which OpenStreetMap's tile servers refuse (blank map)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap',
    referrerPolicy: 'strict-origin-when-cross-origin',
  }).addTo(map);

  const layer = L.layerGroup().addTo(map);
  const markers = new Map<string, L.Marker>();

  function draw(o: NearbyOrigin, list: NearbyRow[], accuracy?: number): void {
    layer.clearLayers();
    markers.clear();
    if (accuracy && accuracy > 0) {
      L.circle([o.lat, o.lng], { radius: accuracy, color: '#2d7be0', weight: 1, fillColor: '#2d7be0', fillOpacity: 0.15, interactive: false }).addTo(layer);
    }
    L.marker([o.lat, o.lng], { icon: pin('me', 'Você'), zIndexOffset: 1000, keyboard: false }).addTo(layer);
    list.forEach(({ place, meters }, i) => {
      const m = L.marker([place.lat, place.lng], { icon: pin(`kind-${place.kind.toLowerCase()}`, String(i + 1)), title: place.name }).addTo(layer);
      m.bindPopup(
        `<b>${esc(place.name)}</b><br>${esc(walkLabel(meters))}<br><a href="${routeUrl(o, place)}" target="_blank" rel="noopener noreferrer">Rotas no Google Maps</a>`,
      );
      markers.set(place.id, m);
    });
    const far = list.length > 0 && list[0].meters > FAR_FRAME_M;
    const framed = far ? list.slice(0, FRAMED_WHEN_FAR) : list;
    const points = [[o.lat, o.lng], ...framed.map((r) => [r.place.lat, r.place.lng])] as [number, number][];
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 17 });
  }

  draw(origin, rows, accuracyM);
  // the page is laid out after mounting: re-measure so tiles fill the box
  setTimeout(() => map.invalidateSize(), 50);

  return {
    update: draw,
    focus(id) {
      const m = markers.get(id);
      if (!m) return;
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
      m.openPopup();
    },
    destroy: () => map.remove(),
  };
}
