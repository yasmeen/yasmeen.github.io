// Small behaviors shared by every page: the Appearance switch (Blue or Graphite), pausing motion, the Dock bounce on
// phones, telling Mini Yaz about things worth reacting to, and moving between pages in place, so Mini Yaz can travel
// along. The theme and motion choices are applied in <head> before first paint (see src/site/templates.mjs); this file
// only wires up the controls.
(() => {
  const root = document.documentElement;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const send = (type, detail) => document.dispatchEvent(new CustomEvent('miniyaz:' + type, { detail }));
  const motionOff = () => root.dataset.motion === 'paused' || matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  // the toggles live in the footer and beside Mini Yaz, so one listener covers the ones a new page brings
  document.addEventListener('click', (e) => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-motion-toggle]')) return;
    store.set('motion', root.dataset.motion === 'paused' ? null : 'paused');
    applyMotion();
  });
  applyMotion();

  // page-to-page glide on full page loads (cross-document view transitions): skipped when motion is paused
  const skipIfPaused = (e) => { if (e.viewTransition && root.dataset.motion === 'paused') e.viewTransition.skipTransition(); };
  window.addEventListener('pageswap', skipIfPaused);
  window.addEventListener('pagereveal', skipIfPaused);

  // ---------- Dock (phones): the icon you tapped bounces as its page opens, like an app launching ----------
  const launch = (href) => {
    const here = document.querySelector('.dock a[aria-current="page"]');
    if (href && here && here.getAttribute('href') === href && root.dataset.motion !== 'paused') here.classList.add('is-launching');
  };
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element && e.target.closest('.dock a');
    if (!a) return;
    try { sessionStorage.setItem('dock-launch', a.getAttribute('href')); } catch (err) { /* ignore */ }
    a.classList.add('is-launching');
  });
  document.addEventListener('animationend', (e) => { if (e.target instanceof Element && e.target.matches('.dock a')) e.target.classList.remove('is-launching'); });
  try {
    const launched = sessionStorage.getItem('dock-launch');
    sessionStorage.removeItem('dock-launch');
    launch(launched);
  } catch (e) { /* ignore */ }

  // ---------- Mini Yaz reacts to the page ----------
  // data-yaz="cheer" (a hop with arms up), "ooh" (eyes light up), "wave"; each element reacts at most every few seconds
  const lastAt = new WeakMap();
  const react = (el) => {
    const now = performance.now();
    if (now - (lastAt.get(el) || -1e9) < 4000) return;
    lastAt.set(el, now);
    send('react', { kind: el.dataset.yaz });
  };
  const yazOf = (e) => (e.target instanceof Element ? e.target.closest('[data-yaz]') : null);
  document.addEventListener('pointerover', (e) => { const el = yazOf(e); if (el && e.pointerType === 'mouse' && !el.contains(e.relatedTarget)) react(el); });
  document.addEventListener('pointerdown', (e) => { const el = yazOf(e); if (el && e.pointerType !== 'mouse') react(el); });
  // keyboard users: Mini Yaz looks at whatever has focus (and reacts to it)
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (!(t instanceof Element) || !t.matches(':focus-visible') || t.closest('.mini-yaz')) return;
    if (t.matches('[data-yaz]')) react(t);
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

  // ---------- the home page's headline rotates through a few titles ----------
  // it holds still while motion is paused or reduced; screen readers get all of them at once (in the hidden text beside it)
  let rolesTimer = 0;
  const startRoles = () => {
    clearInterval(rolesTimer);
    const roles = document.querySelector('[data-roles]');
    if (!roles) return;
    const items = [...roles.children];
    let at = 0;
    rolesTimer = setInterval(() => {
      if (motionOff() || document.hidden) return;
      const prev = items[at];
      at = (at + 1) % items.length;
      prev.classList.remove('is-on'); prev.classList.add('is-out');
      items[at].classList.remove('is-out'); items[at].classList.add('is-on');
      setTimeout(() => prev.classList.remove('is-out'), 500);
    }, 2800);
  };
  startRoles();

  // ---------- moving between pages in place ----------
  // Links to other pages of this site load the page's HTML and swap in its content, header and Dock, instead of
  // loading the whole page again. The live Mini Yaz stays, and moves to its spot on the new page
  // (assets/mini-yaz/mascot.js). Anything unexpected falls back to a normal page load.
  const pages = new Map();
  const fetchPage = (url) => {
    const key = url.pathname;
    if (!pages.has(key)) pages.set(key, fetch(key, { credentials: 'same-origin' }).then((r) => r.text()).catch((e) => { pages.delete(key); throw e; }));
    return pages.get(key);
  };
  const ours = (a) => {
    if (!a || a.target || a.hasAttribute('download') || a.getAttribute('rel') === 'external') return null;
    const url = new URL(a.href, location.href);
    const ext = url.pathname.match(/\.([a-z0-9]+)$/i);
    if (url.origin !== location.origin || (ext && ext[1].toLowerCase() !== 'html')) return null;   // files (the résumé) load normally
    if (url.pathname === location.pathname && url.hash) return null;            // a jump within this page
    return url;
  };
  let busy = false;
  const go = async (url, { push = true, scrollY = 0 } = {}) => {
    if (busy) return;
    busy = true;
    try {
      const html = await fetchPage(url);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const main = doc.querySelector('main#main'), head = doc.querySelector('.masthead'), dock = doc.querySelector('.dock');
      if (!main || !head || !doc.querySelector('.mini-yaz--main')) throw new Error('not one of our pages');
      if (push) {
        history.replaceState({ scrollY: window.scrollY }, '');
        history.pushState({ scrollY: 0 }, '', url.pathname + url.search + url.hash);
      }
      const animate = !motionOff();
      const swap = () => {
        document.dispatchEvent(new CustomEvent('site:beforeswap'));
        document.title = doc.title;
        ['meta[name="description"]', 'link[rel="canonical"]'].forEach((q) => { const a = document.querySelector(q), b = doc.querySelector(q); if (a && b) a.replaceWith(b.cloneNode(true)); });
        document.querySelector('.masthead').replaceWith(document.adoptNode(head));
        const oldDock = document.querySelector('.dock');
        if (oldDock && dock) oldDock.replaceWith(document.adoptNode(dock));
        document.querySelector('main#main').replaceWith(document.adoptNode(main));
        const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (target) target.scrollIntoView(); else window.scrollTo(0, scrollY);
        applyMotion();
        startRoles();
        document.dispatchEvent(new CustomEvent('site:afterswap', { detail: { animate } }));
        // page scripts (the Lab's) run again for the new content
        doc.querySelectorAll('body script[type="module"][src]').forEach((s) => import(new URL(s.getAttribute('src'), location.href).href + '?' + Date.now()));
      };
      // the content changes at once; the motion is Mini Yaz gliding over to its new spot
      swap();
      // keyboard and screen reader users land at the top of the new page's content
      const h1 = document.querySelector('main h1');
      if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
      launch(sessionStorage.getItem('dock-launch'));
      try { sessionStorage.removeItem('dock-launch'); } catch (e) { /* ignore */ }
    } catch (err) {
      location.href = url.href;
    } finally {
      busy = false;
    }
  };
  if (window.fetch && window.DOMParser && history.pushState) {
    history.scrollRestoration = 'manual';
    document.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element && e.target.closest('a[href]');
      const url = a && ours(a);
      if (!url) return;
      e.preventDefault();
      if (url.pathname === location.pathname && !url.hash) { window.scrollTo({ top: 0, behavior: motionOff() ? 'auto' : 'smooth' }); return; }
      go(url);
    });
    // start loading a page as soon as a pointer heads for its link
    document.addEventListener('pointerover', (e) => { const a = e.target instanceof Element && e.target.closest('a[href]'); const url = a && ours(a); if (url && url.pathname !== location.pathname) fetchPage(url).catch(() => {}); });
    window.addEventListener('popstate', (e) => go(new URL(location.href), { push: false, scrollY: (e.state && e.state.scrollY) || 0 }));
  }
})();
