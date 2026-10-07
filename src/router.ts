// Routes nav-bar tabs and garden/shop events between the Phaser scenes and the HTML UI.
import Phaser from 'phaser';
import { buyAnimal } from './core/actions';
import { PARTNERS, animalById } from './core/catalog';
import type { Emitter, GameEvents, Tab } from './core/events';
import type { Store } from './core/state';
import type { RoomScene } from './scenes/RoomScene';
import { createAlbumPage } from './ui/album';
import { showCard } from './ui/card';
import { flyCoins } from './ui/coinFly';
import { createFamilyPage } from './ui/family';
import type { Hud } from './ui/hud';
import { PageHost } from './ui/pageHost';
import { createPassportPage } from './ui/passport';
import { createPlannerPage } from './ui/planner';
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

  /** Make sure the room scene runs, then hand it over. */
  const withRoom = (fn: (room: RoomScene) => void) => {
    const room = game.scene.getScene('room') as RoomScene;
    if (game.scene.isActive('room')) return fn(room);
    game.scene.stop('garden');
    room.events.once('room-ready', () => fn(room));
    game.scene.start('room', ctx);
  };

  const openGarden = () => {
    if (game.scene.isActive('room')) (game.scene.getScene('room') as RoomScene).editor.exit();
    game.scene.stop('room');
    if (!game.scene.isActive('garden')) game.scene.start('garden', { ...ctx, asleep: wakeAsleep });
    wakeAsleep = false;
  };

  const openPassport = () => host.push(createPassportPage(store, () => host.pop()));
  const openPlanner = (partner?: string) => host.push(createPlannerPage({ store, bus, back: () => (host.pop(), refreshFamily()) }, partner));
  const openFamily = () => host.open(createFamilyPage({ store, bus, ui, openPassport, openPlanner, startVisit: (partner) => bus.emit('startVisit', { partner }) }));
  /** the family page lists outings and missions, so redraw it after a sub-page closes */
  const refreshFamily = () => host.isOpen && host.top?.el.classList.contains('family') && openFamily();
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
    withRoom((room) => {
      if (tab === 'edit') room.editor.startEdit();
      else room.editor.exit();
      if (tab === 'shop') d.shop.open();
      d.setTab(tab);
    });
  });

  bus.on('shopPick', (id) =>
    withRoom((room) => {
      room.editor.startPlace(id);
      d.setTab('shop');
    }),
  );

  bus.on('startVisit', ({ partner, preGps }) => {
    const id = partner ?? PARTNERS[0].id;
    host.push(
      startVisitFlow(
        { store, close: () => host.pop(), openGarden: () => bus.emit('tab', 'garden'), openPassport: () => (bus.emit('tab', 'family'), openPassport()) },
        id,
        preGps,
      ),
    );
  });

  const goVisit = (unlock?: string) => {
    const p = PARTNERS.find((x) => x.reward.unlock === unlock);
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
  bus.on('badgeEarned', ({ id }) => bus.emit('toast', `Medalha nova: ${badgeById(id).name}!`));
  bus.on('coinsFly', ({ x, y, amount }) => flyCoins(ui, { x, y }, d.hud.coinTarget(), amount));
  return { host };
}
