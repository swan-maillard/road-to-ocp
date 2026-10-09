import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runJava } from './runner/javaRunner.js';
import { createStore } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in process.env)) process.env[m[1]] = v;
    }
  } catch {}
}
loadEnv(path.join(__dirname, '.env'));

const PUBLIC = path.join(__dirname, 'public');
const CONTENT = path.join(__dirname, 'content');
const store = createStore(path.join(__dirname, 'data', 'ocplab.db'));
const PORT = Number(process.env.PORT || 4321);
const AI_KEY = () => process.env.DEEPSEEK_API_KEY || '';
const AI_MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Prices in USD per 1,000,000 tokens. Override any of these via .env.
const AI_RATES = {
  'deepseek-chat': { input: 0.27, cacheInput: 0.07, output: 1.10 },
  'deepseek-reasoner': { input: 0.55, cacheInput: 0.14, output: 2.19 },
};
function aiRates() {
  const inP = Number(process.env.DEEPSEEK_PRICE_INPUT);
  const outP = Number(process.env.DEEPSEEK_PRICE_OUTPUT);
  const cacheP = Number(process.env.DEEPSEEK_PRICE_CACHE_INPUT);
  const rates = JSON.parse(JSON.stringify(AI_RATES));
  for (const m of Object.keys(rates)) {
    if (Number.isFinite(inP)) rates[m].input = inP;
    if (Number.isFinite(outP)) rates[m].output = outP;
    if (Number.isFinite(cacheP)) rates[m].cacheInput = cacheP;
  }
  return rates;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 2_000_000) reject(new Error('body too large')); });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function loadDrills() {
  if (!fs.existsSync(CONTENT)) return [];
  const drills = [];
  for (const f of fs.readdirSync(CONTENT).filter((f) => f.endsWith('.json'))) {
    const arr = JSON.parse(fs.readFileSync(path.join(CONTENT, f), 'utf8'));
    if (!Array.isArray(arr)) continue;
    for (const d of arr) drills.push(d);
  }
  return drills;
}

