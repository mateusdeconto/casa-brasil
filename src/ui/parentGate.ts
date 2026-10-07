// PIN gate for the parent panel: first time creates a PIN, afterwards asks for it.
import { PIN_LENGTH } from '../config';
import { checkPin, hashPin, lockAfterFail, lockSecondsLeft } from '../core/pin';
import type { Store } from '../core/state';
import { el } from './dom';
import { createPinPad } from './keypad';
import { button, confirmBox, demoRibbon } from './widgets';

/** Shows the gate; calls onOpen once the parent got in. Returns a function that closes it. */
export function openParentGate(ui: HTMLElement, store: Store, onOpen: () => void): () => void {
  const shade = el('div', 'shade pin-gate');
  const card = el('div', 'panel card-modal');
  card.appendChild(el('div', 'panel-title', '<span>Painel dos pais</span>'));
  const close = () => shade.remove();
  const x = el('button', 'close', '✕');
  x.setAttribute('aria-label', 'Fechar');
  x.onclick = close;
  card.firstElementChild!.appendChild(x);
  const body = el('div', 'card-body');
  card.appendChild(body);
  shade.appendChild(card);
  ui.appendChild(shade);

  const demo = el('p', 'pin-demo');
  demo.append(demoRibbon(), document.createTextNode('Protótipo: o PIN fica só neste aparelho e não protege de verdade.'));

  const create = (first?: string) => {
    body.innerHTML = '';
    const pad = createPinPad(first ? 'Repita o PIN para confirmar' : `Crie um PIN de ${PIN_LENGTH} dígitos`, (pin) => {
      if (!first) return create(pin);
      if (pin !== first) {
        create();
        const m = body.querySelector<HTMLElement>('.pin-msg')!;
        m.textContent = 'Os PINs não batem. Tente de novo.';
        m.classList.add('bad');
        return;
      }
      store.root.pinHash = hashPin(pin);
      store.commit();
      close();
      onOpen();
    });
    body.append(pad.el, demo);
  };

  const enter = () => {
    body.innerHTML = '';
    let timer = 0;
    /** shows the countdown while the keypad is locked, then opens it again */
    const refreshLock = () => {
      const left = lockSecondsLeft(store.root.pinLockUntil, Date.now());
      pad.setLocked(left > 0);
      if (left > 0) {
        pad.setMessage(`Muitas tentativas. Tente de novo em ${left} s.`, true);
        timer = window.setTimeout(refreshLock, 1000);
      } else if (timer) {
        timer = 0;
        pad.setMessage('Digite o PIN');
      }
    };
    const pad = createPinPad('Digite o PIN', (pin) => {
      if (checkPin(pin, store.root.pinHash)) {
        store.root.pinFails = 0;
        store.root.pinLockUntil = 0;
        store.commit();
        close();
        return onOpen();
      }
      store.root.pinFails += 1;
      store.root.pinLockUntil = lockAfterFail(store.root.pinFails, Date.now());
      store.commit();
      pad.reset();
      if (store.root.pinLockUntil) return refreshLock();
      pad.setMessage('PIN incorreto. Tente de novo.', true);
    });
    const forgot = button('Esqueci o PIN', () =>
      confirmBox(ui, 'Esqueceu o PIN? Vamos apagar o PIN deste aparelho para você criar um novo. Os dados das crianças continuam.', 'Apagar o PIN', () => {
        store.root.pinHash = null;
        store.commit();
        create();
      }),
      'secondary small',
    );
    body.append(pad.el, forgot, demo);
    refreshLock();
  };

  if (store.root.pinHash) enter();
  else create();
  return close;
}
