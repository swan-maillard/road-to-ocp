<script setup>
import { OUTCOMES } from '../../lib/util';
const props = defineProps({ modelValue: { type: String, default: 'OUTPUT' }, actual: { type: String, default: null } });
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <div class="outcome-btns">
    <button
      v-for="(o, i) in OUTCOMES" :key="o.id" type="button"
      :class="{ sel: modelValue === o.id && !actual, correct: actual === o.id, wrong: actual && actual !== o.id && modelValue === o.id }"
      :disabled="!!actual"
      @click="emit('update:modelValue', o.id)"
    >
      {{ o.label }}<span class="num">{{ i + 1 }}</span>
    </button>
  </div>
</template>
