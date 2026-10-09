<script setup>
import { ref } from 'vue';
import { useAi } from '../../composables/useAi';
import { useContent } from '../../composables/useContent';
import { useProgress } from '../../composables/useProgress';
import { useToasts } from '../../composables/useToasts';
import { OFFLINE } from '../../lib/mode.js';
import Markdown from '../ui/Markdown.vue';

const props = defineProps({ drill: { type: Object, required: true } });
const emit = defineEmits(['advance']);

const { configured, aiCall } = useAi();
const { groundedReference, refBlock } = useContent();
const { rec, save } = useProgress();
const { push } = useToasts();

const text = ref('');
const busy = ref(false);
const verdict = ref(null);

function ctx() {
  const d = props.drill;
  return JSON.stringify({ chapter: d.chapter, section: d.section, trap: d.trap, code: d.code || null, prompt: d.prompt, explanation: d.explanation || null, ref: d.ref || null, teachBack: d.teachBack || null });
}
function store(note) { if (note) rec(props.drill.id).teachNote = note; save(); }
async function next() {
  if (busy.value) return;
  const t = text.value.trim();
  if (!t) { emit('advance'); return; }
  if (OFFLINE) { store(t); emit('advance'); return; }
  if (!configured.value) { store(t); push('Saved. Add a DeepSeek key to get AI feedback.', 'warn'); emit('advance'); return; }
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
    store(t);
  } catch (e) { push('AI error: ' + (e.message || e), 'bad'); store(t); }
  finally { busy.value = false; }
}
</script>
<template>
  <div class="teach">
    <h4>Teach-back <span class="muted">(optional — leave empty to skip)</span></h4>
    <div class="muted">{{ drill.teachBack }}</div>
    <textarea v-model="text" class="text" spellcheck="false" placeholder="Answer in your own words…" :disabled="busy || !!verdict" style="width:100%; min-height:64px; margin-top:8px; font-family:var(--mono);"></textarea>

    <div v-if="!verdict" class="teach-next">
      <button class="btn primary next-btn" :disabled="busy" @click="next">Next</button>
      <span v-if="busy" class="spin">Validating…</span>
    </div>

    <div v-else class="teach-result">
      <div class="ai-msg" style="margin-top:10px">
        <div class="verdict-line" :class="verdict.verdict === 'correct' ? 'ok' : verdict.verdict === 'partial' ? 'mid' : 'bad'">AI: {{ verdict.verdict }}</div>
        <Markdown :text="verdict.feedback || ''" />
        <div v-if="verdict.modelAnswer" class="muted" style="margin-top:6px">Model answer:</div>
        <Markdown v-if="verdict.modelAnswer" :text="verdict.modelAnswer" />
      </div>
      <div class="teach-next">
        <button class="btn primary next-btn" @click="emit('advance')">Next</button>
      </div>
    </div>
  </div>
</template>
