<script setup>
import { computed } from 'vue';
import { GRADES, BOX_NAMES } from '../../composables/useProgress';

const props = defineProps({
  suggested: { type: String, default: null },
  chosen: { type: String, default: null },
  graded: { type: Boolean, default: false },
  currentBox: { type: Number, default: 0 },
});
const emit = defineEmits(['grade']);

const maxBox = BOX_NAMES.length - 1;
const projected = (delta) => Math.max(0, Math.min(maxBox, props.currentBox + delta));
const current = computed(() => BOX_NAMES[props.currentBox]);
</script>

<template>
  <div class="self-grade">
    <div class="sg-label">Grade yourself <span class="muted">— now {{ current }}</span></div>
    <div class="grades">
      <button
        v-for="g in GRADES" :key="g.key"
        class="btn grade" :class="[g.tone, { sel: (graded ? chosen : suggested) === g.key }]"
        :title="'→ ' + BOX_NAMES[projected(g.delta)]"
        :disabled="graded" @click="emit('grade', g.key)"
      >
        {{ g.label }}
        <small v-if="!graded" class="to">{{ BOX_NAMES[projected(g.delta)] }}</small>
      </button>
    </div>
  </div>
</template>
