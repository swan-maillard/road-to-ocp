import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function createStore(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  const selectAll = db.prepare('SELECT key, value FROM store');
  const selectOne = db.prepare('SELECT value FROM store WHERE key = ?');
  const upsert = db.prepare(`
    INSERT INTO store (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const del = db.prepare('DELETE FROM store WHERE key = ?');

  return {
    getAll() {
      const out = {};
      for (const row of selectAll.all()) {
        try { out[row.key] = JSON.parse(row.value); }
        catch { out[row.key] = row.value; }
      }
      return out;
    },
    get(key) {
      const row = selectOne.get(key);
      if (!row) return undefined;
      try { return JSON.parse(row.value); }
      catch { return row.value; }
    },
    set(key, value) {
      upsert.run(String(key), JSON.stringify(value), Date.now());
    },
    remove(key) {
      del.run(String(key));
    },
    close() {
      db.close();
    },
  };
}
