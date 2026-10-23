# Builds Mini Yaz in Blender: a glossy vinyl toy in the style of Apple's Little Finder Guy, as a girl (a bow, and
# lashes drawn in the browser). The proportions were measured from a front view of the Finder figure.
# Blender is Z-up; Mini Yaz faces -Y. Ground at z = 0, 3.15 to the top of the head.
# (The earlier clay version, built from reference/turn-*.png with profiles.py, is in the git history.)
import bpy, bmesh, json, math, sys, os, addon_utils
import numpy as np
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = ARGS[0] if ARGS else HERE
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

def surf_normal(rings, u, t):
    e = 1e-3
    du = ring_point(rings, u + e, t) - ring_point(rings, u - e, t)
    dt = ring_point(rings, u, t + e) - ring_point(rings, u, t - e)
    n = dt.cross(du).normalized()
    if n.dot(Vector((math.cos(t), math.sin(t), 0.0))) < 0: n = -n
    return n

def profile_rings(pts, n_rings, depth, cy=0.0, smooth_passes=6):
    """A closed profile from the top pole to the bottom pole, as (half-width, z) points, smoothed and resampled
    evenly along its length into loft rings. depth: half-depth as a fraction of the half-width."""
    p = np.array(pts, float)
    dense = []
    for i in range(len(p) - 1):
        for k in range(8): dense.append(p[i] + (p[i + 1] - p[i]) * k / 8)
    dense.append(p[-1]); d = np.array(dense)
    for _ in range(smooth_passes * 8):           # relax the polyline, keeping its two poles on the axis
        d[1:-1] = 0.5 * d[1:-1] + 0.25 * (d[:-2] + d[2:])
    seg = np.sqrt(((d[1:] - d[:-1]) ** 2).sum(1)); s = np.concatenate([[0], np.cumsum(seg)])
    ss = np.linspace(0, s[-1], n_rings)
    r = np.interp(ss, s, d[:, 0]); z = np.interp(ss, s, d[:, 1])
    r[0] = r[-1] = 0.0
    return [(float(z[i]), float(r[i]), float(r[i] * depth), cy) for i in range(n_rings)]

# ---------------- head: a soft gumdrop, a broad dome on top, widest low on the cheeks, a flat rounded underside ----------------
# Measured from the front view of the figure: half-width per height, in head heights from the top.
TOP, HH = 3.15, 1.62
HEAD_PROFILE = [(0.0, 0.0), (0.1, 0.003), (0.2, 0.018), (0.288, 0.049), (0.374, 0.098), (0.429, 0.147), (0.472, 0.196),
                (0.506, 0.245), (0.534, 0.294), (0.558, 0.344), (0.577, 0.393), (0.592, 0.442), (0.601, 0.491), (0.613, 0.54),
                (0.62, 0.589), (0.621, 0.638), (0.619, 0.687), (0.612, 0.736), (0.6, 0.785), (0.581, 0.834), (0.546, 0.883),
                (0.49, 0.933), (0.4, 0.972), (0.28, 0.993), (0.14, 1.0), (0.0, 1.0)]
HEAD_DEPTH = 0.9
headRings = profile_rings([(r * HH, TOP - t * HH) for r, t in HEAD_PROFILE], 72 if WEB else 140, HEAD_DEPTH)
NH = 128 if WEB else 192
head = loft('Head', headRings, NH)
u_max = len(headRings) - 1.0

def front_point(X, Z):
    """the head surface point seen from the front at (X, Z), and its normal"""
    us = np.linspace(0, u_max, 4000)
    zs = [interp_rings(headRings, u)[0] for u in us]
    u = float(np.interp(-Z, [-z for z in zs], us))
    z, a, b, cy = interp_rings(headRings, u)
    t = -math.acos(max(-1.0, min(1.0, X / a)))           # front half: sin(t) < 0 -> -Y
    return ring_point(headRings, u, t), surf_normal(headRings, u, t)

# The Finder face: the head is blue on Mini Yaz's right (your left) and white on the other side. The line between runs
# just left of center down the forehead, then steps over (the nose) a little below the eyes. Drawn by the browser's
# shader; these are its numbers, in Blender space.
SPLIT_TOP, SPLIT_LOW, SPLIT_STEP = -0.02, 0.12, TOP - 0.595 * HH

