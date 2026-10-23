// The shared frame every page sits in: <head>, the Aqua tabs (or the title bar and Dock on phones), the footer,
// and the Mini Yaz markup. Pages are assembled in pages.mjs.
import { site, nav } from './content.mjs';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const svg = (paths, cls = '') => `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ''}>${paths}</svg>`;

const PIN = '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><path d="M9 10a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/>';
export const pin = () => svg(PIN);

// Theme and motion choices, applied before first paint so nothing flashes
const EARLY = `(function(){var d=document.documentElement,g=function(k){try{return localStorage.getItem(k)}catch(e){return null}},a=g('appearance');d.dataset.appearance=a==='blue'||a==='graphite'?a:(matchMedia('(prefers-color-scheme: dark)').matches?'graphite':'blue');d.dataset.motion=g('motion')==='paused'?'paused':'on'})();`;

const POSTER = { point: 'point', cheer: 'cheer', lost: 'lost' };
const TAP = { spin: 'Spin Mini Yaz around', wave: 'Say hi to Mini Yaz', idle: 'Say hi to Mini Yaz', lost: 'Ask Mini Yaz for directions' };

// Mini Yaz: a poster that the live 3D character replaces once it loads (assets/mini-yaz/mascot.js)
export const mascot = ({ pose = 'idle', label, props = '', main = false, id = '' }) => `
<div class="mini-yaz${main ? ' mini-yaz--main' : ''}" data-pose="${pose}"${props ? ` data-props="${props}"` : ''}${id ? ` id="${id}"` : ''} role="group" aria-label="${esc(label)}">
  <img class="yaz-poster" src="/assets/mini-yaz/poster-${POSTER[pose] || 'idle'}.webp" alt="" width="816" height="890" draggable="false"${main ? ' fetchpriority="high"' : ' loading="lazy"'}>
  <span class="yaz-z" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>${pose === 'lost' ? '\n  <span class="yaz-q" aria-hidden="true">?</span>' : ''}
  <button type="button" class="yaz-hit" aria-label="${TAP[pose] || 'Tap Mini Yaz'}"></button>
</div>`;

const PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
const PLAY = '<path d="M7 4v16l13-8z"/>';
export const motionToggle = () => `<button type="button" class="mini-btn" data-motion-toggle aria-pressed="false">${svg(PAUSE, 'i-pause')}${svg(PLAY, 'i-play')}<span data-motion-label>Pause motion</span></button>`;
export const hint = (text) => `<p class="yaz-hint"><span>${text}</span>${motionToggle()}</p>`;

const tabs = (active) => `
  <nav class="tabs" aria-label="Main">
${nav.map((n) => n.key === 'home'
    ? `    <a class="tab tab--home" href="/" aria-label="Home"${active === 'home' ? ' aria-current="page"' : ''}><img src="/assets/img/peek.webp" alt="" width="324" height="268"></a>`
    : `    <a class="tab" href="${n.href}"${active === n.key ? ' aria-current="page"' : ''}>${n.label}</a>`).join('\n')}
  </nav>`;

const dock = (active) => `
<nav class="dock" aria-label="Main">
${nav.map((n) => `  <a href="${n.href}"${active === n.key ? ' aria-current="page"' : ''}><span class="dock-icon ${n.key === 'home' ? 'dock-icon--home' : n.gel}">${n.key === 'home' ? '<img src="/assets/img/peek.webp" alt="" width="324" height="268">' : svg(n.icon)}</span>${n.label}</a>`).join('\n')}
</nav>`;

const footer = () => `
<footer class="footer">
  <div class="wrap">
    <p class="footer-links">
${nav.map((n) => `      <a href="${n.href}">${n.label}</a>`).join('\n')}
      <a href="/making-mini-yaz">Making Mini Yaz</a>
      <a href="${site.github}">GitHub</a>
      <a href="${site.linkedin}">LinkedIn</a>
    </p>
    <div class="footer-prefs">
      <span><span id="appearance-label">Appearance</span>
        <span class="seg" role="group" aria-labelledby="appearance-label">
          <button type="button" data-appearance-option="auto" aria-pressed="true">Auto</button><button type="button" data-appearance-option="blue" aria-pressed="false">Blue</button><button type="button" data-appearance-option="graphite" aria-pressed="false">Graphite</button>
        </span>
      </span>
      ${motionToggle()}
    </div>
    <p class="copy">Copyright © ${site.year} ${site.name}. Made with love in ${site.location}.</p>
  </div>
</footer>`;

export function page({ path, title, description, active, pageName, main, mascot: hasMascot = true, head = '', scripts = '', jsonld = null, noindex = false }) {
  const url = site.url + path;
  const ogImage = `${site.url}/assets/img/og.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#FFFFFF">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Mini Yaz, a little blue and white vinyl version of Yasmeen, waving beside the name Yasmeen Roumie">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" href="/static/img/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/static/img/favicon-32.png">
<link rel="apple-touch-icon" href="/static/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/InstrumentSerif-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/site.css">
<script>${EARLY}</script>
${hasMascot ? '<link rel="modulepreload" href="/assets/mini-yaz/mascot.js">\n<script type="module" src="/assets/mini-yaz/mascot.js"></script>\n' : ''}<script src="/assets/js/site.js" defer></script>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>\n` : ''}${head}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="masthead">
  <a class="titlebar" href="/"><img src="/assets/img/peek.webp" alt="" width="324" height="268"><b>${site.name}</b>${pageName ? `<span>· ${pageName}</span>` : ''}</a>${tabs(active)}
</header>

<main id="main">
${main}
</main>
${footer()}
${dock(active)}
${scripts}</body>
</html>
`;
}

export const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: site.name,
  jobTitle: site.title,
  url: site.url + '/',
  image: site.url + '/assets/img/og.png',
  address: { '@type': 'PostalAddress', addressLocality: 'Miami', addressRegion: 'FL', addressCountry: 'US' },
  sameAs: [site.github, site.linkedin]
};
