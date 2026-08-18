// Builds an SVG sprite from the official @phosphor-icons/core assets and inlines
// it into each page. Inlined rather than referenced as an external file because
// cross-file <use href="file.svg#id"> is unevenly supported, and the sprite is
// small enough that duplicating it costs less than the risk of blank icons.
import { readFileSync, writeFileSync } from 'node:fs';

const ASSETS = 'node_modules/@phosphor-icons/core/assets';
const PAGES = ['index.html', 'projects.html', 'about.html'];

// [sprite id, phosphor weight, phosphor name]
const ICONS = [
  ['github', 'regular', 'github-logo'],
  ['linkedin', 'regular', 'linkedin-logo'],
  ['mail', 'regular', 'envelope-simple'],
  ['pin', 'regular', 'map-pin'],
  ['calendar', 'regular', 'calendar-blank'],
  ['menu', 'regular', 'list'],
  ['close', 'regular', 'x'],
  ['arrow', 'bold', 'arrow-up-right'],
];

const symbols = ICONS.map(([id, weight, name]) => {
  const file = weight === 'regular'
    ? `${ASSETS}/${weight}/${name}.svg`
    : `${ASSETS}/${weight}/${name}-${weight}.svg`;
  const body = readFileSync(file, 'utf8')
    .replace(/^[\s\S]*?<svg[^>]*>|<\/svg>\s*$/g, '')
    .replace(/<rect[^>]*fill="none"[^>]*\/>/g, '')
    .trim();
  return `  <symbol id="i-${id}" viewBox="0 0 256 256">${body}</symbol>`;
});

const sprite = [
  '<!--SPRITE:START-->',
  '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">',
  ...symbols,
  '</svg>',
  '<!--SPRITE:END-->',
].join('\n');

// Matches both the unbuilt placeholder and a previously injected sprite, so the
// build is idempotent.
const SLOT = /<!--SPRITE-->|<!--SPRITE:START-->[\s\S]*?<!--SPRITE:END-->/;

for (const page of PAGES) {
  const html = readFileSync(page, 'utf8');
  if (!SLOT.test(html)) throw new Error(`No sprite slot found in ${page}`);
  writeFileSync(page, html.replace(SLOT, sprite));
}

console.log(`Inlined ${ICONS.length} icons into ${PAGES.length} pages.`);