# ---------------- body: a soft round torso, with tapered legs and arms grown out of it, all one piece ----------------
# Every part is a distance field. The legs and arms are round cones, wide where they join and smaller at the end, and
# each joins the torso with a smooth union, so it grows out of it with a soft fillet. The result is meshed with
# marching cubes. The arms stay in this one surface; the browser bends them with a small skeleton (see export_web.py).
from skimage.measure import marching_cubes
def mono(xs, vs):
    """monotone cubic through (xs, vs), xs increasing: no overshoot and no kinks between the points (no ridges)"""
    xs, v = np.array(xs, float), np.array(vs, float); h = np.diff(xs); d = np.diff(v) / h
    m = np.zeros_like(v)
    for i in range(1, len(v) - 1):
        if d[i - 1] * d[i] > 0:
            w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    def f(x):
        i = min(max(np.searchsorted(xs, x) - 1, 0), len(xs) - 2)
        t = (x - xs[i]) / h[i]; t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * v[i] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * v[i + 1] + (t3 - t2) * h[i] * m[i + 1]
    return f
def profile_sdf(rows, r_max=1.4, res=0.004):
    """rows: (z, half-width) from the top pole to the bottom pole. Returns the signed distance (negative inside) in the
    (rho, z) plane, rho being the distance from the column's axis, as a lookup."""
    fa = mono([r[0] for r in rows][::-1], [r[1] for r in rows][::-1])
    ztop, zbot = rows[0][0], rows[-1][0]
    zs = np.linspace(ztop, zbot, 240); rs = np.array([max(0.0, float(fa(z))) for z in zs]); rs[0] = rs[-1] = 0.0
    P = np.stack([rs, zs], 1)
    gr = np.arange(0, r_max, res); gz = np.arange(zbot - 0.3, ztop + 0.3, res)
    R, Z = np.meshgrid(gr, gz); q = np.stack([R.ravel(), Z.ravel()], 1)
    d = np.full(len(q), 1e9)
    for a, b in zip(P[:-1], P[1:]):              # distance to each piece of the outline
        ab = b - a; t = np.clip(((q - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
        d = np.minimum(d, np.hypot(*(q - (a + np.outer(t, ab))).T))
    inside = (q[:, 1] < ztop) & (q[:, 1] > zbot) & (q[:, 0] < np.interp(-q[:, 1], -zs, rs))
    T = np.where(inside, -d, d).reshape(R.shape).astype(np.float32)
    def look(rho, z):
        fr = np.clip(rho / res, 0, len(gr) - 1.001); fz = np.clip((z - gz[0]) / res, 0, len(gz) - 1.001)
        i, j = fz.astype(np.int32), fr.astype(np.int32); u, v = fz - i, fr - j
        val = T[i, j] * (1 - u) * (1 - v) + T[i + 1, j] * u * (1 - v) + T[i, j + 1] * (1 - u) * v + T[i + 1, j + 1] * u * v
        return val + np.maximum(rho - gr[-1], 0)
    return look
def round_cone(P, a, b, r1, r2):
    """distance to a cone with round ends: radius r1 around a, r2 around b (P: n x 3)"""
    a, b = np.asarray(a, float), np.asarray(b, float)
    ba = b - a; l2 = ba @ ba; rr = r1 - r2; a2 = l2 - rr * rr; il2 = 1.0 / l2
    pa = P - a; y = pa @ ba; z = y - l2
    w = pa * l2 - np.outer(y, ba); x2 = (w * w).sum(1); y2 = y * y * l2; z2 = z * z * l2
    k = np.sign(rr) * rr * rr * x2
    out = (np.sqrt(np.maximum(x2 * a2 * il2, 0)) + y * rr) * il2 - r1
    end_b = np.sign(z) * a2 * z2 > k
    end_a = ~end_b & (np.sign(y) * a2 * y2 < k)
    out = np.where(end_b, np.sqrt(x2 + z2) * il2 - r2, out)
    return np.where(end_a, np.sqrt(x2 + y2) * il2 - r1, out)
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)
# the torso: a soft egg, narrower under the head and widest at the belly, its bottom tucked into the legs
torsoRows = [(1.75, 0.0), (1.7, 0.36), (1.6, 0.47), (1.45, 0.53), (1.25, 0.585), (1.05, 0.635), (0.85, 0.665), (0.7, 0.655),
             (0.6, 0.61), (0.52, 0.48), (0.47, 0.28), (0.45, 0.0)]
torsoD = profile_sdf(torsoRows)
# legs: wide at the hip, tapering to small round feet that just flatten where they stand
LEG_HIP, LEG_FOOT = (0.29, 0.0, 0.72, 0.35), (0.3, 0.0, 0.2, 0.21)          # (x, y, z, radius)
# arms: wide at the shoulder, tapering to a rounded hand, hanging out at ARM_TILT degrees. They meet the torso only at
# the shoulder (mostly under the head), with a gap below the armpit, so raising an arm doesn't drag the torso's side.
ARM_TILT, ARM_LEN, ARM_R = 38.0, 0.8, (0.215, 0.125)
SHOULDER = (0.6, 0.0, 1.42)
def arm_axis(s):
    t = math.radians(ARM_TILT); return np.array([s * math.sin(t), 0.0, -math.cos(t)])
def arm_end(s): return np.array([SHOULDER[0] * s, SHOULDER[1], SHOULDER[2]]) + arm_axis(s) * (ARM_LEN - ARM_R[1])
def d_trunk(P):
    """torso and legs"""
    x, y, z = P[:, 0], P[:, 1], P[:, 2]
    dT = torsoD(np.sqrt(x * x + (y / 0.85) ** 2), z)
    legs = [round_cone(P, (LEG_HIP[0] * s, 0, LEG_HIP[2]), (LEG_FOOT[0] * s, 0, LEG_FOOT[2]), LEG_HIP[3], LEG_FOOT[3]) for s in (-1, 1)]
    dL = smin(legs[0], legs[1], 0.05)              # the crotch, rounded
    dL = -smin(-dL, z, 0.03)                       # flat where the feet meet the ground, with a soft edge
    return smin(dT, dL, 0.16)
def d_arm(P, s):
    return round_cone(P, (SHOULDER[0] * s, SHOULDER[1], SHOULDER[2]), arm_end(s), ARM_R[0], ARM_R[1])
ARM_K = 0.06
def d_body(P):
    d = d_trunk(P)
    for s in (-1, 1): d = smin(d, d_arm(P, s), ARM_K)
    return d
VOX = 0.011 if WEB else 0.0085
gx = np.arange(-1.25, 1.25 + VOX, VOX); gy = np.arange(-0.75, 0.75 + VOX, VOX); gz = np.arange(-0.04, 1.86, VOX)
field = np.empty((len(gx), len(gy), len(gz)), np.float32)
GX, GY = np.meshgrid(gx, gy, indexing='ij')
for k0 in range(0, len(gz), 16):                   # in slabs, to keep memory small
    zz = gz[k0:k0 + 16]
    P = np.stack([np.repeat(GX[..., None], len(zz), 2).ravel(), np.repeat(GY[..., None], len(zz), 2).ravel(),
                  np.broadcast_to(zz, GX.shape + (len(zz),)).ravel()], 1)
    field[:, :, k0:k0 + 16] = d_body(P).reshape(GX.shape + (len(zz),))
bv, bf, _, _ = marching_cubes(field, 0.0, spacing=(VOX, VOX, VOX))
del field
bv += np.array([gx[0], gy[0], gz[0]])
body = mk('Body', bv, [tuple(f) for f in bf])
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True); bpy.context.view_layer.objects.active = body
sm = body.modifiers.new('smooth', 'SMOOTH'); sm.factor = 0.5; sm.iterations = 4     # just the voxel steps
bpy.ops.object.modifier_apply(modifier='smooth')
if WEB:
    dm = body.modifiers.new('dec', 'DECIMATE'); dm.ratio = min(1.0, 7000 / len(body.data.vertices))
    bpy.ops.object.modifier_apply(modifier='dec')
bpy.ops.object.shade_smooth()

# ---------------- the bow: two puffy loops and a knot, on top of the head on the white side ----------------
BOW_L = 0.4
bowH = [(0.0, 0.05), (0.1, 0.064), (0.25, 0.1), (0.45, 0.135), (0.65, 0.152), (0.8, 0.143), (0.9, 0.112), (0.96, 0.07), (1.0, 0.0)]
bowT = [(0.0, 0.055), (0.3, 0.064), (0.7, 0.068), (0.9, 0.056), (1.0, 0.0)]
def bow_loop(side, n=28):
    ss = np.linspace(0, 1, n)
    hs = np.interp(ss, [p[0] for p in bowH], [p[1] for p in bowH]); ts = np.interp(ss, [p[0] for p in bowT], [p[1] for p in bowT])
    hs = np.convolve(np.pad(hs, 1, mode='edge'), np.ones(3) / 3, mode='valid'); hs[-1] = 0
    ts = np.convolve(np.pad(ts, 1, mode='edge'), np.ones(3) / 3, mode='valid'); ts[-1] = 0
    ob = loft('BowLoop', [(-s * BOW_L, h, t, 0.0) for s, h, t in zip(ss, hs, ts)], 32 if WEB else 48)
    ob.rotation_euler = (0, -side * math.pi / 2, 0)               # the loop's spine runs out sideways, its height up
    ob.rotation_euler.rotate_axis('Y', side * math.radians(-12))   # and tips up a little
    return ob
loops = [bow_loop(-1), bow_loop(1)]
bpy.ops.mesh.primitive_uv_sphere_add(segments=32 if WEB else 48, ring_count=20 if WEB else 32, radius=1.0)
knot = bpy.context.active_object; knot.name = 'Knot'; knot.scale = (0.078, 0.075, 0.088)
bpy.ops.object.shade_smooth()
bpy.ops.object.select_all(action='DESELECT')
for o in loops + [knot]: o.select_set(True)
bpy.context.view_layer.objects.active = knot
bpy.ops.object.join()
bow = knot; bow.name = 'Bow'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# seat it where the head's outline tips 38 degrees from upright, on the white side, its face toward you
best = None
for i in range(1, len(headRings) - 1):
    dz, da = headRings[i + 1][0] - headRings[i - 1][0], headRings[i + 1][1] - headRings[i - 1][1]
    nrm = Vector((-dz, 0, da)).normalized()                    # the outline's outward normal
    tilt = math.degrees(math.acos(max(-1.0, min(1.0, nrm.z))))
    if best is None or abs(tilt - 38) < abs(best[0] - 38): best = (tilt, Vector((headRings[i][1], 0, headRings[i][0])), nrm)
BOW_TILT, BOW_AT, BOW_N = best
bow.rotation_euler = (0, math.radians(BOW_TILT), 0)
bow.location = BOW_AT + BOW_N * 0.08 + Vector((0, -0.12, 0))     # resting on the head, a touch forward
bpy.ops.object.select_all(action='DESELECT'); bow.select_set(True); bpy.context.view_layer.objects.active = bow
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# ---------------- face: bead eyes and a thin smile, placed on the head ----------------
EYE_X, EYE_Z, EYE_RX, EYE_RZ = 0.367, TOP - 0.552 * HH, 0.075, 0.085
eyes = []
for s in (-1, 1):
    p, n = front_point(EYE_X * s, EYE_Z)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=32, radius=1.0)
    eye = bpy.context.active_object; eye.name = 'Eye'
    eye.scale = (EYE_RX, EYE_RZ, 0.04)
    rot = n.to_track_quat('Z', 'Y')
    eye.rotation_mode = 'QUATERNION'; eye.rotation_quaternion = rot
    eye.location = p - n * 0.012
    bpy.ops.object.shade_smooth()
    hl_local = Vector((EYE_RX * 0.38, EYE_RZ * 0.45, 0.04))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.016)
    g = bpy.context.active_object; g.name = 'Glint'
    g.location = eye.location + rot @ hl_local
    eyes.append((eye, g))
