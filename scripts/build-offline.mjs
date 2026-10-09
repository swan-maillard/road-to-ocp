import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { generateOfflineContent } from './gen-offline-content.mjs';
import { snapshotProgress } from './snapshot-progress.mjs';
import config from '../vite.offline.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// 1. Bake the latest server DB state (if present) into a committed seed.
snapshotProgress();

// 2. Generate the static content bundle.
generateOfflineContent();

// 3. Make the seed fetchable next to index.html.
const seedSrc = path.join(root, 'content', 'offline-seed.json');
const publicDir = path.join(root, 'web', 'public');
fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(seedSrc)) {
  fs.writeFileSync(seedSrc, JSON.stringify({ schema: 'ocplab.seed.v1', entries: {} }));
}
fs.copyFileSync(seedSrc, path.join(publicDir, 'offline-seed.json'));

// 4. Build.
await build(config);

// GitHub Pages: stop Jekyll from processing the output.
fs.writeFileSync(path.join(config.build.outDir, '.nojekyll'), '');

console.log('[offline] built to ' + path.relative(root, config.build.outDir) + ' (base ' + config.base + ')');
