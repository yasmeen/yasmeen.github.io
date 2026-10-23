# Side-by-side and outline overlay of the Blender renders against the reference turnaround.
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
D = sys.argv[1]; R = sys.argv[2]; out = sys.argv[3]
BG = (220, 234, 251, 255)
def on(im):
    bg = Image.new('RGBA', im.size, BG); bg.alpha_composite(im.convert('RGBA')); return bg
cells = []
for rn, refn in [('r_front.png', 'turn-front.png'), ('r_side.png', 'turn-side.png')]:
    r = Image.open(R + rn).convert('RGBA'); f = Image.open(D + refn).convert('RGBA')
    # outline of the reference drawn over the render
    a = np.array(f)[:, :, 3] > 100
    edge = Image.fromarray((a * 255).astype('uint8')).filter(ImageFilter.FIND_EDGES)
    ov = on(r); px = ov.load(); e = np.array(edge) > 0
    for y, x in zip(*np.where(e)): px[int(x), int(y)] = (230, 40, 90, 255)
    cells += [on(f), on(r), ov]
W, H = cells[0].size
o = Image.new('RGB', (W * len(cells), H))
for i, c in enumerate(cells): o.paste(c.convert('RGB'), (i * W, 0))
o.save(out)
