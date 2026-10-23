// Tunes Mini Yaz's lighting and colors (the LOOK settings in assets/mini-yaz/engine.js) against the reference images.
//   npm run serve   (in another terminal)
//   node mini-yaz/tools/tune.mjs <out.json> [start look.json] [passes]
// Coordinate descent: nudge each setting up or down, keep whatever lowers the color difference, halve the steps when a
// full pass finds nothing. Copy the result into LOOK's defaults.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2], startFile = process.argv[3], PASSES = +(process.argv[4] || 6);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
p.on('pageerror', (e) => console.log('pageerror', String(e)));
await p.goto((process.env.BASE || 'http://localhost:8130') + '/mini-yaz/tools/tune.html');
await p.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
const P = {   // name: [min, max, step]
  exposure: [0.5, 1.5, 0.08], env: [0.2, 1.8, 0.12], key: [0, 2.5, 0.2], keyX: [-7, 7, 1.5], keyY: [0, 10, 1.5], keyZ: [-3, 10, 1.5], hemi: [0, 1, 0.1],
  soft: [0.4, 6, 0.5], fill: [0, 4, 0.3], top: [0, 4, 0.3], rim: [0, 3, 0.3], room: [0.15, 1.2, 0.08],
  sheen: [0, 1, 0.1], sheenTint: [0, 1, 0.15], sheenFace: [0, 1, 0.1], aoPow: [0.5, 3.5, 0.2], aoDirect: [0, 1, 0.1],
  sss: [0, 0.3, 0.03], sssFace: [0, 0.3, 0.03], edge: [0, 1.2, 0.1], edgeFace: [0, 1.2, 0.1], rough: [0.5, 1, 0.05], roughFace: [0.5, 1, 0.05],
  aoPowFace: [0.5, 3.5, 0.2], 'pink.0': [180, 255, 6], 'pink.1': [140, 230, 6], 'pink.2': [130, 230, 6],
  'blue.0': [0, 255, 8], 'blue.1': [0, 255, 8], 'blue.2': [0, 255, 8], 'cream.0': [150, 255, 6], 'cream.1': [150, 255, 6], 'cream.2': [150, 255, 6]
};
let look = startFile ? JSON.parse(readFileSync(startFile, 'utf8')) : await p.evaluate(() => window.look());
look.blue = look.blue || [63, 117, 186]; look.cream = look.cream || [250, 235, 221]; look.pink = look.pink || [248, 192, 186]; if (look.aoPowFace == null) look.aoPowFace = look.aoPow;
const get = (k) => (k.includes('.') ? look[k.split('.')[0]][+k.split('.')[1]] : look[k]);
const set = (L, k, v) => { const c = JSON.parse(JSON.stringify(L)); if (k.includes('.')) c[k.split('.')[0]][+k.split('.')[1]] = v; else c[k] = v; return c; };
const score = (L) => p.evaluate((L) => window.score(L), L);
let best = await score(look); console.log('start', best.toFixed(3));
const steps = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, v[2]]));
for (let pass = 0; pass < PASSES; pass++) {
  let improved = false;
  for (const k of Object.keys(P)) {
    const [lo, hi] = P[k];
    for (const dir of [1, -1]) {
      let moved = false;
      for (;;) {
        const v = Math.min(hi, Math.max(lo, get(k) + dir * steps[k]));
        if (v === get(k)) break;
        const cand = set(look, k, v), e = await score(cand);
        if (e < best - 1e-3) { best = e; look = cand; improved = moved = true; } else break;
      }
      if (moved) break;
    }
  }
  console.log('pass', pass, best.toFixed(3));
  writeFileSync(out, JSON.stringify({ score: best, look }, null, 1));
  if (!improved) Object.keys(steps).forEach((k) => { steps[k] /= 2; });
}
await b.close();
