import { ref, computed } from 'vue';
import { useContent } from './useContent';
import { useProgress } from './useProgress';

const { allItems } = useContent();
const { isDue, isNew, state } = useProgress();

const scope = ref('due');
const newOnly = ref(false);
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
// Remaining counts: decrease as cards are viewed, never grow when a new card
// becomes a review mid-session (classification is frozen per session).
const newLeft = computed(() => Math.max(0, newTotal.value - doneNew.value));
const reviewLeft = computed(() => Math.max(0, reviewTotal.value - doneReview.value));

// New cards are introduced in chapter order (then section order).
function chapterOrder(list) {
  return list.slice().sort((a, b) => (a.chapter - b.chapter) || String(a.section).localeCompare(String(b.section)));
}
function shuffleArray(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// New cards keep their chapter order; reviews are shuffled into them at random
// positions.
function mixReviews(fresh, reviews) {
  const out = fresh.slice();
  for (const d of shuffleArray(reviews)) out.splice(Math.floor(Math.random() * (out.length + 1)), 0, d);
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
  if (newOnly.value) reviews = [];
  session.value = mixReviews(chapterOrder(fresh), reviews);
  reviewIds.value = new Set(reviews.map((d) => d.id));
  cursor.value = 0;
  revealed.value = false;
}
function next() { cursor.value++; revealed.value = false; }
// Shuffle the cards still ahead in the current deck (including the one on
// screen), leaving already-answered cards in place.
function shuffle() {
  session.value = [...session.value.slice(0, cursor.value), ...shuffleArray(session.value.slice(cursor.value))];
  revealed.value = false;
}
// Start a fresh session of up to `n` unseen (new) cards only — no reviews.
function newCardsSession(n) {
  const count = n || goal.value;
  const fresh = chapterOrder(allItems.value.filter((d) => isNew(d.id))).slice(0, count);
  session.value = fresh;
  reviewIds.value = new Set();
  cursor.value = 0;
  revealed.value = false;
}
function setScope(v) { scope.value = v; buildSession(); }
function setNewOnly(v) { newOnly.value = v; buildSession(); }
function trainTrap(tag) { scope.value = 'trap:' + tag; buildSession(); }

export function usePractice() {
  return { scope, newOnly, session, cursor, current, revealed, buildSession, next, shuffle, newCardsSession, setScope, setNewOnly, trainTrap, allItems, isNewItem, newTotal, reviewTotal, newLeft, reviewLeft, done, doneNew, doneReview, goal, reviewsDue, newAllowance };
}
