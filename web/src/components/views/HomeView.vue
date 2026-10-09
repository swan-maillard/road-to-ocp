<script setup>
import { computed } from 'vue';
import Stat from '../ui/Stat.vue';
import Bar from '../ui/Bar.vue';
import { useContent } from '../../composables/useContent';
import { useProgress, BOX_NAMES, MASTERED_BOX } from '../../composables/useProgress';
import { OFFLINE } from '../../lib/mode.js';

const emit = defineEmits(['practice', 'cheat', 'coverage', 'traps']);

const DAY = 86400000;
const { allItems } = useContent();
const { state, isDue, isNew, isLearned, isMastered, accuracy, trapStats, todayAnswered } = useProgress();

const total = computed(() => allItems.value.length);
const mastered = computed(() => allItems.value.filter((d) => isMastered(d.id)).length);
const learned = computed(() => allItems.value.filter((d) => isLearned(d.id)).length);
const readiness = computed(() => (total.value ? Math.round((learned.value / total.value) * 50 + (mastered.value / total.value) * 50) : 0));
const a = computed(() => accuracy());
const goal = computed(() => Math.max(1, state.settings.goal || 20));
const today = computed(() => todayAnswered());
const due = computed(() => allItems.value.filter((d) => isDue(d.id)).length);
const newAvailable = computed(() => allItems.value.filter((d) => isNew(d.id)).length);
const newToday = computed(() => Math.min(goal.value, newAvailable.value));

const topTraps = computed(() => Object.entries(trapStats(allItems.value)).sort((x, y) => y[1].misses - x[1].misses).slice(0, 6));
const maxTrap = computed(() => (topTraps.value.length ? topTraps.value[0][1].misses : 1));

const boxes = computed(() => {
  const c = new Array(BOX_NAMES.length).fill(0);
  for (const id in state.items) c[Math.min(state.items[id].box, BOX_NAMES.length - 1)]++;
  return c;
});
const wrong = computed(() => {
  const d = 14, start = Date.now() - d * DAY, b = new Array(d).fill(0), now = Date.now();
  for (const h of state.history) if (!h.ok && h.t >= start) b[d - 1 - Math.min(d - 1, Math.floor((now - h.t) / DAY))]++;
  return b;
});
const maxW = computed(() => Math.max(1, ...wrong.value));
</script>

<template>
  <div class="view">
    <section class="home-hero">
      <h2>{{ due > 0 ? 'Welcome back' : 'Start your Road to OCP' }}</h2>
      <p>Short single-rule drills: predict → run on the real JVM → grade. Each session is the reviews due today plus new cards up to your daily goal.</p>
      <div class="home-actions">
        <button class="btn primary" @click="emit('practice')">
          {{ due > 0 ? `Continue · ${due} review + ${newToday} new` : `Start · ${newToday} new` }}
        </button>
        <button class="btn ghost" @click="emit('cheat')">Cheat sheet</button>
        <button class="btn ghost" @click="emit('traps')">Traps</button>
      </div>
    </section>

    <div v-if="OFFLINE" class="home-note">
      <span><b>Offline mode.</b> Every predict / concept / fill / order / trace / find-the-bug drill is fully playable here and saved on this device. To move your progress to your local server build (and back), use <b>Settings &rarr; Export / import data</b>.</span>
    </div>

    <div class="home-grid">
      <Stat :value="readiness + '%'" label="readiness" />
      <Stat :value="mastered + ' / ' + total" label="mastered" />
      <Stat :value="due" label="due now" />
      <Stat :value="newToday" label="new today" />
      <Stat :value="state.streak" label="streak" />
      <Stat :value="a.acc + '%'" label="accuracy" />
    </div>

    <div class="home-cols">
      <div class="home-panel">
        <h3>Today <span class="muted">{{ today }} / {{ goal }}</span></h3>
        <Bar :value="today" :max="goal" />
        <div class="home-list" style="margin-top:12px">
          <div class="row"><span class="grow">Reviews due</span><b>{{ due }}</b></div>
          <div class="row"><span class="grow">New to introduce</span><b>{{ newToday }}</b></div>
          <div class="row"><span class="grow">New cards remaining</span><b>{{ newAvailable }}</b></div>
          <div class="row"><span class="grow">Answered today</span><b>{{ today }}</b></div>
        </div>
      </div>

      <div class="home-panel">
        <h3>Weakest areas <button class="btn ghost sm" @click="emit('traps')">All traps</button></h3>
        <div v-if="!topTraps.length" class="muted">No mistakes recorded yet — start practising.</div>
        <div v-for="[tag, s] in topTraps" :key="tag" class="trap-row">
          <span class="name">{{ tag.replace(/-/g, ' ') }}</span>
          <span class="meter"><i :style="{ width: Math.round((s.misses / maxTrap) * 100) + '%' }"></i></span>
          <span class="n">{{ s.misses }}</span>
        </div>
      </div>
    </div>

    <section class="home-progress">
      <div class="home-progress-head">
        <h3>Progress</h3>
        <button class="btn ghost sm" @click="emit('coverage')">Coverage</button>
      </div>
      <div class="muted">Cards per box — <b>Mastered</b> and <b>Expert</b> count as mastery</div>
      <div class="days-grid">
        <div v-for="(n, i) in boxes" :key="i" class="day-card" :class="{ mastered: i >= MASTERED_BOX }">
          <div class="d">{{ BOX_NAMES[i] }}<template v-if="i >= MASTERED_BOX"> · mastered</template></div>
          <div class="n">{{ n }}</div>
        </div>
      </div>
      <div class="muted" style="margin-top:14px">Mistakes per day (last 14 days)</div>
      <div class="spark"><i v-for="(n, i) in wrong" :key="i" :style="{ height: Math.max(4, Math.round((n / maxW) * 100)) + '%' }" :title="n"></i></div>
    </section>
  </div>
</template>
