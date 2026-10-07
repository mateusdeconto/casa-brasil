// Student activities: short quiz with feedback (no score), field diary, photo of the place.
import { savePhoto, shrinkImage } from '../core/photos';
import type { ExpeditionCard, Store } from '../core/state';
import { el, esc } from '../ui/dom';
import { button } from '../ui/widgets';

const DIARY_MAX = 500;

function modal(root: HTMLElement, title: string): { body: HTMLElement; close: () => void } {
  const shade = el('div', 'shade');
  const card = el('div', 'panel card-modal task-modal');
  const head = el('div', 'panel-title', `<span>${esc(title)}</span>`);
  const x = el('button', 'close', '✕');
  x.setAttribute('aria-label', 'Fechar');
  head.appendChild(x);
  const body = el('div', 'card-body');
  card.append(head, body);
  shade.appendChild(card);
  root.appendChild(shade);
  const close = () => shade.remove();
  x.onclick = close;
  return { body, close };
}

/** Questions one by one. Each answer gets friendly feedback; nothing is scored. */
export function runQuiz(root: HTMLElement, card: ExpeditionCard, onFinish: () => void): void {
  const { body, close } = modal(root, card.title);
  const qs = card.quiz ?? [];
  let i = 0;
  const show = () => {
    body.innerHTML = '';
    if (i >= qs.length) {
      body.append(el('p', '', 'Quiz concluído! Não vale nota: é só para aprender.'), button('Continuar', () => (close(), onFinish())));
      return;
    }
    const q = qs[i];
    body.appendChild(el('p', 'q', `<b>${i + 1} de ${qs.length}</b><br>${esc(q.q)}`));
    const fb = el('p', 'feedback');
    const next = button(i + 1 < qs.length ? 'Próxima' : 'Terminar', () => (i++, show()));
    next.hidden = true;
    q.options.forEach((o, n) => {
      const b = el('button', 'opt', esc(o));
      b.onclick = () => {
        const right = n === q.answer;
        b.classList.add(right ? 'right' : 'try');
        fb.textContent = right ? q.ok : q.retry;
        fb.className = `feedback ${right ? 'ok' : 'try'}`;
        if (right) body.querySelectorAll('.opt').forEach((x) => ((x as HTMLButtonElement).disabled = true));
        next.hidden = !right;
      };
      body.appendChild(b);
    });
    body.append(fb, next);
  };
  show();
}

function photoPicker(key: string, onPhoto: () => void): { input: HTMLInputElement; button: HTMLElement; note: HTMLElement } {
  const input = el('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.setAttribute('capture', 'environment');
  input.hidden = true;
  input.setAttribute('data-testid', 'school-photo');
  const note = el('p', 'privacy-note', '<b>Fotografe o lugar, sem pessoas.</b><br><small>Sua foto fica só neste aparelho.</small>');
  const pick = button('Tirar foto', () => input.click(), 'secondary');
  input.onchange = async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      await savePhoto(key, await shrinkImage(f));
      pick.textContent = 'Foto guardada. Tirar outra';
      onPhoto();
    } catch {
      note.textContent = 'Não consegui abrir essa foto. Tente outra.';
    }
  };
  return { input, button: pick, note };
}

export const schoolPhotoKey = (profileId: string, cardId: string) => `school-${profileId}-${cardId}`;

export function runPhoto(root: HTMLElement, store: Store, card: ExpeditionCard, onFinish: () => void): void {
  const { body, close } = modal(root, card.title);
  const p = photoPicker(schoolPhotoKey(store.data.id, card.id), () => (done.disabled = false));
  const done = button('Concluir', () => (close(), onFinish()));
  done.disabled = true;
  body.append(el('p', '', esc(card.hint)), p.note, p.input, p.button, done, button('Agora não', close, 'secondary small'));
}

export function runDiary(root: HTMLElement, store: Store, expId: string, card: ExpeditionCard, onSave: (text: string, hasPhoto: boolean) => void): void {
  const { body, close } = modal(root, card.title);
  const area = el('textarea');
  area.maxLength = DIARY_MAX;
  area.rows = 5;
  area.placeholder = 'O que você viu, sentiu ou descobriu?';
  area.value = store.data.school.diary[expId]?.text ?? '';
  area.setAttribute('aria-label', 'Diário de campo');
  let hasPhoto = !!store.data.school.diary[expId]?.hasPhoto;
  const p = photoPicker(`diary-${store.data.id}-${expId}`, () => (hasPhoto = true));
  const count = el('small', 'count', `${area.value.length}/${DIARY_MAX}`);
  area.oninput = () => (count.textContent = `${area.value.length}/${DIARY_MAX}`);
  const save = button('Guardar diário', () => {
    if (!area.value.trim()) return void (count.textContent = 'Escreva pelo menos uma frase.');
    close();
    onSave(area.value, hasPhoto);
  });
  body.append(el('p', '', esc(card.hint)), area, count, el('p', 'privacy-note', 'Foto é opcional e sem pessoas. Tudo fica só neste aparelho.'), p.input, p.button, save);
}
