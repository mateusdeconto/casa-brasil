// Entry point: state, save, offline production, Phaser game and the HTML interface.
import Phaser from 'phaser';
import './ui/style.css';
import './ui/pages.css';
import { TITLE, COLORS, OFFLINE_CAP_HOURS, AWAY_SLEEP_MS } from './config';
import { ANIMALS } from './core/catalog';
import { Emitter, type GameEvents, type Tab } from './core/events';
import { applyOffline } from './core/production';
import { attachProgress } from './core/progress';
import { autoSave, loadSave, storageWorks } from './core/save';
import { Store } from './core/state';
import { setupRouter } from './router';
import { BootScene } from './scenes/BootScene';
import { GardenScene } from './scenes/GardenScene';
import { RoomScene } from './scenes/RoomScene';
import { showAvatarPicker } from './ui/avatarPicker';
import { createActionBar } from './ui/actionBar';
import { toast } from './ui/dom';
import { createEditFab, createHud, createNav } from './ui/hud';
import { showOpening } from './ui/opening';
import { createShop } from './ui/shop';
import { loading } from './ui/loading';
import { handleQr } from './ui/qrFlow';
import { createFeedback } from './ui/sound';
import { openSettings } from './ui/settings';
import { createTutorial, type Tutorial } from './ui/tutorial';
import { startUsageTimer } from './ui/timeLimit';

document.title = TITLE;
// ?rapido=1 (with ?demo=1): the garden produces 10x faster, for presentations
if (new URLSearchParams(location.search).get('rapido') === '1') for (const a of ANIMALS) a.periodSec /= 10;
const bus = new Emitter<GameEvents>();
const now = Date.now();
const save = loadSave(now);
const wasAway = save.profiles.some((p) => p.started) && now - save.time > AWAY_SLEEP_MS;
// time away counts for production, capped; never a penalty
for (const p of save.profiles) applyOffline(p.animals, save.time, now, OFFLINE_CAP_HOURS * 3600_000);
const store = new Store(save, bus);
autoSave(() => store.root, (fn) => bus.on('changed', fn));
attachProgress(bus, store);

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

/** ?qr=<token> from a scanned code; consumed once the child has an avatar and the game is up */
let pendingQr = new URLSearchParams(location.search).get('qr');
game.events.on('load-progress', (p: number) => loading.progress(0.2 + p * 0.8));
const assetsReady = new Promise<void>((ok) => game.events.once('assets-ready', ok));
assetsReady.then(() => loading.done());
createFeedback(bus, store);
let hud: ReturnType<typeof createHud> | null = null;
let setTab: (t: Tab) => void = () => {};
let fabTab: (t: Tab) => void = () => {};
let tutorial: Tutorial | null = null;

function room(): RoomScene {
  return game.scene.getScene('room') as RoomScene;
}

function enterGame(): void {
  if (!hud) {
    hud = createHud(ui, bus);
    const navTab = createNav(ui, bus);
    fabTab = createEditFab(ui, bus);
    setTab = (t) => (navTab(t), fabTab(t));
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
    startUsageTimer(store, ui);
    tutorial = createTutorial(ui, bus, store);
    bus.on('openSettings', () => openSettings({ store, ui, restartTutorial: () => tutorial?.start(0) }));
    setupRouter({ game, bus, store, ui, hud, shop, setTab: (t) => setTab(t), pickAvatar, asleep: wasAway });
    if (wasAway && store.data.animals.length) bus.emit('toast', 'Seus bichos produziram enquanto você esteve fora!');
    if (!store.settings.tutorialDone && !pendingQr) tutorial.start(store.settings.tutorialStep);
  }
  hud.setPlayer(store.data.avatar, store.data.name);
  hud.setCoins(store.data.coins);
  setTab('home');
  assetsReady.then(() => {
    if (!game.scene.isActive('room') && !game.scene.isActive('garden')) game.scene.start('room', { bus, store });
    if (pendingQr) {
      const token = pendingQr;
      pendingQr = null;
      history.replaceState(null, '', location.pathname);
      handleQr({ store, bus, ui }, token);
    }
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

bus.on('toast', (text) => toast(ui, text, Math.max(1800, text.length * 65)));
// storage blocked (private window, full disk): keep playing in memory and say so once
let warned = false;
bus.on('changed', () => {
  if (warned || storageWorks()) return;
  warned = true;
  bus.emit('toast', 'Não consegui salvar neste aparelho. Seu progresso vale só até fechar a página.');
});

const begin = () => (store.data.started ? enterGame() : pickAvatar());
// a scanned QR skips the opening: first the avatar (if needed), then the prize or the partner
if (pendingQr) begin();
else showOpening(ui, begin);
