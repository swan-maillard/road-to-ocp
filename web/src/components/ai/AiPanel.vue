<script setup>
import { ref, computed } from 'vue';
import { useAi } from '../../composables/useAi';
import { useContent } from '../../composables/useContent';
import { OFFLINE } from '../../lib/mode.js';
import Markdown from '../ui/Markdown.vue';

const props = defineProps({
  drill: { type: Object, required: true },
  correct: { type: Boolean, default: false },
  mine: { type: String, default: '' },
  actual: { type: String, default: '' },
  code: { type: String, default: '' }, // learner's source (write tasks only)
  unlocked: { type: Boolean, default: false }, // solution may be revealed (solved / gave up)
});

const { configured, aiCall } = useAi();
const { groundedReference, refBlock } = useContent();

const logs = ref([]);
const question = ref('');
const busy = ref(false);
const chat = ref([]);

const isWrite = computed(() => props.drill.kind === 'write');

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
async function optimal() {
  if (!configured.value) return;
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill);
    const raw = await aiCall([
      { role: 'system', content: 'You are an expert OCP Java 25 tutor. Give the optimal, exam-ready solution for this task. Output the Java code in one fenced block, then at most 2 short sentences on why it is optimal. Keep it minimal and idiomatic; use a compact source file (void main()) unless the task requires otherwise.' },
      { role: 'user', content: 'Task: ' + ctx() + '\nExpected output: ' + (props.drill.expected || []).join(' | ') + refBlock(ref) },
    ], { temperature: 0.2, maxTokens: 700 });
    add('ai', 'Optimal solution', raw);
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
async function review() {
  if (!configured.value) return;
  const src = (props.code || '').trim();
  if (!src) { add('ai', 'Solution review', 'Write some code first, then ask for a review.'); return; }
  busy.value = true;
  try {
    const ref = await groundedReference(props.drill);
    const raw = await aiCall([
      { role: 'system', content: 'You are an expert OCP Java 25 code reviewer. Review the learner\'s solution against the task and expected output. In at most 4 short bullets: whether it is correct, the exact rule/misconception at play, and one concrete improvement. If it is wrong, give only the minimal fix, not a full rewrite.' },
      { role: 'user', content: 'Task: ' + ctx() + '\nExpected output: ' + (props.drill.expected || []).join(' | ') + '\n\nLearner code:\n"""\n' + src + '\n"""' + refBlock(ref) },
    ], { temperature: 0.2, maxTokens: 700 });
    add('ai', 'Solution review', raw);
  } catch (e) { add('ai', 'AI error', String(e.message || e)); } finally { busy.value = false; }
}
</script>
<template>
  <div v-if="!OFFLINE" class="ai-panel">
    <div v-if="!configured" class="muted">Add <b>DEEPSEEK_API_KEY</b> to <code>.env</code> and restart to unlock grounded explanations, teach-back grading, Q&amp;A, and solution review.</div>
    <template v-else>
      <div class="ai-tools">
        <template v-if="isWrite">
          <button v-if="unlocked" type="button" @click="optimal">Optimal solution</button>
          <button type="button" @click="review">Review my solution</button>
        </template>
        <template v-else>
          <button v-if="!correct" type="button" @click="why">Why was I wrong?</button>
          <button type="button" @click="verify">Verify vs PDF</button>
        </template>
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
