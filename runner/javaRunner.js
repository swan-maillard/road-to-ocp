import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function findJdk25() {
  const roots = ['C:\\Program Files\\Eclipse Adoptium', 'C:\\Program Files\\Java'];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const hits = fs.readdirSync(root)
      .filter((n) => /^jdk-2[1-9]/.test(n) || /^jdk-2[1-9]\./.test(n))
      .sort()
      .reverse();
    for (const h of hits) {
      const p = path.join(root, h, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      if (fs.existsSync(p)) return path.dirname(path.dirname(p));
    }
  }
  return null;
}

function resolveJdk() {
  const candidates = [
    process.env.OCP_JAVA_HOME,
    findJdk25(),
    process.env.JAVA_HOME,
  ].filter(Boolean);
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  for (const home of candidates) {
    const p = path.join(home, 'bin', exe);
    if (fs.existsSync(p)) return p;
  }
  return exe;
}

const JAVA = resolveJdk();
const TIMEOUT_MS = 15000;
const JVM_OPTS = ['-XX:TieredStopAtLevel=1', '-XX:+UseSerialGC', '-Xshare:auto', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8'];

function runProcess(args, cwd, stdin) {
  return new Promise((resolve) => {
    const child = spawn(JAVA, args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        try { child.kill('SIGKILL'); } catch {}
        finish(-1, stdout, stderr + '\n[ocp-lab] timed out after ' + TIMEOUT_MS + 'ms');
      }
    }, TIMEOUT_MS);
    function finish(exitCode, out, err) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ exitCode, stdout: out, stderr: err });
    }
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (e) => finish(-1, stdout, stderr + '\n' + e.message));
    child.on('close', (code) => finish(code, stdout, stderr));
    if (stdin) child.stdin.write(stdin);
    try { child.stdin.end(); } catch {}
  });
}

export async function runJava(source, stdin = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocplab-'));
  const file = path.join(dir, 'Main.java');
  fs.writeFileSync(file, source, 'utf8');
  const started = Date.now();
  const result = await runProcess([...JVM_OPTS, 'Main.java'], dir, stdin);
  const elapsedMs = Date.now() - started;
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    compiled: result.exitCode !== -1 && !/error:/.test(result.stderr),
    elapsedMs,
    java: JAVA,
  };
}

export const JAVA_BIN = JAVA;
export const RUNNER_SIG = JAVA + '|' + JVM_OPTS.join(' ');
