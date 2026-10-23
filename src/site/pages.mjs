// One function per page. Each returns { file, html }.
import { site, jobs, attachKinds, projects, about } from './content.mjs';
import { page, mascot, hint, esc, svg, pin, person } from './templates.mjs';

const CLIP = '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>';
const art = (p, cls = '') => `<img src="/assets/img/${p.art}.webp" alt="" width="600" height="600" loading="lazy"${cls ? ` class="${cls}"` : ''}>`;

// ---------- Home ----------
function home() {
  const main = `
<section class="hero" aria-labelledby="name">
  <div class="wrap">
    <h1 class="hero-name" id="name">${site.name}</h1>
    <div class="hero-mascot">${mascot({ pose: 'wave', label: 'Mini Yaz, a little vinyl me, waving hello', main: true })}</div>
    ${hint('Tap Mini Yaz to say hi, or drag to spin')}
    <div class="hero-title"><span><span class="visually-hidden">${site.titles.join(', ')}.</span><span class="roles" aria-hidden="true" data-roles>${site.titles.map((t, i) => `<span class="role${i ? '' : ' is-on'}">${t}.</span>`).join('')}</span></span> <span>${site.tagline}</span></div>
    <p class="hero-body">${site.summary}</p>
    <p class="pill">${pin()} ${site.location}</p>
    <div class="actions">
      <a class="btn" href="/work">Where I've worked</a>
      <a class="btn btn--silver" href="/projects">What I've built</a>
    </div>
  </div>
</section>

<section class="section" id="places" aria-labelledby="places-h">
  <div class="section-head"><h2 id="places-h">Places I've worked.</h2><a href="/work">All the details ›</a></div>
  <div class="places">
${jobs.map((j) => `    <a class="tile lift" href="/work#${j.id}">
      <span class="tile-head"><span class="tile-name">${j.co}</span><span class="tile-when">${j.short}</span></span>
      <span class="tile-what">${esc(j.what)}</span>${j.tileAttach ? `
      <span class="tile-attach">${svg(CLIP)} ${j.tileAttach}</span>` : ''}
    </a>`).join('\n')}
  </div>
</section>

<section class="band" id="built" aria-labelledby="built-h">
  <div class="section">
    <div class="section-head"><h2 id="built-h">Things I've built.</h2><a href="/projects">See all projects ›</a></div>
    <div class="builds">
${projects.filter((p) => p.home).map((p) => `      <a class="build lift" href="/projects#${p.id}" data-yaz="${p.yaz}">
        <span class="art" style="--art: ${p.color}">${art(p)}</span>
        <span class="build-text">
          <span class="tile-head"><span class="tile-name">${p.name}</span><span class="tile-when">${p.when}</span></span>
          <span class="tile-what">${esc(p.homeWhat)}</span>
        </span>
      </a>`).join('\n')}
    </div>
  </div>
</section>`;
  return {
    file: 'index.html',
    html: page({
      path: '/', active: 'home',
      title: `${site.name} · ${site.title} in ${site.location}`,
      description: `${site.name} is a design engineer in ${site.location} who builds with whatever's newest: HoloLens apps at NASA, AR lenses at Snapchat, NLP at Tinder and Goldman Sachs, blockchain at Celo, and backend systems at Oscar Health and Hook.`,
      jsonld: person, main
    })
  };
}

