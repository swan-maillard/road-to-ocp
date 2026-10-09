import { ref, computed } from 'vue';
import { useContent } from './useContent';
import { useProgress } from './useProgress';

const { allItems } = useContent();
const { isDue, isNew, state } = useProgress();

const scope = ref('due');
const interleave = ref(false);
const session = ref([]);
const cursor = ref(0);
const revealed = ref(false);
// Ids classified as reviews when the session was built. Frozen so that
// answering a new card doesn't reclassify it as a review mid-session.
const reviewIds = ref(new Set());

const goal = computed(() => Math.max(1, state.settings.goal || 20));
const reviewsDue = computed(() => allItems.value.filter((d) => isDue(d.id)).length);
const newAvailable = computed(() => allItems.value.filter((d) => isNew(d.id)).length);
const newAllowance = computed(() => Math.min(goal.value, newAvailable.value));

const current = computed(() => session.value[cursor.value] || null);

const isNewItem = (id) => { const r = state.items[id]; return !r || !r.seen; };
const isSessionNew = (d) => !reviewIds.value.has(d.id);
const newTotal = computed(() => session.value.filter(isSessionNew).length);
const reviewTotal = computed(() => session.value.length - newTotal.value);
const done = computed(() => Math.min(cursor.value, session.value.length));
const doneNew = computed(() => session.value.slice(0, cursor.value).filter(isSessionNew).length);
const doneReview = computed(() => done.value - doneNew.value);

// New cards are introduced in chapter order (then section order).
function chapterOrder(list) {
  return list.slice().sort((a, b) => (a.chapter - b.chapter) || String(a.section).localeCompare(String(b.section)));
}
// Reviews: lowest box (most struggled) first, then most misses, with a random
// tiebreaker so the order differs each session.
function leitnerOrder(list) {
  return list
    .map((d) => ({ d, r: state.items[d.id] || {}, k: Math.random() }))
    .sort((a, b) => (a.r.box || 0) - (b.r.box || 0) || (b.r.wrong || 0) - (a.r.wrong || 0) || a.k - b.k)
    .map((x) => x.d);
}
// Interleave topics by chapter, preserving the order inside each chapter.
function interleaveList(list) {
  const buckets = new Map();
  for (const d of list) { if (!buckets.has(d.chapter)) buckets.set(d.chapter, []); buckets.get(d.chapter).push(d); }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  const out = []; let more = true;
  while (more) { more = false; for (const k of keys) { const arr = buckets.get(k); if (arr.length) { out.push(arr.shift()); more = true; } } }
  return out;
}

function splitSeen(list) {
  return { reviews: list.filter((d) => !isNewItem(d.id)), fresh: list.filter((d) => isNewItem(d.id)) };
}

function buildSession() {
  const s = scope.value;
  let reviews, fresh;
  if (s.startsWith('trap:')) { ({ reviews, fresh } = splitSeen(allItems.value.filter((d) => d.trap === s.slice(5)))); }
  else if (s === 'all') { ({ reviews, fresh } = splitSeen(allItems.value.slice())); }
  else if (s.startsWith('ch:')) { ({ reviews, fresh } = splitSeen(allItems.value.filter((d) => d.chapter === Number(s.slice(3))))); }
  else {
    // Session = all reviews due today + new cards up to the daily goal (chapter order).
    reviews = allItems.value.filter((d) => isDue(d.id));
    fresh = chapterOrder(allItems.value.filter((d) => isNew(d.id))).slice(0, goal.value);
  }
  const ordered = [...leitnerOrder(reviews), ...chapterOrder(fresh)];
  session.value = interleave.value ? interleaveList(ordered) : ordered;
  reviewIds.value = new Set(reviews.map((d) => d.id));
  cursor.value = 0;
  revealed.value = false;
}
function next() { cursor.value++; revealed.value = false; }
// Start a fresh session of up to `n` unseen (new) cards only — no reviews.
function newCardsSession(n) {
  const count = n || goal.value;
  const fresh = chapterOrder(allItems.value.filter((d) => isNew(d.id))).slice(0, count);
  session.value = interleave.value ? interleaveList(fresh) : fresh;
  reviewIds.value = new Set();
  cursor.value = 0;
  revealed.value = false;
}
function reshuffle() { buildSession(); }
function setScope(v) { scope.value = v; buildSession(); }
function trainTrap(tag) { scope.value = 'trap:' + tag; buildSession(); }

export function usePractice() {
  return { scope, interleave, session, cursor, current, revealed, buildSession, next, newCardsSession, reshuffle, setScope, trainTrap, allItems, isNewItem, newTotal, reviewTotal, done, doneNew, doneReview, goal, reviewsDue, newAllowance };
}
