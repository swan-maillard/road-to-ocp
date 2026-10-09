import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { generateOfflineContent } from './gen-offline-content.mjs';
import config from '../vite.offline.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

generateOfflineContent();

await build(config);

// GitHub Pages: stop Jekyll from processing the output.
const outDir = config.build.outDir;
fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

console.log('[offline] built to ' + path.relative(root, outDir) + ' (base ' + config.base + ')');
