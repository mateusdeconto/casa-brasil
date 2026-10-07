// The class garden as plain DOM: the garden picture, a "7º ano B" sign and one animal per 5 completions.
import calibration from '../data/calibration.json';
import { CLASS_NAME, gardenAnimalIds, untilNextAnimal } from '../core/school';
import { MANIFEST, animalById, assetUrl } from '../core/catalog';
import { IsoGrid } from '../core/IsoGrid';
import { el, esc, itemUrl } from '../ui/dom';

const VIEW = calibration.garden.view; // x0, y0, x1, y1 of the part of the picture that is shown
const grid = new IsoGrid(calibration.garden as never);
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

function place(node: HTMLElement, gx: number, gy: number, widthCells: number, originY = 0.88): void {
  const [vx0, vy0, vx1, vy1] = VIEW;
  const w = grid.toWorld(gx, gy);
  node.style.left = pct(w.x - vx0, vx1 - vx0);
  node.style.top = pct(w.y - vy0, vy1 - vy0);
  node.style.width = pct(grid.cellWidth * widthCells, vx1 - vx0);
  node.style.transform = `translate(-50%, -${originY * 100}%)`;
}

function animalNode(id: string, fresh: boolean): HTMLElement {
  const def = animalById(id);
  const frame = (k: string) => (MANIFEST.items[`${id}_${k}`] ? `${id}_${k}` : id);
  const box = el('div', `cg-animal${fresh ? ' pop' : ''}`);
  box.dataset.animal = id;
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', def.name);
  box.innerHTML = `<img class="f1" src="${itemUrl(frame('idle1'))}" alt=""><img class="f2" src="${itemUrl(frame('idle2'))}" alt="">`;
  place(box, def.at[0], def.at[1], def.width);
  // lifted animals (on a branch) keep their lift in picture units
  if (def.lift) box.style.marginTop = `-${pct(def.lift, VIEW[3] - VIEW[1])}`;
  return box;
}

export interface GardenOpts {
  completions: number;
  goalText: string;
  /** the last animal pops in (a student just finished) */
  highlightNew?: boolean;
}

export function renderClassGarden(o: GardenOpts): HTMLElement {
  const [vx0, vy0, vx1, vy1] = VIEW;
  const base = MANIFEST.bases.garden;
  const wrap = el('figure', 'class-garden');
  wrap.setAttribute('aria-label', `Jardim da turma ${CLASS_NAME}`);
  const stage = el('div', 'cg-stage');
  stage.style.aspectRatio = `${vx1 - vx0} / ${vy1 - vy0}`;
  const img = el('img', 'cg-bg');
  img.src = assetUrl(base.file);
  img.alt = '';
  img.style.width = pct(base.srcW, vx1 - vx0);
  img.style.left = pct(-vx0, vx1 - vx0);
  img.style.top = pct(-vy0, vy1 - vy0);
  stage.appendChild(img);

  const ids = gardenAnimalIds(o.completions);
  ids.forEach((id, i) => stage.appendChild(animalNode(id, !!o.highlightNew && i === ids.length - 1 && i > 0)));

  const sign = el('div', 'cg-sign', `<img src="${itemUrl('signboard')}" alt=""><b>${esc(CLASS_NAME)}</b>`);
  place(sign, 1.15, 5.35, 1.1, 0.7);
  stage.appendChild(sign);

  const left = untilNextAnimal(o.completions);
  const ribbon = el('figcaption', 'cg-goal', `<b>Meta da turma</b><span>${esc(o.goalText)}</span><small>${left ? `Faltam ${left} ${left === 1 ? 'conclusão' : 'conclusões'} para um novo bichinho` : 'Jardim completo!'}</small>`);
  wrap.append(stage, ribbon);
  return wrap;
}
