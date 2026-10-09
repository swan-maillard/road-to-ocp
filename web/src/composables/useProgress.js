import { reactive } from 'vue';
import { classify } from '../lib/util';
import { getItem, setItem, removeItem } from '../lib/store';
import { OFFLINE } from '../lib/mode.js';

const KEY = 'ocplab.progress.v1';
const DAY = 86400000;
// Anki-style growing intervals (days) per box. Box 0 = relearn now.
export const BOX_DAYS = [0, 1, 3, 7, 16, 35];
export const BOX_NAMES = ['Not known', 'Shaky', 'Learning', 'Solid', 'Mastered', 'Expert'];
export const MASTERED_BOX = 4;
export const GRADES = [
  { key: 'unknown', label: 'Not known', delta: -2, tone: 'bad' },
  { key: 'hard', label: 'Hard', delta: -1, tone: 'warn' },
  { key: 'getting', label: 'Getting there', delta: 0, tone: 'mid' },
  { key: 'good', label: 'Good', delta: 1, tone: 'ok' },
  { key: 'excellent', label: 'Excellent', delta: 2, tone: 'ok' },
];
const GRADE_DELTA = Object.fromEntries(GRADES.map((g) => [g.key, g.delta]));

function base() {
  return { items: {}, streak: 0, bestStreak: 0, seen: 0, ai: {}, aiUsage: { calls: 0, promptTokens: 0, completionTokens: 0, cost: 0 }, history: [], taxonomy: {}, settings: { goal: 20 }, tasks: {}, reports: [] };
}
function merge(s) {
  if (s && s.items) {
    const b = base();
    const legacyGoal = s.plan && s.plan.goal ? { goal: s.plan.goal } : {};
    const out = Object.assign(b, s);
    out.ai = s.ai || {};
    out.aiUsage = s.aiUsage || b.aiUsage;
    out.history = s.history || [];
    out.taxonomy = s.taxonomy || {};
    out.tasks = s.tasks || {};
    out.settings = Object.assign({ goal: 20 }, legacyGoal, s.settings || {});
    delete out.plan;
    return out;
  }
  return base();
}

const state = reactive(base());
export function hydrateProgress() { Object.assign(state, merge(getItem(KEY))); }

function save() { setItem(KEY, JSON.parse(JSON.stringify(state))); }
function rec(id) { if (!state.items[id]) state.items[id] = { box: 0, correct: 0, wrong: 0, seen: 0, lastTeach: null, lastSeen: 0, lastResult: null, firstSeen: 0 }; return state.items[id]; }
function isNew(id) { const r = state.items[id]; return !r || r.seen === 0; }
function isDue(id) {
  const r = state.items[id];
  if (!r || r.seen === 0) return false; // unseen cards are "new", not "due"
  if (r.box === 0) return true; // answered wrong -> review now
  return Date.now() - r.lastSeen >= BOX_DAYS[Math.min(r.box, BOX_DAYS.length - 1)] * DAY;
}
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
function newIntroducedToday() { const s = startOfToday(); let n = 0; for (const id in state.items) { const r = state.items[id]; if (r.seen > 0 && r.firstSeen >= s) n++; } return n; }
function isLearned(id) { const r = state.items[id]; return !!r && r.correct > 0; }
function isMastered(id) { const r = state.items[id]; return !!r && r.box >= MASTERED_BOX; }

function recordResult(d, correct, hints, gradeKey) {
  const r = rec(d.id);
  if (!r.firstSeen) r.firstSeen = Date.now();
  r.lastSeen = Date.now(); r.seen++; r.lastResult = correct ? 'correct' : 'wrong'; state.seen++;
  const key = gradeKey || (correct ? (hints > 0 ? 'getting' : 'good') : 'unknown');
  const delta = GRADE_DELTA[key] ?? 0;
  r.box = Math.max(0, Math.min(BOX_DAYS.length - 1, r.box + delta));
  if (correct) { r.correct++; state.streak++; state.bestStreak = Math.max(state.bestStreak, state.streak); }
  else { r.wrong++; state.streak = 0; const c = classify(d); state.taxonomy[c] = (state.taxonomy[c] || 0) + 1; }
  state.history.push({ t: Date.now(), id: d.id, ok: correct, hint: hints > 0 });
  if (state.history.length > 2000) state.history = state.history.slice(-1500);
  save();
}
function accuracy() {
  let c = 0, w = 0;
  for (const id in state.items) { const r = state.items[id]; c += r.correct || 0; w += r.wrong || 0; }
  const t = c + w;
  return { correct: c, wrong: w, acc: t ? Math.round((c / t) * 100) : 0 };
}
function trapStats(items) {
  const map = new Map(items.map((i) => [i.id, i]));
  const stats = {};
  for (const id in state.items) {
    const r = state.items[id];
    if (!r || r.wrong <= 0 || isMastered(id)) continue;
    const d = map.get(id); if (!d) continue;
    const tag = d.trap;
    stats[tag] = stats[tag] || { misses: 0, drills: 0, chapters: new Set(), rules: [] };
    stats[tag].misses += r.wrong; stats[tag].drills++;
    stats[tag].chapters.add(d.chapter);
    stats[tag].rules.push({ explanation: d.explanation || ('Chapter ' + d.chapter + ' task: ' + d.ref), ref: d.ref || '' });
  }
  return stats;
}
function todayAnswered() {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  return state.history.filter((h) => h.t >= s.getTime()).length;
}
function reset() { Object.assign(state, base()); removeItem(KEY); }

