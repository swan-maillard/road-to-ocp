import { createApp } from 'vue';
import App from './App.vue';
import { loadStore } from './lib/store';
import { hydrateProgress } from './composables/useProgress';
import { hydrateAi } from './composables/useAi';
import { hydrateTheme } from './composables/useTheme';
import './styles/theme.css';

(async () => {
  await loadStore();
  hydrateProgress();
  hydrateAi();
  hydrateTheme();
  createApp(App).mount('#app');
})();
