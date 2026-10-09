import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(__dirname, 'web'),
  plugins: [vue()],
  define: { __OFFLINE__: 'false' },
  build: {
    outDir: path.join(__dirname, 'public'),
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4321',
      '/pdf': 'http://localhost:4321',
    },
  },
});