// ---------- Work ----------
function work() {
  const attachment = (a) => {
    const k = attachKinds[a.kind];
    const inner = `
            <span class="att-icon ${k.gel}">${svg(k.icon)}</span>
            <span class="att-text"><span class="att-title">${esc(a.title)}</span><span class="att-meta">${k.label} · ${esc(a.meta)}</span></span>`;
    return a.href
      ? `          <a class="att" href="${a.href}" data-yaz="ooh">${inner}
            <span class="att-go" aria-hidden="true">›</span>
          </a>`
      : `          <div class="att">${inner}
          </div>`;
  };
  const main = `
<section class="page-hero">
  <div class="mascot-slot">${mascot({ pose: 'point', label: 'Mini Yaz, pointing at the list of jobs, with a laptop on the floor', props: 'laptop', main: true })}</div>
  <div class="copy">
    <h1>Places I've worked.</h1>
    <p>Seven teams, newest first. What I built at each, with the talks, papers and code attached to the job they came from.</p>
    ${hint('Tap or drag Mini Yaz')}
  </div>
</section>

<section class="jobs" aria-label="Jobs">
${jobs.map((j) => `  <article class="job" id="${j.id}" aria-labelledby="${j.id}-h">
    <div class="job-meta">
      <h2 id="${j.id}-h">${j.co}</h2>
      <span class="job-team">${esc(j.team)}</span>
      <span class="job-when">${esc(j.when)}</span>
      <span class="chips">${j.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
    </div>
    <div class="job-body">
${j.roles.map((r) => `      <div>${r.team ? `
        <p class="role-head"><b>${esc(r.team)}</b><span>${esc(r.when)}</span></p>` : ''}
        <ul class="bullets">
${r.bullets.map((b) => `          <li>${esc(b)}</li>`).join('\n')}
        </ul>
      </div>`).join('\n')}${j.attach ? `
      <div class="attached">
        <span>Attached</span>
${j.attach.map(attachment).join('\n')}
      </div>` : ''}
    </div>
  </article>`).join('\n')}
</section>

<section class="next" aria-label="Next">
  <a class="next-card" href="/projects">
    <span class="peek" aria-hidden="true"><img src="/assets/img/peek.webp" alt="" width="324" height="268" loading="lazy"></span>
    <span class="next-label"><small>Next</small><strong>Things I've built ›</strong></span>
    <span>Side projects, usually built with whatever just came out.</span>
  </a>
</section>`;
  return {
    file: 'work.html',
    html: page({
      path: '/work', active: 'work', pageName: 'Work',
      title: `Work · ${site.name}`,
      description: `Places ${site.name} has worked, newest first: Hook, Oscar Health, Goldman Sachs, Celo, Tinder, Snapchat and NASA, with the talks, papers and code from each.`,
      main
    })
  };
}

// ---------- Projects ----------
function projectsPage() {
  const main = `
<section class="page-hero">
  <div class="mascot-slot">${mascot({ pose: 'cheer', label: 'Mini Yaz, cheering with both arms up, in running shoes', props: 'shoes', main: true })}</div>
  <div class="copy">
    <h1>Things I've built.</h1>
    <p>Side projects and experiments, usually with whatever had just come out.</p>
    ${hint('Tap or drag Mini Yaz')}
  </div>
</section>

<section class="projects" aria-label="Projects">
${projects.map((p) => `  <a class="project" id="${p.id}" href="${p.href}" data-yaz="${p.yaz}">
    <span class="window">
      <span class="window-bar"><span class="lights" aria-hidden="true"><span></span><span></span><span></span></span><span class="title">${p.name}</span></span>
      <span class="art" style="--art: ${p.color}">${art(p)}${p.badge ? `<span class="badge${p.live ? ' badge--live' : ''}" style="--badge-dot: ${p.badgeDot}; --badge-ink: ${p.badgeInk}">${esc(p.badge)}</span>` : ''}</span>
      <span class="project-text">
        <span class="project-head"><b>${p.name}</b><span>${p.when}</span></span>
        <span class="project-what">${esc(p.what)}</span>
        <span class="chips">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
        <span class="cta">${p.cta} ›</span>
      </span>
    </span>
  </a>`).join('\n')}
</section>

<section class="more"><p>More on the way as I polish older projects. Meanwhile, there are small experiments in the <a href="/lab">Lab</a>.</p></section>`;
  return {
    file: 'projects.html',
    html: page({
      path: '/projects', active: 'projects', pageName: 'Projects',
      title: `Projects · ${site.name}`,
      description: `Side projects by ${site.name}, usually built with whatever had just come out: ${projects.map((p) => p.name).join(', ')}.`,
      main
    })
  };
}

// ---------- Lab ----------
function lab() {
  const win = (id, title, body) => `  <section class="window" id="${id}" aria-labelledby="${id}-h">
    <div class="window-bar"><span class="lights" aria-hidden="true"><span></span><span></span><span></span></span><span class="title">${title}</span></div>
    <div class="exp-body pinstripe">
${body}
    </div>
  </section>`;
  // the colors in assets/mini-yaz/mascot.js (COLORS), as swatches
  const YAZ_COLORS = [['blue', 'Finder blue', '#2692EE'], ['pink', 'Pink', '#EE669E'], ['lilac', 'Lilac', '#926EE6'], ['mint', 'Mint', '#1EB894'], ['tangerine', 'Tangerine', '#FA8C28'], ['graphite', 'Graphite', '#545A66']];
  const btn = (attr, label, pressed) => `<button type="button" ${attr}${pressed !== undefined ? ` aria-pressed="${pressed}"` : ''}>${label}</button>`;
  const main = `
<section class="page-hero">
  <div class="copy">
    <h1>Lab.</h1>
    <p>Small experiments, mostly pieces of this site pulled out so you can play with them. Everything here runs live in your browser.</p>
  </div>
</section>

<div class="lab">
${win('playground', 'Mini Yaz playground', `      <h2 id="playground-h">Mini Yaz playground</h2>
      <p>The same character that lives on every page, with the controls showing. Try the actions, dress it up, change its color, or put it to sleep. Five quick taps also work. The color you pick follows you around the site. <a href="/making-mini-yaz">How it was made ›</a></p>
      <div class="exp-grid">
        <div class="stage">
          <div class="mascot-slot">${mascot({ pose: 'idle', label: 'Mini Yaz in the playground', main: true, id: 'play-yaz' })}</div>
        </div>
        <div class="controls" data-playground>
          <div class="control-row"><b>Do something</b>
            <span class="seg">${['wave', 'hop', 'spin', 'cheer', 'dizzy'].map((k) => btn(`data-act="${k}"`, k[0].toUpperCase() + k.slice(1))).join('')}</span>
          </div>
          <div class="control-row"><b>Wear or bring</b>
            <span class="seg">${btn('data-prop="shoes"', 'Running shoes', false)}${btn('data-prop="bib"', 'Race bib', false)}${btn('data-prop="visor"', 'Headset', false)}${btn('data-prop="laptop"', 'Laptop', false)}</span>
          </div>
          <div class="control-row"><b>Color</b>
            <span class="swatches">${YAZ_COLORS.map(([k, label, hex]) => `<button type="button" class="swatch" data-color="${k}" aria-pressed="${k === 'blue'}" style="--sw:${hex}" aria-label="${label}" title="${label}"></button>`).join('')}</span>
          </div>
          <div class="control-row"><b>Look</b>
            <span class="seg">${btn('data-sleep', 'Doze off')}${btn('data-wire', 'Wireframe', false)}</span>
          </div>
          ${hint('Drag Mini Yaz to spin it')}
        </div>
      </div>`)}

${win('gel', 'Aqua gel maker', `      <h2 id="gel-h">Aqua gel maker</h2>
      <p>The glossy "gel" look from Mac OS X, the one on the buttons and tabs here. It is two gradients: a hard-edged white shine on the top half, over a light-to-dark fill. Pick a color and copy the CSS.</p>
      <div class="exp-grid">
        <div class="stage gelmaker-out" data-gel-out>
          <button type="button" class="btn" data-gel-preview>Say hi</button>
          <code data-gel-css tabindex="0" aria-label="CSS for this gel"></code>
        </div>
        <div class="controls" data-gel>
          <div class="control-row"><b>Color</b><label><input type="color" value="#2F7FE0" data-gel-color> <span data-gel-hex>#2F7FE0</span></label></div>
          <div class="control-row"><b>Shape</b><span class="seg">${btn('data-gel-shape="999px"', 'Pill', true)}${btn('data-gel-shape="10px"', 'Rounded', false)}${btn('data-gel-shape="4px"', 'Square', false)}</span></div>
          <div class="control-row"><b>Shine</b><input type="range" min="0" max="100" value="58" data-gel-shine aria-label="Shine"></div>
          <div class="control-row"><b>Label</b><label><input type="text" value="Say hi" maxlength="24" data-gel-label aria-label="Button label" style="font: 14px var(--sans); padding: 6px 8px; border-radius: 6px; border: 1px solid var(--seg-line); background: var(--win-panel); color: var(--ink)"></label></div>
        </div>
      </div>`)}

${win('springs', 'Springs, not keyframes', `      <h2 id="springs-h">Springs, not keyframes</h2>
      <p>Mini Yaz's head and body follow you with critically damped springs, the fastest kind that never overshoots. Move around the pad. The blue dot is a spring; the gray one restarts a 400 ms ease every time the target moves, so it lurches whenever you change direction.</p>
      <div class="exp-grid">
        <div class="spring-pad" data-spring-pad><canvas></canvas><p>Drag or move here</p></div>
        <div class="controls">
          <div class="control-row"><b>Stiffness (how fast it catches up)</b><input type="range" min="2" max="30" step="0.5" value="9" data-spring-omega aria-label="Stiffness"></div>
          <div class="control-row"><label><input type="checkbox" data-spring-ghost checked> Show the eased dot</label></div>
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-3)">Each frame: <code style="font: 12px ui-monospace, Menlo, monospace">x += (v + w·d)·dt·e<sup>−w·dt</sup></code>, with velocity carried over, so a new target bends the path instead of restarting it.</p>
        </div>
      </div>`)}
</div>`;
  return {
    file: 'lab.html',
    html: page({
      path: '/lab', active: 'lab', pageName: 'Lab',
      title: `Lab · ${site.name}`,
      description: 'Small interactive experiments: play with Mini Yaz, mix an Aqua gel button, and feel how springs move.',
      main, scripts: '<script type="module" src="/assets/js/lab.js"></script>\n'
    })
  };
}

