// Mounts every Mini Yaz on the page. Each one starts as a still poster (so the page never waits on it); the live 3D
// version loads once the poster is near the screen and the page has settled, then fades in over it. If WebGL or the
// download fails, the poster stays and gently bobs instead.
//
// Markup (see src/site/templates.mjs):
//   <div class="mini-yaz" data-pose="wave" data-props="laptop"> <img class="yaz-poster"> <button class="yaz-hit"> </div>
// Pages talk to it with events on document: 'miniyaz:react' {kind}, 'miniyaz:look' {x, y}, 'miniyaz:motion' {paused},
// 'miniyaz:theme' {dark}, 'miniyaz:color' {name}. The color (one of COLORS) is remembered on this device.
// When the site swaps pages in place (assets/js/site.js), the live Mini Yaz moves to the new page instead of starting
// over: it glides from its old spot to its new one, takes up the new page's pose and props, and hops as it lands.
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

// Mini Yaz's colors: the colored half (`blue`, whatever color it is) and the headphones. The still posters are rendered
// in the Finder blue, so for another color they're tinted toward it (hue and saturation) until the live one fades in.
export const COLORS = {
  blue: { label: 'Finder blue', blue: [38, 146, 238], phones: [238, 168, 192], pads: [226, 142, 172] },
  pink: { label: 'Pink', blue: [238, 102, 158], phones: [236, 239, 245], pads: [206, 211, 224] },
  lilac: { label: 'Lilac', blue: [146, 110, 230], phones: [238, 168, 192], pads: [226, 142, 172] },
  mint: { label: 'Mint', blue: [30, 184, 148], phones: [238, 168, 192], pads: [226, 142, 172] },
  tangerine: { label: 'Tangerine', blue: [250, 140, 40], phones: [38, 146, 238], pads: [30, 112, 196] },
  graphite: { label: 'Graphite', blue: [84, 90, 102], phones: [238, 168, 192], pads: [226, 142, 172] }
};
const colorName = () => { try { const c = localStorage.getItem('yaz-color'); return COLORS[c] ? c : 'blue'; } catch (e) { return 'blue'; } };
const lookOf = (name) => { const c = COLORS[name]; return { blue: c.blue, phones: c.phones, pads: c.pads }; };
const hueSat = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, d / (1 - Math.abs(mx + mn - 1) || 1)];
};
const posterFilter = (name) => {
  if (name === 'blue') return '';
  const [h0, s0] = hueSat(COLORS.blue.blue), [h1, s1] = hueSat(COLORS[name].blue);
  return `hue-rotate(${Math.round(h1 - h0)}deg) saturate(${(s1 / s0).toFixed(2)})`;
};
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const isPaused = () => root.dataset.motion === 'paused';
const isDark = () => root.dataset.appearance === 'graphite';
const live = [];

const STANCE = { point: 'point', cheer: 'cheer', lost: 'lost' };
const INTRO = { wave: 'wave', spin: 'spin' };

const yawOf = (stance) => (stance === 'point' ? 0.2 : stance === 'cheer' ? 0.12 : stance === 'lost' ? 0.1 : 0.28);

function mount(el) {
  el.dataset.mounted = '1';
  const pose = el.dataset.pose || 'idle';
  const poster = el.querySelector('.yaz-poster');
  if (poster) poster.style.filter = posterFilter(colorName());
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
      yaw: yawOf(stance),
      props: (el.dataset.props || '').split(/\s+/).filter(Boolean),
      reduced: reducedMQ.matches,
      paused: isPaused(),
      dark: isDark(),
      look: lookOf(colorName()),
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
  el.miniYazDispose = () => { dead = true; io.disconnect(); if (ctl) { ctl.dispose(); live.splice(live.indexOf(ctl), 1); } };
}

export { loadThree, loadModel };

let all = [...document.querySelectorAll('.mini-yaz')];
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
document.addEventListener('miniyaz:color', (e) => {
  const name = COLORS[e.detail.name] ? e.detail.name : 'blue';
  try { if (name === 'blue') localStorage.removeItem('yaz-color'); else localStorage.setItem('yaz-color', name); } catch (err) { /* private mode */ }
  live.forEach((c) => c.setLook(lookOf(name)));
  all.forEach((el) => { const p = el.querySelector('.yaz-poster'); if (p) p.style.filter = posterFilter(name); });
});

// ---------- moving to the next page (assets/js/site.js swaps pages in place) ----------
let carry = null;
document.addEventListener('site:beforeswap', () => {
  const el = document.querySelector('.mini-yaz--main');
  carry = el && el.miniYaz && el.miniYaz() ? { el, rect: el.getBoundingClientRect() } : null;
  all.forEach((x) => { if (x !== (carry && carry.el) && x.miniYazDispose) x.miniYazDispose(); });
});
document.addEventListener('site:afterswap', (e) => {
  const slot = document.querySelector('main .mini-yaz--main');
  if (carry && slot) {
    const el = carry.el, ctl = el.miniYaz();
    ['data-pose', 'data-props', 'aria-label', 'id'].forEach((a) => { if (slot.hasAttribute(a)) el.setAttribute(a, slot.getAttribute(a)); else el.removeAttribute(a); });
    const p0 = el.querySelector('.yaz-poster'), p1 = slot.querySelector('.yaz-poster');
    if (p0 && p1) { p0.src = p1.src; p0.alt = p1.alt; }
    slot.replaceWith(el);
    const stance = STANCE[el.dataset.pose] || 'idle';
    ctl.setStance(stance, yawOf(stance));
    ctl.setProps((el.dataset.props || '').split(/\s+/).filter(Boolean));
    // glide from the old spot to the new one (it keeps animating the whole way), then hop as it lands
    const r1 = el.getBoundingClientRect(), r0 = carry.rect;
    const still = !e.detail.animate || reducedMQ.matches || isPaused();
    if (!still && r1.width && Math.hypot(r0.left - r1.left, r0.top - r1.top) > 2) {
      const k = r0.width / r1.width;
      el.classList.add('is-gliding');
      el.animate([{ transformOrigin: '0 0', transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${k})` }, { transformOrigin: '0 0', transform: 'none' }],
        { duration: 560, easing: 'cubic-bezier(.3, .7, .2, 1)' }).finished.then(() => el.classList.remove('is-gliding'), () => el.classList.remove('is-gliding'));
      setTimeout(() => ctl.react('hop'), 380);
    } else if (!still) ctl.react('hop');
  } else if (carry && carry.el.miniYazDispose) carry.el.miniYazDispose();
  carry = null;
  all = [...document.querySelectorAll('.mini-yaz')];
  all.forEach((el) => { if (!el.dataset.mounted) mount(el); });
});
