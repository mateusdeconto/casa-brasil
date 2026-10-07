// Routes nav-bar tabs and garden/shop events between the Phaser scenes and the HTML UI.
import Phaser from 'phaser';
import { buyAnimal, simulateVisit } from './core/actions';
import { animalById } from './core/catalog';
import type { Emitter, GameEvents, Tab } from './core/events';
import type { Store } from './core/state';
import type { RoomScene } from './scenes/RoomScene';
import { showCard } from './ui/card';
import { flyCoins } from './ui/coinFly';
import type { Hud } from './ui/hud';
import type { Shop } from './ui/shop';

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

export function setupRouter(d: RouterDeps): void {
  const { game, bus, store, ui } = d;
  const ctx = { bus, store };
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

  bus.on('tab', (tab) => {
    d.shop.close();
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

  const visitButtons = [
    { label: 'Simular visita ao zoológico (demo)', onClick: () => visit('zoo') },
    { label: 'Simular visita ao museu (demo)', secondary: true, onClick: () => visit('museum') },
  ];
  const visit = (kind: 'zoo' | 'museum') => {
    simulateVisit(store, kind);
    bus.emit('gardenChanged', undefined);
    bus.emit('toast', kind === 'zoo' ? 'Onça-pintada liberada no jardim!' : 'Peças do museu liberadas na loja!');
  };
  bus.on('visitCard', () =>
    showCard(ui, { title: 'Exclusivo', image: 'lock', text: 'Exclusivo: só com visita real a um parceiro.', buttons: visitButtons }),
  );

  bus.on('animalTap', ({ id, look }) => {
    const def = animalById(id);
    if (look === 'locked') {
      return showCard(ui, { title: def.name, image: 'jaguar_silhouette', text: 'Exclusivo: só com visita real a um parceiro.', buttons: visitButtons });
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

  bus.on('coinsFly', ({ x, y, amount }) => flyCoins(ui, { x, y }, d.hud.coinTarget(), amount));
}
