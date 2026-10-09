<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import DrillHost from '../drill/DrillHost.vue';
import WriteDrill from '../drill/WriteDrill.vue';
import Badge from '../ui/Badge.vue';
import { usePractice } from '../../composables/usePractice';
import { useContent } from '../../composables/useContent';
import { useProgress } from '../../composables/useProgress';
import { OFFLINE } from '../../lib/mode.js';

const emit = defineEmits(['home']);
const { scope, newOnly, session, cursor, current, buildSession, shuffle, setScope, setNewOnly, newCardsSession, newLeft, reviewLeft, done } = usePractice();
const { chapters, allItems } = useContent();
const { state, todayAnswered, isNew } = useProgress();
const host = ref(null);

const goal = computed(() => Math.max(1, state.settings.goal || 20));
const newRemaining = computed(() => allItems.value.filter((d) => isNew(d.id)).length);
const scopeOptions = computed(() => {
  const opts = [{ v: 'due', label: 'Today (reviews + new)' }, { v: 'all', label: 'All chapters' }];
  for (const c of chapters.value) opts.push({ v: 'ch:' + c, label: 'Chapter ' + c + ' (' + allItems.value.filter((d) => d.chapter === c).length + ')' });
  return opts;
});
const pct = computed(() => (session.value.length ? Math.min(100, (cursor.value / session.value.length) * 100) : 0));

function onScope(e) { setScope(e.target.value); }
function onNewOnly(e) { setNewOnly(e.target.checked); }
function onKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (host.value && host.value.run) host.value.run(); }
}
onMounted(() => document.addEventListener('keydown', onKey));
onBeforeUnmount(() => document.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="view">
    <div class="session-head">
      <div class="session-top">
        <button v-if="!OFFLINE" class="btn ghost sm" @click="emit('home')">&larr; Home</button>
        <div class="session-stats">
          <Badge kind="new" title="New cards left in this session">New {{ newLeft }}</Badge>
          <Badge kind="review" title="Review cards left in this session">Review {{ reviewLeft }}</Badge>
          <Badge kind="done" title="Cards finished this session">Done {{ done }} / {{ session.length }}</Badge>
        </div>
        <div class="spacer"></div>
        <span class="pill">today {{ todayAnswered() }} / {{ goal }}</span>
      </div>
      <div class="progress-line"><i :style="{ width: pct + '%' }"></i></div>
      <div class="session-controls">
        <label class="field inline"><span>Focus</span>
          <select :value="scope" @change="onScope">
            <option v-for="o in scopeOptions" :key="o.v" :value="o.v">{{ o.label }}</option>
          </select>
        </label>
        <label class="toggle"><input type="checkbox" :checked="newOnly" @change="onNewOnly" /> New only</label>
        <div class="spacer"></div>
        <button class="btn ghost sm" @click="shuffle">Shuffle</button>
      </div>
    </div>

    <WriteDrill v-if="current && current.kind === 'write'" ref="host" :drill="current" />
    <DrillHost v-else-if="current" ref="host" :drill="current" />
    <div v-else class="card">
      <div class="empty">
        Session complete. Nice work.
        <div class="muted" style="margin-top:6px">Reviews are done for today — a new session brings only new cards.</div>
        <div class="row-actions" style="justify-content:center">
          <button v-if="newRemaining" class="btn primary" @click="newCardsSession()">Start {{ Math.min(goal, newRemaining) }} new cards</button>
          <button class="btn ghost" @click="buildSession">New session</button>
          <button v-if="!OFFLINE" class="btn ghost" @click="emit('home')">Home</button>
        </div>
      </div>
    </div>
  </div>
</template>