function loadTasks() {
  const fp = path.join(CONTENT, 'tasks.json');
  if (!fs.existsSync(fp)) return [];
  try { const j = JSON.parse(fs.readFileSync(fp, 'utf8')); return j.tasks || []; } catch { return []; }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');

    if (req.method === 'POST' && url.pathname === '/api/run') {
      const body = JSON.parse((await readBody(req)) || '{}');
      if (typeof body.source !== 'string' || !body.source.trim()) {
        return send(res, 400, JSON.stringify({ error: 'empty source' }));
      }
      const result = await runJava(body.source, body.stdin || '');
      return send(res, 200, JSON.stringify(result));
    }

    if (req.method === 'GET' && url.pathname === '/api/content') {
      return send(res, 200, JSON.stringify({ drills: loadDrills(), tasks: loadTasks() }));
    }

    if (req.method === 'GET' && url.pathname === '/api/store') {
      return send(res, 200, JSON.stringify({ entries: store.getAll() }));
    }

    if ((req.method === 'PUT' || req.method === 'POST') && url.pathname === '/api/store') {
      const raw = (await readBody(req)) || '{}';
      let body;
      try { body = JSON.parse(raw); } catch { return send(res, 400, JSON.stringify({ error: 'invalid json' })); }
      if (body && typeof body.key === 'string') {
        store.set(body.key, body.value);
        return send(res, 200, JSON.stringify({ ok: true }));
      }
      if (body && body.entries && typeof body.entries === 'object') {
        for (const k of Object.keys(body.entries)) store.set(k, body.entries[k]);
        return send(res, 200, JSON.stringify({ ok: true }));
      }
      return send(res, 400, JSON.stringify({ error: 'expected { key, value } or { entries }' }));
    }

    if (req.method === 'DELETE' && url.pathname === '/api/store') {
      const key = url.searchParams.get('key');
      if (!key) return send(res, 400, JSON.stringify({ error: 'missing key' }));
      store.remove(key);
      return send(res, 200, JSON.stringify({ ok: true }));
    }

    if (req.method === 'GET' && url.pathname === '/api/ref') {
      const ch = Number(url.searchParams.get('chapter'));
      const fp = path.join(CONTENT, 'reference', 'ch' + ch + '.txt');
      if (!Number.isInteger(ch) || !fs.existsSync(fp)) return send(res, 404, 'no reference', 'text/plain; charset=utf-8');
      return send(res, 200, fs.readFileSync(fp, 'utf8'), 'text/plain; charset=utf-8');
    }

    if (req.method === 'GET' && url.pathname === '/api/pages') {
      const fp = path.join(CONTENT, 'reference', 'pages.json');
      if (!fs.existsSync(fp)) return send(res, 200, JSON.stringify({ sections: {}, chapters: {} }));
      return send(res, 200, fs.readFileSync(fp, 'utf8'));
    }

    if (req.method === 'GET' && url.pathname === '/api/hints') {
      const fp = path.join(CONTENT, 'hints.json');
      if (!fs.existsSync(fp)) return send(res, 200, JSON.stringify({}));
      return send(res, 200, fs.readFileSync(fp, 'utf8'));
    }

    if (req.method === 'GET' && url.pathname === '/api/titles') {
      const fp = path.join(CONTENT, 'titles.json');
      if (!fs.existsSync(fp)) return send(res, 200, JSON.stringify({ chapters: {}, sections: {} }));
      return send(res, 200, fs.readFileSync(fp, 'utf8'));
    }

    if (req.method === 'GET' && url.pathname === '/api/tasks') {
      const fp = path.join(CONTENT, 'tasks.json');
      if (!fs.existsSync(fp)) return send(res, 200, JSON.stringify({ tasks: [] }));
      return send(res, 200, fs.readFileSync(fp, 'utf8'));
    }

    if (req.method === 'GET' && url.pathname === '/pdf') {
      const fp = path.join(__dirname, '..', 'OCP_Java_25_Certification_Exam_Refresher.pdf');
      if (!fs.existsSync(fp)) return send(res, 404, 'pdf not found', 'text/plain');
      const stat = fs.statSync(fp);
      const range = req.headers.range;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        const start = m && m[1] ? parseInt(m[1], 10) : 0;
        const end = m && m[2] ? parseInt(m[2], 10) : stat.size - 1;
        res.writeHead(206, { 'Content-Type': 'application/pdf', 'Accept-Ranges': 'bytes', 'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size, 'Content-Length': end - start + 1 });
        fs.createReadStream(fp, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Accept-Ranges': 'bytes', 'Content-Length': stat.size });
      fs.createReadStream(fp).pipe(res);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/ai/status') {
      return send(res, 200, JSON.stringify({ configured: !!AI_KEY(), model: AI_MODEL(), rates: aiRates() }));
    }

    if (req.method === 'POST' && url.pathname === '/api/ai') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const apiKey = body.apiKey || AI_KEY();
      if (!apiKey) {
        return send(res, 400, JSON.stringify({ error: { message: 'No DeepSeek API key configured. Add DEEPSEEK_API_KEY to .env and restart the server.' } }));
      }
      const payload = {
        model: body.model || AI_MODEL(),
        messages: Array.isArray(body.messages) ? body.messages : [],
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
        max_tokens: typeof body.maxTokens === 'number' ? body.maxTokens : 900,
      };
      if (body.json) payload.response_format = { type: 'json_object' };
      let upstream;
      try {
        upstream = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        return send(res, 502, JSON.stringify({ error: { message: 'Upstream error: ' + String(e) } }));
      }
      const text = await upstream.text();
      return send(res, upstream.status, text);
    }

    let pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const fp = path.join(PUBLIC, path.normalize(pathname));
    if (!fp.startsWith(PUBLIC)) return send(res, 403, 'forbidden', 'text/plain');
    if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
      return send(res, 200, fs.readFileSync(fp), MIME[path.extname(fp)] || 'application/octet-stream');
    }
    return send(res, 404, 'not found', 'text/plain');
  } catch (e) {
    return send(res, 500, JSON.stringify({ error: String(e) }));
  }
});

server.listen(PORT, () => {
  console.log('OCP Lab running at http://localhost:' + PORT);
});
