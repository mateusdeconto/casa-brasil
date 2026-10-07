// On-screen numeric keypad for the parent PIN: dots + 3x4 keys, calls back when complete.
import { PIN_LENGTH } from '../config';
import { el } from './dom';

export interface PinPad {
  el: HTMLElement;
  setMessage(text: string, bad?: boolean): void;
  reset(): void;
  /** locked keypad ignores presses (too many wrong tries) */
  setLocked(locked: boolean): void;
}

export function createPinPad(title: string, onComplete: (pin: string) => void): PinPad {
  let value = '';
  let locked = false;
  const root = el('div', 'pinpad');
  const msg = el('p', 'pin-msg', title);
  const dots = el('div', 'pin-dots');
  const keys = el('div', 'pin-keys');
  const paint = () => {
    dots.innerHTML = Array.from({ length: PIN_LENGTH }, (_, i) => `<i class="${i < value.length ? 'on' : ''}"></i>`).join('');
    dots.setAttribute('aria-label', `${value.length} de ${PIN_LENGTH} dígitos`);
  };
  const press = (k: string) => {
    if (locked) return;
    if (k === '⌫') value = value.slice(0, -1);
    else if (value.length < PIN_LENGTH) value += k;
    paint();
    if (value.length === PIN_LENGTH) setTimeout(() => onComplete(value), 120);
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']) {
    const b = el('button', k ? 'key' : 'key empty', k);
    if (k) {
      b.dataset.key = k;
      b.setAttribute('aria-label', k === '⌫' ? 'Apagar' : k);
      b.onclick = () => press(k);
    } else b.disabled = true;
    keys.appendChild(b);
  }
  root.append(msg, dots, keys);
  paint();
  return {
    el: root,
    setMessage: (t, bad) => ((msg.textContent = t), msg.classList.toggle('bad', !!bad)),
    reset: () => ((value = ''), paint()),
    setLocked: (l) => {
      locked = l;
      keys.classList.toggle('locked', l);
      keys.querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = l || b.classList.contains('empty')));
    },
  };
}
