from pathlib import Path
from pypdf import PdfReader
import re
import html

root = Path(__file__).resolve().parents[1]
raw = ' '.join(page.extract_text() for page in PdfReader(root / 'assets/privacy-policy.pdf').pages)
page = (root / 'privacy-policy.html').read_text(encoding='utf-8')
body = page.split('<article class=')[1].split('</article>')[0].split('>', 1)[1]
def normalize(text):
    text = html.unescape(re.sub(r'<[^>]+>', ' ', text)).replace('●', ' ')
    return re.sub(r'\s+([.,;:])', r'\1', re.sub(r'\s+', ' ', text)).strip()
source = normalize(raw)
assert normalize(body) == source[source.index('1. Introduction'):]
assert len(re.findall('<section class="policy-section"', body)) == 10
assert page.count('<h3>') == 5
assert 'November 15, 2025' in page
print('PASS: complete policy text matches the source PDF; all 10 sections, 5 subsections and the original effective date preserved.')
