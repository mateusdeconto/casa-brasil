import { defineConfig } from 'vite';

// Phaser alone is ~1.2 MB minified; one chunk is fine for this game.
export default defineConfig({
  build: { chunkSizeWarningLimit: 2000 },
});
