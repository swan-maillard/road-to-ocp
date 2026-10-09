<script setup>
defineProps({ options: { type: Array, default: () => [] }, modelValue: { type: String, default: '' }, actual: { type: String, default: null } });
const emit = defineEmits(['update:modelValue']);
</script>
<template>
  <div class="options">
    <div
      v-for="o in options" :key="o.id" class="option"
      :class="{ sel: modelValue === o.id && !actual, correct: actual === o.id, wrong: actual && actual !== o.id && modelValue === o.id }"
      @click="!actual && emit('update:modelValue', o.id)"
    >
      <span class="key">{{ o.id }}.</span><span>{{ o.text }}</span>
    </div>
  </div>
</template>
