<script setup>
defineProps({ title: String });
const emit = defineEmits(['close']);
</script>
<template>
  <div class="modal" @click.self="emit('close')">
    <div class="modal-box" role="dialog" aria-modal="true">
      <h3 v-if="title">{{ title }}</h3>
      <slot />
    </div>
  </div>
</template>
