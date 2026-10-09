<script setup>
import { ref, onMounted } from 'vue';
import Modal from '../ui/Modal.vue';
import { useAi } from '../../composables/useAi';

const emit = defineEmits(['close']);
const { settings, saveSettings, fetchStatus, aiCall, costLine } = useAi();
const status = ref('Checking…');
const msg = ref('');

onMounted(async () => {
  const s = await fetchStatus();
  status.value = s.configured ? ('Key loaded from .env. Server model: ' + s.model + '.') : 'No key found. Add DEEPSEEK_API_KEY to .env and restart the server.';
});
function save() { saveSettings(); msg.value = 'Saved.'; }
async function test() {
  msg.value = 'Testing…';
  try { const o = await aiCall([{ role: 'user', content: 'Reply with the single word OK.' }], { temperature: 0, maxTokens: 10 }); msg.value = 'Connected: ' + o.trim(); }
  catch (e) { msg.value = 'Failed: ' + e.message; }
}
</script>

<template>
  <Modal title="DeepSeek AI" @close="emit('close')">
    <p class="muted">Grounds explanations in the PDF and never decides code outcomes (the JVM does). The key is read from <code>.env</code>.</p>
    <p class="muted">{{ status }}</p>
    <p class="muted">{{ costLine }}</p>
    <label class="field" style="margin-top:10px"><span class="muted" style="font-size:12.5px">Model</span>
      <select v-model="settings.model" style="width:100%">
        <option value="deepseek-chat">deepseek-chat (fast)</option>
        <option value="deepseek-reasoner">deepseek-reasoner (stronger)</option>
      </select>
    </label>
    <div class="row-actions">
      <button class="btn primary" @click="save">Save</button>
      <button class="btn ghost" @click="test">Test connection</button>
      <button class="btn ghost" @click="emit('close')">Close</button>
    </div>
    <p class="muted">{{ msg }}</p>
  </Modal>
</template>
