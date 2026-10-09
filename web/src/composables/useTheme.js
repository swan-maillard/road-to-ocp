import { ref, watch } from 'vue';

const KEY = 'ocplab.theme';
function systemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function storedTheme() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    let s = raw;
    try { s = JSON.parse(raw); } catch {}
    return s === 'light' || s === 'dark' ? s : null;
  } catch { return null; }
}
function apply(t) { document.documentElement.dataset.theme = t; }

const theme = ref(storedTheme() || systemTheme());

export function hydrateTheme() { apply(theme.value); }

// Remember the choice on this device (localStorage), independent of the
// progress store so it works identically in server and offline builds.
watch(theme, (t) => {
  apply(t);
  try { window.localStorage.setItem(KEY, t); } catch {}
}, { immediate: true });

export function useTheme() {
  const toggle = () => { theme.value = theme.value === 'light' ? 'dark' : 'light'; };
  return { theme, toggle };
}
