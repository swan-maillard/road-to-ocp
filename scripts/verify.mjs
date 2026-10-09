import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runJava, RUNNER_SIG } from '../runner/javaRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const CACHE_FILE = path.join(ROOT, '.verify-cache.json');

const norm = (s) => (s ?? '').replace(/\r\n/g, '\n').replace(/\s+$/g, '').trim();
const NO_CACHE = process.argv.includes('--no-cache');
const FORCE = process.argv.includes('--force');
const CONCURRENCY = Math.max(4, Math.min(12, os.cpus().length));
const KINDS = new Set(['code', 'concept', 'fill', 'order', 'trace', 'bug']);
const OUTCOMES = new Set(['OUTPUT', 'NO_OUTPUT', 'COMPILE_ERROR', 'RUNTIME_ERROR']);

export function outcomeOf(res) {
  if (!res.compiled) return 'COMPILE_ERROR';
  if (res.exitCode !== 0 && /Exception|Error/.test(res.stderr)) return 'RUNTIME_ERROR';
  if (res.stdout.trim() === '') return 'NO_OUTPUT';
  return 'OUTPUT';
}

function loadCache() {
  if (NO_CACHE) return { sig: '', results: {}, runs: {} };
  try { const c = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); return c.sig === RUNNER_SIG ? Object.assign({ runs: {} }, c) : { sig: RUNNER_SIG, results: {}, runs: {} }; }
  catch { return { sig: RUNNER_SIG, results: {}, runs: {} }; }
}
async function pool(items, worker, size) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (true) { const i = next++; if (i >= items.length) return; out[i] = await worker(items[i], i); } }));
  return out;
}

const drills = [];
for (const f of fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json'))) {
  const arr = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
  if (!Array.isArray(arr)) continue;
  for (const d of arr) drills.push({ ...d, _file: f });
}
const tasks = JSON.parse(fs.readFileSync(path.join(CONTENT, 'tasks.json'), 'utf8')).tasks;

/* ---------- schema validation ---------- */
let schemaFail = 0;
const seenIds = new Map();
const seenCode = new Map();
for (const d of drills) {
  const problems = [];
  if (!d.id) problems.push('missing id');
  if (!Number.isInteger(d.chapter)) problems.push('bad chapter');
  if (!d.section) problems.push('missing section');
  if (!KINDS.has(d.kind)) problems.push('bad kind: ' + d.kind);
  if (!d.trap) problems.push('missing trap');
  if (seenIds.has(d.id)) problems.push('duplicate id (also in ' + seenIds.get(d.id) + ')'); else seenIds.set(d.id, d._file);
  if (d.kind === 'code') {
    if (!OUTCOMES.has(d.outcome)) problems.push('bad outcome: ' + d.outcome);
    if (!d.code) problems.push('code kind without code');
    if (d.code && seenCode.has(d.code)) problems.push('duplicate code (also ' + seenCode.get(d.code) + ')'); else if (d.code) seenCode.set(d.code, d.id);
  } else if (d.kind === 'concept' || d.kind === 'fill') {
    if (!Array.isArray(d.options) || !d.options.length) problems.push('missing options');
    if (d.answer == null) problems.push('missing answer');
  } else if (d.kind === 'order') {
    if (!Array.isArray(d.items) || !Array.isArray(d.answer) || d.items.length !== d.answer.length) problems.push('order items/answer mismatch');
  } else if (d.kind === 'trace') {
    if (!Array.isArray(d.columns) || !Array.isArray(d.rows)) problems.push('trace columns/rows missing');
  } else if (d.kind === 'bug') {
    if (!d.code || !Number.isInteger(d.answerLine)) problems.push('bug needs code + answerLine');
  }
  if (problems.length) { schemaFail++; console.log('SCHEMA FAIL  ' + (d.id || '(no id)') + ': ' + problems.join('; ')); }
}
if (!schemaFail) console.log('schema OK (' + drills.length + ' drills, no duplicate ids/code)');
for (const t of tasks) { if (!t.id || !t.starter || typeof t.harness !== 'string' || !Array.isArray(t.expected) || !Array.isArray(t.expected) || t.chapter == null) { schemaFail++; console.log('SCHEMA FAIL task ' + t.id); } }

/* ---------- code drill verification ---------- */
const cache = loadCache();
const codeDrills = drills.filter((d) => d.kind === 'code' && d.code);
const started = Date.now();
let cacheHits = 0;
const results = await pool(codeDrills, async (d) => {
  const key = crypto.createHash('sha1').update(d.code).digest('hex');
  let res = FORCE ? null : cache.results[key];
  if (res) cacheHits++; else { res = await runJava(d.code); cache.results[key] = res; }
  const actual = outcomeOf(res); const problems = [];
  if (actual !== d.outcome) problems.push('outcome expected ' + d.outcome + ' got ' + actual);
  if (d.outcome === 'OUTPUT' && norm(res.stdout) !== norm(d.answer)) problems.push('stdout expected ' + JSON.stringify(norm(d.answer)) + ' got ' + JSON.stringify(norm(res.stdout)));
  if (d.outcome === 'RUNTIME_ERROR' && !res.stderr.includes(d.answer)) problems.push('exception expected ' + d.answer + ' not in stderr');
  return { d, problems };
}, CONCURRENCY);
let pass = 0, fail = 0;
for (const { d, problems } of results) { if (problems.length) { fail++; console.log('FAIL  ' + d.id); for (const p of problems) console.log('        ' + p); } else pass++; }

/* ---------- task verification (solution + harness) ---------- */
let taskPass = 0, taskFail = 0;
for (const t of tasks) {
  const key = 'task:' + crypto.createHash('sha1').update(t.solution + '\n' + t.harness).digest('hex');
  let res = FORCE ? null : cache.runs[key];
  if (res) cacheHits++; else { res = await runJava(t.solution + '\n\n' + t.harness); cache.runs[key] = res; }
  const lines = res.compiled ? res.stdout.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n') : [];
  const ok = res.compiled && t.expected.every((e, i) => lines[i] === e);
  if (ok) taskPass++; else { taskFail++; console.log('TASK FAIL  ' + t.id + (res.compiled ? ' (output mismatch)' : ' (compile error)')); if (res.stderr) console.log('        ' + res.stderr.split('\n')[0]); }
}

if (!NO_CACHE) { try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch {} }
const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log('\n' + pass + ' passed, ' + fail + ' failed, ' + (pass + fail) + ' code drills (' + cacheHits + ' cached)');
console.log(taskPass + ' passed, ' + taskFail + ' failed, ' + (taskPass + taskFail) + ' sandbox task solutions');
console.log('schema: ' + (schemaFail ? schemaFail + ' problems' : 'clean') + ' · ' + secs + 's');
process.exit(fail || taskFail || schemaFail ? 1 : 0);
