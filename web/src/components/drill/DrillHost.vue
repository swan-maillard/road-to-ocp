<script setup>
import { ref, watch, computed } from 'vue';
import CodeBlock from '../code/CodeBlock.vue';
import OutcomeButtons from './OutcomeButtons.vue';
import OptionsInput from './OptionsInput.vue';
import OrderInput from './OrderInput.vue';
import TraceInput from './TraceInput.vue';
import BugInput from './BugInput.vue';
import Hints from './Hints.vue';
import RevealPanel from './RevealPanel.vue';
import TeachBack from './TeachBack.vue';
import GradeInput from './GradeInput.vue';
import AiPanel from '../ai/AiPanel.vue';
import { useContent } from '../../composables/useContent';
import { useProgress, BOX_NAMES, MASTERED_BOX } from '../../composables/useProgress';
import { usePractice } from '../../composables/usePractice';
import { norm, arraysEqual, OUTCOME_LABEL } from '../../lib/util';
import { OFFLINE } from '../../lib/mode.js';

const props = defineProps({ drill: { type: Object, required: true } });
const { hints: hintsFor } = useContent();
const { state, recordResult } = useProgress();
const { next } = usePractice();

const revealed = ref(false);
const correct = ref(false);
const graded = ref(false);
const grade = ref(null);
const unknown = ref(false);
const mine = ref('');
const actual = ref('');
const actualOutcome = ref(null);
const rawOutput = ref('');
const hintsShown = ref(0);
const busy = ref(false);

const outcome = ref('OUTPUT');
const text = ref('');
const choice = ref('');
const order = ref([]);
const trace = ref([]);
const bugLine = ref(null);

function reset() {
  revealed.value = false; correct.value = false; graded.value = false; grade.value = null; unknown.value = false; mine.value = ''; actual.value = ''; actualOutcome.value = null; rawOutput.value = ''; hintsShown.value = 0; busy.value = false;
  outcome.value = 'OUTPUT'; text.value = ''; choice.value = ''; order.value = []; bugLine.value = null;
  trace.value = props.drill.kind === 'trace' ? props.drill.rows.map((r) => r.cells.map(() => '')) : [];
}
watch(() => props.drill.id, reset, { immediate: true });

const hintList = computed(() => {
  const pair = hintsFor(props.drill.trap) || [];
  const h = ['<b>Where:</b> Chapter ' + props.drill.chapter + ', ' + props.drill.section + (props.drill.objective ? ' — ' + props.drill.objective : '')];
  h.push('<b>Think:</b> ' + (pair[0] || 'about the single rule this tests'));
  h.push('<b>Narrow it down:</b> ' + (pair[1] || ('Re-read "' + (props.drill.ref || ('Chapter ' + props.drill.chapter)) + '" and apply it step by step.')));
  return h;
});
function nextHint() { if (hintsShown.value < hintList.value.length) hintsShown.value++; }

const needsText = computed(() => props.drill.outcome === 'OUTPUT');
const revealLabel = computed(() => 'Reveal answer');
const box = computed(() => { const r = state.items[props.drill.id]; return r && r.seen ? r.box : null; });

