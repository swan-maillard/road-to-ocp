import json
import os
import re
from pypdf import PdfReader

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = os.path.join(root, '..', 'OCP_Java_25_Certification_Exam_Refresher.pdf')
outdir = os.path.join(root, 'content', 'reference')
os.makedirs(outdir, exist_ok=True)

reader = PdfReader(pdf)
text = '\n'.join((p.extract_text() or '') for p in reader.pages)

matches = list(re.finditer(r'Chapter\s+(\d+)\s+([A-Z][^\n]{0,90})', text))
last = {}
for m in matches:
    last[int(m.group(1))] = m

starts = sorted((num, m.start(), re.sub(r'\s+', ' ', m.group(2)).strip()) for num, m in last.items())

meta = []
for i, (num, start, title) in enumerate(starts):
    end = starts[i + 1][1] if i + 1 < len(starts) else len(text)
    body = text[start:end]
    body = re.sub(r'[ \t]+', ' ', body)
    body = re.sub(r'\n{2,}', '\n', body).strip()
    with open(os.path.join(outdir, 'ch{}.txt'.format(num)), 'w', encoding='utf-8') as f:
        f.write(body)
    meta.append({'chapter': num, 'title': title, 'chars': len(body)})
    print(num, len(body), title[:70])

with open(os.path.join(outdir, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(meta, f, indent=2)
print('wrote', len(meta), 'chapters to', outdir)
