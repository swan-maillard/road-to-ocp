<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { useAi } from '../../composables/useAi';
import { useContent } from '../../composables/useContent';
import { useProgress } from '../../composables/useProgress';
import { useToasts } from '../../composables/useToasts';
import Markdown from '../ui/Markdown.vue';

const props = defineProps({ drill: { type: Object, required: true } });

const { configured, aiCall } = useAi();
const { groundedReference, refBlock } = useContent();
const { state, rec, save } = useProgress();
const { push } = useToasts();

const text = ref('');
const busy = ref(false);
const verdict = ref(null);

// Snapshot the previous attempt (read before this one is graded) so a wrong or
// partial teach-back can nudge the learner to re-explain on the next review.
const prev = state.items[props.drill.id] || {};
const prevTeach = prev.lastTeach || null; // 'ok' | 'mid' | 'bad'
const prevNote = prev.teachNote || '';
const needsReexplain = prevTeach === 'bad' || prevTeach === 'mid';

function ctx() {
  const d = props.drill;
  return JSON.stringify({ chapter: d.chapter, section: d.section, trap: d.trap, code: d.code || null, prompt: d.prompt, explanation: d.explanation || null, ref: d.ref || null, teachBack: d.teachBack || null });
}
function store(note) { if (note) rec(props.drill.id).teachNote = note; }

// Optional: ask the AI to grade the explanation. Grading the card (below the
// teach-back block) is what moves on to the next drill.
async function verify() {
  if (busy.value) return;
  const t = text.value.trim();
  if (!t) { push('Write your explanation first.', 'warn'); return; }
  if (!configured.value) { push('Add a DeepSeek API key to get AI feedback.', 'warn'); return; }
  busy.value = true; verdict.value = null;
  try {
    const ref = await groundedReference(props.drill);
    const raw = await aiCall([
      { role: 'system', content: 'You are an expert OCP Java 25 tutor. Grade ONLY the student teach-back of a single rule. Reply ONLY as JSON {"verdict":"correct"|"partial"|"incorrect","feedback":"...","modelAnswer":"..."}. feedback: max 2 sentences, no repetition, do not restate the question.' },
      { role: 'user', content: 'Drill: ' + ctx() + refBlock(ref) + '\n\nStudent teach-back: ' + t },
    ], { json: true, temperature: 0.1, maxTokens: 300 });
    let j; try { j = JSON.parse(raw); } catch { j = { verdict: 'partial', feedback: raw, modelAnswer: '' }; }
    verdict.value = j;
    rec(props.drill.id).lastTeach = j.verdict === 'correct' ? 'ok' : j.verdict === 'partial' ? 'mid' : 'bad';
    store(t); save();
  } catch (e) { push('AI error: ' + (e.message || e), 'bad'); store(t); save(); }
  finally { busy.value = false; }
}
function onBlur() { store(text.value.trim()); save(); }
onBeforeUnmount(() => { store(text.value.trim()); save(); });
</script>
<template>
  <div class="teach">
    <h4>Teach-back <span class="muted">(optional — explain the rule, then grade below)</span></h4>

    <div
      v-if="needsReexplain"
      class="teach-recall"
      :style="{
        border: '1px solid ' + (prevTeach === 'bad' ? 'var(--bad)' : 'var(--accent)'),
        borderLeftWidth: '3px',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-sm)',
        padding: '9px 12px',
        margin: '8px 0',
        fontSize: 'var(--t-sm)',
      }"
    >
      <b>Last time you explained this, it was marked {{ prevTeach === 'bad' ? 'incorrect' : 'partial' }}.</b>
      Try to re-explain it from memory.
      <div v-if="prevNote" class="muted" style="margin-top:4px; font-style:italic">“{{ prevNote }}”</div>
    </div>

    <div class="muted">{{ drill.teachBack }}</div>
    <textarea v-model="text" class="text" spellcheck="false" placeholder="Answer in your own words…" :disabled="busy || !!verdict" style="width:100%; min-height:64px; margin-top:8px; font-family:var(--mono);" @blur="onBlur"></textarea>

    <div v-if="!verdict" class="teach-next">
      <button class="btn ghost" :disabled="busy" @click="verify">Verify with AI</button>
      <span v-if="busy" class="spin">Validating…</span>
    </div>

    <div v-else class="teach-result">
      <div class="ai-msg" style="margin-top:10px">
        <div class="verdict-line" :class="verdict.verdict === 'correct' ? 'ok' : verdict.verdict === 'partial' ? 'mid' : 'bad'">AI: {{ verdict.verdict }}</div>
        <Markdown :text="verdict.feedback || ''" />
        <div v-if="verdict.modelAnswer" class="muted" style="margin-top:6px">Model answer:</div>
        <Markdown v-if="verdict.modelAnswer" :text="verdict.modelAnswer" />
      </div>
    </div>
  </div>
</template>
