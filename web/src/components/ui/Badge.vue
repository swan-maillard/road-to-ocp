<script setup>
defineProps({ kind: { type: String, default: '' }, title: { type: String, default: '' } });
</script>
<template>
  <span class="badge" :class="kind" :title="title"><slot /></span>
</template>
