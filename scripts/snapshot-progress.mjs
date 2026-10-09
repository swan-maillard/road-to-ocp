import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const DB_PATH = path.join(root, 'data', 'ocplab.db');
const OUT_FILE = path.join(root, 'content', 'offline-seed.json');
const PREFIX = 'ocplab.';

function readEntries() {
  if (!fs.existsSync(DB_PATH)) return null;
  let db;
  try { db = new DatabaseSync(DB_PATH); } catch { return null; }
  try {
    const rows = db.prepare('SELECT key, value FROM store').all();
    const entries = {};
    for (const r of rows) {
      if (!String(r.key).startsWith(PREFIX)) continue;
      try { entries[r.key] = JSON.parse(r.value); } catch { entries[r.key] = r.value; }
    }
    return entries;
  } catch {
    return null;
  } finally {
    try { db.close(); } catch {}
  }
}

export function snapshotProgress() {
  const entries = readEntries();

  if (entries === null) {
    // No database available (e.g. CI): keep whatever committed seed exists.
    if (fs.existsSync(OUT_FILE)) {
      console.log('[seed] no local DB — keeping committed content/offline-seed.json');
      return JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    }
    const empty = { schema: 'ocplab.seed.v1', generatedAt: new Date().toISOString(), entries: {} };
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(empty, null, 2));
    console.log('[seed] no local DB — wrote empty seed');
    return empty;
  }

  const seed = { schema: 'ocplab.seed.v1', generatedAt: new Date().toISOString(), entries };
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(seed, null, 2));
  const prog = entries['ocplab.progress.v1'];
  const cards = prog && prog.items ? Object.keys(prog.items).length : 0;
  console.log(`[seed] captured DB snapshot -> content/offline-seed.json (${cards} cards, ${Object.keys(entries).length} keys)`);
  return seed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  snapshotProgress();
}
