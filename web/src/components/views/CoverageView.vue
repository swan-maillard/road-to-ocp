<script setup>
import { computed } from 'vue';
import Stat from '../ui/Stat.vue';
import Badge from '../ui/Badge.vue';
import { useContent } from '../../composables/useContent';
import { useProgress, BOX_NAMES, MASTERED_BOX } from '../../composables/useProgress';

const { allItems, chapters, chapterTitle, sectionTitle } = useContent();
const { isLearned, isMastered, accuracy } = useProgress();

const a = computed(() => accuracy());
const learnedTotal = computed(() => allItems.value.filter((d) => isLearned(d.id)).length);
const masteredTotal = computed(() => allItems.value.filter((d) => isMastered(d.id)).length);

const count = (sd, fn) => sd.filter((d) => fn(d.id)).length;
const chapterData = computed(() => chapters.value.map((c) => {
  const ds = allItems.value.filter((d) => d.chapter === c);
  const sections = [...new Set(ds.map((d) => d.section))].sort().map((s) => {
    const sd = ds.filter((d) => d.section === s);
    return { s, title: sectionTitle(s), learned: count(sd, isLearned), mastered: count(sd, isMastered), total: sd.length };
  });
  return { c, title: chapterTitle(c), learned: count(ds, isLearned), mastered: count(ds, isMastered), total: ds.length, sections };
}));
</script>

<template>
  <div class="view">
    <div class="section-head">
      <h2>Coverage</h2>
      <p class="muted">A card is <b>learned</b> after its first correct answer and <b>mastered</b> once it reaches {{ BOX_NAMES[MASTERED_BOX] }} (box {{ MASTERED_BOX }}).</p>
    </div>

    <div class="cov-stats">
      <Stat :value="learnedTotal" label="learned (1+ correct)" />
      <Stat :value="masteredTotal" label="mastered (box 4-5)" />
      <Stat :value="a.correct" label="correct answers" />
      <Stat :value="a.acc + '%'" label="accuracy" />
    </div>

    <div class="legend">
      <span class="item"><span class="swatch" style="background:color-mix(in srgb, var(--accent) 45%, transparent)"></span> learned</span>
      <span class="item"><span class="swatch" style="background:var(--ok)"></span> mastered</span>
      <span class="item"><Badge kind="few">few drills</Badge> section has fewer than 8 drills</span>
    </div>

    <div class="box-scale">
      <span v-for="(n, i) in BOX_NAMES" :key="i" class="box-step" :class="{ mastered: i >= MASTERED_BOX }">
        <b>{{ i }}</b>{{ n }}
      </span>
    </div>

    <details v-for="ch in chapterData" :key="ch.c" class="block" open style="margin-top:12px">
      <summary>
        <span class="caret">&#9656;</span>
        <span class="grow">Chapter {{ ch.c }} — {{ ch.title || 'Overview' }}</span>
        <span class="n">{{ ch.mastered }}/{{ ch.total }} mastered · {{ ch.learned }}/{{ ch.total }} learned</span>
      </summary>
      <div class="block-body">
        <div class="cov-row">
          <span class="name" style="font-weight:600">All sections</span>
          <span class="dualbar">
            <i class="l" :style="{ width: (ch.learned / ch.total * 100) + '%' }"></i>
            <i class="m" :style="{ width: (ch.mastered / ch.total * 100) + '%' }"></i>
          </span>
          <span class="num">{{ ch.mastered }}/{{ ch.total }}</span>
        </div>
        <div v-for="s in ch.sections" :key="s.s" class="cov-row">
          <span class="name sec">{{ s.s }} {{ s.title }}<Badge v-if="s.total < 8" kind="few" title="This section has fewer than 8 drills." style="margin-left:6px">few</Badge></span>
          <span class="dualbar">
            <i class="l" :style="{ width: (s.learned / s.total * 100) + '%' }"></i>
            <i class="m" :style="{ width: (s.mastered / s.total * 100) + '%' }"></i>
          </span>
          <span class="num">{{ s.mastered }}/{{ s.total }}</span>
        </div>
      </div>
    </details>
  </div>
</template>
