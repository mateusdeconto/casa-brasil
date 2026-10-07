// Routes nav-bar tabs and garden/shop events between the Phaser scenes and the HTML UI.
import Phaser from 'phaser';
import { buyAnimal } from './core/actions';
import { PLACE_PARTNERS, animalById, furnitureById } from './core/catalog';
import type { Emitter, GameEvents, Tab } from './core/events';
import type { Store } from './core/state';
import { galleryBounds } from './core/gallery';
import type { RoomScene } from './scenes/RoomScene';
import { createAlbumPage } from './ui/album';
import { showCard } from './ui/card';
import { flyCoins } from './ui/coinFly';
import { createFamilyPage } from './ui/family';
import { createGalleryPage } from './ui/gallery';
import { createRoteiroPage } from './ui/roteiro';
import type { Outing } from './core/state';
import type { Hud } from './ui/hud';
import { PageHost } from './ui/pageHost';
import { createPassportPage } from './ui/passport';
import { createPlannerPage } from './ui/planner';
import { createNearbyPage } from './ui/nearby';
import { createParentPanel } from './ui/parentPanel';
import { openParentGate } from './ui/parentGate';
import { badgeById } from './core/badges';
import type { Shop } from './ui/shop';
import { startVisitFlow } from './ui/visitFlow';

export interface RouterDeps {
  game: Phaser.Game;
  bus: Emitter<GameEvents>;
  store: Store;
  ui: HTMLElement;
  hud: Hud;
  shop: Shop;
  setTab: (t: Tab) => void;
  pickAvatar: () => void;
  asleep: boolean;
}

const NO_PARTNER_HINT: Record<string, string> = {
  semana: 'Complete as 3 missões da semana no Clube Família.',
  evento: 'Escaneie o QR do evento para ganhar este item.',
};

