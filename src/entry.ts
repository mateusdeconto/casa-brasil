// Entry point: the game lives at "/", the school, city and about pages are light pages without Phaser.
type SiteModule = { mount: (root: HTMLElement) => void };

const SITE: Record<string, () => Promise<SiteModule>> = {
  '/escola': () => import('./school'),
  '/cidade': () => import('./site/city'),
  '/sobre': () => import('./site/about'),
};

const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const path = location.pathname.slice(base.length).replace(/\/+$/, '') || '/';
const load = SITE[path];

if (load) {
  document.documentElement.classList.add('site');
  document.getElementById('app')?.remove();
  const root = document.createElement('main');
  root.id = 'site';
  document.body.appendChild(root);
  load().then((m) => m.mount(root));
} else {
  import('./main');
}
