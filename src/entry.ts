// Entry point: the game lives at "/", the school, city and about pages are light pages without Phaser.
import { loadSave } from './core/save';
import { seedDemo } from './core/demoSeed';
import { installErrorGuard } from './ui/crash';
import { loading } from './ui/loading';
import { applyTextSize } from './ui/settings';

type SiteModule = { mount: (root: HTMLElement) => void };

const SITE: Record<string, () => Promise<SiteModule>> = {
  '/escola': () => import('./school'),
  '/cidade': () => import('./site/city'),
  '/sobre': () => import('./site/about'),
};

async function start(): Promise<void> {
  installErrorGuard();
  loading.progress(0.15);
  // ?demo=1 replaces the save with the demonstration family (kept in the URL: ?rapido=1 speeds the garden up)
  const q = new URLSearchParams(location.search);
  // it replaces the save, so ask first when this device already has a game in progress
  const hasGame = loadSave().profiles.some((p) => p.started);
  if (q.get('demo') === '1' && (!hasGame || window.confirm('Carregar os dados de demonstração? O jogo salvo neste aparelho será substituído.'))) {
    await seedDemo();
    q.delete('demo');
    const rest = q.toString();
    history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
  }
  applyTextSize(loadSave().settings.textSize);

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = location.pathname.slice(base.length).replace(/\/+$/, '') || '/';
  const load = SITE[path];
  if (!load) return void (await import('./main'));
  document.documentElement.classList.add('site');
  document.getElementById('app')?.remove();
  const root = document.createElement('main');
  root.id = 'site';
  document.body.appendChild(root);
  (await load()).mount(root);
  loading.done();
}

void start();