export function setupRouter(d: RouterDeps): { host: PageHost } {
  const { game, bus, store, ui } = d;
  const ctx = { bus, store };
  const host = new PageHost(ui);
  let wakeAsleep = d.asleep;

  /** Make sure the house or the gallery scene runs (and only that one), then hand it over. */
  const withScene = (key: 'room' | 'gallery', fn: (room: RoomScene) => void) => {
    const room = game.scene.getScene(key) as RoomScene;
    if (game.scene.isActive(key)) return fn(room);
    for (const other of ['garden', key === 'room' ? 'gallery' : 'room']) {
      if (game.scene.isActive(other) && other !== 'garden') (game.scene.getScene(other) as RoomScene).editor.exit();
      game.scene.stop(other);
    }
    room.events.once('room-ready', () => fn(room));
    game.scene.start(key, ctx);
  };
  const withRoom = (fn: (room: RoomScene) => void) => withScene('room', fn);

  const openGarden = () => {
    for (const key of ['room', 'gallery']) {
      if (game.scene.isActive(key)) (game.scene.getScene(key) as RoomScene).editor.exit();
      game.scene.stop(key);
    }
    if (!game.scene.isActive('garden')) game.scene.start('garden', { ...ctx, asleep: wakeAsleep });
    wakeAsleep = false;
  };

  const openPassport = () => host.push(createPassportPage(store, () => host.pop()));
  const openRoteiro = (outing: Outing) => host.push(createRoteiroPage({ store, bus, outing, back: () => host.pop() }));
  const openPlanner = (partner?: string) =>
    host.push(createPlannerPage({ store, bus, back: () => (host.pop(), refreshFamily()), openRoteiro }, partner));
  const openNearby = () => host.push(createNearbyPage({ back: () => host.pop() }));
  const openFamily = () => host.open(createFamilyPage({ store, bus, ui, openPassport, openPlanner, openRoteiro, openNearby, startVisit: (partner) => bus.emit('startVisit', { partner }) }));
  /** the family page lists outings and missions, so redraw it after a sub-page closes */
  const refreshFamily = () => host.isOpen && host.top?.el.classList.contains('family') && openFamily();
  const openGalleryPage = () =>
    host.open(createGalleryPage({ store, bus, close: () => host.closeAll(), goShop: () => bus.emit('tab', 'shop') }));
  const openAlbum = () => host.open(createAlbumPage({ store, ui, goFamily: () => bus.emit('tab', 'family') }));

  bus.on('tab', (tab) => {
    d.shop.close();
    host.closeAll();
    if (tab === 'family') return (openFamily(), d.setTab(tab));
    if (tab === 'album') return (openAlbum(), d.setTab(tab));
    if (tab === 'avatar') return withRoom((r) => (r.editor.exit(), d.pickAvatar()));
    if (tab === 'garden') {
      openGarden();
      return d.setTab('garden');
    }
    if (tab === 'gallery' || tab === 'galleryEdit') {
      return withScene('gallery', (g) => {
        if (tab === 'galleryEdit') g.editor.startEdit();
        else g.editor.exit();
        d.setTab(tab);
        if (tab === 'gallery' && !galleryBounds(store.data)) openGalleryPage();
      });
    }
    withRoom((room) => {
      if (tab === 'edit') room.editor.startEdit();
      else room.editor.exit();
      if (tab === 'shop') d.shop.open();
      d.setTab(tab);
    });
  });

  bus.on('shopPick', (id) => {
    if (furnitureById(id).gallery) {
      if (!galleryBounds(store.data)) {
        bus.emit('toast', 'Construa a galeria primeiro: abra a aba Galeria.');
        return bus.emit('tab', 'gallery');
      }
      return withScene('gallery', (g) => {
        g.editor.startPlace(id);
        d.setTab('gallery');
      });
    }
    withRoom((room) => {
      room.editor.startPlace(id);
      d.setTab('shop');
    });
  });
  bus.on('openGallery', openGalleryPage);
  bus.on('houseBuilt', () => {
    host.closeAll();
    bus.emit('toast', 'A casa ficou maior! Agora tem mais espaço para decorar.');
    withRoom((room) => {
      room.editor.exit();
      room.scene.restart(ctx);
      d.setTab('home');
    });
  });
  bus.on('galleryBuilt', () => bus.emit('changed', undefined));
  bus.on('pieceTap', ({ id }) => {
    const def = furnitureById(id);
    showCard(ui, { title: def.name, image: def.sprite, text: `Você sabia? ${def.blurb ?? ''}`, buttons: [] });
  });

  bus.on('startVisit', ({ partner, preGps }) => {
    const id = partner ?? PLACE_PARTNERS[0].id;
    host.push(
      startVisitFlow(
        { store, close: () => host.pop(), openGarden: () => bus.emit('tab', 'garden'), openPassport: () => (bus.emit('tab', 'family'), openPassport()) },
        id,
        preGps,
      ),
    );
  });

  const goVisit = (unlock?: string) => {
    const p = PLACE_PARTNERS.find((x) => x.reward.unlock === unlock);
    if (p) return bus.emit('startVisit', { partner: p.id });
    bus.emit('toast', NO_PARTNER_HINT[unlock ?? ''] ?? 'Faça uma visita no Clube Família.');
  };
  const visitText = 'Exclusivo: só com visita real a um parceiro.';

  bus.on('visitCard', ({ unlock }) =>
    showCard(ui, { title: 'Exclusivo', image: 'lock', text: visitText, buttons: [{ label: 'Fazer uma visita', onClick: () => goVisit(unlock) }] }),
  );

  bus.on('animalTap', ({ id, look }) => {
    const def = animalById(id);
    if (look === 'locked') {
      return showCard(ui, {
        title: def.name, image: 'jaguar_silhouette', text: visitText,
        buttons: [{ label: 'Fazer uma visita', onClick: () => goVisit(def.exclusive) }],
      });
    }
    showCard(ui, {
      title: def.name,
      image: `${id}_idle1`,
      text: `Produz ${def.coins} moedas a cada ${def.periodSec} s.`,
      buttons: [{
        label: `Comprar por ${def.price}`,
        disabled: store.data.coins < def.price,
        onClick: () => {
          if (buyAnimal(store, id)) bus.emit('gardenChanged', undefined);
        },
      }],
    });
  });

  // a visit may have unlocked an animal (jaguar): refresh the garden if it is the running scene
  bus.on('unlocked', () => bus.emit('gardenChanged', undefined));
  const openParent = () =>
    openParentGate(ui, store, () => {
      const panel = createParentPanel({ store, bus, ui, changePin: () => (panel.remove(), (store.root.pinHash = null), store.commit(), openParent()) });
      ui.appendChild(panel);
    });
  bus.on('openParent', openParent);

  /** another child was selected (or renamed): reload header and scenes with their data */
  let current = store.data.id;
  bus.on('profileChanged', (id) => {
    d.hud.setPlayer(store.data.avatar, store.data.name);
    d.hud.setCoins(store.data.coins);
    if (id === current) return; // just a rename
    current = id;
    host.closeAll();
    game.scene.stop('garden');
    game.scene.stop('gallery');
    game.scene.stop('room');
    game.scene.start('room', ctx);
    d.setTab('home');
  });
  bus.on('badgeEarned', ({ id }) => bus.emit('toast', `Medalha nova: ${badgeById(id).name}!`));
  bus.on('coinsFly', ({ x, y, amount }) => flyCoins(ui, { x, y }, d.hud.coinTarget(), amount));
  return { host };
}
