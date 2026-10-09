import { spawnSync } from 'node:child_process';
import { snapshotProgress } from './snapshot-progress.mjs';

// One-command publish: capture the current server DB into the committed seed,
// commit it if it changed, then push. CI rebuilds and deploys to GitHub Pages.
function git(args) {
  const r = spawnSync('git', args, { stdio: 'inherit' });
  return r.status ?? 1;
}

snapshotProgress();

git(['add', 'content/offline-seed.json']);
if (git(['diff', '--cached', '--quiet']) !== 0) {
  git(['commit', '-m', 'chore: refresh offline progress seed']);
} else {
  console.log('[publish] seed unchanged — nothing to commit');
}
process.exit(git(['push']));
