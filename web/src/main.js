import { createApp } from 'vue';
import App from './App.vue';
import { loadStore } from './lib/store';
import { hydrateProgress, applyOfflineSeed } from './composables/useProgress';
import { hydrateAi } from './composables/useAi';
import { hydrateTheme } from './composables/useTheme';
import { OFFLINE } from './lib/mode.js';
import './styles/theme.css';

function dismissSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  el.classList.add('hide');
  setTimeout(() => el.remove(), 400);
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {});
  } catch {}
}

(async () => {
  await loadStore();
  if (OFFLINE) await applyOfflineSeed();
  hydrateProgress();
  hydrateAi();
  hydrateTheme();
  createApp(App).mount('#app');
  dismissSplash();
  if (OFFLINE) registerServiceWorker();
})();