SMILE_X, SMILE_Z, SMILE_HW, SMILE_SAG, SMILE_R = 0.054, TOP - 0.734 * HH, 0.135, 0.05, 0.016
pts = []
for i in range(17):
    u = i / 16 * 2 - 1
    p, n = front_point(SMILE_X + u * SMILE_HW, SMILE_Z + SMILE_SAG * u * u)
    pts.append(p + n * 0.004)
cu = bpy.data.curves.new('Smile', 'CURVE'); cu.dimensions = '3D'
spl = cu.splines.new('POLY'); spl.points.add(len(pts) - 1)
for i, q in enumerate(pts): spl.points[i].co = (q.x, q.y, q.z, 1)
cu.bevel_depth = SMILE_R; cu.bevel_resolution = 6; cu.use_fill_caps = True
smile = bpy.data.objects.new('Smile', cu); scene.collection.objects.link(smile)

# ---------------- materials: glossy vinyl, Finder blue and white ----------------
BLUE, WHITE = (38, 146, 238), (232, 237, 245)
def principled(name, base, rough=0.38, coat=0.25, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    for k, v in [('Base Color', base), ('Roughness', rough), ('Coat Weight', coat), ('Coat Roughness', 0.2), ('Specular IOR Level', spec)]:
        if k in bsdf.inputs: bsdf.inputs[k].default_value = v
    return m, nt, bsdf
def two_tone(name, left, right, profile):
    """left of the split (-X, Mini Yaz's right) one color, right of it the other; the head's split steps at the nose"""
    m, nt, bsdf = principled(name, srgb(*left))
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tc.outputs['Object'], sep.inputs[0])
    def math_(op, a, b):
        n_ = nt.nodes.new('ShaderNodeMath'); n_.operation = op
        for k, v in enumerate((a, b)):
            if isinstance(v, (int, float)): n_.inputs[k].default_value = v
            else: nt.links.new(v, n_.inputs[k])
        return n_.outputs[0]
    split = 0.0
    if profile:
        below = math_('LESS_THAN', sep.outputs['Z'], SPLIT_STEP)
        front = math_('LESS_THAN', sep.outputs['Y'], 0.0)
        split = math_('ADD', math_('MULTIPLY', math_('MULTIPLY', below, front), SPLIT_LOW - SPLIT_TOP), SPLIT_TOP)
    k = math_('GREATER_THAN', sep.outputs['X'], split)
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs[6].default_value = srgb(*left); mix.inputs[7].default_value = srgb(*right)
    nt.links.new(k, mix.inputs[0]); nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    return m
