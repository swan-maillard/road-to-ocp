<script setup>
import { computed } from 'vue';
import Badge from '../ui/Badge.vue';
import { useContent } from '../../composables/useContent';
import { useProgress } from '../../composables/useProgress';
import { usePractice } from '../../composables/usePractice';

const emit = defineEmits(['practice']);
const { allItems, chapterTitle, sectionTitle } = useContent();
const { state, trapStats, isMastered } = useProgress();
const { trainTrap } = usePractice();

const traps = computed(() => {
  const map = new Map(allItems.value.map((d) => [d.id, d]));
  const stats = trapStats(allItems.value);
  return Object.entries(stats).map(([tag, s]) => {
    const secs = new Set();
    for (const id in state.items) {
      const r = state.items[id];
      if (!r || r.wrong <= 0 || isMastered(id)) continue;
      const d = map.get(id);
      if (d && d.trap === tag) secs.add(d.section);
    }
    return { tag, misses: s.misses, chapter: Math.min(...[...s.chapters]), sections: [...secs].sort() };
  });
});

const byChapter = computed(() => {
  const g = new Map();
  for (const t of traps.value) { if (!g.has(t.chapter)) g.set(t.chapter, []); g.get(t.chapter).push(t); }
  for (const arr of g.values()) arr.sort((a, b) => b.misses - a.misses);
  return [...g.entries()].sort((a, b) => a[0] - b[0]);
});
const maxMiss = computed(() => Math.max(1, ...traps.value.map((t) => t.misses)));
const tax = computed(() => Object.entries(state.taxonomy || {}).sort((a, b) => b[1] - a[1]));
const maxTax = computed(() => (tax.value.length ? tax.value[0][1] : 1));

function train(tag) { trainTrap(tag); emit('practice'); }
</script>

<template>
  <div class="view">
    <div class="section-head">
      <h2>Traps I Keep Falling For</h2>
      <p class="muted">Your recurring mistakes, grouped by chapter. Train a trap to drill only its cards. Cards that reach box 4 (<b>mastered</b>) drop off automatically.</p>
    </div>

    <div v-if="!traps.length" class="empty">No traps yet — every wrong answer shows up here.</div>

    <details v-for="[c, list] in byChapter" :key="c" class="block" open>
      <summary>
        <span class="caret">&#9656;</span>
        <span class="grow">Chapter {{ c }} — {{ chapterTitle(c) || 'Overview' }}</span>
        <Badge kind="missed">{{ list.length }} trap(s)</Badge>
      </summary>
      <div class="block-body">
        <div v-for="t in list" :key="t.tag" class="trap-row">
          <span class="name">{{ t.tag.replace(/-/g, ' ') }}</span>
          <span class="meter"><i :style="{ width: Math.round((t.misses / maxMiss) * 100) + '%' }"></i></span>
          <span class="n">{{ t.misses }}</span>
          <button class="btn ghost xs" @click="train(t.tag)">Train</button>
          <div v-if="t.sections.length" class="muted" style="flex-basis:100%; font-size:var(--t-xs); margin:-2px 0 4px 0">
            {{ t.sections.map((s) => (sectionTitle(s) || s)).join(' · ') }}
          </div>
        </div>
      </div>
    </details>

    <details v-if="tax.length" class="block">
      <summary><span class="caret">&#9656;</span><span class="grow">Error categories</span><span class="n">{{ tax.length }}</span></summary>
      <div class="block-body">
        <div v-for="[cat, n] in tax" :key="cat" class="trap-row">
          <span class="name">{{ cat }}</span>
          <span class="meter"><i :style="{ width: Math.round((n / maxTax) * 100) + '%' }"></i></span>
          <span class="n">{{ n }}</span>
        </div>
      </div>
    </details>
  </div>
</template>
