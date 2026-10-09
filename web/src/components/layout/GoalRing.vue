<script setup>
import { computed } from 'vue';
const props = defineProps({ count: { type: Number, default: 0 }, goal: { type: Number, default: 20 } });
const pct = computed(() => Math.min(100, Math.round((props.count / Math.max(1, props.goal)) * 100)));
</script>
<template>
  <div class="goal" :style="{ '--p': pct }" :title="count + ' / ' + goal + ' today'"><span>{{ count }}</span></div>
</template>
