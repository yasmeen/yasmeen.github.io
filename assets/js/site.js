// Small behaviors shared by every page: the Appearance switch (Blue or Graphite), pausing motion, the Dock bounce on
// phones, and telling Mini Yaz about things worth reacting to. The theme and motion choices are applied in <head>
// before first paint (see src/site/templates.mjs); this file only wires up the controls.
(() => {
  const root = document.documentElement;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const send = (type, detail) => document.dispatchEvent(new CustomEvent('miniyaz:' + type, { detail }));

  // ---------- Appearance: Auto follows the system; Blue and Graphite stick ----------
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const applyAppearance = () => {
    const pref = store.get('appearance') || 'auto';
    const look = pref === 'auto' ? (darkMQ.matches ? 'graphite' : 'blue') : pref;
    root.dataset.appearance = look;
    document.querySelectorAll('[data-appearance-option]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.appearanceOption === pref)));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = look === 'graphite' ? '#1C1D20' : '#FFFFFF';
    send('theme', { dark: look === 'graphite' });
  };
  document.querySelectorAll('[data-appearance-option]').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.appearanceOption;
    store.set('appearance', v === 'auto' ? null : v);
    applyAppearance();
  }));
  darkMQ.addEventListener('change', applyAppearance);
  applyAppearance();

  // ---------- Motion: one switch pauses Mini Yaz and every looping animation on the site ----------
  const applyMotion = () => {
    const paused = store.get('motion') === 'paused';
    root.dataset.motion = paused ? 'paused' : 'on';
    document.querySelectorAll('[data-motion-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(paused));
      const label = b.querySelector('[data-motion-label]');
      if (label) label.textContent = paused ? 'Play motion' : 'Pause motion';
    });
    send('motion', { paused });
  };
  document.querySelectorAll('[data-motion-toggle]').forEach((b) => b.addEventListener('click', () => {
    store.set('motion', root.dataset.motion === 'paused' ? null : 'paused');
    applyMotion();
  }));
  applyMotion();

  // page-to-page glide (cross-document view transitions): skipped when motion is paused
  const skipIfPaused = (e) => { if (e.viewTransition && root.dataset.motion === 'paused') e.viewTransition.skipTransition(); };
  window.addEventListener('pageswap', skipIfPaused);
  window.addEventListener('pagereveal', skipIfPaused);

  // ---------- Dock (phones): the icon you tapped bounces as its page opens, like an app launching ----------
  document.querySelectorAll('.dock a').forEach((a) => a.addEventListener('click', () => {
    try { sessionStorage.setItem('dock-launch', a.getAttribute('href')); } catch (e) { /* ignore */ }
    a.classList.add('is-launching');
  }));
  try {
    const launched = sessionStorage.getItem('dock-launch');
    sessionStorage.removeItem('dock-launch');
    const here = document.querySelector('.dock a[aria-current="page"]');
    if (launched && here && here.getAttribute('href') === launched && root.dataset.motion !== 'paused') here.classList.add('is-launching');
  } catch (e) { /* ignore */ }
  document.querySelectorAll('.dock a').forEach((a) => a.addEventListener('animationend', () => a.classList.remove('is-launching')));

  // ---------- Mini Yaz reacts to the page ----------
  // data-yaz="cheer" (a hop with arms up), "ooh" (eyes light up), "wave"; each element reacts at most every few seconds
  const lastAt = new WeakMap();
  const react = (el) => {
    const now = performance.now();
    if (now - (lastAt.get(el) || -1e9) < 4000) return;
    lastAt.set(el, now);
    send('react', { kind: el.dataset.yaz });
  };
  document.querySelectorAll('[data-yaz]').forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') react(el); });
    el.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') react(el); });
    el.addEventListener('focus', () => { if (el.matches(':focus-visible')) react(el); });
  });
  // keyboard users: Mini Yaz looks at whatever has focus
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches(':focus-visible') || t.closest('.mini-yaz')) return;
    const r = t.getBoundingClientRect();
    send('look', { x: r.left + r.width / 2, y: r.top + r.height / 2, ms: 2500 });
  });
  // coming back to the page from another tab or the back button: a wave hello
  window.addEventListener('pageshow', (e) => { if (e.persisted) setTimeout(() => send('react', { kind: 'wave' }), 400); });
  let leftAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) leftAt = performance.now();
    else if (leftAt && performance.now() - leftAt > 20000) setTimeout(() => send('react', { kind: 'wave' }), 500);
  });

  // the home page's headline rotates through a few titles; it holds still while motion is paused or reduced, and
  // screen readers get all of them at once (in the hidden text beside it)
  const roles = document.querySelector('[data-roles]');
  if (roles) {
    const items = [...roles.children];
    const still = () => root.dataset.motion === 'paused' || matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden;
    let at = 0;
    setInterval(() => {
      if (still()) return;
      const prev = items[at];
      at = (at + 1) % items.length;
      prev.classList.remove('is-on'); prev.classList.add('is-out');
      items[at].classList.remove('is-out'); items[at].classList.add('is-on');
      setTimeout(() => prev.classList.remove('is-out'), 500);
    }, 2800);
  }
})();
