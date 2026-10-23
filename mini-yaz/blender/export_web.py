# Runs inside build_miniyaz.py (WEB=1): bakes ambient occlusion into each part, then writes miniyaz.json for three.js.
# three.js axes: x = X, y = Z, z = -Y (Mini Yaz faces +z).
import base64
scene.cycles.samples = 96
scene.render.bake.target = 'VERTEX_COLORS'
scene.world.light_settings.distance = 0.3
for o in [smile] + [e for e, g in eyes] + [g for e, g in eyes]: o.hide_render = True   # the face features stay out of the bake
parts = [('head', head), ('hair', hair), ('bun', bun), ('body', body), ('armL', arms[0]), ('armR', arms[1])]
for name, ob in parts:
    ca = ob.data.color_attributes.new('ao', 'FLOAT_COLOR', 'POINT')
    ob.data.color_attributes.active_color = ca
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.object.bake(type='AO')
    # soften the baked shading across neighbouring points so a slanted shadow edge never reads as a staircase
    me = ob.data
    nbr = [[] for _ in me.vertices]
    for e in me.edges:
        a0, a1 = e.vertices; nbr[a0].append(a1); nbr[a1].append(a0)
    ao = np.array([ca.data[i].color[0] for i in range(len(me.vertices))])
    for _ in range(6 if name in ('head', 'hair') else 2):
        ao = 0.5 * ao + 0.5 * np.array([ao[n].mean() if n else ao[i] for i, n in enumerate(nbr)])
    for i in range(len(me.vertices)): ca.data[i].color = (ao[i], ao[i], ao[i], 1)
    print('baked', name, len(ob.data.vertices))
def b64(arr): return base64.b64encode(np.ascontiguousarray(arr).tobytes()).decode()
def to3(v): return [v[0], v[2], -v[1]]
def pack(ob, world=True, local_of=None):
    me = ob.data
    co = np.array([to3((ob.matrix_world @ v.co) if world else v.co) for v in me.vertices], dtype=np.float64)
    lo, hi = co.min(0), co.max(0)
    q = np.round((co - lo) / np.maximum(hi - lo, 1e-9) * 65535).astype(np.uint16)
    ao = np.array([me.color_attributes['ao'].data[i].color[0] for i in range(len(me.vertices))])
    out = dict(n=len(me.vertices), lo=lo.tolist(), hi=hi.tolist(), pos=b64(q), ao=b64(np.clip(np.round(ao * 255), 0, 255).astype(np.uint8)))
    return out
data = {}
# grid meshes rebuild their faces in JS from the ring layout
def ring_sizes(rings, N): return [1 if (r[1] < 1e-5 and r[2] < 1e-5) else N for r in rings]
data['head'] = pack(head); data['head']['rings'] = ring_sizes(headRings, NH)
bl = np.array([head.data.color_attributes['blush'].data[i].color[0] for i in range(len(head.data.vertices))])
data['head']['blush'] = b64(np.clip(np.round(bl * 255), 0, 255).astype(np.uint8))
data['bun'] = pack(bun); data['bun']['rings'] = ring_sizes(bunRings, 64)
data['hair'] = pack(hair); data['hair']['hair'] = [NM, M]
# arms: exported in their own space (pivot at the shoulder, hanging down -y); placement comes from the rig
data['arm'] = pack(arms[0], world=False); data['arm']['rings'] = ring_sizes(resample(armProf), 40)
data['arm']['aoR'] = pack(arms[1], world=False)['ao']
# body: an indexed mesh
me = body.data
me.calc_loop_triangles()
tris = np.array([t.vertices[:] for t in me.loop_triangles], dtype=np.uint16)
data['body'] = pack(body); data['body']['idx'] = b64(tris.reshape(-1))
# rig and face, in three.js space
data['rig'] = dict(shoulderL=to3(arms[0].location), shoulderR=to3(arms[1].location), armTilt=23,
                   neck=[0, 1.14, -D0 * -1], headCenter=to3((0, -H[len(H) // 2]['d'], 1.953)), bunBase=[0, P['bun']['z'] - P['bun']['r'] * 0.7, P['bun']['d']])
data['eyes'] = []
for eye, g in eyes:
    q = eye.rotation_quaternion
    nrm = q @ Vector((0, 0, 1))
    data['eyes'].append(dict(p=to3(eye.location), n=to3(nrm), s=[eye.scale[0], eye.scale[1], eye.scale[2]], glintR=0.024))
data['smile'] = dict(pts=[to3(p) for p in pts], r=cu.bevel_depth)
data['colors'] = dict(blue=[70, 130, 207], cream=[250, 235, 221], pink=[242, 158, 166])
json.dump(data, open(os.path.join(OUT, 'miniyaz.json'), 'w'))
print('exported', os.path.getsize(os.path.join(OUT, 'miniyaz.json')), 'bytes;', {k: v['n'] for k, v in data.items() if isinstance(v, dict) and 'n' in v})
