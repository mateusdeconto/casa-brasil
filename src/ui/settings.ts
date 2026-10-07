// Settings sheet (gear in the HUD): sound, text size, tutorial, privacy, demo data, reset.
import { clearPhotos } from '../core/photos';
import { seedDemo } from '../core/demoSeed';
import { clearSave, freezeSaves } from '../core/save';
import type { Store } from '../core/state';
import { showCard } from './card';
import { el } from './dom';
import { button, confirmBox, toggleRow } from './widgets';

export interface SettingsDeps {
  store: Store;
  ui: HTMLElement;
  restartTutorial: () => void;
}

const PRIVACY_LINES = [
  'Suas fotos ficam só neste aparelho. Nada é enviado para a internet.',
  'Fotografe o lugar, sem pessoas.',
  'Não há chat livre, anúncios nem compras com dinheiro de verdade.',
  'A localização só é usada na hora de confirmar uma visita e não é guardada.',
  'Os pais controlam tempo e compras no painel com PIN.',
  'Este é um protótipo: tudo que é simulado mostra o selo DEMO.',
];

export function applyTextSize(size: 'normal' | 'grande'): void {
  document.documentElement.dataset.text = size;
}

/** Forget everything on this device and start over (photos, saves, PIN). Reloads the page. */
export async function wipeEverything(): Promise<void> {
  freezeSaves();
  await clearPhotos();
  clearSave();
  location.replace(location.pathname);
}

export function openSettings(d: SettingsDeps): void {
  const { store } = d;
  const s = store.settings;
  const screen = el('div', 'screen settings');
  const close = () => screen.remove();
  const head = el('header', 'page-head');
  const back = el('button', 'back', '←');
  back.setAttribute('aria-label', 'Fechar configurações');
  back.onclick = close;
  head.append(back, el('h2', '', 'Configurações'));
  const body = el('div', 'page-body');
  screen.append(head, body);

  const size = el('div', 'opt-row');
  size.appendChild(el('div', 'opt-text', '<b>Tamanho do texto</b><small>Deixa as telas de leitura maiores.</small>'));
  const seg = el('div', 'seg');
  for (const v of ['normal', 'grande'] as const) {
    const b = el('button', `seg-btn${s.textSize === v ? ' on' : ''}`, v === 'normal' ? 'Normal' : 'Grande');
    b.onclick = () => {
      s.textSize = v;
      applyTextSize(v);
      store.commit();
      seg.querySelectorAll('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
    };
    seg.appendChild(b);
  }
  size.appendChild(seg);

  const opts = el('div', 'panel options');
  opts.append(toggleRow('Som', 'Sons curtos de coleta, compra e carimbo.', s.sound, (v) => ((s.sound = v), store.commit())), size);

  const demo = button('Carregar dados de demonstração', () =>
    confirmBox(d.ui, 'Isso troca o que está salvo neste aparelho por uma família de exemplo (2 crianças, casa decorada, álbum e carimbos). Continuar?', 'Carregar demo', async () => {
      freezeSaves();
      await seedDemo();
      location.replace(location.pathname);
    }),
  'secondary');

  const wipe = button('Apagar tudo e recomeçar', () =>
    confirmBox(d.ui, 'Apagar tudo? Perfis, casa, jardim, álbum e PIN serão removidos deste aparelho.', 'Continuar', () =>
      confirmBox(d.ui, 'Última chance: isso não pode ser desfeito. Apagar tudo mesmo?', 'Sim, apagar tudo', () => void wipeEverything()),
    ),
  'secondary');
  wipe.classList.add('danger');

  body.append(
    opts,
    button('Rever tutorial', () => (close(), d.restartTutorial()), 'secondary'),
    button('Privacidade', () => showCard(d.ui, { title: 'Privacidade', image: 'shield_parent', text: PRIVACY_LINES.map((l) => `• ${l}`).join('<br>'), buttons: [{ label: 'Entendi', onClick: () => {} }] }), 'secondary'),
    demo,
    wipe,
    el('p', 'version', 'Passport · protótipo · dados só neste aparelho'),
  );
  d.ui.appendChild(screen);
}
