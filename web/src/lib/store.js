import { OFFLINE } from './mode.js';

// Key/value store used for progress, theme and AI settings.
//   - Server build: persisted to the server's SQLite database via /api/store.
//   - Offline build: persisted to this device's localStorage.
// In both modes the same in-memory `cache` is the source of truth, so export /
// import produce an identical, portable JSON file.
const cache = {};
const pending = new Map();
let persistEnabled = false;
let flushTimer = null;
let flushing = false;

const PREFIX = 'ocplab.';

function parseRaw(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}

export async function loadStore() {
  if (OFFLINE) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) cache[k] = parseRaw(localStorage.getItem(k));
      }
    } catch {}
    persistEnabled = true;
    return;
  }
  try {
    const r = await fetch('/api/store');
    if (r.ok) {
      const data = await r.json();
      if (data && data.entries) Object.assign(cache, data.entries);
    }
  } catch {}
  persistEnabled = true;
}

export function getItem(key) {
  return Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : null;
}

export function setItem(key, value) {
  cache[key] = value;
  if (OFFLINE) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    return;
  }
  schedule(key, value);
}

export function removeItem(key) {
  delete cache[key];
  if (OFFLINE) {
    try { localStorage.removeItem(key); } catch {}
    return;
  }
  schedule(key, undefined);
}

// ---- Export / import (works identically in both modes) --------------------

export function exportEntries() {
  const out = {};
  for (const k of Object.keys(cache)) if (k.startsWith(PREFIX)) out[k] = cache[k];
  return out;
}

export async function importEntries(entries) {
  if (!entries || typeof entries !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(entries)) {
    if (!k.startsWith(PREFIX)) continue;
    const value = entries[k];
    cache[k] = value;
    if (OFFLINE) {
      try { localStorage.setItem(k, JSON.stringify(value)); } catch {}
    } else {
      try {
        await fetch('/api/store', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: k, value }),
        });
      } catch {}
    }
    n++;
  }
  return n;
}

// ---- server-mode persistence queue ---------------------------------------

function schedule(key, value) {
  if (!persistEnabled) return;
  pending.set(key, value);
  if (flushTimer || flushing) return;
  flushTimer = setTimeout(flush, 300);
}

async function flush() {
  flushTimer = null;
  if (flushing) return;
  flushing = true;
  const items = [...pending.entries()];
  pending.clear();
  try {
    for (const [key, value] of items) {
      try {
        if (value === undefined) {
          await fetch('/api/store?key=' + encodeURIComponent(key), { method: 'DELETE' });
        } else {
          await fetch('/api/store', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
          });
        }
      } catch {}
    }
  } finally {
    flushing = false;
    if (pending.size && !flushTimer) flushTimer = setTimeout(flush, 0);
  }
}

function flushBeacon() {
  if (OFFLINE || !persistEnabled) return;
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  for (const [key, value] of pending.entries()) {
    if (value === undefined) continue;
    try {
      const blob = new Blob([JSON.stringify({ key, value })], { type: 'application/json' });
      navigator.sendBeacon('/api/store', blob);
    } catch {}
  }
  pending.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushBeacon);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushBeacon(); });
}
