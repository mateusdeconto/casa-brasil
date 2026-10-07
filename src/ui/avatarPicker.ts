// Avatar choice: 4x2 cards, name field, "Começar".
import { AVATAR_IDS, NAME_MAX } from '../config';
import { el, itemUrl } from './dom';

export function showAvatarPicker(
  root: HTMLElement,
  current: { avatar: string; name: string },
  onDone: (avatar: string, name: string) => void,
): void {
  let chosen = current.avatar;
  const s = el('div', 'screen picker');
  s.appendChild(el('h2', '', 'Escolha seu avatar'));
  const grid = el('div', 'grid');
  const cards = AVATAR_IDS.map((id) => {
    const c = el('button', 'card' + (id === chosen ? ' on' : ''), `<img src="${itemUrl(id)}" alt="">`);
    c.onclick = () => {
      chosen = id;
      cards.forEach((k) => k.classList.toggle('on', k === c));
    };
    grid.appendChild(c);
    return c;
  });
  s.appendChild(grid);

  const foot = el('div', 'foot');
  const input = el('input');
  input.maxLength = NAME_MAX;
  input.placeholder = 'Seu nome';
  input.value = current.name;
  const go = el('button', 'btn', 'Começar');
  go.onclick = () => {
    const name = input.value.trim().slice(0, NAME_MAX) || 'Jogador';
    s.remove();
    onDone(chosen, name);
  };
  input.onkeydown = (e) => e.key === 'Enter' && go.click();
  foot.append(input, go);
  s.appendChild(foot);
  root.appendChild(s);
}
