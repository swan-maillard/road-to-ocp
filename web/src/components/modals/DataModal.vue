<script setup>
import { ref } from 'vue';
import Modal from '../ui/Modal.vue';
import { useProgress } from '../../composables/useProgress';
import { useToasts } from '../../composables/useToasts';
import { exportEntries, importEntries } from '../../lib/store';
import { OFFLINE } from '../../lib/mode.js';

const emit = defineEmits(['close']);
const { reset } = useProgress();
const { push } = useToasts();
const fileInput = ref(null);
const busy = ref(false);

function doExport() {
  const payload = {
    app: 'Road to OCP',
    schema: 'ocplab.export.v1',
    exportedAt: new Date().toISOString(),
    mode: OFFLINE ? 'offline' : 'server',
    entries: exportEntries(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'road-to-ocp-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  push('Progress exported.', 'ok');
}

function pick() { if (fileInput.value) fileInput.value.click(); }

async function onFile(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  busy.value = true;
  try {
    const data = JSON.parse(await file.text());
    const entries = data && data.entries ? data.entries : data;
    if (!entries || typeof entries !== 'object' || !entries['ocplab.progress.v1']) {
      push('That file is not a Road to OCP export.', 'bad');
      return;
    }
    if (!confirm('Import this file? It replaces the progress currently on this device.')) return;
    await importEntries(entries);
    push('Imported — reloading…', 'ok');
    setTimeout(() => location.reload(), 500);
  } catch (err) {
    push('Import failed: ' + (err.message || err), 'bad');
  } finally {
    busy.value = false;
  }
}

function doReset() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    reset();
    push('Progress reset.', 'ok');
    emit('close');
  }
}
</script>

<template>
  <Modal title="Export / import data" @close="emit('close')">
    <p class="muted">
      Your progress is a portable JSON file. Export here and import it
      <template v-if="OFFLINE">on your local server build</template><template v-else>on the offline (phone) build</template>
      to keep both in sync — and vice-versa.
    </p>

    <div class="data-row">
      <div class="data-text">
        <b>Export</b>
        <span class="muted">Download a snapshot of all your cards, streaks and settings.</span>
      </div>
      <button class="btn primary" @click="doExport">Download JSON</button>
    </div>

    <div class="data-row">
      <div class="data-text">
        <b>Import</b>
        <span class="muted">Load a snapshot exported from the other build. Replaces this device's progress.</span>
      </div>
      <button class="btn" :disabled="busy" @click="pick">Choose file…</button>
      <input ref="fileInput" type="file" accept="application/json,.json" hidden @change="onFile" />
    </div>

    <div class="data-row danger">
      <div class="data-text">
        <b>Reset</b>
        <span class="muted">Erase everything and start over.</span>
      </div>
      <button class="btn danger" @click="doReset">Reset progress</button>
    </div>

    <div class="row-actions">
      <button class="btn ghost" @click="emit('close')">Close</button>
    </div>
  </Modal>
</template>
