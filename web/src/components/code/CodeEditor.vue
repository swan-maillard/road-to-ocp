<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { createEditable, getDoc, setDoc, setTheme, destroy } from '../../lib/cm';
import { useTheme } from '../../composables/useTheme';
import { useToasts } from '../../composables/useToasts';

const props = defineProps({
  code: { type: String, default: '' },
  label: { type: String, default: 'Editor' },
  live: { type: Boolean, default: false }, // reflect external `code` changes into the editor
});
const emit = defineEmits(['change', 'run']);
const host = ref(null);
let view = null;
const { theme } = useTheme();
const { push } = useToasts();

onMounted(() => {
  if (!host.value) return;
  view = createEditable({
    parent: host.value,
    doc: props.code,
    theme: theme.value,
    onRun: () => emit('run'),
    onChange: (text) => emit('change', text),
  });
});
watch(() => props.code, (c) => { if (view && props.live) setDoc(view, c); });
watch(theme, (t) => { if (view) setTheme(view, t); });
onBeforeUnmount(() => { if (view) destroy(view); });

function copy() { const text = view ? getDoc(view) : props.code; navigator.clipboard.writeText(text).then(() => push('Copied to clipboard', 'ok'), () => push('Copy failed', 'bad')); }
defineExpose({ get: () => (view ? getDoc(view) : props.code), set: (t) => { if (view) setDoc(view, t); } });
</script>
<template>
  <div class="code-shell">
    <div class="code-head">
      <span class="dot"></span><span class="lang">{{ label }}</span>
      <button class="copy-btn" type="button" @click="copy">Copy</button>
    </div>
    <div ref="host" class="cm-host cm-editor-host"></div>
  </div>
</template>
