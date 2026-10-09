import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const children = [];
function run(args, name) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
  child.on('exit', (code) => { shutdown(code ?? 0); });
  child.on('error', (e) => { console.error('[' + name + '] ' + e.message); shutdown(1); });
  children.push(child);
  return child;
}

let closing = false;
function shutdown(code) {
  if (closing) return;
  closing = true;
  for (const c of children) { try { c.kill(); } catch {} }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('Road to OCP — starting API server (4321) and Vite dev server (5173)…');
run(['server.js'], 'api');
run([path.join('node_modules', 'vite', 'bin', 'vite.js')], 'vite');
