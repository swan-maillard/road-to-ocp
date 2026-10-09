<script setup>
import { ref, watch, computed } from 'vue';
import CodeEditor from '../code/CodeEditor.vue';
import Hints from './Hints.vue';
import TeachBack from './TeachBack.vue';
import GradeInput from './GradeInput.vue';
import AiPanel from '../ai/AiPanel.vue';
import { useProgress, BOX_NAMES, MASTERED_BOX } from '../../composables/useProgress';
import { useRun } from '../../composables/useRun';
import { usePractice } from '../../composables/usePractice';
import { useContent } from '../../composables/useContent';
import { useToasts } from '../../composables/useToasts';
import { OFFLINE } from '../../lib/mode.js';

const props = defineProps({ drill: { type: Object, required: true } });
const { state, save, recordResult } = useProgress();
const { runJava } = useRun();
const { next } = usePractice();
const { hints: hintsFor } = useContent();
const { push } = useToasts();

const editor = ref(null);
const code = ref('');
const tests = ref(null);
const compiled = ref(true);
const stderr = ref('');
const revealed = ref(false);
const busy = ref(false);
const hintsShown = ref(0);
const unknown = ref(false);
const graded = ref(false);
const grade = ref(null);

function stored() { return (state.tasks[props.drill.id] && state.tasks[props.drill.id].code) || props.drill.starter; }
function reset() {
  code.value = stored(); tests.value = null; compiled.value = true; stderr.value = ''; revealed.value = false; busy.value = false; hintsShown.value = 0; unknown.value = false; graded.value = false; grade.value = null;
  if (editor.value) editor.value.set(code.value);
}
watch(() => props.drill.id, reset, { immediate: true, flush: 'post' });

function onChange(t) { code.value = t; state.tasks[props.drill.id] = { code: t }; save(); }
function resetCode() { state.tasks[props.drill.id] = { code: props.drill.starter }; save(); reset(); push('Reset to starter.', 'ok'); }
function showSolution() { if (editor.value) editor.value.set(props.drill.solution); push('Solution loaded — study it, then Reset.', 'warn'); }

const hintList = computed(() => {
  const pair = hintsFor(props.drill.trap) || [];
  return [
    '<b>Where:</b> Chapter ' + props.drill.chapter + ', ' + props.drill.section + (props.drill.objective ? ' — ' + props.drill.objective : ''),
    '<b>Think:</b> ' + (pair[0] || 'match the required signature and keep to the single rule'),
    '<b>Narrow it down:</b> ' + (pair[1] || 'Re-read the task and trace the expected output by hand.'),
  ];
});
function nextHint() { if (hintsShown.value < hintList.value.length) hintsShown.value++; }

const expectedCount = computed(() => (props.drill.expected || []).length);
const box = computed(() => { const r = state.items[props.drill.id]; return r && r.seen ? r.box : null; });
const passed = computed(() => (tests.value || []).filter((t) => t.ok).length);
const allOk = computed(() => compiled.value && expectedCount.value > 0 && passed.value === expectedCount.value);

async function runTests() {
  if (busy.value) return;
  busy.value = true;
  const source = props.drill.harness ? (code.value + '\n\n' + props.drill.harness) : code.value;
  try {
    const res = await runJava(source);
    compiled.value = res.compiled;
    stderr.value = res.stderr || '';
    if (!res.compiled) { tests.value = null; }
    else {
      const lines = res.stdout.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
      tests.value = (props.drill.expected || []).map((exp, i) => ({ exp, got: lines[i] != null ? lines[i] : '(no output)', ok: lines[i] === exp }));
    }
    revealed.value = true;
  } finally { busy.value = false; }
  push(allOk.value ? 'All hidden tests passed' : (passed.value + '/' + expectedCount.value + ' passed'), allOk.value ? 'ok' : 'warn');
}
function dontKnow() {
  if (busy.value) return;
  revealed.value = true; unknown.value = true; tests.value = []; compiled.value = true; stderr.value = '';
  push('Marked as not known.', 'warn');
}
function suggestedGrade() {
  if (unknown.value) return 'unknown';
  return allOk.value ? (hintsShown.value > 0 ? 'getting' : 'good') : 'unknown';
}
function gradeCard(key) {
  if (graded.value) return;
  graded.value = true; grade.value = key;
  recordResult(props.drill, allOk.value, hintsShown.value, key);
}
// Grading is the last step: choosing a grade records the result and advances.
function onGrade(key) { gradeCard(key); next(); }
defineExpose({ run: runTests });
</script>

<template>
  <div class="card">
    <div class="meta-line">
      <b>Chapter {{ drill.chapter }}</b> · {{ expectedCount }} hidden test(s)
      <span class="grow"></span>
      <span v-if="box === null" class="box-tag new">New card</span>
      <span v-else class="box-tag" :class="{ mastered: box >= MASTERED_BOX }">Box {{ box }} · {{ BOX_NAMES[box] }}</span>
    </div>
    <div class="prompt">{{ drill.prompt }}</div>

    <CodeEditor ref="editor" :code="code" label="Editor" @change="onChange" @run="runTests" />

    <Hints :list="hintList" :shown="hintsShown" />

    <div class="action-bar">
      <button class="btn primary" :disabled="busy || revealed" @click="runTests">Run hidden tests</button>
      <div class="spacer"></div>
      <button class="btn ghost" :disabled="revealed" @click="resetCode">Reset</button>
      <button class="btn ghost" :disabled="revealed" @click="showSolution">Show solution</button>
      <button class="btn ghost" :disabled="revealed || hintsShown >= hintList.length" @click="nextHint">Hint</button>
      <button class="btn ghost" :disabled="revealed || busy" @click="dontKnow">I don't know</button>
    </div>
    <div v-if="busy" class="spin" style="margin-top:12px">Compiling and running hidden tests…</div>

    <div v-if="revealed" class="reveal-anim">
      <div v-if="unknown" class="verdict bad">Marked as not known</div>
      <template v-else-if="!compiled">
        <div class="verdict bad">Compile error</div>
        <pre class="code">{{ stderr }}</pre>
      </template>
      <template v-else>
        <div class="verdict" :class="allOk ? 'ok' : 'bad'">{{ passed }} / {{ expectedCount }} hidden tests passed</div>
        <div v-for="(t, i) in tests" :key="i" class="test-line" :class="t.ok ? 'ok' : 'bad'">
          <span class="tag">{{ t.ok ? 'PASS' : 'FAIL' }}</span>
          <span>expected <b>{{ t.exp }}</b></span>
          <span class="exp">got {{ t.got }}</span>
        </div>
      </template>
      <TeachBack v-if="!OFFLINE" :drill="drill" />
      <GradeInput :suggested="suggestedGrade()" :chosen="grade" :graded="graded" :current-box="box || 0" @grade="onGrade" />
      <AiPanel :drill="drill" :correct="allOk" :mine="passed + '/' + expectedCount" :actual="(drill.expected || []).join(', ')" />
    </div>
  </div>
</template>
