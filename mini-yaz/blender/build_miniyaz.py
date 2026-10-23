# Builds Mini Yaz in Blender from the measured turnaround (profiles.json) and renders checks against the drawing.
# Blender is Z-up; Mini Yaz faces -Y. 1 unit = 170 px of the reference turnaround.
import bpy, bmesh, json, math, sys, os, addon_utils
import numpy as np
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = ARGS[0] if ARGS else HERE
P = json.load(open(os.path.join(HERE, 'profiles.json')))
WEB = os.environ.get('WEB') == '1'      # lighter meshes for the browser, plus baked shading and a JSON export

bpy.ops.wm.read_factory_settings(use_empty=True)
addon_utils.enable('cycles', default_set=True)
scene = bpy.context.scene

def srgb(r, g, b):
    f = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else (((c / 255) + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), 1.0)

def mk(name, verts, faces, smooth=True):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # open surfaces (the hair) can come out inside-out: make sure normals face away from the middle
    c = sum((v.co for v in bm.verts), Vector()) / max(1, len(bm.verts))
    if sum((f.calc_center_median() - c).dot(f.normal) for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    me.polygons.foreach_set('use_smooth', [smooth] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    return ob

def loft(name, rings, N=128):
    """rings: list of (z, a, b, cy[, n]) top to bottom; a ring with a = b = 0 becomes a pole.
    n is the superellipse exponent of the ring: 2 is an ellipse, higher is squarer (a rounded box)."""
    verts, faces, idx = [], [], []
    for ring in rings:
        z, a, b, cy = ring[:4]; n = ring[4] if len(ring) > 4 else 2.0
        if a < 1e-5 and b < 1e-5:
            idx.append([len(verts)]); verts.append((0, cy, z)); continue
        s = len(verts)
        for j in range(N):
            t = 2 * math.pi * j / N
            c, sn = math.cos(t), math.sin(t)
            verts.append((a * math.copysign(abs(c) ** (2 / n), c), cy + b * math.copysign(abs(sn) ** (2 / n), sn), z))
        idx.append(list(range(s, s + N)))
    for i in range(len(idx) - 1):
        r0, r1 = idx[i], idx[i + 1]
        if len(r0) == 1 and len(r1) == 1: continue
        if len(r0) == 1: faces += [(r0[0], r1[(j + 1) % N], r1[j]) for j in range(N)]
        elif len(r1) == 1: faces += [(r0[j], r0[(j + 1) % N], r1[0]) for j in range(N)]
        else: faces += [(r0[j], r0[(j + 1) % N], r1[(j + 1) % N], r1[j]) for j in range(N)]
    return mk(name, verts, faces)

def interp_rings(rings, u):
    """continuous ring parameter u in [0, len-1] -> (z, a, b, cy)"""
    u = max(0.0, min(len(rings) - 1.0, u)); i = min(int(u), len(rings) - 2); f = u - i
    return tuple(rings[i][k] * (1 - f) + rings[i + 1][k] * f for k in range(4))

def ring_point(rings, u, t):
    z, a, b, cy = interp_rings(rings, u)
    return Vector((a * math.cos(t), cy + b * math.sin(t), z))

# ---------------- head ----------------
H = P['head']
# The reference's outline includes the hair. The face sits on that outline, and under the hair the head steps in by the
# hair's thickness (once the hair's edge is known, below), so the hair lands back on the outline. Insetting whole rings
# instead puts that step on the face wherever the face reaches the side of the head.
HAIR_T = 0.04
def smooth(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def head_ring(h, inset=0.0):
    z, a, b, d = h['z'], h['a'], h['b'], h['d']
    if a <= 0 and b <= 0: return (z, 0.0, 0.0, -d)
    return (z, max(0.0, a - inset), max(0.0, b - inset), -d)
headRings = [head_ring(h) for h in H]
innerRings = [head_ring(h, HAIR_T) for h in H]     # the head under the hair
if WEB:
    headRings = headRings[:-1:2] + [headRings[-1]]
    innerRings = innerRings[:-1:2] + [innerRings[-1]]
NH = 136 if WEB else 192
head = loft('Head', headRings, NH)

fz, fd = np.array(P['faceEdge']['z']), np.array(P['faceEdge']['d'])
order = np.argsort(fz); fz, fd = fz[order], fd[order]
# the fringe: a straight line across the forehead with a soft widow's peak in the middle, curving down at the temples
FRINGE_Z, PEAK, PEAK_W = 2.13, 0.11, 0.36
# the temples curve down early enough that this line, not the side view's face edge, shapes the fringe's corners
TEMPLE_X0, TEMPLE_X1, TEMPLE_Z = 0.45, 0.86, 1.72
def hairline_z(x):
    ax = abs(x)
    s = min(1.0, ax / PEAK_W)
    z = FRINGE_Z - PEAK * (1 - s) ** 2 * (1 + 2 * s)      # a peak with a softly rounded tip, so the rolled edge doesn't pinch
    if ax > TEMPLE_X0: z -= (FRINGE_Z - TEMPLE_Z) * min(1.0, (ax - TEMPLE_X0) / (TEMPLE_X1 - TEMPLE_X0)) ** 2
    if ax > TEMPLE_X1: z -= (ax - TEMPLE_X1) * 2 * (FRINGE_Z - TEMPLE_Z) / (TEMPLE_X1 - TEMPLE_X0)   # then drops away
    return z
def face_edge_d(z):
    # above the measured rows the side view only sees the fringe itself, so the front hairline decides there
    if z > fz[-1]: return float(fd[-1])
    measured = float(np.interp(z, fz, fd)) - 0.02
    # Below the eyes the face reaches the outline as seen from the front (a wide chin, like the reference), and it wraps
    # under the chin to behind the neck, so no hair shows below the chin. Above that the side hair follows the side view,
    # and the back of the head stays hair.
    low = -0.02 - 0.12 * smooth(1.62, 1.28, z)
    return measured + (min(measured, low) - measured) * smooth(1.80, 1.62, z)
def is_face(p):
    X, Y, Z = p; D = -Y
    return Z < hairline_z(X) and D > face_edge_d(Z)

# ---------------- hair: a clay layer laid on the head, cut exactly along the fringe, with a rolled edge ----------------
NM, M = (240, 52) if WEB else (320, 90)
u_max = len(headRings) - 1.0
def surf_normal(u, t, rings=headRings):
    e = 1e-3
    du = ring_point(rings, u + e, t) - ring_point(rings, u - e, t)
    dt = ring_point(rings, u, t + e) - ring_point(rings, u, t - e)
    n = dt.cross(du).normalized()
    outward = Vector((math.cos(t), math.sin(t), 0.0))
    if n.dot(outward) < 0 and abs(math.cos(t)) + abs(math.sin(t)) > 0: n = -n
    return n
bounds = []
for j in range(NM):
    t = 2 * math.pi * j / NM
    ub = None
    steps = np.linspace(0.5, u_max - 3, 400)
    for k in range(1, len(steps)):
        if is_face(ring_point(headRings, steps[k], t)):
            lo, hi = steps[k - 1], steps[k]
            for _ in range(30):
                mid = (lo + hi) / 2
                if is_face(ring_point(headRings, mid, t)): hi = mid
                else: lo = mid
            ub = lo; break
    bounds.append(ub if ub is not None else u_max - 0.6)
# smooth the edge so the fringe reads as one clean rolled line
bb = np.array(bounds); k = 2
bounds = [float(np.mean([bb[(j + i) % NM] for i in range(-k, k + 1)])) if bb[j] < u_max - 1.0 else float(bb[j]) for j in range(NM)]
THICK, LIP = 0.044, 0.05
# the fringe edge as a 3D polyline, so the rolled lip can follow the true distance to it (not the distance along each strand line)
edge_pts = [(j, ring_point(headRings, bounds[j], 2 * math.pi * j / NM)) for j in range(NM) if bounds[j] < u_max - 1.0]
segA, segB = [], []
for i in range(len(edge_pts)):
    (j0, p0), (j1, p1) = edge_pts[i], edge_pts[(i + 1) % len(edge_pts)]
    if (j1 - j0) % NM == 1: segA.append(p0[:]); segB.append(p1[:])
segA, segB = np.array(segA), np.array(segB)
def edge_dist(p):
    q = np.array(p[:]); ab = segB - segA
    t = np.clip(((q - segA) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-12), 0, 1)
    return float(np.sqrt((((segA + ab * t[:, None]) - q) ** 2).sum(1)).min())
# The head steps in under the hair. The face starts dipping a little before the edge, as if the hair pressed into it,
# so the rolled edge stands out from the face without standing far out of the outline.
FACE_W = 0.12
def inset_at(sd):
    """how far in (0..1 of the hair's thickness) the head sits at signed distance sd from the edge, + under the hair"""
    return smooth(-FACE_W, 1.4 * LIP, sd)
def under_hair(p):
    d = edge_dist(p); return inset_at(-d if is_face(p) else d)
hv, i = head.data.vertices, 0
for r, ring in enumerate(headRings):
    for j in range(1 if ring[1] < 1e-5 and ring[2] < 1e-5 else NH):
        t = 2 * math.pi * j / NH
        p = Vector(hv[i].co)
        hv[i].co = p + (ring_point(innerRings, r, t) - ring_point(headRings, r, t)) * under_hair(p); i += 1
assert i == len(hv)
head.data.update()
# every meridian shares the same rings over the crown (no pucker); below that they fan out to their own edge
real = [b for b in bounds if b < u_max - 1.0]
u_cap = 0.85 * min(real)
K1, K3 = 16, 14
EDGE_D = [LIP * 1.8 * (1 - i / (K3 - 1)) ** 1.6 for i in range(K3)]   # the last rows sit at fixed distances from the edge
def u_for_dist(ub, t, d):
    lo, hi = u_cap, ub
    if edge_dist(ring_point(headRings, lo, t)) < d: return lo
    for _ in range(22):
        mid = (lo + hi) / 2
        if edge_dist(ring_point(headRings, mid, t)) > d: lo = mid
        else: hi = mid
    return (lo + hi) / 2
def meridian_us(ub, t, has_edge):
    us = [u_cap * (k + 1) / K1 for k in range(K1)]                 # crown: shared rings
    if not has_edge:
        rest = M - K1
        return us + [u_cap + (ub - u_cap) * (1 - (1 - (k + 1) / rest) ** 1.6) for k in range(rest)]
    ue = [u_for_dist(ub, t, d) for d in EDGE_D]; ue[-1] = ub
    for i in range(1, len(ue)): ue[i] = max(ue[i], ue[i - 1] + 1e-4)
    mid = M - K1 - K3
    u0 = ue[0]
    us += [u_cap + (u0 - u_cap) * (k + 1) / (mid + 1) for k in range(mid)]
    return us + ue
hverts, hfaces = [], []
top = ring_point(headRings, 0, 0)
hverts.append(tuple(top + Vector((0, 0, THICK))))
ring_ids = []
for j in range(NM):
    t = 2 * math.pi * j / NM
    ub = bounds[j]
    col = []
    zs = []
    US = meridian_us(ub, t, ub < u_max - 1.0)
    for k in range(M):
        zs.append(ring_point(headRings, US[k], t))
    # arc length back from the edge
    L = [0.0]
    for k in range(len(zs) - 1, 0, -1): L.append(L[-1] + (zs[k] - zs[k - 1]).length)
    L = L[::-1]
    for k, p in enumerate(zs):
        u = US[k]
        n = surf_normal(max(u, 0.6), t, innerRings)
        dist = edge_dist(p) if len(segA) else 9.0
        q = min(dist / LIP, 1.0)
        h = THICK * math.sqrt(max(0.0, 1 - (1 - q) ** 2)) - 0.006 * (1 - q) ** 4
        if bounds[j] >= u_max - 1.0: h = min(h, THICK * min(1.0, (u_max - u) / 6.0))   # the back: the hair tucks under the head
        # The hair lies on the head as stepped in above, raised along the smooth inner head's normal (offsetting along the
        # step itself would fold the hair over itself).
        p = p + (ring_point(innerRings, u, t) - p) * inset_at(dist)
        col.append(len(hverts)); hverts.append(tuple(p + n * h))
    ring_ids.append(col)
for j in range(NM):
    a, b = ring_ids[j], ring_ids[(j + 1) % NM]
    hfaces.append((0, b[0], a[0]))
    for k in range(M - 1):
        hfaces.append((a[k], b[k], b[k + 1], a[k + 1]))
hair = mk('Hair', hverts, hfaces)

# ---------------- bun ----------------
BR, BZ, BD = P['bun']['r'], P['bun']['z'], P['bun']['d']
nb = 36 if WEB else 64
bunRings = [(BZ + BR * math.cos(math.pi * i / nb), BR * math.sin(math.pi * i / nb), BR * math.sin(math.pi * i / nb), -BD) for i in range(nb + 1)]
bunRings[0] = (BZ + BR, 0, 0, -BD); bunRings[-1] = (BZ - BR, 0, 0, -BD)
bun = loft('Bun', bunRings, 64 if WEB else 96)

# ---------------- body: torso + legs fused into one soft clay surface ----------------
U = 170.0
D0 = -9.0 / U          # body sits a touch behind the head's center line
def px_rings(rows, cx=0.0, cd=D0):
    return [((588 - y) / U, a / U, b / U, -(cd)) + ((r[3],) if len(r) > 3 else ()) for r in rows for (y, a, b) in [r[:3]]]
def smooth_rows(rows, step=1.5):
    """monotone cubic through the measured rows, so the surface has no kinks between them (no ridges)"""
    ys = np.array([r[0] for r in rows], float)
    def mono(vals):
        v = np.array(vals, float); h = np.diff(ys); d = np.diff(v) / h
        m = np.zeros_like(v)
        for i in range(1, len(v) - 1):
            if d[i - 1] * d[i] > 0:
                w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
                m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
        def f(y):
            i = min(max(np.searchsorted(ys, y) - 1, 0), len(ys) - 2)
            t = (y - ys[i]) / h[i]; t2, t3 = t * t, t * t * t
            return (2 * t3 - 3 * t2 + 1) * v[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * v[i + 1] + (t3 - t2) * h[i] * m[i + 1]
        return f
    fa, fb = mono([r[1] for r in rows]), mono([r[2] for r in rows])
    fn = mono([r[3] if len(r) > 3 else 2.0 for r in rows])
    out = [(y, max(0.0, fa(y)), max(0.0, fb(y)), fn(y)) for y in np.arange(ys[0], ys[-1], step)]
    out[0] = (ys[0], 0, 0, 2.0); out.append((ys[-1], 0, 0, 2.0))
    return out
# one column from the neck to the ground, like the reference, kept soft like a plush toy: a full oval torso that only
# barely squares off into the legs (superellipse exponent 2 -> 2.2), round shoulders and round feet. The slit between the
# legs is cut out of it below, so there's no crease at the hips.
bodyRows = [(386, 0, 0), (387.5, 38, 28), (391, 58, 41), (397, 70, 49), (409, 78, 56), (424, 82, 61), (440, 85, 65), (460, 87, 68),
            (480, 87.5, 69), (500, 86, 67, 2.05), (515, 84.5, 62, 2.1), (528, 83.5, 57, 2.15), (540, 83, 53, 2.2), (552, 82.5, 51.5, 2.2),
            (566, 81.5, 50, 2.2), (575, 79, 47, 2.15), (581, 75, 42, 2.1), (585.5, 67, 32, 2.05), (588.5, 0, 0)]
body = loft('Body', px_rings(smooth_rows(bodyRows, 1.0)), 160)
# the slit between the legs: narrow from the top down, flaring at the ground so each foot ends round (like the reference)
def prism(name, outline_px, depth=2.0):
    """outline_px: (half-width px, y px) pairs from the top of the cut down; mirrored in x and extruded through the body"""
    right = [(w / U, (588 - y) / U) for (w, y) in outline_px]
    ring = right + [(-x, z) for (x, z) in reversed(right)]
    n = len(ring)
    verts = [(x, -depth / 2, z) for (x, z) in ring] + [(x, depth / 2, z) for (x, z) in ring]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob
cut = prism('Slit', [(1.5, 545), (3.5, 548), (4, 566), (4.5, 574), (7, 580), (12, 584.5), (19, 587.5), (26, 592), (30, 610)])
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True); bpy.context.view_layer.objects.active = body
body.data.remesh_voxel_size = 0.014 if WEB else 0.009
bpy.ops.object.voxel_remesh()          # a clean, closed surface first, so the cut has something solid to work on
bm_ = body.modifiers.new('slit', 'BOOLEAN'); bm_.operation = 'DIFFERENCE'; bm_.object = cut; bm_.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier='slit')
bpy.data.objects.remove(cut, do_unlink=True)
bpy.ops.object.voxel_remesh()
sm = body.modifiers.new('smooth', 'SMOOTH')
sm.factor = 0.5; sm.iterations = 26   # soft, plush transitions everywhere
bpy.ops.object.modifier_apply(modifier='smooth')
if WEB:
    dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 5200 / len(body.data.vertices))
    bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.shade_smooth()

# ---------------- arms: teardrop mittens, pivot at the shoulder, hanging along -Z ----------------
armProf = [(0.0, 0.0), (0.02, 0.085), (0.06, 0.112), (0.15, 0.127), (0.3, 0.145), (0.42, 0.166), (0.5, 0.176), (0.56, 0.172), (0.605, 0.152), (0.64, 0.11), (0.662, 0.055), (0.672, 0.0)]   # plump mittens

# resample the profile smoothly
from mathutils import geometry
def resample(prof, n=34 if WEB else 48):
    ss = np.linspace(prof[0][0], prof[-1][0], n)
    rs = np.interp(ss, [p[0] for p in prof], [p[1] for p in prof])
    rs = np.convolve(np.pad(rs, 2, mode='edge'), np.ones(5) / 5, mode='valid')
    rs[0] = 0; rs[-1] = 0
    return [(-s, r, r * 1.12, 0.0) for s, r in zip(ss, rs)]
arms = []
for s in (-1, 1):
    arm = loft('Arm', resample(armProf), 40 if WEB else 64)
    arm.location = (0.43 * s, 0.04, 1.1)
    arm.rotation_euler = (0, -math.radians(23) * s, 0)
    arms.append(arm)

# ---------------- face ----------------
def front_point(X, Z):
    """the head surface point seen from the front at (X, Z), and its normal"""
    best = None
    # ring parameter for this height
    us = np.linspace(0, u_max, 2000)
    zs = [interp_rings(headRings, u)[0] for u in us]
    u = float(np.interp(-Z, [-z for z in zs], us))
    z, a, b, cy = interp_rings(headRings, u)
    c = max(-1.0, min(1.0, X / a))
    t = -math.acos(c)                       # front half: sin(t) < 0 -> -Y
    p = ring_point(headRings, u, t)
    n = surf_normal(u, t)
    return p, n
E = P['eyes']
eyes = []
for s in (-1, 1):
    p, n = front_point(E['x'] * s, E['z'])
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=1.0)
    eye = bpy.context.active_object; eye.name = 'Eye'
    eye.scale = (E['rx'] * 1.08, E['rz'] * 1.02, 0.05)
    rot = n.to_track_quat('Z', 'Y')
    eye.rotation_mode = 'QUATERNION'; eye.rotation_quaternion = rot
    eye.location = p - n * 0.016
    bpy.ops.object.shade_smooth()
    # highlight, upper right of each eye
    hl_local = Vector((E['rx'] * 0.38, E['rz'] * 0.45, 0.05))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.024)
    g = bpy.context.active_object; g.name = 'Glint'
    g.location = eye.location + rot @ hl_local
    eyes.append((eye, g))
