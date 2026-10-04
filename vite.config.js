import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        player: resolve(__dirname, 'client/player.html'),
        remote: resolve(__dirname, 'client/remote.html'),
        index: resolve(__dirname, 'client/index.html'),
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/socket.io': {
        target: 'http://localhost:8787',
        ws: true,
      },
    },
  },
});
