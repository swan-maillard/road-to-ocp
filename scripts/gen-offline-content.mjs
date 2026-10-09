import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CONTENT = path.join(root, 'content');
const OUT_DIR = path.join(root, 'web', 'public');
const OUT_FILE = path.join(OUT_DIR, 'offline-content.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT, file), 'utf8'));
}

// Same rule the server uses (server.js loadDrills): every *.json file whose top
// level is an array contributes drills. tasks/hints/titles are objects -> skipped.
function collectDrills() {
  const drills = [];
  for (const f of fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json'))) {
    let j;
    try { j = readJson(f); } catch (e) { throw new Error('Cannot parse ' + f + ': ' + e.message); }
    if (Array.isArray(j)) drills.push(...j);
  }
  return drills;
}

function collectObject(file, fallback) {
  const fp = path.join(CONTENT, file);
  if (!fs.existsSync(fp)) return fallback;
  try { return readJson(file); } catch { return fallback; }
}

export function generateOfflineContent() {
  const drills = collectDrills();
  const hints = collectObject('hints.json', {});
  const titles = collectObject('titles.json', { chapters: {}, sections: {} });

  const ids = new Set();
  for (const d of drills) {
    if (!d || !d.id) throw new Error('Drill without id found');
    if (ids.has(d.id)) throw new Error('Duplicate drill id: ' + d.id);
    ids.add(d.id);
  }

  const bundle = {
    schema: 'ocplab.offline.v1',
    generatedAt: new Date().toISOString(),
    counts: { drills: drills.length, traps: Object.keys(hints).length },
    drills,
    hints,
    titles,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(bundle));
  const kb = Math.round(fs.statSync(OUT_FILE).size / 1024);
  console.log(`[offline] ${drills.length} drills, ${Object.keys(hints).length} traps -> web/public/offline-content.json (${kb} KB)`);
  return bundle;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateOfflineContent();
}
