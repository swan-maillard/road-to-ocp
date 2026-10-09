<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useProgress } from '../../composables/useProgress';
import { OFFLINE } from '../../lib/mode.js';

const emit = defineEmits(['ai', 'data', 'help']);
const { state, save } = useProgress();
const open = ref(false);
const root = ref(null);

function setGoal(e) { state.settings.goal = Math.max(1, Math.min(200, Number(e.target.value) || 1)); save(); }
function onDoc(e) { if (open.value && root.value && !root.value.contains(e.target)) open.value = false; }
function onKey(e) { if (e.key === 'Escape') open.value = false; }
onMounted(() => { document.addEventListener('click', onDoc); document.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); });
function fire(a) { open.value = false; emit(a); }
</script>
<template>
  <div ref="root" class="menu-wrap">
    <button class="icon-btn" title="Settings" aria-label="Settings" @click="open = !open">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    </button>
    <div v-if="open" class="menu">
      <div class="menu-head">Settings</div>
      <label class="menu-field"><span>Daily goal</span><input type="number" min="1" max="200" :value="state.settings.goal" @change="setGoal" /></label>
      <button v-if="!OFFLINE" @click="fire('ai')">AI settings</button>
      <button @click="fire('data')">Export / import data</button>
      <button @click="fire('help')">Help</button>
    </div>
  </div>
</template>
