// Mounts every Mini Yaz on the page. Each one starts as a still poster (so the page never waits on it); the live 3D
// version loads once the poster is near the screen and the page has settled, then fades in over it. If WebGL or the
// download fails, the poster stays and gently bobs instead.
//
// Markup (see src/site/templates.mjs):
//   <div class="mini-yaz" data-pose="wave" data-props="laptop"> <img class="yaz-poster"> <button class="yaz-hit"> </div>
// Pages talk to it with events on document: 'miniyaz:react' {kind}, 'miniyaz:look' {x, y}, 'miniyaz:motion' {paused},
// 'miniyaz:theme' {dark}.
import { createMiniYaz } from './engine.js';

const here = new URL('.', import.meta.url);
let threeP = null, modelP = null;
const loadThree = () => threeP || (threeP = import(new URL('three.min.js', here).href));

// model.bin is gzipped (see mini-yaz/tools/pack-model.mjs); browsers without DecompressionStream get the plain JSON
const loadModel = () => modelP || (modelP = (async () => {
  if (typeof DecompressionStream === 'undefined') return (await fetch(new URL('../../mini-yaz/miniyaz.json', here))).json();
  const res = await fetch(new URL('model.bin', here));
  if (!res.ok) throw new Error('model ' + res.status);
  let bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
  }
  return unpack(bytes);
})());

const unpack = (bytes) => {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(0, 4)) !== 'MYZ1') throw new Error('not a Mini Yaz model');
  const metaLen = dv.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + metaLen)));
  const body = bytes.subarray(8 + metaLen);
  const planes = (sec, stride) => {
    const n = sec.count / stride, out = new Uint16Array(sec.count), src = body.subarray(sec.offset, sec.offset + sec.bytes);
    for (let c = 0; c < stride; c++) {
      const lo = src.subarray(2 * n * c, 2 * n * c + n), hi = src.subarray(2 * n * c + n, 2 * n * (c + 1));
      let v = 0;
      for (let i = 0; i < n; i++) {
        const z = lo[i] | (hi[i] << 8), d = (z >>> 1) ^ -(z & 1);
        v = (v + d) & 0xffff;
        out[i * stride + c] = v;
      }
    }
    return out;
  };
  for (const sec of meta.sections) {
    const [part, key] = sec.path.split('.');
    meta[part][key] = sec.kind === 'pos' ? planes(sec, 3) : sec.kind === 'idx' ? planes(sec, 1) : body.slice(sec.offset, sec.offset + sec.bytes);
  }
  delete meta.sections;
  return meta;
};

const root = document.documentElement;
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const isPaused = () => root.dataset.motion === 'paused';
const isDark = () => root.dataset.appearance === 'graphite';
const live = [];

const STANCE = { point: 'point', cheer: 'cheer', lost: 'lost' };
const INTRO = { wave: 'wave', spin: 'spin' };

function mount(el) {
  const pose = el.dataset.pose || 'idle';
  const poster = el.querySelector('.yaz-poster');
  const hit = el.querySelector('.yaz-hit');
  const gl = document.createElement('div');
  gl.className = 'yaz-gl';
  gl.setAttribute('aria-hidden', 'true');
  el.insertBefore(gl, hit);
  let ctl = null, dead = false;

  const start = () => Promise.all([loadThree(), loadModel()]).then(([THREE, data]) => {
    if (dead) return;
    const stance = STANCE[pose] || 'idle';
    ctl = createMiniYaz(THREE, gl, data, {
      stance,
      intro: INTRO[pose] || null,
      introAt: pose === 'spin' ? 900 : 700,
      first: pose === 'spin' ? 'spin' : pose === 'wave' || pose === 'idle' ? 'wave' : 'hop',
      yaw: stance === 'point' ? 0.2 : stance === 'cheer' ? 0.12 : stance === 'lost' ? 0.1 : 0.28,
      props: (el.dataset.props || '').split(/\s+/).filter(Boolean),
      reduced: reducedMQ.matches,
      paused: isPaused(),
      dark: isDark(),
      onState: (s) => {
        el.classList.toggle('is-asleep', s === 'sleep');
        if (s === 'dizzy') { el.classList.remove('is-dizzy'); void el.offsetWidth; el.classList.add('is-dizzy'); }
      }
    });
    if (!ctl) throw new Error('no WebGL');
    live.push(ctl);
    ctl.canvas.style.opacity = '0';
    ctl.canvas.style.transition = 'opacity .25s ease-out';
    requestAnimationFrame(() => {
      if (dead) return;
      ctl.canvas.style.opacity = '1';
      if (poster) poster.style.opacity = '0';
      el.classList.add('is-live');
    });
  }).catch(() => { el.classList.add('is-static'); });

  // wait until the poster is close to the screen and the page has had a moment to finish loading
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    io.disconnect();
    const go = () => start();
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1200 }); else setTimeout(go, 200);
  }, { rootMargin: '200px' });
  io.observe(el);

  if (hit) {
    hit.addEventListener('click', () => { if (ctl) ctl.tap(); });
    hit.addEventListener('pointerdown', () => { if (ctl) ctl.press(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => hit.addEventListener(t, () => { if (ctl) ctl.press(false); }));
  }
  el.miniYaz = () => ctl;
  return () => { dead = true; if (ctl) ctl.dispose(); };
}

export { loadThree, loadModel };

const all = [...document.querySelectorAll('.mini-yaz')];
all.forEach(mount);

// the nearest Mini Yaz on screen handles page reactions
const nearest = () => {
  let best = null, bestD = Infinity;
  all.forEach((el) => {
    const c = el.miniYaz && el.miniYaz();
    if (!c) return;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const d = Math.abs(r.top + r.height / 2 - innerHeight / 2);
    if (d < bestD) { bestD = d; best = c; }
  });
  return best;
};
document.addEventListener('miniyaz:react', (e) => { const c = nearest(); if (c) c.react(e.detail.kind); });
document.addEventListener('miniyaz:look', (e) => { const c = nearest(); if (c) c.lookAt(e.detail.x, e.detail.y, e.detail.ms); });
document.addEventListener('miniyaz:motion', (e) => live.forEach((c) => c.setPaused(e.detail.paused)));
document.addEventListener('miniyaz:theme', (e) => live.forEach((c) => c.setDark(e.detail.dark)));
