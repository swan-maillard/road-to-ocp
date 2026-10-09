<script setup>
defineProps({ list: { type: Array, default: () => [] }, shown: { type: Number, default: 0 } });
</script>
<template>
  <div v-if="shown > 0" class="hints">
    <div class="hint-list">
      <div v-for="(h, i) in list.slice(0, shown)" :key="i" class="hint" v-html="h"></div>
    </div>
  </div>
</template>
