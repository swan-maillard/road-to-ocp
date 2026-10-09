<script setup>
import { computed } from 'vue';
const props = defineProps({ value: { type: Number, default: 0 }, max: { type: Number, default: 100 } });
const pct = computed(() => Math.max(0, Math.min(100, props.max ? (props.value / props.max) * 100 : 0)));
</script>
<template>
  <div class="bar"><i :style="{ width: pct + '%' }"></i></div>
</template>