Mo = P['mouth']
pts = []
for i in range(17):
    u = i / 16 * 2 - 1
    X = u * Mo['halfw'] * 1.08
    Z = Mo['z'] - 0.014 + 0.05 * u * u
    p, n = front_point(X, Z)
    pts.append(p + n * 0.004)
cu = bpy.data.curves.new('Smile', 'CURVE'); cu.dimensions = '3D'
spl = cu.splines.new('POLY'); spl.points.add(len(pts) - 1)
for i, q in enumerate(pts): spl.points[i].co = (q.x, q.y, q.z, 1)
cu.bevel_depth = 0.019; cu.bevel_resolution = 6; cu.use_fill_caps = True
smile = bpy.data.objects.new('Smile', cu); scene.collection.objects.link(smile)

# blush lives in a color attribute on the head
B = P['blush']
hm = head.data
attr = hm.color_attributes.new('blush', 'FLOAT_COLOR', 'POINT')
for i, v in enumerate(hm.vertices):
    X, Y, Z = v.co
    w = 0.0
    if -Y > 0.2:
        for s in (-1, 1):
            d = math.hypot(X - B['x'] * s, (Z - B['z']) * 1.05)
            r = B['r'] * 1.45
            w = max(w, min(1.0, 1.25 * max(0.0, 1 - d / r) ** 1.2))
    attr.data[i].color = (w, w, w, 1)

