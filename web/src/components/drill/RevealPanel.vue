<script setup>
import { computed } from 'vue';
import { classify } from '../../lib/util';
import { useContent } from '../../composables/useContent';
import { OFFLINE } from '../../lib/mode.js';

const props = defineProps({
  drill: { type: Object, required: true },
  correct: { type: Boolean, default: false },
  mine: { type: String, default: '' },
  actual: { type: String, default: '' },
  rawOutput: { type: String, default: '' },
});
const { pdfLink } = useContent();
const link = computed(() => pdfLink(props.drill));
</script>
<template>
  <div class="reveal-anim">
    <div class="compare">
      <div :class="correct ? 'ok' : 'bad'"><h4>Your answer</h4><pre>{{ mine || '(blank)' }}</pre></div>
      <div class="ok"><h4>{{ drill.kind === 'code' && !OFFLINE ? 'JVM says' : 'Correct' }}</h4><pre>{{ actual }}</pre></div>
    </div>
    <div v-if="!correct" class="anatomy-card">
      <b>Error category:</b> {{ classify(drill) }} — review the rule behind &ldquo;{{ (drill.trap || '').replace(/-/g, ' ') }}&rdquo;.
    </div>
    <details v-if="rawOutput">
      <summary class="muted">Raw JVM output</summary>
      <pre class="code">{{ rawOutput }}</pre>
    </details>
    <div class="explain">
      {{ drill.explanation }}
      <div class="ref-row">
        <span>{{ drill.ref }}</span>
        <a v-if="link" class="ref-link" :href="link.href" target="_blank" rel="noopener">Open PDF (p.{{ link.page }})</a>
      </div>
    </div>
  </div>
</template>
