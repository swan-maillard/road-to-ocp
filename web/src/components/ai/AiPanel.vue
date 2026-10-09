<script setup>
import { ref } from 'vue';
import { useAi } from '../../composables/useAi';
import { useContent } from '../../composables/useContent';
import { useToasts } from '../../composables/useToasts';
import { useRun } from '../../composables/useRun';
import { usePractice } from '../../composables/usePractice';
import { outcomeOf, exceptionName, norm } from '../../lib/util';
import { OFFLINE } from '../../lib/mode.js';
import Markdown from '../ui/Markdown.vue';

const props = defineProps({
  drill: { type: Object, required: true },
  correct: { type: Boolean, default: false },
  mine: { type: String, default: '' },
  actual: { type: String, default: '' },
});

const { configured, aiCall } = useAi();
const { groundedReference, refBlock } = useContent();
const { push } = useToasts();
const { runJava } = useRun();
const { session, cursor } = usePractice();

const logs = ref([]);
const question = ref('');
const busy = ref(false);
const chat = ref([]);

function ctx() {
  const d = props.drill;
  return JSON.stringify({ chapter: d.chapter, section: d.section, trap: d.trap, code: d.code || null, prompt: d.prompt, explanation: d.explanation || null, ref: d.ref || null, teachBack: d.teachBack || null });
}
function add(role, title, body, cls) { logs.value.push({ id: Date.now() + Math.random(), role, title, body, cls }); }

