import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages project site: https://<user>.github.io/<repo>/
const BASE = process.env.OCPLAB_BASE || '/road-to-ocp/';

export default defineConfig({
  root: path.join(__dirname, 'web'),
  base: BASE,
  plugins: [vue()],
  define: { __OFFLINE__: 'true' },
  build: {
    outDir: path.join(__dirname, 'dist-offline'),
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
});
