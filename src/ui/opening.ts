// Opening screen: key art background, title, "Jogar".
import { TITLE } from '../config';
import { MANIFEST, assetUrl } from '../core/catalog';
import { el } from './dom';

export function showOpening(root: HTMLElement, onPlay: () => void): void {
  const s = el('div', 'screen opening');
  s.style.backgroundImage = `url(${assetUrl(MANIFEST.opening)})`;
  s.appendChild(el('div', '', `<h1>${TITLE}</h1><div class="sub">Sua casa, seu jardim, nossos bichos</div>`));
  const play = el('button', 'btn', 'Jogar');
  play.onclick = () => {
    s.remove();
    onPlay();
  };
  s.appendChild(play);
  root.appendChild(s);
}
