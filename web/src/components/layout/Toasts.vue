<script setup>
import { useToasts } from '../../composables/useToasts';
const { toasts, dismiss } = useToasts();
</script>
<template>
  <div class="toasts" aria-live="polite" aria-atomic="true">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">
      <span class="dot"></span><span>{{ t.message }}</span>
      <button class="close" aria-label="Dismiss" @click="dismiss(t.id)">&times;</button>
    </div>
  </div>
</template>
