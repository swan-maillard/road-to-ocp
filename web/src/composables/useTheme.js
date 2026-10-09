import { ref, watch } from 'vue';
import { getItem, setItem } from '../lib/store';

const KEY = 'ocplab.theme';
function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

const theme = ref(systemTheme());
export function hydrateTheme() { const s = getItem(KEY); if (s) theme.value = s; }

watch(theme, (t) => {
  document.documentElement.dataset.theme = t;
  setItem(KEY, t);
}, { immediate: true });

export function useTheme() {
  const toggle = () => { theme.value = theme.value === 'light' ? 'dark' : 'light'; };
  return { theme, toggle };
}
