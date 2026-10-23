# Measures Mini Yaz's reference turnaround (front + side) into profile curves for the Blender build.
# Units: 170 px = 1 Blender unit. Front: X = (x - 181) / 170, Z = (588 - y) / 170. Side: depth toward the face D = (x - 184.5) / 170.
import sys, json
from PIL import Image
import numpy as np
D_ = sys.argv[1]
U, FX, FY, SX = 170.0, 181.0, 588.0, 184.5
def load(n):
    im = np.array(Image.open(D_ + n).convert('RGBA')).astype(float)
    a = im[:, :, 3] > 100
    R, G, B = im[:, :, 0], im[:, :, 1], im[:, :, 2]
    cream = a & (R > 195) & (G > 180) & (B > 160) & (np.abs(R - B) < 60)
    return a, cream, im
fa, fc, fim = load('turn-front.png')
sa, sc, sim = load('turn-side.png')
def smooth(v, k=5):
    v = np.array(v, float); pad = np.pad(v, k, mode='edge'); w = np.ones(2 * k + 1) / (2 * k + 1)
    return np.convolve(pad, w, mode='valid')
# ---- head: half width (front), half depth and center (side), per row
rows = list(range(100, 403, 2))
fw, sd, scn = {}, {}, {}
for y in range(142, 390):
    xs = np.where(fa[y])[0]; fw[y] = (xs.max() - xs.min()) / 2
for y in range(156, 390):
    xs = np.where(sa[y])[0]; sd[y] = (xs.max() - xs.min()) / 2; scn[y] = (xs.max() + xs.min()) / 2
a_, b_, c_ = [], [], []
# the top of the head is hidden by the bun in both views: fit one dome so width and depth close at the same point
TOP = 100.0
def dome(r, y): return r * np.sqrt(max(0.0, 1 - ((256 - y) / (256 - TOP)) ** 2))
for y in rows:
    w = min(1.0, max(0.0, (y - 150) / 25.0))          # blend from the dome into the measured outline
    if y < 390:
        a = dome(163, y) * (1 - w) + (fw[y] if y >= 142 else dome(163, y)) * w
        b = dome(141.5, y) * (1 - w) + (sd[y] if y >= 156 else dome(141.5, y)) * w
    else:
        a = fw[389] * np.sqrt(max(0, 1 - ((y - 389) / 13.0) ** 2)); b = sd[389] * np.sqrt(max(0, 1 - ((y - 389) / 13.0) ** 2))
    c = scn.get(y, 186.0)
    a_.append(a); b_.append(b); c_.append(c)
a_ = smooth(a_, 2); b_ = smooth(b_, 3); c_ = smooth(c_, 6)
head = [dict(z=(FY - y) / U, a=a / U, b=b / U, d=(c - SX) / U) for y, a, b, c in zip(rows, a_, b_, c_)]
head[0]['a'] = head[0]['b'] = 0; head[-1]['a'] = head[-1]['b'] = 0
# ---- hairline seen from the front: topmost cream per column, as Z(X)
hl = []
for x in range(26, 340, 2):
    ys = np.where(fc[150:400, x])[0]
    if len(ys): hl.append(((x - FX) / U, (FY - (150 + ys.min())) / U))
hx = np.array([p[0] for p in hl]); hz = smooth([p[1] for p in hl], 2)
# ---- face edge seen from the side: backmost cream per row, as depth D(Z)
fe = []
for y in range(240, 394, 2):
    xs = np.where(sc[y])[0]
    if len(xs): fe.append(((FY - y) / U, (xs.min() - SX) / U))
fz = np.array([p[0] for p in fe]); fd = smooth([p[1] for p in fe], 2)
out = dict(head=head, hairline=dict(x=hx.tolist(), z=hz.tolist()), faceEdge=dict(z=fz.tolist(), d=fd.tolist()),
  eyes=dict(x=69.5 / U, z=(FY - 293) / U, rx=14.5 / U, rz=21.5 / U),
  mouth=dict(z=(FY - 327.5) / U, halfw=17.5 / U, depth=10 / U),
  blush=dict(x=94.7 / U, z=(FY - 325) / U, r=18 / U),
  bun=dict(z=(FY - 66) / U, d=(155 - SX) / U, r=64.5 / U))
json.dump(out, open('profiles.json', 'w'))
print(len(head), 'head rings; widest a', round(max(h['a'] for h in head), 3), 'deepest b', round(max(h['b'] for h in head), 3))
print('hairline z range', round(min(hz), 3), round(max(hz), 3), 'face edge d range', round(min(fd), 3), round(max(fd), 3))
