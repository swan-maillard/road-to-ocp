import json
import os
import re
from pypdf import PdfReader

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf = os.path.join(root, '..', 'OCP_Java_25_Certification_Exam_Refresher.pdf')
outdir = os.path.join(root, 'content', 'reference')

reader = PdfReader(pdf)
pages = {}
chapter_pages = {}
section_re = re.compile(r'(?<!\d)(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+[A-Z]')

for i, page in enumerate(reader.pages, start=1):
    if i < 11:
        continue
    text = page.extract_text() or ''
    for m in section_re.finditer(text):
        sec = m.group(1)
        if sec not in pages:
            pages[sec] = i
    for m in re.finditer(r'Chapter\s+(\d{1,2})\s+[A-Z]', text):
        ch = m.group(1)
        if ch not in chapter_pages:
            chapter_pages[ch] = i

out = {'sections': pages, 'chapters': chapter_pages}
with open(os.path.join(outdir, 'pages.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)
print('sections:', len(pages), 'chapters:', len(chapter_pages))
print('sample:', {k: pages[k] for k in list(pages)[:8]})