headM = two_tone('Vinyl Head', BLUE, WHITE, True)
bodyM = two_tone('Vinyl Body', WHITE, BLUE, False)
blueM, _, _ = principled('Vinyl Blue', srgb(*BLUE))
whiteM, _, _ = principled('Vinyl White', srgb(*WHITE))
eyeM, _, _ = principled('Eye', srgb(18, 16, 18), rough=0.15, coat=1.0, spec=0.6)
glintM, _, gb = principled('Glint', (1, 1, 1, 1), rough=0.3)
if 'Emission Color' in gb.inputs: gb.inputs['Emission Color'].default_value = (1, 1, 1, 1); gb.inputs['Emission Strength'].default_value = 4.0
lineM, _, _ = principled('Line', srgb(28, 26, 30), rough=0.5)
for o, mt in [(head, headM), (body, bodyM), (bow, blueM), (smile, lineM)] + [(e, eyeM) for e, g in eyes] + [(g, glintM) for e, g in eyes]:
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
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.82, 0.88, 0.96, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.6
def area(name, loc, size, power, color=(1, 1, 1)):
    L = bpy.data.lights.new(name, 'AREA'); L.size = size; L.energy = power; L.color = color
    o = bpy.data.objects.new(name, L); scene.collection.objects.link(o); o.location = loc
    d = Vector((0, 0, 1.6)) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    return o
