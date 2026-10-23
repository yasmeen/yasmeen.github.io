// Mini Yaz: a live 3D vinyl toy, in the style of Apple's Little Finder Guy. The model is built in Blender (shading
// baked) and drawn here with three.js (r169), driven by one clock: idle life, attention (follows the pointer),
// reactions (wave, hop, spin, dizzy), dozing off when nobody is around, and drag-to-spin.
// World units: ground at y = 0, 3.15 to the top of the head; Mini Yaz faces +z.
export function createMiniYaz(THREE, host, data, opts) {
  opts = opts || {};
  const BOX_H = 3.56;                          // world units shown by the layout box (the old 292 x 343 sprite box)
  const GROUND = 0.03;                         // ground sits 3% above the box bottom
  const EXTRA_TOP = 0.3, EXTRA_SIDE = 0.2;     // the canvas overhangs the box so hops and waves never clip
  const BASE_YAW = opts.yaw ?? 0.28;
  const STANCE = opts.stance || 'idle';
  const SLEEP_AFTER = opts.sleepAfter ?? 60000;   // ms without any input on the page before Mini Yaz dozes off
  // phones get a lower resolution cap; any device that can't keep up steps down further on its own
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  let maxDpr = opts.maxDpr ?? (coarse ? 1.5 : 2);

  // ---------- renderer ----------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: coarse ? 'low-power' : 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;
  // every lighting and material value in one place, so the look can be changed live with setLook()
  const LOOK = Object.assign({
    exposure: 0.95, env: 1.0, soft: 3.0, fill: 1.0, top: 2.0, rim: 1.5, room: 0.3,
    key: 2.6, keyX: -4, keyY: 6, keyZ: 6, hemi: 0.1,
    // glossy vinyl, Finder blue and white; the blue lifts toward a light cyan where it faces the top-left light
    blue: [38, 146, 238], white: [232, 237, 245], bow: null, cyan: [125, 218, 255], lift: 0.7,
    rough: 0.44, spec: 0.5, coat: 0.3, coatRough: 0.42,
    aoPow: 1.8, aoDirect: 0.6, sss: 0.04, edge: 0.4,
    // the face: bead eyes with lashes, a thin smile
    eyeSeat: 0.04, mouthW: 1.0, mouthR: 0.016, eyeGloss: 1.0, eyeW: 1.0, glint: 0.55, lash: 1.0
  }, opts.look || {});
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = LOOK.exposure;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  Object.assign(canvas.style, {
    position: 'absolute', left: (-EXTRA_SIDE * 100) + '%', top: (-EXTRA_TOP * 100) + '%',
    width: (100 + 2 * EXTRA_SIDE * 100) + '%', height: (100 + EXTRA_TOP * 100) + '%',
    pointerEvents: 'none', display: 'block'
  });
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(18, 1, 0.1, 100);

  // a cool, soft studio: a big bright panel and a key light from the top left, a dim fill on the right, an overhead,
  // and a rim from behind
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTex = null;
  const buildEnv = () => {
    const env = new THREE.Scene();
    const room = LOOK.room;
    env.add(new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(room * 0.93, room * 0.97, room), side: THREE.BackSide })));
    const panel = (w, h, x, y, z, lum) => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(lum, lum, lum), side: THREE.DoubleSide }));
      p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
    };
    panel(7, 5, -3, 5, 5.5, LOOK.soft);
    panel(5, 4, 4.5, 2, 4, LOOK.fill);
    panel(8, 3, 0, 6.5, 0, LOOK.top);
    panel(4, 5, 2, 2, -6, LOOK.rim);
    if (envTex) envTex.dispose();
    envTex = pmrem.fromScene(env, 0.04).texture;
    scene.environment = envTex;
    env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  };
  buildEnv();
  scene.environmentIntensity = LOOK.env;
  const key = new THREE.DirectionalLight(0xffffff, LOOK.key);
  key.position.set(LOOK.keyX, LOOK.keyY, LOOK.keyZ);
  scene.add(key);
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9d6e8, LOOK.hemi);
  scene.add(hemi);

  // ---------- glossy vinyl in two colors, with the shading baked in Blender (vertex AO) ----------
  // shared uniforms, so a look change never recompiles a shader
  const U = { uAoPow: { value: LOOK.aoPow }, uAoDirect: { value: LOOK.aoDirect }, uSss: { value: LOOK.sss }, uEdge: { value: LOOK.edge }, uLift: { value: LOOK.lift } };
  const faceUni = {
    uEyeA: { value: new THREE.Vector3(0, -9, 0) }, uEyeB: { value: new THREE.Vector3(0, -9, 0) }, uEyeS: { value: new THREE.Vector3(1, 1, 1) }, uEyeK: { value: LOOK.eyeSeat }
  };
  const mats = [];
  // the lifted color for a base color: blues lift toward the light cyan, whites stay white
  const liftOf = (c) => { const hsl = {}; c.getHSL(hsl); return Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b) > 0.3 && hsl.h > 0.5 && hsl.h < 0.7 ? rgb(LOOK.cyan) : c.clone(); };
  // a: the color left of the split (your left), b: right of it. split: [x, x below the nose, nose height, softness];
  // profile: the head's Finder face, where the line steps over below the nose (on the front only)
  const vinyl = (a, b, o) => {
    o = o || {};
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: o.rough ?? LOOK.rough, metalness: 0, specularIntensity: LOOK.spec,
      clearcoat: o.coat ?? LOOK.coat, clearcoatRoughness: LOOK.coatRough
    });
    const own = { uColA: { value: a.clone() }, uColB: { value: (b || a).clone() }, uLiftA: { value: liftOf(a) }, uLiftB: { value: liftOf(b || a) }, uSplit: { value: (o.split || [0, 0, -99, 0.01]).slice() }, uProfile: { value: o.profile ? 1 : 0 } };
    m.userData.own = own; m.userData.fixed = o.rough != null;
    const face = !!o.face;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U, own, face ? faceUni : {});
      sh.vertexShader = 'attribute float ao;\nvarying vec3 vObj;\nvarying float vAO;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;\nvAO = ao;');
      let fs = 'varying vec3 vObj;\nvarying float vAO;\nuniform float uAoPow, uAoDirect, uSss, uEdge, uProfile, uLift;\nuniform vec3 uColA, uColB, uLiftA, uLiftB;\nuniform vec4 uSplit;\n' +
        (face ? 'uniform vec3 uEyeA, uEyeB, uEyeS;\nuniform float uEyeK;\n' : '') + sh.fragmentShader;
      fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' +
        '  float sx = uSplit.x;\n' +
        '  if (uProfile > 0.5) sx = mix(uSplit.x, uSplit.y, smoothstep(uSplit.z + uSplit.w, uSplit.z - uSplit.w, vObj.y) * smoothstep(0.05, 0.3, vObj.z));\n' +
        '  float sd = vObj.x - sx, sw = fwidth(sd) * 0.8 + 1e-5;\n' +
        '  float side = smoothstep(-sw, sw, sd);\n  diffuseColor.rgb = mix(uColA, uColB, side);\n  vec3 liftC = mix(uLiftA, uLiftB, side);\n' +
        // a faint shadow where each eye bead sits on the face
        (face ? '  float eA = length((vObj - uEyeA) / uEyeS), eB = length((vObj - uEyeB) / uEyeS);\n  diffuseColor.rgb *= 1.0 - uEyeK * (1.0 - smoothstep(1.0, 1.32, min(eA, eB)));\n' : ''));
      // where the surface faces the big top-left light, the color lifts (the blue toward a light cyan, like the figure)
      fs = fs.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n  diffuseColor.rgb = mix(diffuseColor.rgb, liftC, uLift * pow(max(dot(normal, normalize(vec3(-0.45, 0.75, 0.5))), 0.0), 3.0));');
      fs = fs.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * uSss * vAO;   // a little light through the vinyl');
      fs = fs.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n  float occ = pow(vAO, uAoPow);\n  reflectedLight.indirectDiffuse *= occ;\n  reflectedLight.indirectSpecular *= occ;\n  reflectedLight.directDiffuse *= mix(1.0, occ, uAoDirect);\n' +
        '  float rimK = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\n  float dim = 1.0 - uEdge * rimK * rimK;   // surfaces turning away from you fall off a little\n' +
        '  reflectedLight.directDiffuse *= dim;\n  reflectedLight.indirectDiffuse *= dim;');
      sh.fragmentShader = fs;
    };
    m.customProgramCacheKey = () => (face ? 'my-vinyl-face' : 'my-vinyl');
    mats.push(m);
    return m;
  };
  const C = data.colors;
  const rgb = (a) => new THREE.Color().setRGB(a[0] / 255, a[1] / 255, a[2] / 255, THREE.SRGBColorSpace);
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // ---------- geometry from the Blender export ----------
  // the packed model hands over typed arrays; the plain JSON export is base64
  const dec = (v, T) => {
    if (typeof v !== 'string') return v;
    const s = atob(v), u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return new T(u.buffer);
  };
  const positions = (m, off) => {
    const q = dec(m.pos, Uint16Array), out = new Float32Array(m.n * 3);
    for (let i = 0; i < m.n; i++) for (let k = 0; k < 3; k++) out[i * 3 + k] = m.lo[k] + (q[i * 3 + k] / 65535) * (m.hi[k] - m.lo[k]) - (off ? off[k] : 0);
    return out;
  };
  const loftIndex = (rings) => {
    const idx = [], start = []; let o = 0;
    rings.forEach((n) => { start.push(o); o += n; });
    const N = Math.max(...rings);
    for (let i = 0; i < rings.length - 1; i++) {
      const a = start[i], b = start[i + 1], na = rings[i], nb = rings[i + 1];
      if (na === 1 && nb === 1) continue;
      for (let j = 0; j < N; j++) {
        const j1 = (j + 1) % N;
        if (na === 1) idx.push(a, b + j, b + j1);
        else if (nb === 1) idx.push(a + j, b, a + j1);
        else idx.push(a + j, b + j, b + j1, a + j, b + j1, a + j1);
      }
    }
    return idx;
  };
  const geo = (m, index, off, aoKey) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions(m, off), 3));
    g.setAttribute('ao', new THREE.BufferAttribute(dec(aoKey || m.ao, Uint8Array), 1, true));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  };
  const R = data.rig;
  const NECK = R.neck, HC = R.headCenter, BB = R.bowBase, SPLIT = data.split;

  // ---------- the rig ----------
  const root = new THREE.Group();          // hop, spin, lean (pivot at the feet)
  const squash = new THREE.Group();        // breathing and squash, volume kept
  root.add(squash);
  scene.add(root);
  // the Finder colors: the head is blue on your left and white on your right, the body the other way round
  const BLUE = () => rgb(LOOK.blue || C.blue), WHITE = () => rgb(LOOK.white || C.white);
  const bodyMat = vinyl(WHITE(), BLUE());
  squash.add(new THREE.Mesh(geo(data.body, Array.from(dec(data.body.idx, Uint16Array))), bodyMat));

  // arms: the exported mitten, skinned to a shoulder bone and an elbow bone so a wave bends it softly
  const armMats = [vinyl(WHITE()), vinyl(BLUE())];
  const makeArm = (s) => {
    const g = geo(data.arm, loftIndex(data.arm.rings), null, s < 0 ? data.arm.ao : data.arm.aoR);
    const pos = g.attributes.position, idx = [], wts = [];
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i), we = sstep(-0.26, -0.46, y), ww = sstep(-0.49, -0.6, y);   // shoulder, elbow, wrist
      idx.push(0, 1, 2, 0); wts.push(1 - we, we * (1 - ww), we * ww, 0);
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wts, 4));
    const shoulder = new THREE.Group();
    shoulder.position.fromArray(s < 0 ? R.shoulderL : R.shoulderR);
    const b0 = new THREE.Bone(), b1 = new THREE.Bone(), b2 = new THREE.Bone();
    b1.position.y = -0.36;
    b2.position.y = -0.18;
    b0.add(b1); b1.add(b2);
    const mesh = new THREE.SkinnedMesh(g, armMats[s < 0 ? 0 : 1]);
    mesh.add(b0);
    mesh.bind(new THREE.Skeleton([b0, b1, b2]));
    mesh.frustumCulled = false;
    shoulder.add(mesh);
    squash.add(shoulder);
    return { shoulder, elbow: b1, wrist: b2 };
  };
  const armL = makeArm(-1), armR = makeArm(1);
  const ARM_TILT = (R.armTilt * Math.PI) / 180;

  // head: pivots at the neck; the bow and the face ride along
  const neck = new THREE.Group();
  neck.position.fromArray(NECK);
  squash.add(neck);
  const head = new THREE.Group();
  neck.add(head);
  const headMat = vinyl(BLUE(), WHITE(), { face: true, profile: true, split: [SPLIT.top, SPLIT.low, SPLIT.step - NECK[1], 0.012] });
  const headGeo = geo(data.head, loftIndex(data.head.rings), NECK);
  head.add(new THREE.Mesh(headGeo, headMat));
  { const e = data.eyes[1].s; faceUni.uEyeS.value.set(e[0] * LOOK.eyeW, e[1], e[0] * LOOK.eyeW); }
  // the bow pivots where it sits on the head, so it can lag behind the head's moves
  const bowPivot = new THREE.Group();
  bowPivot.position.set(BB[0] - NECK[0], BB[1] - NECK[1], BB[2] - NECK[2]);
  head.add(bowPivot);
  const bowMat = vinyl(LOOK.bow ? rgb(LOOK.bow) : BLUE());
  const bow = new THREE.Mesh(geo(data.bow, Array.from(dec(data.bow.idx, Uint16Array)), BB), bowMat);
  bowPivot.add(bow);

  // face: the features ride in a pivot at the head center so the gaze can slide them across the surface
  const gaze = new THREE.Group();
  gaze.position.set(HC[0] - NECK[0], HC[1] - NECK[1], HC[2] - NECK[2]);
  head.add(gaze);
  const inkMat = new THREE.MeshPhysicalMaterial({ color: 0x0d0c0d, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, specularIntensity: 0.5, envMapIntensity: LOOK.eyeGloss });   // glossy beads
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xf1f3f6, toneMapped: false });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x1b1a1d, roughness: 0.4 });
  const makeEye = (e) => {
    const holder = new THREE.Group();
    holder.position.set(e.p[0] - HC[0], e.p[1] - HC[1], e.p[2] - HC[2]);
    holder.lookAt(holder.position.clone().add(new THREE.Vector3(e.n[0], e.n[1], e.n[2])));   // local z out of the face, y up
    const lid = new THREE.Group();
    holder.add(lid);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), inkMat);
    ball.scale.set(e.s[0] * LOOK.eyeW, e.s[1], e.s[2]);
    lid.add(ball);
    const gl = new THREE.Vector3(e.s[0] * 0.3, e.s[1] * 0.42, e.s[2] * 0.97);   // one highlight, up and in from the rim
    const g1 = new THREE.Mesh(new THREE.SphereGeometry(e.glintR, 20, 14), glintMat);
    g1.position.copy(gl);
    g1.scale.setScalar(LOOK.glint);
    lid.add(g1);   // one small highlight; the glossy bead reflects the rest
    // happy eyes: a soft arch the oval closes into
    const w = e.s[0] * 0.92 * LOOK.eyeW, arcPts = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14 * 2 - 1; arcPts.push(new THREE.Vector3(u * w, e.s[1] * (0.25 - 0.5 * u * u), e.s[2] * 0.7)); }
    const line = (pts, r) => {
      const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 10, false), lineMat);
      [pts[0], pts[pts.length - 1]].forEach((q) => { const c = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), lineMat); c.position.copy(q); g.add(c); });
      g.scale.setScalar(0.001);
      holder.add(g);
      return g;
    };
    const arc = line(arcPts, 0.014);
    // asleep: the arch turns over into a soft "u"
    const sleepPts = arcPts.map((q) => new THREE.Vector3(q.x, -q.y - e.s[1] * 0.1, q.z));
    const sleepArc = line(sleepPts, 0.013);
    // lashes: two little flicks at the outer corner, on the open eye and on both closed shapes
    const out = Math.sign(e.p[0] - HC[0]) || 1, rx = e.s[0] * LOOK.eyeW, ry = e.s[1];
    const lash = (parent, x, y, z, dx, dy, len) => {
      const d = new THREE.Vector2(dx, dy).normalize(), L = len * LOOK.lash, r = 0.0085;
      const pts = [new THREE.Vector3(x, y, z), new THREE.Vector3(x + d.x * L * 0.55, y + d.y * L * 0.55, z), new THREE.Vector3(x + d.x * L + out * 0.1 * L, y + d.y * L + 0.22 * L, z)];
      const g = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, r, 8, false), lineMat);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), lineMat); tip.position.copy(pts[2]); g.add(tip);
      parent.add(g);
    };
    [[42, 0.058], [72, 0.046]].forEach(([deg, len]) => {   // out from the rim, tipped up a little
      const a = deg * Math.PI / 180, nx = out * Math.sin(a) / rx, ny = Math.cos(a) / ry;
      lash(lid, out * rx * Math.sin(a), ry * Math.cos(a), 0.013, nx, ny + 0.6 * Math.hypot(nx, ny), len);
    });
    lash(arc, out * w * 0.9, ry * (0.25 - 0.5 * 0.81), e.s[2] * 0.7, out * 0.9, 0.45, 0.052);
    lash(arc, out * w * 0.62, ry * (0.25 - 0.5 * 0.384), e.s[2] * 0.7, out * 0.55, 0.85, 0.044);
    lash(sleepArc, out * w * 0.9, ry * (0.5 * 0.81 - 0.35), e.s[2] * 0.7, out * 0.75, -0.65, 0.05);
    lash(sleepArc, out * w * 0.6, ry * (0.5 * 0.36 - 0.35), e.s[2] * 0.7, out * 0.3, -0.95, 0.042);
    // dizzy: a spiral where the eye was
    const spiralPts = [];
    for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI * 5.2, r = 0.008 + (i / 64) * e.s[0] * 1.15 * LOOK.eyeW; spiralPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 1.15, e.s[2] * 0.72)); }
    const spiral = line(spiralPts, 0.01);
    gaze.add(holder);
    return { holder, lid, glints: [g1], arc, sleepArc, spiral };
  };
  const eyeL = makeEye(data.eyes[0]), eyeR = makeEye(data.eyes[1]);
  const smile = new THREE.Group();
  {
    const S0 = data.smile.pts, mid = S0[(S0.length - 1) >> 1];
    const P0 = S0.map((p) => [mid[0] + (p[0] - mid[0]) * LOOK.mouthW, p[1], p[2] + 0.003]);   // LOOK.mouthW scales its width
    smile.position.set(mid[0] - NECK[0], mid[1] - NECK[1], mid[2] - NECK[2]);
    const pts = P0.map((p) => new THREE.Vector3(p[0] - mid[0], p[1] - mid[1], p[2] - mid[2]));
    smile.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, LOOK.mouthR, 12, false), lineMat));
    [pts[0], pts[pts.length - 1]].forEach((q) => { const c = new THREE.Mesh(new THREE.SphereGeometry(LOOK.mouthR, 14, 10), lineMat); c.position.copy(q); smile.add(c); });
    head.add(smile);
  }
  // an open, happy "D" mouth for big moments. It is wrapped onto the face (each point found by casting a ray at the
  // head), and opens by sliding from the smile's top line down to the full shape.
  const headMesh = head.children[0];
  const mouthParts = [];
  {
    const P0 = data.smile.pts, mid = P0[(P0.length - 1) >> 1], sc = (q) => [mid[0] + (q[0] - mid[0]) * LOOK.mouthW, q[1], q[2]];
    const e0 = sc(P0[0]), e1 = sc(P0[P0.length - 1]);
    const hc = new THREE.Vector3(HC[0], HC[1], HC[2]);
    const c = new THREE.Vector3(mid[0], (e0[1] + e1[1]) / 2, mid[2]);
    const n = c.clone().sub(hc).normalize();
    const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), n).normalize(), vup = new THREE.Vector3().crossVectors(n, side).normalize();
    const hw = Math.abs(e1[0] - e0[0]) / 2 * 0.9, hh = Math.max(0.05, ((e0[1] + e1[1]) / 2 - mid[1]) * 2.6);
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(), neckV = new THREE.Vector3(NECK[0], NECK[1], NECK[2]);
    const onFace = (x, y, lift) => {
      const p = c.clone().addScaledVector(side, x).addScaledVector(vup, y);
      ray.set(p.clone().addScaledVector(n, 0.5), n.clone().negate());
      const hit = ray.intersectObject(headMesh, false)[0];
      return (hit ? hit.point : p).addScaledVector(n, lift).sub(neckV);
    };
    const make = (shape, color, lift) => {
      const g = new THREE.ShapeGeometry(shape, 28), pos = g.attributes.position;
      const open = new Float32Array(pos.count * 3), shut = new Float32Array(pos.count * 3), nrm = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const a = onFace(pos.getX(i), pos.getY(i), lift), b = onFace(pos.getX(i), 0, lift);
        open.set([a.x, a.y, a.z], i * 3); shut.set([b.x, b.y, b.z], i * 3); nrm.set([n.x, n.y, n.z], i * 3);
      }
      g.setAttribute('position', new THREE.BufferAttribute(shut.slice(), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      mesh.visible = false;
      head.add(mesh);
      mouthParts.push({ mesh, open, shut, attr: g.attributes.position });
    };
    const d = new THREE.Shape();
    d.moveTo(hw, 0); d.absellipse(0, 0, hw, hh, 0, Math.PI, true); d.lineTo(hw, 0);       // straight top, round bottom
    make(d, 0x5c2023, 0.006);
    const tg = new THREE.Shape();
    tg.absellipse(0, -hh * 0.64, hw * 0.48, hh * 0.3, 0, Math.PI * 2, false);
    make(tg, 0xec8b91, 0.0075);
  }
  let mouthNow = -1;
  const setMouth = (k) => {
    if (Math.abs(k - mouthNow) < 1e-3) return;
    mouthNow = k;
    mouthParts.forEach((mp) => {
      mp.mesh.visible = k > 0.02;
      const a = mp.attr.array;
      for (let i = 0; i < a.length; i++) a[i] = mp.shut[i] + (mp.open[i] - mp.shut[i]) * k;
      mp.attr.needsUpdate = true;
    });
  };


  // ground: one soft contact shadow, smaller and lighter when in the air
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.75), new THREE.MeshBasicMaterial({ map: blobTex, color: 0x10306b, transparent: true, opacity: 0.32, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.002;
  scene.add(blob);
  const setDark = (dark) => {
    blob.material.color.set(dark ? 0x000000 : 0x10306b);
    blob.userData.base = dark ? 0.5 : 0.32;
  };
  setDark(!!opts.dark);

  // ---------- props: small things that belong to a page ----------
  const tint = (hex, o) => vinyl(new THREE.Color(hex), null, o);
  const lit = (geom) => { geom.setAttribute('ao', new THREE.BufferAttribute(new Uint8Array(geom.attributes.position.count).fill(235), 1, true)); return geom; };
  const plain = (geom, hex, o) => new THREE.Mesh(lit(geom), tint(hex, o));
  const labelTex = (w, h, draw) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  // held props stay upright: they ride on the body and are moved to the hand's position every frame
  const held = [];
  const hand = (grp, at, nudge) => { squash.add(grp); held.push({ grp, at: at || [0, -0.12, 0], nudge: nudge || [0, 0, 0] }); return grp; };
  const PROPS = {
    // an open laptop on the floor beside Mini Yaz, its screen showing a blue Aqua desktop
    laptop: () => {
      const g = new THREE.Group();
      const base = plain(new THREE.BoxGeometry(0.86, 0.05, 0.6), 0xd9dde3, { rough: 0.6 });
      base.position.y = 0.025;
      const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.3), new THREE.MeshStandardMaterial({ color: 0x3d4148, roughness: 0.8 }));
      keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.051, -0.06);
      const lid = new THREE.Group();
      lid.position.set(0, 0.05, -0.3);
      lid.rotation.x = -0.32;
      const shell = plain(new THREE.BoxGeometry(0.86, 0.6, 0.035), 0xd9dde3, { rough: 0.6 });
      shell.position.set(0, 0.3, -0.018);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.5), new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: labelTex(256, 168, (x, w, h) => {
          const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#6FB2F7'); bg.addColorStop(1, '#1D5FC0');
          x.fillStyle = bg; x.fillRect(0, 0, w, h);
          x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 18;
          x.beginPath(); x.moveTo(-20, h * 0.85); x.bezierCurveTo(w * 0.3, h * 0.35, w * 0.6, h * 1.0, w + 20, h * 0.3); x.stroke();
          x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 0, w, 12);
          x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); if (x.roundRect) x.roundRect(36, 38, 128, 84, 6); else x.rect(36, 38, 128, 84); x.fill();
          x.fillStyle = '#ddd'; x.fillRect(36, 38, 128, 12);
          ['#EE5A50', '#F2B53C', '#5CC35A'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(44 + i * 10, 44, 3.4, 0, 7); x.fill(); });
          x.fillStyle = '#9fb4cf'; for (let i = 0; i < 5; i++) x.fillRect(46, 60 + i * 11, 40 + ((i * 37) % 60), 5);
        })
      }));
      screen.position.set(0, 0.3, 0.001);
      lid.add(shell, screen);
      g.add(base, keys, lid);
      g.position.set(-1.2, 0, 0.4);
      g.rotation.y = 0.6;
      g.scale.setScalar(1.05);
      scene.add(g);
      return g;
    },
    // running shoes over both feet
    shoes: () => {
      const g = new THREE.Group();
      [-1, 1].forEach((s) => {
        const shoe = new THREE.Group();
        const sole = plain(new THREE.CylinderGeometry(1, 1, 1, 40), 0xfbfaf6, { rough: 0.7 });
        sole.scale.set(0.31, 0.07, 0.53); sole.position.set(0, 0.035, 0.03);
        const upper = plain(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), 0xd8e85a);
        upper.scale.set(0.3, 0.27, 0.515); upper.position.set(0, 0.06, 0.03);
        const stripe = plain(new THREE.TorusGeometry(1, 0.06, 8, 40, Math.PI * 0.9), 0xffffff);
        stripe.scale.set(0.307, 0.12, 0.42); stripe.position.set(0, 0.085, 0.01);
        const lace = plain(new THREE.TorusGeometry(0.055, 0.018, 8, 20), 0xf4a6b6);
        lace.position.set(0, 0.3, 0.27); lace.rotation.x = -0.9;
        shoe.add(sole, upper, stripe, lace);
        shoe.position.set(s * 0.33, 0, 0.0);
        shoe.rotation.y = s * 0.08;
        g.add(shoe);
      });
      squash.add(g);
      return g;
    },
    // a folded paper map, held up in front, for the 404 page
    map: () => {
      const g = new THREE.Group();
      const tex = labelTex(256, 180, (x, w, h) => {
        x.fillStyle = '#F7F1DE'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#CFE6C3'; x.beginPath(); x.ellipse(70, 60, 60, 38, 0.3, 0, 7); x.fill(); x.beginPath(); x.ellipse(200, 140, 50, 30, -0.2, 0, 7); x.fill();
        x.strokeStyle = '#8CC0EE'; x.lineWidth = 12; x.beginPath(); x.moveTo(0, 120); x.bezierCurveTo(80, 90, 140, 170, 256, 100); x.stroke();
        x.strokeStyle = '#E2C77E'; x.lineWidth = 6; x.beginPath(); x.moveTo(30, 0); x.lineTo(110, 180); x.moveTo(0, 40); x.lineTo(256, 70); x.stroke();
        x.setLineDash([7, 7]); x.strokeStyle = '#D0453A'; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 150); x.bezierCurveTo(90, 40, 150, 160, 196, 52); x.stroke(); x.setLineDash([]);
        x.strokeStyle = '#D0453A'; x.lineWidth = 6; x.beginPath(); x.moveTo(186, 42); x.lineTo(206, 62); x.moveTo(206, 42); x.lineTo(186, 62); x.stroke();
        x.fillStyle = 'rgba(0,0,0,.07)'; x.fillRect(w / 3 - 1, 0, 2, h); x.fillRect(2 * w / 3 - 1, 0, 2, h);
      });
      const W = 1.0, H = 0.66;
      for (let i = 0; i < 3; i++) {
        const geo3 = new THREE.PlaneGeometry(W / 3, H);
        const uv = geo3.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / 3);
        const panel = new THREE.Mesh(geo3, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
        panel.position.x = (i - 1) * (W / 3) * 0.96;
        panel.position.z = i === 1 ? 0 : -0.05;
        panel.rotation.y = (1 - i) * 0.3;
        g.add(panel);
      }
      const o = opts.mapAt || [0, 0.86, 0.78, -0.35, 0, 0.1];
      g.position.set(o[0], o[1], o[2]);
      g.rotation.set(o[3], o[4], o[5]);
      squash.add(g);
      return g;
    },
    // the rest are for the project illustrations (rendered once, see mini-yaz/tools/render.mjs)
    bib: () => {
      const tex = labelTex(256, 200, (x, w, h) => {
        x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h);
        x.fillStyle = '#E2493B'; x.fillRect(0, 0, w, 34);
        x.fillStyle = '#1C1C1C'; x.font = '700 92px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('NYC', w / 2, h * 0.6);
        x.fillStyle = '#888'; [24, w - 24].forEach((cx) => { x.beginPath(); x.arc(cx, 17, 6, 0, 7); x.fill(); });
      });
      const g = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.3, 32, 1, true, -0.62, 1.24), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }));
      g.position.set(0, 0.8, 0);
      g.scale.set(0.78, 1, 0.65);
      squash.add(g);
      return g;
    },
    trophy: () => {
      const gold = new THREE.MeshStandardMaterial({ color: 0xf2c24b, metalness: 1, roughness: 0.28 });
      const g = new THREE.Group();
      const prof = [[0, 0], [0.15, 0], [0.15, 0.03], [0.06, 0.06], [0.035, 0.13], [0.035, 0.2], [0.1, 0.24], [0.17, 0.32], [0.2, 0.46], [0.19, 0.5], [0.17, 0.5]];
      const cup = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 40), gold);
      [-1, 1].forEach((s) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 24, Math.PI * 1.1), gold); h.position.set(s * 0.2, 0.39, 0); h.rotation.z = s > 0 ? -Math.PI / 2 + 0.2 : Math.PI / 2 - 0.2 + Math.PI; g.add(h); });
      g.add(cup);
      g.rotation.set(0.15, 0, -0.25);
      g.scale.setScalar(1.35);
      return hand(g, [0, -0.13, 0], [0.05, 0.02, 0]);
    },
    visor: () => {
      // a mixed reality headset: a band around the head and a tinted visor in front of the eyes
      const g = new THREE.Group();
      const band = plain(new THREE.TorusGeometry(1, 0.055, 10, 72), 0xf1f3f6, { rough: 0.45 });
      band.scale.set(0.995, 0.9, 1); band.rotation.x = Math.PI / 2 + 0.08; band.position.set(0, 2.4, -0.01);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.42, 48, 1, true, -1.05, 2.1), new THREE.MeshPhysicalMaterial({
        color: 0x7fc1ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false
      }));
      lens.scale.set(1.03, 0.9, 0.93); lens.position.set(0, 2.26, 0);
      const brow = plain(new THREE.CylinderGeometry(1, 1, 0.09, 48, 1, true, -1.1, 2.2), 0xf1f3f6, { rough: 0.45 });
      brow.scale.set(1.04, 1, 0.94); brow.position.set(0, 2.45, 0);
      g.add(band, lens, brow);
      g.position.set(-NECK[0], -NECK[1], -NECK[2]);
      head.add(g);
      return g;
    },
    phone: () => {
      const g = new THREE.Group();
      const body = plain(new THREE.BoxGeometry(0.3, 0.56, 0.035), 0x2b2f36, { rough: 0.4 });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.52), new THREE.MeshBasicMaterial({
        toneMapped: false,
        map: labelTex(120, 230, (x, w, h) => {
          const bg = x.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#DDE6F4'); bg.addColorStop(1, '#B8C7E2');
          x.fillStyle = bg; x.fillRect(0, 0, w, h);
          x.fillStyle = '#F2A13B'; x.fillRect(38, 70, 44, 80); x.fillStyle = '#FFFFFF'; x.fillRect(32, 58, 56, 16); x.fillRect(42, 96, 36, 30);
          x.strokeStyle = '#2F7FE0'; x.lineWidth = 4; x.strokeRect(24, 48, 72, 112);
          x.fillStyle = '#2F7FE0'; x.beginPath(); x.roundRect ? x.roundRect(18, 172, 84, 30, 8) : x.rect(18, 172, 84, 30); x.fill();
          x.fillStyle = '#FFFFFF'; x.font = '700 15px sans-serif'; x.textAlign = 'center'; x.fillText('2 left', 60, 192);
        })
      }));
      scr.position.z = 0.0185;
      g.add(body, scr);
      g.rotation.set(-0.12, -0.25, 0.08);
      return hand(g, [0, -0.12, 0], [-0.06, 0.2, 0.08]);
    },
    coin: () => {
      const gold = new THREE.MeshStandardMaterial({ color: 0xf0bf45, metalness: 1, roughness: 0.3 });
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 48), gold);
      disc.rotation.x = Math.PI / 2;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.018, 8, 48), gold);
      ring.position.z = 0.036;
      const star = new THREE.Shape();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.06 : 0.19; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
      const em = new THREE.Mesh(new THREE.ExtrudeGeometry(star, { depth: 0.02, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.01, bevelSegments: 2 }), gold);
      em.position.z = 0.03;
      g.add(disc, ring, em);
      g.position.set(0, 0.78, 0.64);
      g.rotation.set(-0.1, 0, 0);
      squash.add(g);
      return g;
    }
  };
  const props = {};
  (opts.props || []).forEach((name) => { if (PROPS[name]) props[name] = PROPS[name](); });

  // ---------- motion engine ----------
  const bez = (x1, y1, x2, y2) => {
    const X = (t) => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t;
    const Y = (t) => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
    return (p) => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      let lo = 0, hi = 1, t = p;
      for (let i = 0; i < 22; i++) { if (X(t) < p) lo = t; else hi = t; t = (lo + hi) / 2; }
      return Y(t);
    };
  };
  const EASE_IN_OUT = bez(0.77, 0, 0.175, 1), EASE_OUT = bez(0.23, 1, 0.32, 1), EASE_SPIN = bez(0.45, 0, 0.55, 1);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wave = (t, period, phase = 0) => Math.sin((t / period + phase) * Math.PI * 2);
  const seg = (t, a, b, c = 'out') => (t <= a ? 0 : t >= b ? 1 : (c === 'out' ? EASE_OUT : EASE_IN_OUT)((t - a) / (b - a)));
  const track = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const k1 = keys[i];
      if (t <= k1[0]) {
        const k0 = keys[i - 1], span = k1[0] - k0[0], p = span > 0 ? (t - k0[0]) / span : 1;
        return k0[1] + (k1[1] - k0[1]) * (k1[2] === 'out' ? EASE_OUT(p) : EASE_IN_OUT(p));
      }
    }
    return keys[keys.length - 1][1];
  };
  const flow = (t, k) => {
    const n = k.length;
    if (t <= k[0][0]) return k[0][1];
    if (t >= k[n - 1][0]) return k[n - 1][1];
    let i = 0;
    while (k[i + 1][0] < t) i++;
    const slope = (j) => (k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0]);
    const tan = (j) => {
      if (j === 0 || j === n - 1) return 0;
      const a = slope(j - 1), b = slope(j);
      if (a * b <= 0) return 0;
      const h0 = k[j][0] - k[j - 1][0], h1 = k[j + 1][0] - k[j][0], w0 = 2 * h1 + h0, w1 = h1 + 2 * h0;
      return (w0 + w1) / (w0 / a + w1 / b);
    };
    const h = k[i + 1][0] - k[i][0], s = (t - k[i][0]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * k[i][1] + (s3 - 2 * s2 + s) * h * tan(i) + (-2 * s3 + 3 * s2) * k[i + 1][1] + (s3 - s2) * h * tan(i + 1);
  };
  // critically damped spring: smooth, never overshoots, can be interrupted at any time
  const spring = (s, target, omega, dt) => {
    const x = s.x - target, e = Math.exp(-omega * dt);
    const nx = (x + (s.v + omega * x) * dt) * e;
    s.v = (s.v - omega * (s.v + omega * x) * dt) * e;
    s.x = nx + target;
    return s.x;
  };
  const S = () => ({ x: 0, v: 0 });
  const BLINK = [[0, 0], [110, 1], [150, 1], [340, 0, 'out']];
  const CH = ['y', 'sy', 'yaw', 'lean', 'hYaw', 'hPitch', 'hRoll', 'aLz', 'aLx', 'eL', 'wL', 'aRz', 'aRx', 'eR', 'wR', 'lid', 'happy', 'gx', 'gy', 'face', 'mouth', 'spark', 'dizzy'];
  const MAXED = ['lid', 'happy', 'face', 'spark', 'dizzy'];   // these blend by taking the larger value, not by adding
  const zero = () => { const o = {}; CH.forEach((c) => { o[c] = 0; }); return o; };
  const D = Math.PI / 180;

  const hop = (t, a, b, h, o) => {
    const p = t > a && t < b ? (t - a) / (b - a) : -1;
    o.y += p >= 0 ? 4 * h * p * (1 - p) : 0;                                 // gravity: a parabola
    o.sy += flow(t, [[0, 0], [a - 30, -0.09], [a + 60, 0.075], [(a + b) / 2, 0], [b - 20, 0.05], [b + 25, -0.16], [b + 130, -0.02], [b + 300, 0]]);
    o.mouth = Math.max(o.mouth, flow(t, [[0, 0], [a - 10, 0], [a + 90, 1], [b + 180, 1], [b + 420, 0]]));
    o.hPitch += flow(t, [[0, 0], [a - 20, 4 * D], [a + 70, -5 * D], [b + 30, 6 * D], [b + 260, 0]]);
    o.aLz += flow(t, [[0, 0], [a - 20, 3 * D], [a + 100, -28 * D], [b - 40, -10 * D], [b + 40, -22 * D], [b + 260, 0]]);
    o.aRz += flow(t, [[0, 0], [a - 20, -3 * D], [a + 110, 30 * D], [b - 30, 10 * D], [b + 50, 24 * D], [b + 280, 0]]);
    o.happy = Math.max(o.happy, flow(t, [[0, 0], [a, 0], [a + 120, 1], [b + 200, 1], [b + 500, 0]]));
    return o;
  };
  const waveHi = (t, o) => {
    // turn to face you, raise the near-side hand out past the cheek, and wave it from the elbow.
    // Each part's wiggle starts from zero and eases in, so the hand never jumps.
    const P = 440;
    const w = (lag) => { const tt = t - lag; return Math.sin(((tt - 470) / P) * Math.PI * 2) * seg(tt, 470, 800, 'inOut') * (1 - seg(tt, 1950, 2200, 'inOut')); };
    o.yaw += flow(t, [[0, 0], [320, -BASE_YAW], [2200, -BASE_YAW], [2600, 0]]);
    o.aRz += flow(t, [[0, 0], [110, -6 * D], [450, 90 * D], [2150, 90 * D], [2600, 0]]) + 6 * D * w(0);
    o.aRx += flow(t, [[0, 0], [220, 34 * D], [450, 58 * D], [2150, 58 * D], [2450, 30 * D], [2650, 0]]);   // forward first, so the hand rises clear of the head
    o.eR += flow(t, [[0, 0], [320, 10 * D], [470, 34 * D], [2150, 34 * D], [2600, 0]]) + 12 * D * w(90);
    o.wR += flow(t, [[0, 0], [470, 8 * D], [2150, 8 * D], [2600, 0]]) + 30 * D * w(170);   // the hand flaps last: shoulder, elbow, wrist
    const bounce = seg(t, 470, 800, 'inOut') * (1 - seg(t, 1950, 2200, 'inOut'));
    o.y += 0.022 * (0.5 - 0.5 * Math.cos(((t - 470) / P) * Math.PI * 2)) * bounce;
    o.mouth = flow(t, [[0, 0], [420, 0], [600, 1], [2050, 1], [2350, 0]]);   // forearm up beside the face; the hand trails the arm
    o.aLz += flow(t, [[0, 0], [430, -8 * D], [2150, -8 * D], [2600, 0]]);
    o.hRoll += flow(t, [[0, 0], [300, 0], [600, -7 * D], [2150, -7 * D], [2600, 0]]) + 1.6 * D * w(60);
    o.lean += flow(t, [[0, 0], [500, 2 * D], [2150, 2 * D], [2600, 0]]);
    o.sy += flow(t, [[0, 0], [110, -0.03], [300, 0.025], [520, 0]]) + 0.008 * w(30);
    o.happy = Math.max(o.happy, flow(t, [[0, 0], [380, 0], [560, 1], [2100, 1], [2500, 0]]));
    o.face += flow(t, [[0, 0], [320, 1], [2200, 1], [2600, 0]]);       // eyes and head come back to you
    return o;
  };
  const spinA = (t) => {
    const o = hop(t, 170, 800, 0.4, zero());
    o.aLz += flow(t, [[0, 0], [320, -30 * D], [720, -24 * D], [860, -8 * D], [1100, 0]]);   // arms fling out in the turn
    o.aRz += flow(t, [[0, 0], [320, 32 * D], [720, 25 * D], [870, 9 * D], [1120, 0]]);
    o.yaw += Math.PI * 2 * EASE_SPIN(clamp((t - 180) / 660, 0, 1));
    o.gx += flow(t, [[0, 0], [120, 0.12], [260, 0.12], [860, 0]]);
    o.lid = Math.max(o.lid, track(t - 90, BLINK));
    return o;
  };
  // small things Mini Yaz does on its own when nobody is interacting
  const idleLook = (t) => {
    const o = zero();
    o.hYaw += flow(t, [[0, 0], [420, 0.38], [1150, 0.38], [1650, -0.3], [2300, -0.3], [2800, 0]]);
    o.hRoll += flow(t, [[0, 0], [420, -0.05], [1150, -0.05], [1650, 0.05], [2300, 0.05], [2800, 0]]);
    o.gx += flow(t, [[0, 0], [300, 0.1], [1150, 0.1], [1500, -0.1], [2300, -0.1], [2700, 0]]);
    o.lid = Math.max(track(t - 300, BLINK), track(t - 1450, BLINK));
    return o;
  };
  const idleStretch = (t) => {
    const o = zero(), up = flow(t, [[0, 0], [500, 1], [1500, 1], [2100, 0]]);
    o.aLz += -1.35 * up; o.aRz += 1.35 * up; o.eL += -0.3 * up; o.eR += 0.3 * up;
    o.sy += 0.035 * up; o.hPitch += -0.1 * up;
    o.lid = flow(t, [[0, 0], [450, 0], [650, 0.95], [1400, 0.95], [1700, 0]]);
    o.mouth = flow(t, [[0, 0], [500, 0], [700, 0.5], [1400, 0.5], [1700, 0]]);   // a little yawn
    return o;
  };
  // five quick taps: the eyes turn to spirals and the head wobbles in circles until it shakes it off
  const dizzyA = (t) => {
    const o = zero();
    const env = flow(t, [[0, 0], [180, 1], [2300, 1], [2700, 0]]);
    const P = 300, ph = (t / P) * Math.PI * 2;
    o.dizzy = flow(t, [[0, 0], [120, 1], [2350, 1], [2550, 0]]);
    o.hRoll += 0.17 * Math.sin(ph) * env; o.hPitch += 0.08 * Math.cos(ph) * env;
    o.lean += 0.05 * Math.sin(ph * 0.5 + 0.6) * env; o.yaw += 0.12 * Math.sin(ph * 0.5) * env;
    o.aLz += (-0.22 + 0.2 * Math.sin(ph + 1.3)) * env; o.aRz += (0.22 + 0.2 * Math.sin(ph + 2.1)) * env;
    o.sy += flow(t, [[0, 0], [150, -0.04], [400, 0.01], [700, 0]]) + 0.012 * Math.sin(ph * 2) * env;
    o.hYaw += flow(t, [[0, 0], [2300, 0], [2400, 0.2], [2500, -0.2], [2600, 0.12], [2700, 0]]);   // shake it off
    o.mouth = flow(t, [[0, 0], [200, 0.3], [2200, 0.3], [2500, 0]]);
    return o;
  };
  // woken from a nap: a little jump, eyes wide, arms out
  const startleA = (t) => {
    const o = hop(t, 40, 300, 0.2, zero());
    o.spark = flow(t, [[0, 0], [60, 1], [900, 1], [1300, 0]]);
    o.aLz += flow(t, [[0, 0], [90, -0.7], [500, -0.3], [1100, 0]]);
    o.aRz += flow(t, [[0, 0], [90, 0.7], [520, 0.3], [1120, 0]]);
    o.hYaw += flow(t, [[0, 0], [380, 0], [520, 0.22], [700, -0.22], [860, 0.1], [1000, 0]]);
    o.happy = 0;
    o.mouth = flow(t, [[0, 0], [60, 0.8], [500, 0.8], [800, 0]]);
    return o;
  };
  // a happy little cheer, for things worth cheering about on the page
  const cheerA = (t) => {
    const o = hop(t, 120, 430, 0.26, zero());
    const up = flow(t, [[0, 0], [160, 1], [700, 1], [1000, 0]]);
    o.aLz += -1.3 * up; o.aRz += 1.3 * up; o.eL += -0.4 * up; o.eR += 0.4 * up;
    o.happy = Math.max(o.happy, up);
    return o;
  };
  const ACTIONS = {
    idleLook: { dur: 2800, run: idleLook, idle: true },
    idleBounce: { dur: 760, run: (t) => hop(t, 140, 400, 0.12, zero()), idle: true },
    idleStretch: { dur: 2200, run: idleStretch, idle: true },
    wave: { dur: 2650, run: (t) => waveHi(t, zero()) },
    hop: { dur: 900, run: (t) => hop(t, 150, 480, 0.3, zero()) },
    spin: { dur: 1200, run: spinA },
    dizzy: { dur: 2750, run: dizzyA },
    startle: { dur: 1300, run: startleA },
    cheer: { dur: 1100, run: cheerA }
  };
  const ORDER = opts.first === 'spin' ? ['spin', 'wave', 'hop'] : opts.first === 'hop' ? ['hop', 'wave', 'spin'] : ['wave', 'hop', 'spin'];

  // ---------- state ----------
  const rnd = (() => { let s = 0x2f6b9e1d; return () => { s = (s + 0x6d2b79f5) | 0; let r = Math.imul(s ^ (s >>> 15), 1 | s); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; })();
  const m = {
    t: 0, last: 0, raf: 0, onScreen: true, hidden: false, dead: false,
    act: null, prev: null, pending: null, nextTap: 0, nextIdle: 9000, near: false, touch: false, scrollLook: null,
    blinkAt: 1600, blinkT0: -1e9, blinkTwice: false,
    ptr: null, idleLookAt: 2200, idleLook: { x: 0, y: 0 },
    sp: { yaw: S(), pitch: S(), body: S(), ex: S(), ey: S(), happy: S(), lean: S(), mouth: S(), spark: S() },
    drag: null, dragYaw: S(), dragVel: 0, lastDragEnd: -1e9,
    press: S(), pressTo: 0, scrollKick: 0, lastScrollY: typeof window !== 'undefined' ? window.scrollY : 0,
    hist: [],
    sleep: S(), asleep: false, lastInput: 0, taps: [], focus: null, oohUntil: -1e9,
    paused: !!opts.paused, ema: 16, slowFor: 0, lastFrame: 0
  };
  const reduced = !!opts.reduced;
  const emit = (type) => { if (opts.onState) opts.onState(type); };
  const start = (kind) => {
    if (!ACTIONS[kind]) return;
    if (m.act) {
      // keep the interrupted action playing and fade it out, so nothing freezes or jumps; any turn it made is kept
      const def = ACTIONS[m.act.kind], at = m.t - m.act.t0;
      const yaw0 = def.run(Math.min(at, def.dur)).yaw;
      m.dragYaw.x += yaw0;
      m.prev = { kind: m.act.kind, t0: m.act.t0, t1: m.t, yaw0 };
    } else m.prev = null;
    m.act = { kind, t0: m.t };
    if (!ACTIONS[kind].idle) m.nextIdle = Math.max(m.nextIdle, m.t + 9000);
    m.blinkAt = Math.max(m.blinkAt, m.t + 1800);
    wake();
  };
  const busy = () => m.act && !ACTIONS[m.act.kind].idle && m.t - m.act.t0 < ACTIONS[m.act.kind].dur * 0.7;   // idle moments never block a tap
  const past = (key, ago) => {
    const h = m.hist, target = m.t - ago;
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= target) { const a = h[i - 1], b = h[i], k = (target - a.t) / Math.max(1, b.t - a.t); return a[key] + (b[key] - a[key]) * k; }
    }
    return h.length ? h[0][key] : 0;
  };

  // where the pointer is, as yaw/pitch from Mini Yaz's head (screen space, so it works anywhere on the page)
  const attention = () => {
    const r = host.getBoundingClientRect();
    const hx = r.left + r.width * 0.5, hy = r.top + r.height * 0.31;
    // something on the page asked for a look (keyboard focus, a reaction); otherwise the pointer
    const target = m.focus && m.t < m.focus.until ? m.focus : (m.ptr && m.t - m.ptr.t < 4000 ? m.ptr : null);
    if (!target) return null;
    const dx = target.x - hx, dy = target.y - hy, depth = Math.max(170, r.width * 0.95);
    const near = Math.hypot(dx / (r.width * 0.75), dy / (r.height * 0.75));
    return { yaw: Math.atan2(dx, depth), pitch: Math.atan2(dy, depth), near };
  };

  const pose = (dts) => {
    const t = m.t, r = seg(t, 0, 700, 'inOut'), b = wave(t, 3600);
    const P = {
      y: 0, sy: 0.012 * b * r, yaw: 0, lean: 0.005 * wave(t, 6100, 0.3) * r,
      hYaw: 0, hPitch: (0.012 * wave(t, 4700, 0.4) - 0.01 * wave(t - 110, 3600)) * r,
      hRoll: (0.03 * wave(t, 5300, 0.13) + 0.01 * wave(t, 2300, 0.61)) * r,
      aLz: -(ARM_TILT + 0.035 * wave(t - 90, 4100, 0.21) * r), aLx: 0.03 * wave(t, 5100, 0.3) * r, eL: 0.04 + 0.04 * wave(t - 250, 4100, 0.21) * r,
      aRz: ARM_TILT + 0.032 * wave(t - 130, 3700, 0.57) * r, aRx: 0.03 * wave(t, 4300, 0.7) * r, eR: -0.04 - 0.04 * wave(t - 270, 3700, 0.57) * r,
      lid: 0, happy: 0, gx: 0, gy: 0, face: 0, wL: 0, wR: 0, mouth: 0, spark: 0, dizzy: 0
    };
    if (STANCE === 'point') {
      P.aRz += 1.05 + 0.04 * wave(t - 140, 2900, 0.2) * r; P.aRx += 0.35; P.eR += -0.25 + 0.06 * wave(t - 260, 2900, 0.2) * r;
      P.hYaw += 0.25; P.hRoll -= 0.05;
    } else if (STANCE === 'cheer') {
      const c = wave(t, 1700, 0.1) * r;
      P.aLz += -1.62 + 0.08 * c; P.aRz += 1.58 - 0.08 * wave(t - 120, 1700, 0.1) * r;   // arms up and out in a V, clear of the head
      P.eL += -0.55; P.eR += 0.55; P.aLx += 0.12; P.aRx += 0.12;
      P.hPitch -= 0.08; P.sy += 0.008 * c; P.happy = 0.85;
    } else if (STANCE === 'lost') {
      // holding a map up, head tipped: which way was it again?
      P.aRx += -0.9; P.aLx += -0.9; P.aRz += -0.25; P.aLz += 0.25; P.eR += -0.3; P.eL += 0.3;
      P.hRoll += 0.15 + 0.04 * wave(t, 3100, 0.2) * r; P.hPitch += 0.06; P.hYaw += 0.1 * wave(t, 5300, 0.6) * r;
    }

    let A = null;
    if (m.act) {
      const at = t - m.act.t0, def = ACTIONS[m.act.kind];
      if (at >= def.dur) { m.dragYaw.x += def.run(def.dur).yaw; m.act = null; m.prev = null; }   // a finished turn is kept, not snapped back
      else {
        A = def.run(at);
        if (m.prev) {
          const k = seg(t - m.prev.t1, 0, 220, 'inOut');
          if (k >= 1) m.prev = null;
          else {
            const pd = ACTIONS[m.prev.kind], pt = Math.min(t - m.prev.t0, pd.dur);
            const B = pd.run(pt);
            B.yaw -= m.prev.yaw0;
            CH.forEach((c) => { A[c] = B[c] + (A[c] - B[c]) * k; });
          }
        }
      }
    }
    if (A) CH.forEach((c) => { if (!MAXED.includes(c)) P[c] += A[c]; });

    // dozing: after a quiet minute the eyes close, the head drops and the breathing slows
    const sleepTo = !m.paused && !m.act && !m.drag && SLEEP_AFTER > 0 && t - m.lastInput > SLEEP_AFTER ? 1 : 0;
    const zz = spring(m.sleep, sleepTo, sleepTo ? 1.4 : 9, dts);
    if (!m.asleep && zz > 0.6) { m.asleep = true; emit('sleep'); }
    else if (m.asleep && zz < 0.35) { m.asleep = false; emit('wake'); }
    if (zz > 0.001) {
      const br = wave(t, 4600, 0.1);
      P.hPitch += 0.2 * zz + 0.025 * br * zz; P.hRoll += 0.09 * zz; P.hYaw += 0.06 * zz;
      P.sy += 0.022 * br * zz; P.lean += 0.025 * zz;
      P.aLz += 0.07 * zz; P.aRz -= 0.07 * zz;
    }

    // attention: eyes lead, the head follows, then the body
    const at = zz > 0.5 ? null : attention();
    let tYaw = 0, tPitch = 0, near = 9;
    if (at) { tYaw = at.yaw * (1 - zz); tPitch = at.pitch * (1 - zz); near = at.near; }
    if (!at) m.near = false; else if (!m.near && near < 0.85) m.near = true; else if (m.near && near > 1.15) m.near = false;   // no flicker at the edge
    else if (t >= m.idleLookAt) {
      const home = rnd() < 0.4;
      m.idleLook = home ? { x: 0, y: 0 } : { x: (rnd() * 2 - 1) * 0.45, y: (rnd() * 2 - 1) * 0.22 };
      if (STANCE === 'point' && !home) m.idleLook = { x: 0.3 + rnd() * 0.3, y: 0.1 + rnd() * 0.2 };
      m.idleLookAt = t + 1600 + rnd() * 2600;
    }
    if (!at) { tYaw = m.idleLook.x; tPitch = m.idleLook.y; }
    if (!at && m.scrollLook && t - m.scrollLook.t < 1400) { tYaw = 0; tPitch = 0.26 * m.scrollLook.dir; }   // phones: glance toward the page as you scroll
    const faceK = A ? A.face : 0;                       // during a wave, eyes come back to you
    tYaw *= 1 - faceK; tPitch *= 1 - faceK;
    const ex = spring(m.sp.ex, clamp(tYaw, -0.6, 0.6), 22, dts);
    const ey = spring(m.sp.ey, clamp(tPitch, -0.45, 0.45), 22, dts);
    const hy = spring(m.sp.yaw, clamp(tYaw * 0.85, -0.62, 0.62), 7.5, dts);
    const hp = spring(m.sp.pitch, clamp(tPitch * 0.7, -0.32, 0.36), 7.5, dts);
    const by = spring(m.sp.body, clamp(tYaw * 0.4, -0.38, 0.38), 3.6, dts);
    if (Math.abs(ex - hy) > 0.35 && t - m.blinkT0 > 900) { m.blinkT0 = t; m.blinkTwice = false; }   // blink on a big glance
    P.gx += clamp((ex - hy) * 0.5, -0.12, 0.12); P.gy += clamp((ey - hp) * 0.4, -0.08, 0.08);
    P.hYaw += hy - by; P.hPitch += hp; P.yaw += by; P.hRoll += -0.12 * (hy - by);
    const happyT = Math.max(A ? A.happy : 0, STANCE === 'cheer' ? 0.85 * (1 - zz) : 0);
    P.spark = spring(m.sp.spark, Math.max(m.near ? 1 : 0, A ? A.spark : 0, t < m.oohUntil ? 1 : 0), 10, dts);
    P.dizzy = A ? A.dizzy : 0;
    P.sleep = zz;
    const happy = spring(m.sp.happy, happyT, 9, dts);
    P.lean += spring(m.sp.lean, near < 1.4 ? clamp(tYaw, -0.4, 0.4) * 0.08 : 0, 5, dts);   // leans in when you're close

    // drag to spin: follows your finger, then carries on and settles facing forward
    if (m.drag) { m.dragYaw.v = m.dragVel; }
    else {
      const home = Math.round(m.dragYaw.x / (Math.PI * 2)) * Math.PI * 2;
      spring(m.dragYaw, home, 4.2, dts);
    }
    P.yaw += m.dragYaw.x;
    if (m.drag) { P.aLz -= 0.25; P.aRz += 0.25; }

    // a little bob when the page scrolls
    m.scrollKick *= Math.exp(-dts * 6);
    P.y += 0.05 * clamp(m.scrollKick, -1, 1); P.hPitch += 0.05 * clamp(m.scrollKick, -1, 1);

    // blinks (none while dozing)
    if (t >= m.blinkAt) { m.blinkT0 = zz > 0.2 ? -1e9 : t; m.blinkTwice = rnd() < 0.2; m.blinkAt = t + 2800 + rnd() * 1400; }
    let lid = track(t - m.blinkT0, BLINK);
    if (m.blinkTwice) lid = Math.max(lid, track(t - m.blinkT0 - 420, BLINK));
    if (A) lid = Math.max(lid, A.lid);
    P.lid = Math.max(lid, sstep(0.15, 0.55, zz)); P.happy = happy;
    P.mouth = spring(m.sp.mouth, clamp(P.mouth, 0, 1), 16, dts);
    P.press = spring(m.press, m.pressTo, 26, dts);
    return P;
  };

  // a raised mitten must never sink into the head: test the hand against the head (padded by the hand's
  // size) and swing the arm forward and open the elbow by however much it overlaps. Three fixed passes keep it smooth.
  const gv = new THREE.Vector3(), gc = new THREE.Vector3(), gq = new THREE.Quaternion();
  const overlap = (arm) => {
    let worst = 0;
    gaze.getWorldPosition(gc); head.getWorldQuaternion(gq).invert();
    worst = -1;
    for (const [bone, y] of [[arm.elbow, -0.1], [arm.wrist, -0.04], [arm.wrist, -0.17]]) {
      gv.set(0, y, 0); bone.localToWorld(gv); gv.sub(gc).applyQuaternion(gq);
      const e = (gv.x / 1.14) ** 2 + (gv.y / 0.95) ** 2 + (gv.z / 1.04) ** 2;
      worst = Math.max(worst, 1 - Math.sqrt(e));
    }
    return worst;
  };
  const guardHand = (arm, P, s) => {
    for (let i = 0; i < 3; i++) {
      root.updateMatrixWorld(true);
      const raw = overlap(arm);
      const o = 0.03 * Math.log1p(Math.exp(raw / 0.03));      // soft onset: the push eases in instead of snapping
      if (o < 1e-4) return;
      P.guard = (P.guard || 0) + o;
      if (s > 0) { P.aRx += o * 2.2; P.eR -= o * 1.1; arm.shoulder.rotation.set(P.aRx, 0, P.aRz); arm.elbow.rotation.set(0, 0, P.eR); }
      else { P.aLx += o * 2.2; P.eL += o * 1.1; arm.shoulder.rotation.set(P.aLx, 0, P.aLz); arm.elbow.rotation.set(0, 0, P.eL); }
    }
  };
  const apply = (P) => {
    if (opts.posed) for (const k in opts.posed) P[k] = MAXED.includes(k) || k === 'mouth' ? Math.max(P[k] || 0, opts.posed[k]) : (P[k] || 0) + opts.posed[k];
    const ps = 1 - 0.035 * P.press;
    const sy = (1 + P.sy) * ps, sx = Math.pow(1 + P.sy, -0.6) * (1 + 0.012 * P.press);
    root.position.y = P.y;
    root.rotation.set(0, BASE_YAW + P.yaw, P.lean);
    squash.scale.set(sx, sy, sx);
    head.rotation.set(P.hPitch, P.hYaw, P.hRoll, 'YXZ');
    armL.shoulder.rotation.set(P.aLx, 0, P.aLz);
    armL.elbow.rotation.set(0, 0, P.eL);
    armL.wrist.rotation.set(0, 0, P.wL);
    armR.shoulder.rotation.set(P.aRx, 0, P.aRz);
    armR.elbow.rotation.set(0, 0, P.eR);
    armR.wrist.rotation.set(0, 0, P.wR);
    gaze.rotation.set(P.gy, P.gx, 0);
    guardHand(armR, P, 1);       // no threshold: far from the head the overlap is simply zero
    guardHand(armL, P, -1);
    if (held.length) {
      root.updateMatrixWorld(true);
      held.forEach((h) => {
        if (!h.grp.visible) return;
        gv.set(h.at[0], h.at[1], h.at[2]); armR.wrist.localToWorld(gv); squash.worldToLocal(gv);
        h.grp.position.set(gv.x + h.nudge[0], gv.y + h.nudge[1], gv.z + h.nudge[2]);
      });
    }
    // eyes: a blink squashes the oval from above; happy closes it into an arch
    const close = Math.max(P.lid, sstep(0.15, 0.6, P.happy));
    const ls = 1 - 0.92 * close;
    const dz = P.dizzy || 0, zz = P.sleep || 0;
    const sleepK = sstep(0.5, 0.85, zz) * (1 - sstep(0.4, 0.8, P.happy));
    [eyeL, eyeR].forEach((e, i) => {
      e.lid.scale.set(1 + 0.06 * (P.spark || 0), ls, 1);
      e.lid.position.y = -0.035 * close;
      e.lid.visible = (ls > 0.1 || (P.happy < 0.5 && sleepK < 0.5)) && dz < 0.5;
      e.glints.forEach((g) => { g.visible = close < 0.45; g.scale.setScalar(1 + 0.45 * (P.spark || 0)); });   // hover: the eyes light up
      e.arc.scale.setScalar(Math.max(0.001, sstep(0.45, 0.8, P.happy) * (1 - dz)));
      e.sleepArc.scale.setScalar(Math.max(0.001, sleepK * (1 - dz)));
      e.spiral.scale.setScalar(Math.max(0.001, sstep(0.2, 0.7, dz)));
      e.spiral.rotation.z = (i ? -1 : 1) * m.t * 0.009;
    });
    // the shadow where each eye sits on the face follows the eyes as they look around, and fades as they close
    eyeL.holder.getWorldPosition(gv); head.worldToLocal(gv); faceUni.uEyeA.value.copy(gv);
    eyeR.holder.getWorldPosition(gv); head.worldToLocal(gv); faceUni.uEyeB.value.copy(gv);
    faceUni.uEyeK.value = LOOK.eyeSeat * (1 - close) * (1 - dz);
    const joy = Math.max(P.happy, 0.7 * (P.spark || 0));
    smile.scale.set(1 + 0.15 * joy, 1 + 0.9 * joy, 1);
    setMouth(P.mouth);
    smile.visible = P.mouth < 0.45;
    // follow-through: the bow reads the head about 110 ms late
    m.hist.push({ t: m.t, roll: P.hRoll, pitch: P.hPitch, y: P.y, sy: P.sy, yaw: P.yaw + P.hYaw });
    while (m.hist.length > 2 && m.hist[0].t < m.t - 400) m.hist.shift();
    const lagRoll = past('roll', 110) - P.hRoll, lagPitch = past('pitch', 110) - P.hPitch;
    const lagY = past('y', 100) - P.y, lagYaw = past('yaw', 120) - (P.yaw + P.hYaw);
    bowPivot.rotation.set(clamp(0.5 * lagPitch - 0.4 * lagY, -0.3, 0.3), clamp(0.25 * lagYaw, -0.25, 0.25), clamp(0.5 * lagRoll + 0.15 * lagYaw, -0.25, 0.25));
    const air = clamp(P.y / 0.45, 0, 1);
    blob.scale.set((1 - 0.4 * air) * sx, 1 - 0.3 * air, 1);
    blob.material.opacity = (blob.userData.base ?? 0.32) * (1 - 0.55 * air);
  };

  // ---------- sizing and loop ----------
  let W = 0, H = 0;
  const render = () => renderer.render(scene, camera);
  const resize = (force) => {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * (1 + 2 * EXTRA_SIDE))), h = Math.max(1, Math.round(r.height * (1 + EXTRA_TOP)));
    if (w === W && h === H && force !== true) return;
    W = w; H = h;
    renderer.setPixelRatio(Math.min(maxDpr, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    const visH = BOX_H * (1 + EXTRA_TOP), bottomY = -GROUND * BOX_H, centerY = bottomY + visH / 2;
    const dist = visH / (2 * Math.tan((camera.fov * Math.PI) / 360));
    camera.aspect = w / h;
    camera.position.set(0, centerY + 0.25, dist);
    camera.lookAt(0, centerY, 0);
    camera.updateProjectionMatrix();
    render();
  };
  const frame = (now) => {
    m.raf = 0;
    if (m.dead || reduced || m.paused || !m.onScreen || m.hidden) { m.last = 0; return; }
    const dt = m.last ? Math.min(100, now - m.last) : 16;
    m.last = now;
    m.t += dt;
    if (m.pending && m.t >= m.pending.at) { start(m.pending.kind); m.pending = null; }
    if (!m.act && !m.drag && m.t >= m.nextIdle && (!m.ptr || m.t - m.ptr.t > 6000) && m.t - m.lastInput < SLEEP_AFTER - 3000) {
      const pool = STANCE === 'idle' ? ['idleLook', 'idleBounce', 'idleStretch', 'idleLook'] : ['idleLook', 'idleBounce'];
      start(pool[Math.floor(rnd() * pool.length)]);
      m.nextIdle = m.t + 9000 + rnd() * 7000;
    }
    apply(pose(dt / 1000));
    // fast asleep, 30 frames a second is plenty
    if (!(m.sleep.x > 0.95 && now - m.lastFrame < 30)) { render(); m.lastFrame = now; }
    // if this device can't keep up (frames over ~24 ms for a couple of seconds), draw fewer pixels
    m.ema += (dt - m.ema) * 0.05;
    m.slowFor = m.ema > 24 && m.t > 2500 && m.sleep.x < 0.5 ? m.slowFor + dt : 0;
    if (m.slowFor > 2000 && maxDpr > 1) { maxDpr = Math.max(1, maxDpr - 0.25); m.slowFor = 0; m.ema = 16; resize(true); }
    m.raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!opts.manual && !m.raf && !m.dead && !reduced && !m.paused && m.onScreen && !m.hidden) { m.last = 0; m.raf = requestAnimationFrame(frame); } };
  // any input on the page counts as company; waking from a real nap gets a startle
  const poke = () => {
    const deep = m.sleep.x > 0.6;
    m.lastInput = m.t;
    if (deep && !reduced && !m.paused) start('startle');
    wake();
  };

  // ---------- input ----------
  const inside = (e) => { const r = host.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top - r.height * 0.1 && e.clientY <= r.bottom; };
  const onMove = (e) => {
    m.ptr = { x: e.clientX, y: e.clientY, t: m.t };
    if (m.drag && e.pointerId === m.drag.id) {
      const dx = e.clientX - m.drag.x;
      const r = host.getBoundingClientRect();
      const k = 5.5 / Math.max(160, r.width);
      m.dragYaw.x += dx * k;
      const dtm = Math.max(1, e.timeStamp - m.drag.ts);
      m.dragVel = clamp((dx * k) / (dtm / 1000), -18, 18);
      if (Math.abs(e.clientX - m.drag.x0) > 6) m.drag.moved = true;
      m.drag.x = e.clientX; m.drag.ts = e.timeStamp;
    }
    poke();
  };
  const onDown = (e) => {
    m.ptr = { x: e.clientX, y: e.clientY, t: m.t };
    if (e.pointerType === 'touch') m.touch = true;
    if (inside(e) && !m.paused) { m.drag = { id: e.pointerId, x: e.clientX, x0: e.clientX, ts: e.timeStamp, moved: false }; m.dragVel = 0; m.pressTo = 1; }
    poke();
  };
  const onUp = (e) => {
    if (m.drag && e.pointerId === m.drag.id) {
      if (m.drag.moved) { m.lastDragEnd = m.t; m.dragYaw.v = m.dragVel; }
      m.drag = null;
    }
    m.pressTo = 0;
  };
  const onScroll = () => {
    const y = window.scrollY, d = y - m.lastScrollY; m.lastScrollY = y;
    m.scrollKick = clamp(m.scrollKick + d / 160, -1, 1);
    if (d && (m.touch || !m.ptr || m.t - m.ptr.t > 3000)) m.scrollLook = { t: m.t, dir: Math.sign(d) };
    poke();
  };
  const onKey = () => poke();
  const onVis = () => { m.hidden = document.hidden; if (!m.hidden) wake(); };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(host);
  const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((l) => { m.onScreen = l.some((x) => x.isIntersecting); if (m.onScreen) wake(); }, { rootMargin: '120px' }) : null;
  if (io) io.observe(host);
  resize();
  apply(pose(0.016));
  render();
  if (opts.intro) m.pending = { kind: opts.intro, at: opts.introAt ?? 700 };
  wake();

  const tap = () => {
    if (reduced || m.paused || m.t - m.lastDragEnd < 350) return;
    poke();
    // five quick taps make Mini Yaz dizzy
    m.taps = m.taps.filter((x) => m.t - x < 2600);
    m.taps.push(m.t);
    if (m.taps.length >= 5) { m.taps = []; start('dizzy'); emit('dizzy'); return; }
    if (busy()) return;
    const kind = ORDER[m.nextTap % ORDER.length];
    m.nextTap += 1;
    start(kind);
  };
  return {
    canvas,
    tap,
    press: (on) => { m.pressTo = on && !m.paused ? 1 : 0; wake(); },
    // the page can ask for a reaction: 'cheer', 'hop', 'wave', 'spin', 'dizzy', or 'ooh' (eyes light up)
    react: (kind) => {
      if (reduced || m.paused || m.drag) return;
      poke();
      if (kind === 'ooh') { m.oohUntil = m.t + 1100; wake(); return; }
      if (busy() || !ACTIONS[kind]) return;
      start(kind);
    },
    // look at a point on the screen (client coordinates) for a while, e.g. whatever has keyboard focus
    lookAt: (x, y, ms = 2500) => { m.focus = { x, y, until: m.t + ms }; poke(); },
    setPaused: (p) => {
      m.paused = !!p;
      if (m.paused) { if (m.raf) cancelAnimationFrame(m.raf); m.raf = 0; m.drag = null; m.pressTo = 0; render(); }
      else { m.lastInput = m.t; wake(); }
    },
    setDark: (d) => { setDark(d); render(); },
    // change any LOOK value live (used by the look tuner)
    setLook: (patch) => {
      const envKeys = ['soft', 'fill', 'top', 'rim', 'room'];
      const rebuild = envKeys.some((k) => k in patch && patch[k] !== LOOK[k]);
      Object.assign(LOOK, patch);
      if (rebuild) buildEnv();
      renderer.toneMappingExposure = LOOK.exposure;
      scene.environmentIntensity = LOOK.env;
      key.intensity = LOOK.key; key.position.set(LOOK.keyX, LOOK.keyY, LOOK.keyZ); hemi.intensity = LOOK.hemi;
      bodyMat.userData.own.uColA.value.copy(WHITE()); bodyMat.userData.own.uColB.value.copy(BLUE());
      headMat.userData.own.uColA.value.copy(BLUE()); headMat.userData.own.uColB.value.copy(WHITE());
      armMats[0].userData.own.uColA.value.copy(WHITE()); armMats[0].userData.own.uColB.value.copy(WHITE());
      armMats[1].userData.own.uColA.value.copy(BLUE()); armMats[1].userData.own.uColB.value.copy(BLUE());
      const bc = LOOK.bow ? rgb(LOOK.bow) : BLUE(); bowMat.userData.own.uColA.value.copy(bc); bowMat.userData.own.uColB.value.copy(bc);
      mats.forEach((mt) => { if (!mt.userData.fixed) mt.roughness = LOOK.rough; mt.specularIntensity = LOOK.spec; mt.clearcoat = LOOK.coat; mt.clearcoatRoughness = LOOK.coatRough; });
      U.uAoPow.value = LOOK.aoPow; U.uAoDirect.value = LOOK.aoDirect; U.uSss.value = LOOK.sss; U.uEdge.value = LOOK.edge; U.uLift.value = LOOK.lift;
      mats.forEach((mt) => { const o = mt.userData.own; o.uLiftA.value.copy(liftOf(o.uColA.value)); o.uLiftB.value.copy(liftOf(o.uColB.value)); });
      inkMat.envMapIntensity = LOOK.eyeGloss;
      render();
    },
    look: () => Object.assign({}, LOOK),
    asleep: () => m.asleep,
    // playground controls (the Lab)
    setProp: (name, on) => {
      if (on && !props[name] && PROPS[name]) props[name] = PROPS[name]();
      if (props[name]) props[name].visible = !!on;
      render(); wake();
    },
    setWireframe: (on) => { scene.traverse((o) => { if (o.material && o.material !== blob.material) o.material.wireframe = !!on; }); render(); wake(); },
    sleepNow: () => { if (!m.act) { m.lastInput = m.t - SLEEP_AFTER; m.sleep.x = Math.max(m.sleep.x, 0.3); wake(); } },
    // test hooks
    step: (ms) => { const n = Math.round(ms / 16); for (let i = 0; i < n; i++) { m.t += 16; if (m.pending && m.t >= m.pending.at) { start(m.pending.kind); m.pending = null; } apply(pose(0.016)); } render(); },
    startNow: start,
    pointAt: (x, y) => { m.ptr = { x, y, t: m.t }; },
    dispose: () => {
      m.dead = true;
      if (m.raf) cancelAnimationFrame(m.raf);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      blobTex.dispose(); pmrem.dispose(); renderer.dispose();
      canvas.remove();
    }
  };
}