# ---------------- materials ----------------
def principled(name, base, rough=0.8, sss=0.0, sheen=0.0, coat=0.0, spec=0.35, bump=0.0, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    def setin(k, v):
        if k in bsdf.inputs: bsdf.inputs[k].default_value = v
    setin('Base Color', base); setin('Roughness', rough); setin('Subsurface Weight', sss)
    setin('Subsurface Radius', (1.0, 0.5, 0.35)); setin('Subsurface Scale', 0.06)
    setin('Sheen Weight', sheen); setin('Sheen Roughness', 0.45); setin('Coat Weight', coat); setin('Specular IOR Level', spec)
    if emit: setin('Emission Color', emit); setin('Emission Strength', 4.0)
    if bump > 0:
        nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 90.0; nz.inputs['Detail'].default_value = 8.0
        bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.004
        nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs['Normal'], bsdf.inputs['Normal'])
    return m, nt, bsdf
BLUE = srgb(70, 130, 207); CREAM = srgb(250, 235, 221); PINK = srgb(242, 158, 166)
blueM, _, _ = principled('Clay Blue', BLUE, rough=0.72, sss=0.12, sheen=0.35, bump=0.12)
faceM, fnt, fb = principled('Clay Face', CREAM, rough=0.68, sss=0.25, sheen=0.25, bump=0.05)
ca = fnt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'blush'
mix = fnt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
mix.inputs[6].default_value = CREAM; mix.inputs[7].default_value = PINK
fnt.links.new(ca.outputs['Color'], mix.inputs[0]); fnt.links.new(mix.outputs[2], fb.inputs['Base Color'])
eyeM, _, _ = principled('Eye', srgb(18, 14, 13), rough=0.18, coat=1.0, spec=0.6)
glintM, _, _ = principled('Glint', (1, 1, 1, 1), rough=0.3, emit=(1, 1, 1, 1))
lineM, _, _ = principled('Line', srgb(30, 20, 18), rough=0.5)
for o, mt in [(head, faceM), (hair, blueM), (bun, blueM), (body, blueM), (smile, lineM)] + [(a, blueM) for a in arms] + [(e, eyeM) for e, g in eyes] + [(g, glintM) for e, g in eyes]:
    o.data.materials.clear(); o.data.materials.append(mt)