async function why() {
  if (!configured.value) return;
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill);
    const raw = await aiCall([
      { role: 'system', content: 'You are an expert OCP Java 25 tutor. The learner has already read the drill explanation, so do NOT repeat or paraphrase it. In at most 2 sentences: name the exact misconception in the learner\'s answer and give the correct mental model. Optionally add one tiny contrast example.' },
      { role: 'user', content: 'Drill: ' + ctx() + '\nLearner answered: ' + (props.mine || '(unknown)') + '\nCorrect: ' + (props.actual || '(see drill)') + refBlock(ref) },
    ], { temperature: 0.2, maxTokens: 340 });
    add('ai', 'The misconception', raw);
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
async function verify() {
  if (!configured.value) return;
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill);
    if (!ref) { add('ai', 'Verify', 'No reference found for this drill.'); return; }
    const raw = await aiCall([
      { role: 'system', content: 'You are a strict verifier. For each factual claim in CANDIDATE, decide if the REFERENCE supports it. Respond ONLY as JSON: {"supported":boolean,"claims":[{"claim":string,"status":"supported"|"unsupported"|"unclear"}],"corrections":string}.' },
      { role: 'user', content: 'REFERENCE:\n"""\n' + ref + '\n"""\n\nCANDIDATE:\n"""\n' + (props.drill.explanation || props.drill.prompt) + '\n"""' },
    ], { json: true, temperature: 0, maxTokens: 500 });
    let j; try { j = JSON.parse(raw); } catch { add('ai', 'Verify', 'Could not parse verifier output.'); return; }
    const bad = (j.claims || []).filter((c) => c.status !== 'supported');
    const lines = (j.claims || []).map((c) => (c.status === 'supported' ? '[OK] ' : c.status === 'unclear' ? '[?] ' : '[!] ') + c.claim).join('\n');
    add('ai', j.supported && !bad.length ? 'Explanation fully supported' : 'Some claims need review', lines + (j.corrections ? '\n\nCorrections: ' + j.corrections : ''), j.supported && !bad.length ? 'ok' : 'mid');
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
async function ask() {
  const text = question.value.trim();
  if (!text || !configured.value) return;
  add('user', null, text);
  question.value = '';
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill, text);
    chat.value.push({ role: 'user', content: text });
    const raw = await aiCall([
      { role: 'system', content: 'You are an expert OCP Java 25 tutor. Answer the learner\'s question about this drill. When asked for examples, give 1-3 short correct snippets with their printed output. Prefer the reference; label anything beyond it "(general Java knowledge)". Keep it focused and concrete. Drill: ' + ctx() + refBlock(ref) },
      ...chat.value,
    ], { temperature: 0.2, maxTokens: 600 });
    chat.value.push({ role: 'assistant', content: raw });
    add('ai', 'Tutor', raw);
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
async function generate(harder) {
  if (!configured.value) return;
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill);
    const raw = await aiCall([
      { role: 'system', content: 'You generate OCP Java 25 (1Z0-831) micro-drills grounded in the provided reference. Output ONLY JSON {"drills":[...]}. Each drill: {"id":string,"chapter":int,"section":string,"objective":string,"kind":"code","outcome":"OUTPUT"|"NO_OUTPUT"|"COMPILE_ERROR"|"RUNTIME_ERROR","trap":string,"difficulty":1-3,"prompt":string,"code":string,"answer":string,"explanation":string,"ref":string,"teachBack":string}. code must be a complete Java 25 compact source file with void main(){} using IO for output, at most 8 lines, testing EXACTLY one rule. answer is exact stdout for OUTPUT, exception name for RUNTIME_ERROR, else "".' },
      { role: 'user', content: 'Theme (trap): ' + props.drill.trap + '. Reference drill: ' + ctx() + '. Generate 3 ' + (harder ? 'HARDER, more deceptive' : 'similar') + ' drills testing the same rule.' + refBlock(ref) },
    ], { json: true, temperature: harder ? 0.6 : 0.4, maxTokens: 1400 });
    let j; try { j = JSON.parse(raw); } catch { add('ai', 'AI error', 'Could not parse generated drills.'); return; }
    const list = (j.drills || []).filter((x) => x && x.code);
    if (!list.length) { add('ai', 'AI', 'No drills returned.'); return; }
    const added = [];
    for (let i = 0; i < list.length; i++) {
      const g = list[i];
      g.id = 'ai-' + Date.now() + '-' + i; g.kind = 'code'; g.source = 'ai';
      g.chapter = props.drill.chapter; g.section = props.drill.section; g.trap = g.trap || props.drill.trap;
      g.difficulty = harder ? 3 : (g.difficulty || props.drill.difficulty);
      const v = await runJava(g.code);
      const oc = outcomeOf(v); g.outcome = oc;
      g.answer = oc === 'OUTPUT' ? norm(v.stdout) : oc === 'RUNTIME_ERROR' ? exceptionName(v.stderr) : '';
      added.push(g);
    }
    session.value.splice(cursor.value + 1, 0, ...added);
    add('ai', added.length + ' new drill(s) added', added.map((g, i) => (i + 1) + '. ' + g.prompt + ' [' + g.outcome + ']').join('\n') + '\n\nOutcomes decided by the JVM.');
    push(added.length + ' drills inserted after this one', 'ok');
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
function report() { push('Flagged locally for review.', 'warn'); }
</script>
<template>
  <div v-if="!OFFLINE" class="ai-panel">
    <div v-if="!configured" class="muted">Add <b>DEEPSEEK_API_KEY</b> to <code>.env</code> and restart to unlock grounded explanations, teach-back grading, Q&amp;A, and drill generation.</div>
    <template v-else>
      <div class="ai-tools">
        <button v-if="!correct" type="button" @click="why">Why was I wrong?</button>
        <button type="button" @click="generate(false)">More like this (+3)</button>
        <button type="button" @click="generate(true)">Trickier (+3)</button>
        <button type="button" @click="verify">Verify vs PDF</button>
        <button type="button" @click="report">Report</button>
      </div>
      <div class="ai-ask">
        <input v-model="question" class="text" placeholder="Ask about this drill or theme…" @keydown.enter.prevent="ask" />
        <button class="btn ghost" type="button" @click="ask">Ask</button>
      </div>
      <div class="ai-log">
        <div v-for="l in logs" :key="l.id" class="ai-msg" :class="{ you: l.role === 'user' }">
          <div v-if="l.cls" class="verdict-line" :class="l.cls">{{ l.title }}</div>
          <h5 v-else-if="l.title">{{ l.title }}</h5>
          <Markdown v-if="l.role !== 'user'" :text="l.body" />
          <pre v-else>{{ l.body }}</pre>
        </div>
        <div v-if="busy" class="ai-msg spin">Working…</div>
      </div>
    </template>
  </div>
</template>
