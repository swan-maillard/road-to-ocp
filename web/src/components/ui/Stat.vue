<script setup>
defineProps({ value: [String, Number], label: String });
</script>
<template>
  <div class="stat">
    <b>{{ value }}</b>
    <span>{{ label }}</span>
  </div>
</template>
