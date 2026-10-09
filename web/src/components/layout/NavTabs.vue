<script setup>
defineProps({ view: String });
const emit = defineEmits(['set']);
const tabs = [['home', 'Home'], ['cheat', 'Cheat Sheet'], ['traps', 'Traps'], ['coverage', 'Coverage']];
</script>
<template>
  <nav class="tabs" role="tablist" aria-label="Sections">
    <button
      v-for="[id, label] in tabs" :key="id"
      class="tab" :class="{ active: view === id }"
      role="tab" :aria-selected="view === id"
      @click="emit('set', id)"
    >{{ label }}</button>
  </nav>
</template>