// ---- offline seed + merge -------------------------------------------------
// The published offline page carries a snapshot of the server DB as its
// "default" progress. On load we merge it with whatever is already in
// localStorage so neither side is lost.

function mergeMax(a, b) {
  const out = { ...(b || {}) };
  for (const k of Object.keys(a || {})) out[k] = Math.max(out[k] || 0, a[k] || 0);
  return out;
}
function mergeHistory(a, b) {
  const seen = new Set();
  const out = [];
  for (const h of [...(b || []), ...(a || [])]) {
    if (!h) continue;
    const key = h.t + '|' + h.id + '|' + (h.ok ? 1 : 0);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  out.sort((x, y) => x.t - y.t);
  return out.length > 2000 ? out.slice(-1500) : out;
}
function mergeItem(x, y) {
  const newer = (x.lastSeen || 0) >= (y.lastSeen || 0) ? x : y;
  return {
    ...y, ...x,
    box: Math.max(x.box || 0, y.box || 0),
    correct: Math.max(x.correct || 0, y.correct || 0),
    wrong: Math.max(x.wrong || 0, y.wrong || 0),
    seen: Math.max(x.seen || 0, y.seen || 0),
    firstSeen: x.firstSeen && y.firstSeen ? Math.min(x.firstSeen, y.firstSeen) : (x.firstSeen || y.firstSeen),
    lastSeen: Math.max(x.lastSeen || 0, y.lastSeen || 0),
    lastResult: newer.lastResult,
    lastTeach: newer.lastTeach,
    teachNote: x.teachNote || y.teachNote,
  };
}
export function mergeProgress(local, seed) {
  if (!seed) return local;
  if (!local) return JSON.parse(JSON.stringify(seed));
  const out = { ...seed, ...local };
  const ids = new Set([...Object.keys(seed.items || {}), ...Object.keys(local.items || {})]);
  out.items = {};
  for (const id of ids) {
    const x = (local.items || {})[id];
    const y = (seed.items || {})[id];
    out.items[id] = !x ? y : !y ? x : mergeItem(x, y);
  }
  out.streak = local.streak || 0;
  out.bestStreak = Math.max(local.bestStreak || 0, seed.bestStreak || 0);
  out.seen = Math.max(local.seen || 0, seed.seen || 0);
  out.taxonomy = mergeMax(local.taxonomy, seed.taxonomy);
  out.history = mergeHistory(local.history, seed.history);
  out.ai = { ...(seed.ai || {}), ...(local.ai || {}) };
  out.aiUsage = (local.aiUsage && local.aiUsage.calls) ? local.aiUsage : (seed.aiUsage || local.aiUsage);
  out.tasks = { ...(seed.tasks || {}), ...(local.tasks || {}) };
  out.settings = { ...(seed.settings || {}), ...(local.settings || {}) };
  out.reports = [...(seed.reports || []), ...(local.reports || [])];
  return out;
}

export async function applyOfflineSeed() {
  if (!OFFLINE) return;
  let seed = null;
  try {
    const base = import.meta.env.BASE_URL || '/';
    const r = await fetch(base + 'offline-seed.json', { cache: 'no-cache' });
    if (r.ok) { const j = await r.json(); seed = j && j.entries ? j.entries[KEY] : null; }
  } catch {}
  if (!seed || !seed.items) return;
  const local = getItem(KEY);
  setItem(KEY, mergeProgress(local, seed));
}

export function useProgress() {
  return { state, save, rec, isDue, isNew, isLearned, isMastered, recordResult, accuracy, trapStats, todayAnswered, newIntroducedToday, startOfToday, reset };
}
