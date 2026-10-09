<script setup>
const props = defineProps({ columns: { type: Array, default: () => [] }, rows: { type: Array, default: () => [] }, modelValue: { type: Array, default: () => [] }, actual: { type: Array, default: null } });
const emit = defineEmits(['update:modelValue']);
function set(r, c, val) { const m = props.modelValue.map((row) => row.slice()); m[r][c] = val; emit('update:modelValue', m); }
function cls(r, c) { if (!props.actual) return ''; return props.actual[r][c] === props.modelValue[r][c] ? 'correct' : 'wrong'; }
</script>
<template>
  <table class="trace-table">
    <thead>
      <tr><th>Step</th><th v-for="c in columns" :key="c">{{ c }}</th></tr>
    </thead>
    <tbody>
      <tr v-for="(row, r) in rows" :key="r">
        <td>{{ row.label }}</td>
        <td v-for="(_, c) in row.cells" :key="c" :class="cls(r, c)">
          <input :value="modelValue[r] ? modelValue[r][c] : ''" :disabled="!!actual" @input="set(r, c, $event.target.value)" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
