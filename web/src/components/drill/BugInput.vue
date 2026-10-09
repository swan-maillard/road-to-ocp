<script setup>
import { computed } from 'vue';
const props = defineProps({ code: { type: String, default: '' }, modelValue: { type: Number, default: null }, actual: { type: Number, default: null } });
const emit = defineEmits(['update:modelValue']);
const lines = computed(() => (props.code || '').split('\n'));
function cls(n) { if (props.actual == null) return { sel: props.modelValue === n }; if (n === props.actual) return 'correct'; if (n === props.modelValue) return 'wrong'; return ''; }
</script>
<template>
  <div class="bug-code">
    <div v-for="(ln, i) in lines" :key="i" class="bug-line" :class="cls(i + 1)" @click="actual == null && emit('update:modelValue', i + 1)">
      <span class="ln">{{ i + 1 }}</span><span>{{ ln }}</span>
    </div>
  </div>
</template>
