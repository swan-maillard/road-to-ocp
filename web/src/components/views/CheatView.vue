<script setup>
import { ref, computed, nextTick } from 'vue';
import Badge from '../ui/Badge.vue';
import { useContent } from '../../composables/useContent';
import { useProgress } from '../../composables/useProgress';
import { useToasts } from '../../composables/useToasts';

const { allItems, chapters, chapterTitle, sectionTitle } = useContent();
const { state, isMastered } = useProgress();
const { push } = useToasts();
const onlyMissed = ref(true);

const firstSentence = (s) => (s ? s.split(/(?<=\.)\s/)[0] : '');
const stripSection = (txt, s) => { const p = String(s) + ' '; return txt.startsWith(p) ? txt.slice(p.length) : txt; };

const data = computed(() => chapters.value.map((c) => {
  const ds = allItems.value.filter((d) => d.chapter === c);
  const sections = [...new Set(ds.map((d) => d.section))].sort().map((s) => {
    const sd = ds.filter((d) => d.section === s);
    const map = new Map();
    for (const d of sd) {
      const key = d.ref || d.id;
      if (!map.has(key)) map.set(key, { text: stripSection(d.ref || sectionTitle(s) || ('Section ' + s), s), rule: firstSentence(d.explanation), missed: false });
      if (state.items[d.id] && state.items[d.id].wrong > 0 && !isMastered(d.id)) map.get(key).missed = true;
    }
    return { s, title: sectionTitle(s), rules: [...map.values()] };
  }).filter((s) => (onlyMissed.value ? s.rules.some((r) => r.missed) : true));
  const rules = sections.reduce((n, s) => n + (onlyMissed.value ? s.rules.filter((r) => r.missed).length : s.rules.length), 0);
  const missed = sections.reduce((n, s) => n + s.rules.filter((r) => r.missed).length, 0);
  return { c, title: chapterTitle(c), sections, rules, missed };
}).filter((ch) => ch.sections.length));

const missedCount = computed(() => data.value.reduce((n, ch) => n + ch.missed, 0));
const shownCount = computed(() => data.value.reduce((n, ch) => n + ch.sections.reduce((m, s) => m + rulesShown(s).length, 0), 0));

function rulesShown(s) { return onlyMissed.value ? s.rules.filter((r) => r.missed) : s.rules; }
function printPage() { window.print(); }
function jump(c) { const el = document.getElementById('ch-' + c); if (el) { el.open = true; nextTick(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' })); } }
function copy() {
  const txt = data.value.map((ch) => '# Chapter ' + ch.c + ' — ' + ch.title + '\n' + ch.sections.map((s) => '## ' + s.s + ' ' + s.title + '\n' + rulesShown(s).map((r) => '- ' + r.text + (r.rule ? ' — ' + r.rule : '')).join('\n')).join('\n')).join('\n\n');
  navigator.clipboard.writeText(txt).then(() => push('Copied.', 'ok'), () => push('Copy failed', 'bad'));
}
</script>

<template>
  <div class="view">
    <div class="section-head">
      <h2>Cheat Sheet</h2>
      <p class="muted">The rule behind each miss, grouped by chapter and topic. Rules you have <b>mastered</b> (box 4-5) are removed.</p>
      <div class="row-actions">
        <label class="toggle"><input type="checkbox" v-model="onlyMissed" /> Only missed</label>
        <span class="spacer"></span>
        <button class="btn ghost sm" @click="copy">Copy</button>
        <button class="btn ghost sm" @click="printPage">Print</button>
      </div>
    </div>

    <div v-if="data.length" class="cheat-summary">
      <span class="pill">{{ shownCount }} rule{{ shownCount === 1 ? '' : 's' }} shown</span>
      <span class="pill bad">{{ missedCount }} missed</span>
      <span class="pill">{{ data.length }} chapter{{ data.length === 1 ? '' : 's' }}</span>
    </div>

    <div v-if="data.length" class="legend">
      <span class="item"><span class="swatch" style="background:var(--bad); border-color:var(--bad)"></span> missed — review first</span>
      <span class="item"><span class="swatch" style="background:var(--surface)"></span> rule you have seen and not yet mastered</span>
    </div>

    <div v-if="!data.length" class="empty">
      Nothing missed yet. Get some drills wrong and their rules appear here — or uncheck &ldquo;Only missed&rdquo; to browse every rule. Mastered rules are filtered out.
    </div>

    <div v-if="data.length > 1" class="row-actions" style="margin:12px 0 4px">
      <button v-for="ch in data" :key="ch.c" class="btn ghost xs" @click="jump(ch.c)">Ch {{ ch.c }}</button>
    </div>

    <details v-for="ch in data" :key="ch.c" :id="'ch-' + ch.c" class="block" open>
      <summary>
        <span class="caret">&#9656;</span>
        <span class="grow">Chapter {{ ch.c }} — {{ ch.title || 'Overview' }}</span>
        <span class="n">{{ ch.rules }} rule(s)</span>
        <Badge v-if="ch.missed" kind="missed">{{ ch.missed }} missed</Badge>
      </summary>
      <div class="block-body">
        <template v-for="s in ch.sections" :key="s.s">
          <div v-if="rulesShown(s).length" class="sec-head">
            <div class="sec-title">{{ s.s }} {{ s.title }}</div>
            <span class="sec-count">{{ rulesShown(s).length }} rule{{ rulesShown(s).length === 1 ? '' : 's' }}</span>
          </div>
          <div v-for="(r, i) in rulesShown(s)" :key="i" class="rule-row" :class="{ missed: r.missed }">
            <span class="txt">{{ r.text }}<template v-if="r.rule"> — {{ r.rule }}</template></span>
          </div>
        </template>
      </div>
    </details>
  </div>
</template>
