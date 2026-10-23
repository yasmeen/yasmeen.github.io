# Runs inside build_miniyaz.py (WEB=1): bakes ambient occlusion into each part, then writes miniyaz.json for three.js.
# three.js axes: x = X, y = Z, z = -Y (Mini Yaz faces +z).
import base64
scene.cycles.samples = 96
scene.render.bake.target = 'VERTEX_COLORS'
scene.world.light_settings.distance = 0.3
for o in [smile] + [e for e, g in eyes] + [g for e, g in eyes]: o.hide_render = True   # the face features stay out of the bake
def bake(ob, name):
    """bakes ambient occlusion into the mesh's points; returns it, softened across neighbouring points"""
    ca = ob.data.color_attributes.get('ao') or ob.data.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
    ob.data.color_attributes.active_color = ca
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='AO')
    # soften the baked shading across neighbouring points so a slanted shadow edge never reads as a staircase
    me = ob.data
    nbr = [[] for _ in me.vertices]
    for e in me.edges:
        a0, a1 = e.vertices; nbr[a0].append(a1); nbr[a1].append(a0)
    ao = np.array([ca.data[i].color[0] for i in range(len(me.vertices))])
    for _ in range(6 if name == 'head' else 2):
        ao = 0.5 * ao + 0.5 * np.array([ao[n].mean() if n else ao[i] for i, n in enumerate(nbr)])
    print('baked', name, len(ob.data.vertices))
    return ao
def store(ob, ao):
    ca = ob.data.color_attributes['ao']
    for i in range(len(ob.data.vertices)): ca.data[i].color = (ao[i], ao[i], ao[i], 1)
# the body stays in the scene, so it shades the head. The head is baked with and without the headphones: the band's
# shadow is kept at half strength (a soft contact shadow, not a dark line), and the bare one is for when a headset
# takes the headphones' place.
ao_with = bake(head, 'head')
phones.hide_render = pads.hide_render = True
ao_bare = bake(head, 'head')
phones.hide_render = pads.hide_render = False
store(head, ao_bare * (1 - 0.5 * (1 - np.clip(ao_with / np.maximum(ao_bare, 1e-3), 0, 1))))
# the band's underside, where it meets the head, would bake nearly black: a dark line under it from the front
store(phones, 0.3 + 0.7 * bake(phones, 'phones'))
store(pads, bake(pads, 'pads'))
def b64(arr): return base64.b64encode(np.ascontiguousarray(arr).tobytes()).decode()
def to3(v): return [v[0], v[2], -v[1]]
def pack(ob, world=True):
    me = ob.data
    co = np.array([to3((ob.matrix_world @ v.co) if world else v.co) for v in me.vertices], dtype=np.float64)
    lo, hi = co.min(0), co.max(0)
    q = np.round((co - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
    ao = np.array([me.color_attributes['ao'].data[i].color[0] for i in range(len(me.vertices))])
    return dict(n=len(me.vertices), lo=lo.tolist(), hi=hi.tolist(), pos=b64(q), ao=b64(np.clip(np.round(ao * 255), 0, 255).astype(np.uint8)))
def normals(ob):
    n = np.array(ob.data['nrm'], float)
    return b64(np.clip(np.round(np.stack([n[:, 0], n[:, 2], -n[:, 1]], 1) * 127), -127, 127).astype(np.int8).reshape(-1))
def tris(ob):
    me = ob.data; me.calc_loop_triangles()
    return b64(np.array([t.vertices[:] for t in me.loop_triangles], dtype=np.uint16).reshape(-1))
data = {}
# grid meshes rebuild their faces in JS from the ring layout; the rest carry a triangle list
def ring_sizes(rings, N): return [1 if (r[1] < 1e-5 and r[2] < 1e-5) else N for r in rings]
data['head'] = pack(head); data['head']['rings'] = ring_sizes(headRings, NH)
data['head']['aoBare'] = b64(np.clip(np.round(ao_bare * 255), 0, 255).astype(np.uint8))
data['phones'] = pack(phones); data['phones']['idx'] = tris(phones); data['phones']['nrm'] = normals(phones)
data['pads'] = pack(pads); data['pads']['idx'] = tris(pads); data['pads']['nrm'] = normals(pads)
# The body is drawn by the browser straight from its distance field (assets/mini-yaz/engine.js), with each arm turned
# about its shoulder, so the shoulders blend exactly in every pose. It gets the same field: the torso as a table of
# signed distance over (distance from its axis, height), stored as half floats, and the numbers for the legs and arms.
T, res, z0 = torsoD.table
T = T[::2, ::2]                                  # every other sample (0.008 apart) is plenty
data['shape'] = dict(
    torso=dict(n=[int(T.shape[1]), int(T.shape[0])], res=res * 2, z0=float(z0), y=BELLY_Y, depth=BELLY_D),
    torsoD=b64(T.astype(np.float16).view(np.uint16)),
    legs=dict(hip=list(LEG_HIP), foot=list(LEG_FOOT), long=LEG_LONG, k=LEG_K, crotch=0.06, ground=0.03),
    arm=dict(ARM, shoulder=list(SHOULDER), tilt=ARM_TILT),
    # a stand-in for the head, for the soft shadow it casts on the shoulders: an egg as wide as the head, flat underneath
    head=dict(center=float(TOP - 0.638 * HH), up=float(0.638 * HH), down=0.7, width=float(0.621 * HH), depth=HEAD_DEPTH, bottom=float(TOP - HH)))
rs_ = [r for r, t in HEAD_PROFILE]
print('torso table', T.shape, 'head widest', round(max(rs_) * HH, 3))
data['rig'] = dict(shoulderL=to3((-SHOULDER[0], SHOULDER[1], SHOULDER[2])), shoulderR=to3(SHOULDER), armTilt=ARM_TILT,
                   neck=[0, 1.5, 0], headCenter=[0, 2.34, 0])
data['split'] = dict(top=SPLIT_TOP, low=SPLIT_LOW, step=SPLIT_STEP)
data['eyes'] = []
for eye, g in eyes:
    nrm = eye.rotation_quaternion @ Vector((0, 0, 1))
    data['eyes'].append(dict(p=to3(eye.location), n=to3(nrm), s=[eye.scale[0], eye.scale[1], eye.scale[2]], glintR=0.016))
data['smile'] = dict(pts=[to3(p) for p in pts], r=cu.bevel_depth)
data['colors'] = dict(blue=list(BLUE), white=list(WHITE), phones=list(PHONES), pads=list(PADS))
json.dump(data, open(os.path.join(OUT, 'miniyaz.json'), 'w'))
print('exported', os.path.getsize(os.path.join(OUT, 'miniyaz.json')), 'bytes;', {k: v['n'] for k, v in data.items() if isinstance(v, dict) and 'n' in v})
