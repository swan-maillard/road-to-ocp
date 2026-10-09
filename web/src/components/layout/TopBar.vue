<script setup>
import { computed } from 'vue';
import NavTabs from './NavTabs.vue';
import GoalRing from './GoalRing.vue';
import SettingsMenu from './SettingsMenu.vue';
import { useProgress } from '../../composables/useProgress';
import { useTheme } from '../../composables/useTheme';
import { OFFLINE } from '../../lib/mode.js';

defineProps({ view: String, minimal: Boolean });
const emit = defineEmits(['set', 'ai', 'data', 'help']);

const { state, todayAnswered } = useProgress();
const { theme, toggle } = useTheme();
const goal = computed(() => Math.max(1, state.settings.goal || 20));
</script>
<template>
  <header class="topbar" :class="{ slim: minimal }">
    <div class="brand">
      <div class="logo">25</div>
      <div><h1>Road to OCP</h1><div class="sub">{{ minimal ? 'Training' : 'Java 25 · 1Z0-831' }}</div></div>
    </div>
    <NavTabs v-if="!minimal" :view="view" @set="emit('set', $event)" />
    <div class="hud">
      <span v-if="OFFLINE" class="offline-badge" title="Frontend-only build — progress is saved on this device. Use Settings to export it."><i class="dot"></i>Offline</span>
      <GoalRing :count="todayAnswered()" :goal="goal" />
      <button class="icon-btn" title="Toggle theme" aria-label="Toggle theme" @click="toggle">
        <svg v-if="theme === 'light'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      </button>
      <SettingsMenu @ai="emit('ai')" @data="emit('data')" @help="emit('help')" />
    </div>
  </header>
</template>
