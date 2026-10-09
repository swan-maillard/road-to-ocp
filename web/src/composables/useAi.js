import { ref, computed } from 'vue';
import { useProgress } from './useProgress';
import { useRun } from './useRun';
import { fmtUsd } from '../lib/util';
import { getItem, setItem } from '../lib/store';
import { OFFLINE } from '../lib/mode.js';

const SKEY = 'ocplab.settings.v1';
const settings = ref({ model: 'deepseek-chat' });
export function hydrateAi() { settings.value = { model: 'deepseek-chat', ...(getItem(SKEY) || {}) }; }

const configured = ref(false);
const rates = ref(null);
const serverModel = ref('deepseek-chat');

export function useAi() {
  const { state } = useProgress();
  const { start, end } = useRun();

  function saveSettings() { setItem(SKEY, JSON.parse(JSON.stringify(settings.value))); }

  async function fetchStatus() {
    if (OFFLINE) { configured.value = false; rates.value = null; return { configured: false, model: 'deepseek-chat' }; }
    try {
      const s = await (await fetch('/api/ai/status')).json();
      configured.value = !!s.configured;
      rates.value = s.rates || null;
      serverModel.value = s.model || 'deepseek-chat';
      if (!settings.value.model) settings.value.model = s.model;
      return s;
    } catch { configured.value = false; return { configured: false, model: 'deepseek-chat' }; }
  }

  function recordUsage(usage, model) {
    if (!usage) return;
    const u = state.aiUsage;
    const prompt = usage.prompt_tokens || 0, completion = usage.completion_tokens || 0;
    const hit = usage.prompt_cache_hit_tokens || 0;
    const miss = usage.prompt_cache_miss_tokens != null ? usage.prompt_cache_miss_tokens : Math.max(0, prompt - hit);
    const r = (rates.value && (rates.value[model] || rates.value['deepseek-chat'])) || { input: 0.27, cacheInput: 0.07, output: 1.1 };
    u.calls++; u.promptTokens += prompt; u.completionTokens += completion;
    u.cost += (miss / 1e6) * r.input + (hit / 1e6) * (r.cacheInput != null ? r.cacheInput : r.input) + (completion / 1e6) * r.output;
  }

  const costLine = computed(() => 'Usage: ' + state.aiUsage.calls + ' call(s) · ' + (state.aiUsage.promptTokens + state.aiUsage.completionTokens) + ' tokens · ~' + fmtUsd(state.aiUsage.cost) + ' estimated');
  const hudCost = computed(() => state.aiUsage.calls ? 'AI ' + fmtUsd(state.aiUsage.cost) : '');

  async function aiCall(messages, opts = {}) {
    if (OFFLINE) throw new Error('AI features need the local server and are not available offline.');
    if (!configured.value) throw new Error('No DeepSeek API key configured. Add DEEPSEEK_API_KEY to .env and restart the server.');
    start();
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.value.model, messages, temperature: opts.temperature ?? 0.3, json: !!opts.json, maxTokens: opts.maxTokens || 700 }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error((data.error && data.error.message) || ('AI request failed (' + r.status + ')'));
      recordUsage(data.usage, settings.value.model);
      return data.choices && data.choices[0] ? data.choices[0].message.content : '';
    } finally { end(); }
  }

  return { settings, saveSettings, configured, rates, serverModel, fetchStatus, aiCall, costLine, hudCost };
}
