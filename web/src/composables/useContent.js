import { ref, computed } from 'vue';
import { OFFLINE } from '../lib/mode.js';

const drills = ref([]);
const tasks = ref([]);
const hints = ref({});
const pages = ref({ sections: {}, chapters: {} });
const titles = ref({ chapters: {}, sections: {} });
const refCache = new Map();
const loaded = ref(false);

const writeItems = computed(() => tasks.value.map((t) => ({
  id: t.id, chapter: t.chapter, section: t.section, objective: t.objective || '',
  kind: 'write', trap: t.trap, difficulty: t.difficulty || 2, prompt: t.prompt,
  starter: t.starter, harness: t.harness || '', expected: t.expected || [], solution: t.solution,
  ref: t.ref || ('Chapter ' + t.chapter + ' writing task'),
  teachBack: t.teachBack || 'Explain, in your own words, the rule this task exercises.',
  title: t.title,
})));
const allItems = computed(() => [...drills.value, ...writeItems.value]);
const byId = computed(() => new Map(allItems.value.map((d) => [d.id, d])));
const chapters = computed(() => [...new Set(allItems.value.map((d) => d.chapter))].sort((a, b) => a - b));

async function load() {
  if (OFFLINE) {
    const base = import.meta.env.BASE_URL || '/';
    let bundle = { drills: [], hints: {}, titles: { chapters: {}, sections: {} } };
    try {
      const r = await fetch(base + 'offline-content.json', { cache: 'no-cache' });
      if (r.ok) bundle = await r.json();
    } catch {}
    drills.value = bundle.drills || [];
    tasks.value = []; // writing tasks need the JVM -> not part of offline mode
    hints.value = bundle.hints || {};
    titles.value = bundle.titles || { chapters: {}, sections: {} };
    pages.value = { sections: {}, chapters: {} };
    loaded.value = true;
    return;
  }
  const [content, h, p, t] = await Promise.all([
    fetch('/api/content').then((r) => r.json()).catch(() => ({ drills: [], tasks: [] })),
    fetch('/api/hints').then((r) => r.json()).catch(() => ({})),
    fetch('/api/pages').then((r) => r.json()).catch(() => ({ sections: {}, chapters: {} })),
    fetch('/api/titles').then((r) => r.json()).catch(() => ({ chapters: {}, sections: {} })),
  ]);
  drills.value = content.drills || [];
  tasks.value = content.tasks || [];
  hints.value = h || {};
  pages.value = p || { sections: {}, chapters: {} };
  titles.value = t || { chapters: {}, sections: {} };
  loaded.value = true;
}
function chapterTitle(n) { return titles.value.chapters[String(n)] || ''; }
function sectionTitle(s) { return titles.value.sections[s] || ''; }

async function loadRef(chapter) {
  if (OFFLINE) return '';
  if (refCache.has(chapter)) return refCache.get(chapter);
  let t = '';
  try { const r = await fetch('/api/ref?chapter=' + chapter); if (r.ok) t = await r.text(); } catch {}
  refCache.set(chapter, t);
  return t;
}
function excerpt(text, ref, len) {
  if (!text) return '';
  len = len || 2000;
  const m = (ref || '').match(/\d+\.\d+(\.\d+)?/);
  if (m) { const i = text.indexOf(m[0]); if (i >= 0) return text.slice(Math.max(0, i - 200), i + len); }
  return text.slice(0, len);
}
async function groundedReference(d, query) {
  const text = await loadRef(d.chapter);
  if (!text) return '';
  if (query) for (const k of (query.match(/[A-Za-z][A-Za-z0-9]{5,}/g) || [])) { const i = text.indexOf(k); if (i >= 0) return text.slice(Math.max(0, i - 200), i + 1800); }
  return excerpt(text, d.ref);
}
function refBlock(ref) {
  return ref
    ? '\n\nPREFERRED REFERENCE (use for exam-specific facts; anything beyond it must be labelled "(general Java knowledge)"):\n"""\n' + ref + '\n"""'
    : '\n\n(No reference excerpt available; answer from standard Java knowledge and mark it "(general Java knowledge)".)';
}
function pdfLink(d) {
  if (OFFLINE) return null; // no PDF / server in offline mode
  const p = pages.value.sections[d.section] || pages.value.chapters[String(d.chapter)];
  return p ? { href: '/pdf#page=' + p, page: p } : null;
}
function hintsFor(trap) { return hints.value[trap] || []; }

export function useContent() {
  return { drills, tasks, hints: hintsFor, pages, titles, allItems, byId, chapters, loaded, load, loadRef, groundedReference, refBlock, pdfLink, excerpt, chapterTitle, sectionTitle };
}