// ---------- About ----------
function aboutPage() {
  const main = `
<section class="about" id="bio" aria-labelledby="bio-h">
  <div class="window window--quiet">
    <div class="window-bar"><span class="lights" aria-hidden="true"><span></span><span></span><span></span></span><span class="title">About Yasmeen</span></div>
    <div class="about-body pinstripe">
      <div class="about-head">
        <div class="mascot-slot">${mascot({ pose: 'spin', label: 'Mini Yaz, a little vinyl version of Yasmeen', main: true })}</div>
        ${hint('Tap or drag Mini Yaz to spin')}
        <h1 id="bio-h">${site.name}</h1>
        <p>${site.title} · ${site.location}</p>
      </div>
      <div class="prose-sm">
${about.bio.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
        <p>The little blue character is Mini Yaz. Here's <a href="/making-mini-yaz">how I made it</a>.</p>
      </div>
      <dl class="facts">
${about.facts.map(([k, v]) => `        <dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('\n')}
      </dl>
      <div class="actions">
        <a class="btn btn--sm" href="/work">Where I've worked…</a>
        <a class="btn btn--silver btn--sm" href="/projects">What I've built…</a>
      </div>
    </div>
  </div>
</section>

<section class="contact" id="contact" aria-labelledby="contact-h">
  <div>
    <img src="/assets/img/cheer.webp" alt="" width="342" height="405" loading="lazy">
    <div>
      <h2 id="contact-h">Say hi.</h2>
      <a class="btn btn--lg" href="mailto:${site.email}" data-yaz="cheer">${site.email}</a>
      <p><a href="${site.github}">GitHub</a><a href="${site.linkedin}">LinkedIn</a></p>
    </div>
  </div>
