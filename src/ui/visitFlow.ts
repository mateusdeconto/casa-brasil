// The 3-step visit: Local (GPS) -> Foto (camera, stays on the device) -> Carimbo (reward).
import { PROJECTS_PER_VISIT, VISIT_RADIUS_M } from '../config';
import { furnitureById, partnerById } from '../core/catalog';
import { boostDaysLeft } from '../core/boost';
import { getPosition, haversineM } from '../core/geo';
import { photosInMemory, savePhoto, shrinkImage } from '../core/photos';
import type { Store } from '../core/state';
import { completeVisit, makeVisitId } from '../core/visits';
import { el, itemUrl } from './dom';
import { makePage, type PageHandle } from './pageHost';
import { button, demoRibbon } from './widgets';

export interface FlowDeps {
  store: Store;
  /** called when the flow ends or is cancelled */
  close: () => void;
  openGarden: () => void;
  openPassport: () => void;
}

interface FlowState {
  partnerId: string;
  demo: boolean;
  photo: Blob | null;
  visitId: string;
}

const STEPS = ['Local', 'Foto', 'Carimbo'];

function indicator(step: number): HTMLElement {
  const bar = el('ol', 'steps');
  STEPS.forEach((s, i) => bar.appendChild(el('li', i === step ? 'on' : i < step ? 'done' : '', `<b>${i + 1}</b> ${s}`)));
  return bar;
}

export function startVisitFlow(deps: FlowDeps, partnerId: string, preGps = false): PageHandle {
  const { store } = deps;
  const partner = partnerById(partnerId);
  const st: FlowState = { partnerId, demo: false, photo: null, visitId: makeVisitId(store.data.id, partnerId, Date.now()) };
  const page = makePage({ title: '', className: 'flow', back: deps.close, bare: true });
  let previewUrl = '';
  page.onClose = () => previewUrl && URL.revokeObjectURL(previewUrl);

  const frame = (step: number, title: string): HTMLElement => {
    page.body.innerHTML = '';
    const head = el('header', 'page-head');
    const back = el('button', 'back', '←');
    back.setAttribute('aria-label', 'Voltar');
    back.onclick = deps.close;
    head.append(back, el('h2', '', `${step + 1}. ${title}`));
    page.body.append(head, indicator(step));
    const content = el('div', 'flow-content');
    page.body.appendChild(content);
    return content;
  };

  const localStep = (): void => {
    const c = frame(0, 'Local');
    c.appendChild(el('div', 'place', `<img src="${itemUrl(partner.image)}" alt=""><div><b>${partner.name}</b><small>${partner.mission}</small></div>`));
    const msg = el('p', 'flow-msg', 'Vamos confirmar que você está aí. A localização só é usada agora e não fica guardada.');
    const actions = el('div', 'flow-actions');
    c.append(msg, actions);
    const demoBtn = () => button('Modo demonstração', () => ((st.demo = true), photoStep()), 'secondary');
    const check = async () => {
      msg.textContent = 'Procurando o sinal de GPS...';
      actions.innerHTML = '';
      const r = await getPosition();
      if (r.ok) {
        const dist = haversineM(r.pos, partner);
        if (dist <= VISIT_RADIUS_M) {
          msg.innerHTML = `<span class="ok">✔</span> Localização confirmada: você está no ${partner.name}!`;
          return void actions.append(button('Continuar', photoStep));
        }
        const km = dist >= 1000 ? `${(dist / 1000).toFixed(1).replace('.', ',')} km` : `${Math.round(dist)} m`;
        msg.textContent = `Você está a ${km} do ${partner.name}. Chegue mais perto (até ${VISIT_RADIUS_M} m) ou use o modo demonstração.`;
      } else {
        msg.textContent =
          r.reason === 'denied' ? 'Sem permissão de localização. Você pode liberar no navegador ou usar o modo demonstração.' : 'Não consegui achar o GPS agora. Tente de novo ou use o modo demonstração.';
      }
      actions.append(button('Tentar de novo', check), demoBtn());
    };
    actions.appendChild(button('Estou aqui', check));
    if (preGps) {
      msg.innerHTML = '<span class="ok">✔</span> QR do parceiro lido: o passo Local já está concluído.';
      actions.innerHTML = '';
      actions.appendChild(button('Continuar', photoStep));
    }
  };

  const photoStep = (): void => {
    const c = frame(1, 'Foto');
    const view = el('div', 'photo-view');
    const img = el('img', 'photo-img');
    img.alt = 'Prévia da foto';
    img.hidden = true;
    view.append(img, el('div', 'photo-hint', `<img src="${itemUrl('camera')}" alt="">`));
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.hidden = true;
    input.setAttribute('data-testid', 'photo-input');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        st.photo = await shrinkImage(file);
      } catch {
        return void (tip.textContent = 'Não consegui abrir essa foto. Tente outra.');
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(st.photo);
      img.src = previewUrl;
      img.hidden = false;
      view.querySelector('.photo-hint')!.classList.add('hidden');
      shoot.textContent = 'Tirar outra';
      next.disabled = false;
    };
    const tip = el('p', 'flow-msg', `<b>${partner.photoTip}.</b><br><small>Sua foto fica só neste aparelho.</small>`);
    const shoot = button('Tirar foto', () => input.click());
    const next = button('Continuar', stampStep);
    next.disabled = true;
    const skip = button('Pular a foto', () => ((st.photo = null), stampStep()), 'secondary small');
    c.append(view, tip, input, el('div', 'flow-actions'));
    c.lastElementChild!.append(shoot, next, skip);
  };

  const stampStep = async (): Promise<void> => {
    if (st.photo) {
      await savePhoto(st.visitId, st.photo);
      if (photosInMemory) store.bus.emit('toast', 'Não consegui guardar a foto no aparelho: ela fica só até fechar a página.');
    }
    const { visit } = completeVisit(store, { partnerId, demo: st.demo, hasPhoto: !!st.photo, id: st.visitId });
    const c = frame(2, 'Carimbo');
    const paper = el('div', 'stamp-paper');
    const stamp = el('img', 'stamp-press');
    stamp.src = itemUrl(partner.stamp);
    stamp.alt = `Carimbo ${partner.name}`;
    paper.appendChild(stamp);
    if (visit.demo) paper.appendChild(demoRibbon());
    const days = boostDaysLeft(store.data, Date.now());
    const rewardKeys = partner.reward.animal ? [partner.reward.animal] : (partner.reward.items ?? []).map((id) => furnitureById(id).sprite);
    const icons = el('div', 'reward-icons', rewardKeys.map((k) => `<img src="${itemUrl(k)}" alt="">`).join(''));
    c.append(
      paper,
      icons,
      el('p', 'reward', `<b>${partner.reward.text}</b>`),
      el('p', 'flow-msg', `+${PROJECTS_PER_VISIT} projeto de obra para a Galeria (você tem ${store.data.projects})`),
      el('p', 'flow-msg', `Produção 2x no jardim por 7 dias.<br><span class="boost">2x ativo, restam ${days} ${days === 1 ? 'dia' : 'dias'}</span>`),
    );
    const actions = el('div', 'flow-actions');
    actions.append(button('Ver no jardim', () => (deps.close(), deps.openGarden())), button('Ver passaporte', () => (deps.close(), deps.openPassport()), 'secondary'));
    c.appendChild(actions);
  };

  localStep();
  return page;
}
