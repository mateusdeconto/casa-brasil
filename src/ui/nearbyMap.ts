// Leaflet map for "Perto de você". Loaded on demand so the game itself stays light.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { routeUrl, walkLabel, type NearbyOrigin, type NearbyRow } from '../core/nearby';
import { esc } from './dom';

export interface NearbyMap {
  focus(id: string): void;
  destroy(): void;
}

const pin = (cls: string, html: string) =>
  L.divIcon({ className: '', html: `<span class="map-pin ${cls}">${html}</span>`, iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });

export function mountNearbyMap(host: HTMLElement, origin: NearbyOrigin, rows: NearbyRow[]): NearbyMap {
  const map = L.map(host, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

  L.marker([origin.lat, origin.lng], { icon: pin('me', 'Você'), zIndexOffset: 1000 }).addTo(map);
  const markers = new Map<string, L.Marker>();
  rows.forEach(({ place, meters }, i) => {
    const m = L.marker([place.lat, place.lng], { icon: pin(`kind-${place.kind.toLowerCase()}`, String(i + 1)), title: place.name }).addTo(map);
    m.bindPopup(
      `<b>${esc(place.name)}</b><br>${esc(walkLabel(meters))}<br><a href="${routeUrl(origin, place)}" target="_blank" rel="noopener noreferrer">Rotas no Google Maps</a>`,
    );
    markers.set(place.id, m);
  });

  map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], ...rows.map((r) => [r.place.lat, r.place.lng] as [number, number])]), { padding: [24, 24] });
  // the page is laid out after mounting: re-measure so tiles fill the box
  setTimeout(() => map.invalidateSize(), 50);

  return {
    focus(id) {
      const m = markers.get(id);
      if (!m) return;
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 16), { duration: 0.6 });
      m.openPopup();
    },
    destroy: () => map.remove(),
  };
}
