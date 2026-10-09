import { createApp } from 'vue';
import App from './App.vue';
import { loadStore } from './lib/store';
import { hydrateProgress, applyOfflineSeed } from './composables/useProgress';
import { hydrateAi } from './composables/useAi';
import { hydrateTheme } from './composables/useTheme';
import { OFFLINE } from './lib/mode.js';
import './styles/theme.css';

(async () => {
  await loadStore();
  if (OFFLINE) await applyOfflineSeed();
  hydrateProgress();
  hydrateAi();
  hydrateTheme();
  createApp(App).mount('#app');
})();