async function reveal(forceWrong = false) {
  if (revealed.value || busy.value) return;
  const d = props.drill;
  if (d.kind === 'concept' || d.kind === 'fill') {
    mine.value = choice.value || '(blank)'; actual.value = d.answer; correct.value = choice.value === d.answer; revealed.value = true;
  } else if (d.kind === 'order') {
    mine.value = order.value.join('  \u2192  ') || '(empty)'; actual.value = d.answer.join('  \u2192  '); correct.value = arraysEqual(order.value, d.answer); revealed.value = true;
  } else if (d.kind === 'trace') {
    const flat = d.rows.flatMap((r) => r.cells); let ok = true;
    d.rows.forEach((row, ri) => row.cells.forEach((c, ci) => { if (norm(trace.value[ri][ci]) !== norm(c)) ok = false; }));
    correct.value = ok;
    mine.value = trace.value.map((r) => r.join(' | ')).join(' ; ') || '(blank)';
    actual.value = flat.join(' | '); revealed.value = true;
  } else if (d.kind === 'bug') {
    mine.value = 'line ' + (bugLine.value || '?'); actual.value = 'line ' + d.answerLine; correct.value = bugLine.value === d.answerLine; revealed.value = true;
  } else {
    // Grade against the answer captured when the drill was authored and
    // verified on the JVM (scripts/verify.mjs) — no JVM round-trip needed.
    const a = d.outcome || 'OUTPUT';
    actualOutcome.value = a;
    rawOutput.value = '';
    const t = norm(text.value);
    let textOk = true;
    if (a === 'OUTPUT') textOk = t !== '' && t === norm(d.answer);
    else if (t) { if (a === 'RUNTIME_ERROR') textOk = t.toLowerCase().includes(norm(d.answer).toLowerCase()); else textOk = false; }
    correct.value = (outcome.value || 'OUTPUT') === a && textOk;
    mine.value = (outcome.value ? OUTCOME_LABEL[outcome.value] : '(no outcome)') + (text.value ? '\n' + t : '');
    actual.value = OUTCOME_LABEL[a] + (a === 'OUTPUT' ? '\n' + norm(d.answer) : (a === 'RUNTIME_ERROR' ? '\n' + (d.answer || '') : ''));
    revealed.value = true;
  }
  if (forceWrong) { correct.value = false; mine.value = "(I don't know)"; }
}
function dontKnow() { reveal(true).then(() => { unknown.value = true; }); }
function suggestedGrade() {
  if (unknown.value) return 'unknown';
  return correct.value ? (hintsShown.value > 0 ? 'getting' : 'good') : 'unknown';
}
function gradeCard(key) {
  if (graded.value || busy.value) return;
  graded.value = true; grade.value = key;
  recordResult(props.drill, correct.value, hintsShown.value, key);
}
// Grading is the last step: choosing a grade records the result and advances.
function onGrade(key) { gradeCard(key); next(); }
defineExpose({ run: reveal });
</script>

<template>
  <div class="card">
    <div class="meta-line">
      <b>Chapter {{ drill.chapter }}</b>
      <span class="grow"></span>
      <span v-if="box === null" class="box-tag new">New card</span>
      <span v-else class="box-tag" :class="{ mastered: box >= MASTERED_BOX }">Box {{ box }} · {{ BOX_NAMES[box] }}</span>
    </div>
    <div class="prompt">{{ drill.prompt }}</div>
    <CodeBlock v-if="drill.code && drill.kind !== 'bug'" :code="drill.code" />

    <BugInput v-if="drill.kind === 'bug'" :code="drill.code" v-model="bugLine" :actual="revealed ? drill.answerLine : null" />
    <OptionsInput v-else-if="drill.kind === 'concept' || drill.kind === 'fill'" :options="drill.options" v-model="choice" :actual="revealed ? drill.answer : null" />
    <OrderInput v-else-if="drill.kind === 'order'" :items="drill.items" v-model="order" :actual="revealed ? drill.answer : null" />
    <TraceInput v-else-if="drill.kind === 'trace'" :columns="drill.columns" :rows="drill.rows" v-model="trace" :actual="revealed ? drill.rows.map((r) => r.cells) : null" />
    <div v-else class="answer-area">
      <label>What happens? <span class="muted">{{ needsText ? '(pick one, then type the exact output — required)' : '(pick one; exact result optional)' }}</span></label>
      <OutcomeButtons v-model="outcome" :actual="actualOutcome" />
      <input v-model="text" class="text" :disabled="revealed" :placeholder="needsText ? 'exact printed output (required)' : 'exact printed output or exception name (optional)'" style="width:100%; font-family:var(--mono);" />
    </div>

    <Hints :list="hintList" :shown="hintsShown" />

    <div class="action-bar">
      <button class="btn primary" :disabled="revealed || busy" @click="reveal()">{{ revealLabel }}</button>
      <div class="spacer"></div>
      <button class="btn ghost" :disabled="revealed || hintsShown >= hintList.length" @click="nextHint">Hint</button>
      <button class="btn ghost" :disabled="revealed || busy" @click="dontKnow">I don't know</button>
    </div>

    <RevealPanel v-if="revealed" :drill="drill" :correct="correct" :mine="mine" :actual="actual" :raw-output="rawOutput" />
    <TeachBack v-if="revealed && !OFFLINE" :drill="drill" />
    <GradeInput v-if="revealed" :suggested="suggestedGrade()" :chosen="grade" :graded="graded" :current-box="box || 0" @grade="onGrade" />
    <AiPanel v-if="revealed" :drill="drill" :correct="correct" :mine="mine" :actual="actual" />
  </div>
</template>
