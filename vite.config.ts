import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const THEME = '#1C1730';

// Phaser alone is ~1.2 MB minified; one chunk is fine for this game.
export default defineConfig({
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'og.jpg'],
      manifest: {
        name: 'Casa Brasil',
        short_name: 'Casa Brasil',
        description: 'Um jogo de casa e jardim que leva as famílias a museus, parques e centros de ciência.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME,
        background_color: THEME,
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // app shell and all the WebP art are cached on install, so the game opens offline
        globPatterns: ['**/*.{js,css,html,json,svg,ico,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 3_000_000,
        navigateFallback: '/index.html',
        // printable QR pages are real files, not part of the app
        navigateFallbackDenylist: [/^\/qr/],
        runtimeCaching: [
          { urlPattern: /\/assets\/.*\.png$/, handler: 'CacheFirst', options: { cacheName: 'art-fallback', expiration: { maxEntries: 250 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } },
        ],
      },
    }),
  ],
});
