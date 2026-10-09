import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REF = path.join(__dirname, '..', 'content', 'reference');
const OUT = path.join(__dirname, '..', 'content', 'titles.json');

const chapters = {};
const sections = {};
const secRe = /^(\d{1,2}(?:\.\d{1,2}){1,2})\s+([A-Z].{2,70})$/;

for (const file of fs.readdirSync(REF).filter((f) => /^ch\d+\.txt$/.test(f))) {
  const ch = file.match(/ch(\d+)\.txt/)[1];
  const lines = fs.readFileSync(path.join(REF, file), 'utf8').split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.replace(/\s*☝\s*$/, '').trim();
    let m = line.match(/^Chapter\s+(\d+)\s+(.+)$/);
    if (m) { chapters[m[1]] = m[2].trim(); continue; }
    m = line.match(secRe);
    if (m) {
      const id = m[1];
      let title = m[2].trim().replace(/\s{2,}/g, ' ');
      if (!sections[id]) sections[id] = title;
    }
  }
}

fs.writeFileSync(OUT, JSON.stringify({ chapters, sections }, null, 2));
console.log('chapters:', Object.keys(chapters).length, 'sections:', Object.keys(sections).length);
console.log('sample chapters:', Object.entries(chapters).slice(0, 3));
console.log('sample sections:', Object.entries(sections).slice(0, 6));
