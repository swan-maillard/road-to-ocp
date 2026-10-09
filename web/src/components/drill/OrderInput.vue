<script setup>
import { computed } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, modelValue: { type: Array, default: () => [] }, actual: { type: Array, default: null } });
const emit = defineEmits(['update:modelValue']);
const pool = computed(() => props.items.filter((i) => !props.modelValue.includes(i)));
const place = (item) => { if (!props.actual) emit('update:modelValue', [...props.modelValue, item]); };
const removeAt = (i) => { if (props.actual) return; const next = props.modelValue.slice(); next.splice(i, 1); emit('update:modelValue', next); };
const cls = (item, i) => (!props.actual ? { placed: true } : (props.actual[i] === item ? 'correct' : 'wrong'));
const reset = () => emit('update:modelValue', []);
</script>
<template>
  <div class="order-picked">
    <span v-for="(item, i) in modelValue" :key="i" class="order-item" :class="cls(item, i)" @click="removeAt(i)">{{ item }}</span>
    <span v-if="!modelValue.length" class="muted">Click items below to build your order…</span>
  </div>
  <div class="order-pool">
    <span v-for="item in pool" :key="item" class="order-item" @click="place(item)">{{ item }}</span>
  </div>
  <button v-if="!actual" class="btn ghost small" type="button" @click="reset">Reset order</button>
</template>
