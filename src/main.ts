// Entry point: state, save, Phaser game and the HTML interface.
import Phaser from 'phaser';
import './ui/style.css';
import { TITLE, COLORS } from './config';
import { Emitter, type GameEvents, type Tab } from './core/events';
import { autoSave, loadSave } from './core/save';
import { Store } from './core/state';
import { BootScene } from './scenes/BootScene';
import { RoomScene } from './scenes/RoomScene';
import { showAvatarPicker } from './ui/avatarPicker';
import { createHud, createNav } from './ui/hud';
import { showOpening } from './ui/opening';

document.title = TITLE;
const bus = new Emitter<GameEvents>();
const store = new Store(loadSave(), bus);
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
  scene: [BootScene, RoomScene],
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
  }
  hud.setPlayer(store.data.avatar, store.data.name);
  hud.setCoins(store.data.coins);
  setTab('home');
  assetsReady.then(() => {
    if (!game.scene.isActive('room')) game.scene.start('room', { bus, store });
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

bus.on('tab', (tab) => {
  if (tab === 'avatar') return pickAvatar();
  setTab(tab);
});

showOpening(ui, () => (store.data.started ? enterGame() : pickAvatar()));
