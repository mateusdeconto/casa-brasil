// Avatar builder: sex, style (hair + outfit model), skin, hair and clothes colours, name, "Começar".
import { NAME_MAX } from '../config';
import {
  MODELS, PALETTES, formatAvatar, parseAvatar, sexOf, toneCss, type AvatarSpec, type Part, type Sex,
} from '../core/avatarSpec';
import { avatarUrl } from './avatarImage';
import { el } from './dom';

const SEXES: { sex: Sex; label: string }[] = [
  { sex: 'menina', label: 'Menina' },
  { sex: 'menino', label: 'Menino' },
];

const COLOR_ROWS: { part: Part; label: string }[] = [
  { part: 'skin', label: 'Cor da pele' },
  { part: 'hair', label: 'Cor do cabelo' },
  { part: 'cloth', label: 'Cor da roupa' },
];

export function showAvatarPicker(
  root: HTMLElement,
  current: { avatar: string; name: string },
  onDone: (avatar: string, name: string) => void,
): void {
  let spec: AvatarSpec = parseAvatar(current.avatar);
  const s = el('div', 'screen picker');
  s.appendChild(el('h2', '', 'Monte seu avatar'));
  const body = el('div', 'pick-body');
  s.appendChild(body);

  const preview = el('img', 'pick-preview');
  preview.alt = 'Seu avatar';
  const section = (title: string, ...children: HTMLElement[]) => {
    const box = el('section', 'pick-sec');
    box.append(el('h3', '', title), ...children);
    body.appendChild(box);
    return box;
  };
  body.appendChild(preview);

  // sex
  const seg = el('div', 'seg');
  const sexBtns = SEXES.map(({ sex, label }) => {
    const b = el('button', 'seg-btn', label);
    b.dataset.sex = sex;
    b.onclick = () => {
      if (sexOf(spec.base) === sex) return;
      spec = { ...spec, base: MODELS[sex][0] };
      refresh();
    };
    seg.appendChild(b);
    return b;
  });
  section('Sexo', seg);

  // style = the painted models of that sex
  const styles = el('div', 'pick-styles');
  section('Estilo de cabelo e roupa', styles);

  // colours
  const colorRows = COLOR_ROWS.map(({ part, label }) => {
    const row = el('div', 'swatches');
    const original = el('button', 'swatch original', 'Original');
    original.onclick = () => pick(part, undefined);
    row.appendChild(original);
    const dots = PALETTES[part].map((tone, i) => {
      const d = el('button', 'swatch');
      d.style.background = toneCss(tone);
      d.setAttribute('aria-label', tone.name);
      d.title = tone.name;
      d.onclick = () => pick(part, i);
      row.appendChild(d);
      return d;
    });
    section(label, row);
    return { part, original, dots };
  });

  function pick(part: Part, index: number | undefined): void {
    spec = { ...spec, [part]: index };
    refresh();
  }

  let renderId = 0;
  function refresh(): void {
    const sex = sexOf(spec.base);
    sexBtns.forEach((b) => b.classList.toggle('on', b.dataset.sex === sex));
    for (const { part, original, dots } of colorRows) {
      original.classList.toggle('on', spec[part] == null);
      dots.forEach((d, i) => d.classList.toggle('on', spec[part] === i));
    }
    const mine = ++renderId;
    styles.replaceChildren();
    for (const base of MODELS[sex]) {
      const card = el('button', 'card' + (base === spec.base ? ' on' : ''));
      const img = el('img');
      img.alt = '';
      card.appendChild(img);
      card.onclick = () => {
        spec = { ...spec, base };
        refresh();
      };
      styles.appendChild(card);
      void avatarUrl(formatAvatar({ ...spec, base })).then((url) => {
        if (mine === renderId) img.src = url;
      });
    }
    void avatarUrl(formatAvatar(spec)).then((url) => {
      if (mine === renderId) preview.src = url;
    });
  }

  const foot = el('div', 'foot');
  const input = el('input');
  input.maxLength = NAME_MAX;
  input.placeholder = 'Seu nome';
  input.value = current.name;
  const go = el('button', 'btn', 'Começar');
  go.onclick = () => {
    const name = input.value.trim().slice(0, NAME_MAX) || 'Jogador';
    s.remove();
    onDone(formatAvatar(spec), name);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go.click();
  });
  foot.append(input, go);
  s.appendChild(foot);
  root.appendChild(s);
  refresh();
}