# ---------------- light, world, render ----------------
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get('SAMPLES', '48'))
try:
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception as e: print('denoise', e)
scene.render.film_transparent = True
scene.view_settings.view_transform = 'Standard'
world = bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.82, 0.86, 0.93, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.45
def area(name, loc, size, power, color=(1, 1, 1)):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = power; L.color = color
    o = bpy.data.objects.new(name, L); scene.collection.objects.link(o); o.location = loc
    d = Vector((0, 0, 1.6)) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
area('Key', (-4, -6, 7), 6, 520, (1, 0.98, 0.95))
area('Fill', (5, -5, 3), 5, 150, (0.95, 0.97, 1))
area('Top', (0, -1, 8), 6, 170)
area('Rim', (3, 6, 5), 4, 200, (0.9, 0.94, 1))
area('Front', (0.5, -9, 1.9), 4, 110, (1, 0.97, 0.93))

def camera(name, loc, target, ortho=None, lens=85):
    cd = bpy.data.cameras.new(name)
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    else: cd.lens = lens
    o = bpy.data.objects.new(name, cd); scene.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
REF_H = 622 / U
camF = camera('Front', (-2 / U, -20, (588 - 311) / U), (-2 / U, 0, (588 - 311) / U), ortho=REF_H)
camS = camera('Side', (-20, 5.5 / U, (588 - 311) / U), (0, 5.5 / U, (588 - 311) / U), ortho=REF_H)
camH = camera('Hero', (4.6, -12.5, 2.6), (0, 0, 1.6), lens=100)

def render(cam, path, w, h):
    scene.camera = cam; scene.render.resolution_x = w; scene.render.resolution_y = h
    scene.render.filepath = path; bpy.ops.render.render(write_still=True)
if 'norender' not in ARGS:
    render(camF, os.path.join(OUT, 'r_front.png'), 358, 622)
    render(camS, os.path.join(OUT, 'r_side.png'), 358, 622)
    render(camH, os.path.join(OUT, 'r_hero.png'), 600, 700)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'miniyaz_web.blend' if WEB else 'miniyaz.blend'))
if WEB:
    exec(open(os.path.join(HERE, 'export_web.py')).read())
print('done')
