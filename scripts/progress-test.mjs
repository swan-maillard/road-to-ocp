const KEY = 'ocplab.progress.v1';
const BOX_DAYS = [0, 1, 2, 4, 7, 15];

let store = {};
let quotaBytes = Infinity;
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => {
    if (Buffer.byteLength(v) > quotaBytes) {
      const e = new Error('quota exceeded');
      e.name = 'QuotaExceededError';
      throw e;
    }
    store[k] = v;
  },
};

let state;
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.items) { s.ai = s.ai || {}; return s; }
  } catch {}
  return { items: {}, streak: 0, bestStreak: 0, seen: 0, ai: {} };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); state.saveOk = true; }
  catch (e) {
    try { state.ai = {}; localStorage.setItem(KEY, JSON.stringify(state)); state.saveOk = true; }
    catch (e2) {
      try { delete state.reports; state.ai = {}; localStorage.setItem(KEY, JSON.stringify(state)); state.saveOk = true; }
      catch (e3) { state.saveOk = false; }
    }
  }
}
function rec(id) {
  if (!state.items[id]) state.items[id] = { box: 0, correct: 0, wrong: 0, seen: 0, lastTeach: null, lastSeen: 0, lastResult: null };
  return state.items[id];
}
function recordResult(d, correct) {
  const r = rec(d.id);
  r.lastSeen = Date.now();
  r.seen = (r.seen || 0) + 1;
  r.lastResult = correct ? 'correct' : 'wrong';
  state.seen++;
  if (correct) { r.correct++; r.box = Math.min(r.box + 1, BOX_DAYS.length - 1); }
  else { r.wrong++; r.box = 0; }
  save();
}

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log('FAIL  ' + msg); } else console.log('PASS  ' + msg); };

state = load();
recordResult({ id: 'a' }, false);
ok(state.items.a.wrong === 1, 'wrong answer recorded');

// Simulate a bloated AI cache that pushes the serialized state over quota.
state.ai['big-drill|why'] = 'x'.repeat(5000);
quotaBytes = 1500;

recordResult({ id: 'a' }, true);

const reloaded = load();
ok(!!reloaded.items.a, 'item survives reload');
ok(reloaded.items.a.correct === 1, 'correct answer persisted despite quota pressure');
ok(reloaded.items.a.wrong === 1, 'earlier wrong answer still persisted');
ok(reloaded.items.a.box === 1 && reloaded.items.a.lastResult === 'correct', 'box and lastResult updated');
ok(!('big-drill|why' in reloaded.ai), 'oversized AI cache was dropped to protect progress');

console.log('\n' + (fail ? fail + ' failed' : 'all passed'));
process.exit(fail ? 1 : 0);
