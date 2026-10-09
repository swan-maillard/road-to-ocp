import { ref } from 'vue';
import { OFFLINE } from '../lib/mode.js';

const depth = ref(0);

export function useRun() {
  function start() { depth.value++; }
  function end() { depth.value = Math.max(0, depth.value - 1); }
  async function runJava(source) {
    if (OFFLINE) throw new Error('Running code needs the local server (not available in offline mode).');
    start();
    try {
      const r = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });
      return await r.json();
    } finally { end(); }
  }
  return { depth, start, end, runJava };
}
