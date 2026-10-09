<script setup>
import Modal from '../ui/Modal.vue';
import { BOX_DAYS, BOX_NAMES, MASTERED_BOX } from '../../composables/useProgress';
import { OFFLINE } from '../../lib/mode.js';
const emit = defineEmits(['close']);
</script>

<template>
  <Modal title="How it works" @close="emit('close')">
    <ol class="help-list">
      <li>New cards come in <b>chapter order</b>; reviews come back on an <b>Anki-style</b> spaced schedule that grows the gap each time you grade well.</li>
      <li>A session is <b>all reviews due today + new cards up to your daily goal</b> (Settings). Starting a second session the same day shows <b>new cards only</b>.</li>
      <li>Read a short drill, then <b>predict</b> the outcome.</li>
      <li v-if="OFFLINE">Press <b>Ctrl+Enter</b> (or <b>Reveal answer</b>) to check your prediction against the verified result.</li>
      <li v-else>Press <b>Ctrl+Enter</b> to run it on the real JVM and see the truth.</li>
      <li><b>Grade yourself</b> — Not known&nbsp;(-2 boxes) / Hard&nbsp;(-1) / Getting there&nbsp;(0) / Good&nbsp;(+1) / Excellent&nbsp;(+2). The grade moves the card between boxes and sets the next review. Cards in box {{ MASTERED_BOX }}-5 are <b>mastered</b>.</li>
      <li v-if="!OFFLINE">Some drills are <b>writing tasks</b>: complete the method in the VS Code-style editor and run the hidden tests. The editor highlights Java and auto-closes brackets, but gives no autocomplete or typo hints.</li>
      <li v-if="!OFFLINE">Optionally do the <b>teach-back</b>: type an explanation and click <b>Next</b> to have the AI grade it, or click <b>Next</b> empty to skip.</li>
      <li v-else>Optionally write a <b>teach-back</b> in your own words; it is saved with the card.</li>
      <li>Misses feed <b>Traps</b> and the <b>Cheat Sheet</b>; mastered cards drop off both.</li>
      <li v-if="OFFLINE">This is the <b>offline (frontend-only)</b> build: progress lives on this device. Use <b>Settings &rarr; Export / import data</b> to move it to your server build and back.</li>
    </ol>
    <h4>Boxes</h4>
    <table class="kbd-table">
      <tbody>
        <tr v-for="(n, i) in BOX_NAMES" :key="i">
          <td><b>{{ i }}</b> {{ n }}<template v-if="i >= MASTERED_BOX"> &#10003; mastered</template></td>
          <td>{{ BOX_DAYS[i] === 0 ? 'review now' : 'next review in ' + BOX_DAYS[i] + ' day' + (BOX_DAYS[i] > 1 ? 's' : '') }}</td>
        </tr>
      </tbody>
    </table>
    <h4>Keyboard</h4>
    <table class="kbd-table">
      <tbody>
        <tr><td><b>Ctrl+Enter</b></td><td>Reveal &amp; run / run hidden tests</td></tr>
      </tbody>
    </table>
    <p v-if="OFFLINE" class="muted">Offline build: no AI and no JVM. Answers are checked against results verified on the JVM when the drills were authored.</p>
    <p v-else class="muted">AI is advisory and grounded in the PDF; the JVM is always the judge of code.</p>
    <div class="row-actions"><button class="btn primary" @click="emit('close')">Got it</button></div>
  </Modal>
</template>
