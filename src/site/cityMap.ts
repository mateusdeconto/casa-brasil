// Stylised city map in SVG: river, blocks, and one marker per public place sized by visits.
import { MIN_VISITS, markerRadius, shownVisits, type Period, type Place } from '../core/city';
import { esc } from '../ui/dom';

export const TYPE_COLOR: Record<string, string> = {
  Zoológico: '#e0903a',
  Museu: '#b08be0',
  Parque: '#6fcf5a',
  Ciência: '#5aa7e0',
  Cultura: '#e06a8a',
};

const BLOCKS: [number, number, number, number][] = [
  [30, 30, 90, 50], [140, 30, 110, 40], [270, 30, 80, 60], [30, 150, 70, 60], [120, 150, 90, 50], [230, 140, 60, 50],
  [360, 140, 60, 60], [440, 170, 80, 50], [450, 30, 90, 60], [30, 300, 80, 60], [230, 300, 100, 60], [360, 310, 90, 50], [470, 290, 80, 60],
];

function background(): string {
  const blocks = BLOCKS.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#36443a"/>`).join('');
  return `<rect width="600" height="400" fill="#2a3a30"/>${blocks}
    <path d="M-10 230 C120 190 220 270 330 230 S520 190 610 240" fill="none" stroke="#2f6f9e" stroke-width="26" stroke-linecap="round" opacity=".85"/>
    <path d="M-10 230 C120 190 220 270 330 230 S520 190 610 240" fill="none" stroke="#5aa7e0" stroke-width="3" stroke-dasharray="2 10" opacity=".7"/>
    <g stroke="#4a3d57" stroke-width="5" opacity=".9"><path d="M0 120H600M0 280H600M130 0V400M300 0V400M430 0V400"/></g>`;
}

function marker(p: Place, period: Period): string {
  const visits = shownVisits(p, period);
  const r = markerRadius(visits);
  const color = TYPE_COLOR[p.type] ?? '#ccc';
  const label = esc(p.name);
  const title = visits === null ? `${label}: dados ocultos (menos de ${MIN_VISITS} visitas)` : `${label}: ${visits} visitas`;
  const dot =
    visits === null
      ? `<circle r="${r}" fill="#4a3d57" stroke="#f1ddb0" stroke-width="2" stroke-dasharray="4 3"/><text y="4" text-anchor="middle" font-size="11" fill="#f1ddb0">&lt;${MIN_VISITS}</text>`
      : `<circle r="${r}" fill="${color}" fill-opacity=".85" stroke="#f1ddb0" stroke-width="3"/><text y="5" text-anchor="middle" font-size="${r > 22 ? 15 : 12}" font-weight="700" fill="#1c1730">${visits}</text>`;
  return `<g class="pin" transform="translate(${p.x} ${p.y})" tabindex="0" role="img" aria-label="${title}"><title>${title}</title>${dot}<text y="${r + 14}" text-anchor="middle" font-size="12" fill="#f1ddb0" stroke="#1c1730" stroke-width="3" paint-order="stroke">${label}</text></g>`;
}

export function cityMapSvg(places: Place[], period: Period): string {
  return `<svg viewBox="0 0 600 400" role="group" aria-label="Mapa estilizado da cidade, ${period === 'before' ? 'antes' : 'depois'} da campanha">${background()}${places.map((p) => marker(p, period)).join('')}</svg>`;
}