area('Key', (-4, -6, 7), 6, 520, (1, 0.99, 0.97))
area('Fill', (5, -5, 3), 5, 180, (0.95, 0.97, 1))
area('Top', (0, -1, 8), 6, 170)
area('Rim', (3, 6, 5), 4, 200, (0.9, 0.94, 1))

def camera(name, loc, target, ortho=None, lens=85):
    cd = bpy.data.cameras.new(name)
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    else: cd.lens = lens
    o = bpy.data.objects.new(name, cd); scene.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    return o
camF = camera('Front', (0, -20, 1.7), (0, 0, 1.7), ortho=3.7)
camS = camera('Side', (-20, 0, 1.7), (0, 0, 1.7), ortho=3.7)
camH = camera('Hero', (4.6, -12.5, 2.6), (0, 0, 1.7), lens=100)

def render(cam, path, w, h):
    scene.camera = cam; scene.render.resolution_x = w; scene.render.resolution_y = h
    scene.render.filepath = path; bpy.ops.render.render(write_still=True)
if 'norender' not in ARGS:
    render(camF, os.path.join(OUT, 'r_front.png'), 600, 600)
    render(camS, os.path.join(OUT, 'r_side.png'), 600, 600)
    render(camH, os.path.join(OUT, 'r_hero.png'), 600, 700)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, 'miniyaz_web.blend' if WEB else 'miniyaz.blend'))
if WEB:
    exec(open(os.path.join(HERE, 'export_web.py')).read())
print('done')
