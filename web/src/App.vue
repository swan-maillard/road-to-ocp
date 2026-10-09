<script setup>
import { ref, computed, onMounted } from 'vue';
import TopBar from './components/layout/TopBar.vue';
import RunBar from './components/layout/RunBar.vue';
import Toasts from './components/layout/Toasts.vue';
import PracticeView from './components/views/PracticeView.vue';
import HomeView from './components/views/HomeView.vue';
import CheatView from './components/views/CheatView.vue';
import TrapsView from './components/views/TrapsView.vue';
import CoverageView from './components/views/CoverageView.vue';
import AiModal from './components/modals/AiModal.vue';
import DataModal from './components/modals/DataModal.vue';
import HelpModal from './components/modals/HelpModal.vue';
import { useContent } from './composables/useContent';
import { usePractice } from './composables/usePractice';
import { useAi } from './composables/useAi';

const view = ref('home');
const showAi = ref(false);
const showData = ref(false);
const showHelp = ref(false);

const { load } = useContent();
const { buildSession } = usePractice();
const { fetchStatus } = useAi();
const wide = computed(() => ['home', 'cheat', 'traps', 'coverage'].includes(view.value));

onMounted(async () => {
  await Promise.all([load(), fetchStatus()]);
  buildSession();
});
</script>

<template>
  <TopBar :view="view" @set="view = $event" @ai="showAi = true" @data="showData = true" @help="showHelp = true" />
  <RunBar />
  <main :class="{ wide }">
    <HomeView v-if="view === 'home'" @practice="view = 'practice'" @cheat="view = 'cheat'" @coverage="view = 'coverage'" @traps="view = 'traps'" />
    <PracticeView v-else-if="view === 'practice'" @home="view = 'home'" />
    <CheatView v-else-if="view === 'cheat'" />
    <TrapsView v-else-if="view === 'traps'" @practice="view = 'practice'" />
    <CoverageView v-else-if="view === 'coverage'" />
  </main>
  <Toasts />
  <AiModal v-if="showAi" @close="showAi = false" />
  <DataModal v-if="showData" @close="showData = false" />
  <HelpModal v-if="showHelp" @close="showHelp = false" />
</template>