</section>`;
  return {
    file: 'about.html',
    html: page({
      path: '/about', active: 'about', pageName: 'About',
      title: `About · ${site.name}`,
      description: `${site.name} is a design engineer based in ${site.location} who has always gravitated to whatever's newest, from HoloLens at NASA to AR at Snapchat.`,
      jsonld: person, main
    })
  };
}

// ---------- 404 ----------
function notFound() {
  const main = `
<section class="lost" aria-labelledby="lost-h">
  <div class="mascot-slot">${mascot({ pose: 'lost', label: 'Mini Yaz, holding a map and looking lost', props: 'map', main: true })}</div>
  <h1 id="lost-h">This page wandered off.</h1>
  <p>Mini Yaz checked the map and it isn't here. Maybe it's one of these?</p>
  <div class="actions">
    <a class="btn" href="/">Home</a>
    <a class="btn btn--silver" href="/work">Work</a>
    <a class="btn btn--silver" href="/projects">Projects</a>
  </div>
</section>`;
  return {
    file: '404.html',
    html: page({
      path: '/404', active: '', pageName: 'Lost',
      title: `Lost · ${site.name}`,
      description: 'This page wandered off.',
      noindex: true, main
    })
  };
}

export { home, work, projectsPage, lab, aboutPage, notFound };
