import { ref } from 'vue';

const toasts = ref([]);
let seq = 0;

export function useToasts() {
  function push(message, kind = '') {
    const id = ++seq;
    toasts.value.push({ id, message, kind });
    setTimeout(() => dismiss(id), 3600);
  }
  function dismiss(id) { toasts.value = toasts.value.filter((t) => t.id !== id); }
  return { toasts, push, dismiss };
}
