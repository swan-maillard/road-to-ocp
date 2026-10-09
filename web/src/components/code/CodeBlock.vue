<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { createReadOnly, setDoc, setTheme, destroy } from '../../lib/cm';
import { useTheme } from '../../composables/useTheme';
import { useToasts } from '../../composables/useToasts';
import { formatJava } from '../../lib/format';

const props = defineProps({ code: { type: String, default: '' }, lang: { type: String, default: 'Java' } });
const host = ref(null);
let view = null;
const { theme } = useTheme();
const { push } = useToasts();
const formatted = computed(() => formatJava(props.code));

onMounted(() => { if (host.value) view = createReadOnly({ parent: host.value, doc: formatted.value, theme: theme.value }); });
watch(formatted, (c) => { if (view) setDoc(view, c); });
watch(theme, (t) => { if (view) setTheme(view, t); });
onBeforeUnmount(() => { if (view) destroy(view); });

function copy() { navigator.clipboard.writeText(formatted.value).then(() => push('Copied to clipboard', 'ok'), () => push('Copy failed', 'bad')); }
</script>
<template>
  <div class="code-shell">
    <div class="code-head">
      <span class="dot"></span><span class="lang">{{ lang }}</span>
      <button class="copy-btn" type="button" @click="copy">Copy</button>
    </div>
    <div ref="host" class="cm-host"></div>
  </div>
</template>
