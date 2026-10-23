// Builds the site's pages from src/site/ into the repo root (GitHub Pages serves them as-is).
//   npm run build:site
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { site } from '../src/site/content.mjs';
import { home, work, projectsPage, lab, aboutPage, notFound } from '../src/site/pages.mjs';
import { making } from '../src/site/making.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = [home(), work(), projectsPage(), lab(), aboutPage(), making(), notFound()];
for (const p of pages) {
  writeFileSync(join(root, p.file), p.html);
  console.log('wrote', p.file, p.html.length, 'bytes');
}

const listed = pages.filter((p) => p.file !== '404.html').map((p) => p.file === 'index.html' ? '/' : '/' + p.file.replace(/\.html$/, ''));
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${listed.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}
</urlset>
`);
writeFileSync(join(root, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`);
console.log('wrote sitemap.xml, robots.txt');
