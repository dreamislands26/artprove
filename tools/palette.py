"""Adds dominant colours (hex) to every work in site/ap-data.js and fills an empty `pal` (warm/cool/bold/neutral).
Run: python3 tools/palette.py   (re-run after adding works)."""
import json, re, colorsys, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent / 'site'
src = (root / 'ap-data.js').read_text(encoding='utf-8')
head, body = src.split('window.APD=', 1)
data = json.loads(body.rstrip().rstrip(';'))

def colours(path, k=5):
    im = Image.open(path).convert('RGB'); im.thumbnail((96, 96))
    q = im.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette(); counts = sorted(q.getcolors(), reverse=True)
    out = []
    for n, i in counts:
        r, g, b = pal[i*3:i*3+3]
        if any(abs(r-a)+abs(g-b2)+abs(b-c) < 60 for a, b2, c in out): continue
        out.append((r, g, b))
    return ['#%02x%02x%02x' % c for c in out[:k]]

def tone(hexes):
    ch = []
    for h in hexes:
        r, g, b = (int(h[i:i+2], 16)/255 for i in (1, 3, 5))
        hh, l, s = colorsys.rgb_to_hls(r, g, b)
        if s > .25 and .12 < l < .9: ch.append((hh*360, s))
    if not ch: return 'neutral'
    warm = sum(1 for h, s in ch if h < 70 or h >= 320); cool = sum(1 for h, s in ch if 150 <= h < 300)
    hi = sum(1 for h, s in ch if s > .6)
    if hi >= 2 and warm and cool: return 'bold'
    return 'warm' if warm >= cool else 'cool'

n = 0
for w in data['works']:
    p = root / 'img' / (w['img'] + '.jpg')
    if not p.exists(): continue
    w['hex'] = colours(p)
    if not w.get('pal'): w['pal'] = tone(w['hex']); n += 1
(root / 'ap-data.js').write_text(head + 'window.APD=' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')
print('works', len(data['works']), 'pal filled', n)
