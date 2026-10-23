// The Lab: the Mini Yaz playground, the Aqua gel maker, and the spring pad.
const root = document.documentElement;
const motionOff = () => root.dataset.motion === 'paused' || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Mini Yaz playground ----------
{
  const el = document.getElementById('play-yaz');
  const panel = document.querySelector('[data-playground]');
  const ctl = () => (el && el.miniYaz ? el.miniYaz() : null);
  if (panel) {
    panel.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => { const c = ctl(); if (c && !motionOff()) c.startNow(b.dataset.act); }));
    panel.querySelectorAll('[data-prop]').forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      const c = ctl(); if (c) c.setProp(b.dataset.prop, on);
    }));
    const sleep = panel.querySelector('[data-sleep]');
    if (sleep) sleep.addEventListener('click', () => { const c = ctl(); if (c) c.sleepNow(); });
    const wire = panel.querySelector('[data-wire]');
    if (wire) wire.addEventListener('click', () => {
      const on = wire.getAttribute('aria-pressed') !== 'true';
      wire.setAttribute('aria-pressed', String(on));
      const c = ctl(); if (c) c.setWireframe(on);
    });
  }
}

// ---------- Aqua gel maker ----------
{
  const box = document.querySelector('[data-gel]');
  const preview = document.querySelector('[data-gel-preview]');
  const out = document.querySelector('[data-gel-css]');
  if (box && preview && out) {
    const color = box.querySelector('[data-gel-color]'), hex = box.querySelector('[data-gel-hex]');
    const shine = box.querySelector('[data-gel-shine]'), label = box.querySelector('[data-gel-label]');
    let radius = '999px';
    const toHsl = (h) => {
      const n = parseInt(h.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
      let hh = 0, s = 0;
      if (d) {
        s = d / (1 - Math.abs(2 * l - 1));
        hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
        hh = (hh * 60 + 360) % 360;
      }
      return [hh, s * 100, l * 100];
    };
    const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(Math.min(100, s))}% ${Math.round(Math.max(4, Math.min(96, l)))}%)`;
    const update = () => {
      const [h, s, l] = toHsl(color.value);
      const top = hsl(h, s * 0.95, l + 16), bottom = hsl(h, s * 1.05, l - 14);
      const k = shine.value / 100;
      const gloss = `linear-gradient(180deg, rgba(255,255,255,${(k).toFixed(2)}) 0%, rgba(255,255,255,${(k * 0.24).toFixed(2)}) 50%, rgba(255,255,255,0) 51%)`;
      const ink = l > 72 ? '#1A1A1A' : '#FFFFFF';
      const css = {
        'border-radius': radius,
        border: '1px solid rgba(0,0,0,.35)',
        background: `${gloss},\n    linear-gradient(180deg, ${top}, ${bottom})`,
        color: ink,
        'text-shadow': ink === '#FFFFFF' ? '0 -1px 0 rgba(0,0,0,.3)' : 'none'
      };
      Object.assign(preview.style, { borderRadius: css['border-radius'], border: css.border, background: css.background.replace('\n    ', ' '), color: css.color, textShadow: css['text-shadow'] });
      preview.textContent = label.value || ' ';
      hex.textContent = color.value.toUpperCase();
      out.textContent = '.gel {\n' + Object.entries(css).map(([p, v]) => `  ${p}: ${v};`).join('\n') + '\n}';
    };
    box.querySelectorAll('[data-gel-shape]').forEach((b) => b.addEventListener('click', () => {
      radius = b.dataset.gelShape;
      box.querySelectorAll('[data-gel-shape]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      update();
    }));
    [color, shine, label].forEach((i) => i.addEventListener('input', update));
    update();
  }
}

// ---------- Springs, not keyframes ----------
{
  const pad = document.querySelector('[data-spring-pad]');
  if (pad) {
    const cv = pad.querySelector('canvas'), cx = cv.getContext('2d');
    const omegaIn = document.querySelector('[data-spring-omega]'), ghostIn = document.querySelector('[data-spring-ghost]');
    let W = 0, H = 0, raf = 0, visible = false, user = false, t0 = performance.now(), last = 0;
    const target = { x: 0, y: 0 };
    const sp = { x: 0, y: 0, vx: 0, vy: 0, trail: [] };
    const gh = { x: 0, y: 0, fx: 0, fy: 0, tx: 0, ty: 0, start: 0, trail: [] };
    const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
    const size = () => {
      const r = pad.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
      if (!sp.x) { target.x = sp.x = gh.x = gh.tx = W / 2; target.y = sp.y = gh.y = gh.ty = H / 2; }
    };
    const retarget = (x, y) => {
      target.x = x; target.y = y;
      gh.fx = gh.x; gh.fy = gh.y; gh.tx = x; gh.ty = y; gh.start = performance.now();   // the tween restarts from rest every time
      wake();
    };
    const css = (v) => getComputedStyle(root).getPropertyValue(v).trim();
    const draw = () => {
      cx.clearRect(0, 0, W, H);
      const dot = (p, color, r) => {
        p.trail.forEach((q, i) => { cx.globalAlpha = (i / p.trail.length) * 0.35; cx.fillStyle = color; cx.beginPath(); cx.arc(q[0], q[1], r * 0.45, 0, 7); cx.fill(); });
        cx.globalAlpha = 1; cx.fillStyle = color; cx.beginPath(); cx.arc(p.x, p.y, r, 0, 7); cx.fill();
      };
      cx.strokeStyle = css('--ink-3'); cx.lineWidth = 1.5; cx.beginPath(); cx.arc(target.x, target.y, 9, 0, 7); cx.stroke();
      if (ghostIn.checked) dot(gh, '#9A9EA6', 9);
      dot(sp, '#2F7FE0', 11);
    };
    const step = (now) => {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!user && !motionOff()) {   // until you touch it, the target wanders in a figure eight
        const a = (now - t0) / 1000;
        const x = W / 2 + Math.sin(a * 0.9) * W * 0.32, y = H / 2 + Math.sin(a * 1.8) * H * 0.28;
        if (Math.hypot(x - target.x, y - target.y) > 18) retarget(x, y);
      }
      const w = +omegaIn.value, e = Math.exp(-w * dt);
      for (const k of ['x', 'y']) {
        const v = k === 'x' ? 'vx' : 'vy', x = sp[k] - target[k];
        const nx = (x + (sp[v] + w * x) * dt) * e;
        sp[v] = (sp[v] - w * (sp[v] + w * x) * dt) * e;
        sp[k] = nx + target[k];
      }
      const p = Math.min(1, (now - gh.start) / 400), k = ease(p);
      gh.x = gh.fx + (gh.tx - gh.fx) * k; gh.y = gh.fy + (gh.ty - gh.fy) * k;
      [sp, gh].forEach((d) => { d.trail.push([d.x, d.y]); if (d.trail.length > 26) d.trail.shift(); });
      draw();
      const moving = Math.abs(sp.vx) + Math.abs(sp.vy) > 0.5 || p < 1 || Math.hypot(sp.x - target.x, sp.y - target.y) > 0.5 || (!user && !motionOff());
      if (visible && moving) raf = requestAnimationFrame(step); else { last = 0; [sp, gh].forEach((d) => { d.trail = []; }); draw(); }
    };
    const wake = () => { if (!raf && visible) raf = requestAnimationFrame(step); };
    const at = (e) => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    pad.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) { user = true; retarget(...at(e)); } });
    pad.addEventListener('pointerdown', (e) => { user = true; pad.setPointerCapture(e.pointerId); retarget(...at(e)); });
    omegaIn.addEventListener('input', wake);
    ghostIn.addEventListener('change', () => { draw(); wake(); });
    new ResizeObserver(() => { size(); draw(); }).observe(pad);
    new IntersectionObserver((l) => { visible = l.some((x) => x.isIntersecting); if (visible) wake(); }).observe(pad);
    document.addEventListener('miniyaz:motion', wake);
    size();
  }
}
