// Entry point: state, save, offline production, Phaser game and the HTML interface.
import Phaser from 'phaser';
import './ui/style.css';
import { TITLE, COLORS, OFFLINE_CAP_HOURS, AWAY_SLEEP_MS } from './config';
import { Emitter, type GameEvents, type Tab } from './core/events';
import { applyOffline } from './core/production';
import { autoSave, loadSave } from './core/save';
import { Store } from './core/state';
import { setupRouter } from './router';
import { BootScene } from './scenes/BootScene';
import { GardenScene } from './scenes/GardenScene';
import { RoomScene } from './scenes/RoomScene';
import { showAvatarPicker } from './ui/avatarPicker';
import { createActionBar } from './ui/actionBar';
import { toast } from './ui/dom';
import { createHud, createNav } from './ui/hud';
import { showOpening } from './ui/opening';
import { createShop } from './ui/shop';

document.title = TITLE;
const bus = new Emitter<GameEvents>();
const now = Date.now();
const save = loadSave(now);
const wasAway = save.started && now - save.time > AWAY_SLEEP_MS;
// time away counts for production, capped; never a penalty
applyOffline(save.animals, save.time, now, OFFLINE_CAP_HOURS * 3600_000);
const store = new Store(save, bus);
autoSave(() => store.data, (fn) => bus.on('changed', fn));

const app = document.getElementById('app')!;
const ui = document.getElementById('ui')!;
const dpr = () => Math.min(window.devicePixelRatio || 1, 3);
const size = () => ({ width: Math.round(app.clientWidth * dpr()), height: Math.round(app.clientHeight * dpr()) });

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.page,
  ...size(),
  render: { pixelArt: false, antialias: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, RoomScene, GardenScene],
});
window.addEventListener('resize', () => {
  const s = size();
  game.scale.resize(s.width, s.height);
});
(window as unknown as { game: Phaser.Game }).game = game;

const assetsReady = new Promise<void>((ok) => game.events.once('assets-ready', ok));
let hud: ReturnType<typeof createHud> | null = null;
let setTab: (t: Tab) => void = () => {};

function room(): RoomScene {
  return game.scene.getScene('room') as RoomScene;
}

function enterGame(): void {
  if (!hud) {
    hud = createHud(ui, bus);
    setTab = createNav(ui, bus);
    const shop = createShop(ui, bus, () => store.data);
    const editor = () => room().editor;
    const showActions = createActionBar(ui, {
      buy: () => editor().confirm(),
      cancel: () => bus.emit('tab', 'home'),
      sell: () => editor().sell(),
      done: () => bus.emit('tab', 'home'),
    });
    bus.on('editor', (s) => {
      showActions(s);
      if (s.mode === 'none' && game.scene.isActive('room')) setTab('home');
    });
    setupRouter({ game, bus, store, ui, hud, shop, setTab: (t) => setTab(t), pickAvatar, asleep: wasAway });
    if (wasAway && store.data.animals.length) bus.emit('toast', 'Seus bichos produziram enquanto você esteve fora!');
  }
  hud.setPlayer(store.data.avatar, store.data.name);
  hud.setCoins(store.data.coins);
  setTab('home');
  assetsReady.then(() => {
    if (!game.scene.isActive('room') && !game.scene.isActive('garden')) game.scene.start('room', { bus, store });
  });
}

function pickAvatar(): void {
  showAvatarPicker(ui, store.data, (avatar, name) => {
    Object.assign(store.data, { avatar, name, started: true });
    store.commit();
    bus.emit('avatarChosen', { avatar, name });
    if (game.scene.isActive('room')) room().scene.restart({ bus, store });
    enterGame();
  });
}

bus.on('toast', (text) => toast(ui, text));

showOpening(ui, () => (store.data.started ? enterGame() : pickAvatar()));
