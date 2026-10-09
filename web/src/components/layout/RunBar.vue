<script setup>
import { useRun } from '../../composables/useRun';
const { depth } = useRun();
</script>
<template>
  <div class="runbar" :class="{ on: depth > 0 }" aria-hidden="true"></div>
</template>
